/* ═══════════════════════════════════════════════════════════════════════
   phenix_maquette3d.js — MOTEUR 3D PARTAGÉ (PXModel) — 30/10/2026 [Moteur partagé]
   Écrit UNE fois, chargé par le Carnet (phenix_carnet.html) ET par le Chantier.
   Extrait tel quel de phenix_carnet.html ; seul ajout : attribut data-state sur les pastilles.
   Prérequis de la page hôte : <script type="importmap"> pour « three » (0.160) et « three/addons/ »,
   puis <script type="module" src="phenix_maquette3d.js">. API : init, update, setLook, setStage, setMode,
   focus, goView, views, overview, zoomIn, setActive. La page fournit PXModel.loader (→ ArrayBuffer .glb) et PXModel.cfg.
   ═══════════════════════════════════════════════════════════════════════ */
/* Maquette 3D par projet — charge le .glb exporté d'ArchiCAD (three.js). Même API que PXHouse (maison phare). */
(async function(){
  var THREE, OrbitControls, GLTFLoader;
  try{
    THREE = await import('three');
    OrbitControls = (await import('three/addons/controls/OrbitControls.js')).OrbitControls;
    GLTFLoader = (await import('three/addons/loaders/GLTFLoader.js')).GLTFLoader;
  }catch(e){ window.dispatchEvent(new Event('px3d-fail')); return; }

  var M = { ready:false, isModel:true, rooms:[], loader:null, cfg:null };
  var host, renderer, scene, camera, controls, root, spots = {}, zones = [], onPick = function(){}, flb = null, ldr = null;
  var mode = 'out', active = false, dirty = true, loopOn = false, anim = null, forceId = null, floorI = 0, states = {};
  var MAT = {}, meshes = [], stage = null, growH = 999, growPl = new THREE.Plane(new THREE.Vector3(0,-1,0), 999), baseH = .3, topH = 6, growAnim = null, stageIn = false;
  var roofNodes = [], plane = new THREE.Plane(new THREE.Vector3(0,-1,0), 999), cuts = [1.4], box = new THREE.Box3(), ctr = new THREE.Vector3(), size = new THREE.Vector3();
  var v3 = new THREE.Vector3(), cd = new THREE.Vector3(), mp = new THREE.Vector3(), mn = new THREE.Vector3(), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  var KEYS = [ ['couverture',/toit|couv|charp|comble/i], ['menuiseries',/menuis|fenetr|fenêtr|baie|vitr/i], ['porte',/porte/i], ['volets',/volet/i], ['plancher',/dalle|plancher|soubass/i], ['cloture',/cloture|clôture/i], ['portail',/portail/i], ['allee',/allee|allée/i], ['murs',/mur|fa[cç]ade|bardage|enduit/i] ];
  var RE_GLASS = /vitr|verre|glass|fenetre_v/i, RE_GROUND = /terrain|^sol$|jardin|voirie|site/i, RE_TERR = /grave|herbe|gazon|pelouse/i, RE_ROOF = /toit|couv|charp|comble/i;

  function kick(){ if(loopOn || !active) return; loopOn = true; requestAnimationFrame(frame); }
  function ease(t){ return t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
  function fly(pos, tgt, ms){
    anim = { t0:performance.now(), ms:ms||800, p0:camera.position.clone(), t0v:controls.target.clone(), p1:pos, t1:tgt }; dirty = true; kick();
  }
  /* [Atelier] vue d'accueil réglée dans l'Atelier ; en portrait (téléphone) on recule pour garder la maison entière */
  function overviewPose(){
    var hv = (M.cfg && M.cfg.views || []).filter(function(v){ return v.home && v.p && v.tg; })[0];
    if(!hv) return autoPose();
    var p = new THREE.Vector3(hv.p[0], hv.p[1], hv.p[2]), t = new THREE.Vector3(hv.tg[0], hv.tg[1], hv.tg[2]);
    if((host.clientWidth||600)/(host.clientHeight||420) < .8) p.sub(t).multiplyScalar(1.9).add(t);
    return { p:p, t:t };
  }
  function autoPose(){
    var r = Math.max(size.x, size.z, size.y*1.2) || 10, k = (host.clientWidth||600)/(host.clientHeight||420) > .8 ? 1 : 1.55;
    var d = r*1.55*k;
    return { p:new THREE.Vector3(ctr.x + d*.78, size.y*.9 + d*.38, ctr.z + d*.78), t:new THREE.Vector3(ctr.x, size.y*.38, ctr.z) };
  }
  function inPose(){
    var o = autoPose(); o.p.set(ctr.x + (o.p.x-ctr.x)*.55, size.y*1.1 + (o.p.y-size.y*.9)*1.5, ctr.z + (o.p.z-ctr.z)*.55); o.t.y = Math.min(size.y*.3, 1.5); return o;
  }

  function prepare(gltf){
    root = gltf.scene; scene.add(root);
    var cfg = M.cfg || {}, keep = !!cfg.keepMaterials;
    var COL = cfg.colors || {}, colOf = function(k, d){ return COL[k] != null ? COL[k] : d; };
    var mWall = new THREE.MeshStandardMaterial({ color:colOf('wall',0xf4f6fa), roughness:.92, metalness:0, side:THREE.DoubleSide });
    var mRoof = new THREE.MeshStandardMaterial({ color:colOf('roof',0xdde3ec), roughness:.9, metalness:0, side:THREE.DoubleSide });
    var mGrd = new THREE.MeshStandardMaterial({ color:colOf('terr',0x2a3e5d), roughness:1, metalness:0 });
    var mGls = new THREE.MeshStandardMaterial({ color:0x9fb9d6, roughness:.15, metalness:.1, transparent:true, opacity:.38, depthWrite:false, side:THREE.DoubleSide });
    var mk = function(c){ return new THREE.MeshStandardMaterial({ color:c, roughness:.85, metalness:0, side:THREE.DoubleSide }); };
    MAT = { wall:mWall, roof:mRoof, frame:mk(colOf('frame',0x9fb2c6)), door:mk(colOf('door',0xb9c6da)), gate:mk(colOf('gate',0xb9c6da)), allee:mk(colOf('allee',0xc6cedc)), glass:mGls, ground:mGrd, terr:mGrd,
      charpente:mk(colOf('charpente',0xd9cbb5)), mobilier:mk(colOf('mobilier',0xc9d2de)) };
    ['dalle','cloison','escalier','vrd'].forEach(function(k){ MAT[k] = COL[k] != null ? mk(COL[k]) : mWall; }); /* [Atelier] */
    MAT.ghost = new THREE.MeshStandardMaterial({ color:0xdde3ec, roughness:.9, transparent:true, opacity:.28, depthWrite:false, side:THREE.DoubleSide });
    var reRoof = cfg.roofRe ? new RegExp(cfg.roofRe,'i') : RE_ROOF;
    var named = {}, drop = [], LY = cfg.layers || {};
    var CZ = { roof:'couverture', wall:'murs', glass:'menuiseries', frame:'menuiseries', door:'porte', dalle:'plancher', vrd:'cloture', gate:'portail', allee:'allee' };
    root.traverse(function(o){
      if(!o.isMesh) return;
      var path = o.name, p = o.parent; while(p && p !== root){ path = p.name + '/' + path; p = p.parent; }
      /* [Atelier] catégorie réglée dans l'Atelier, sinon celle écrite dans le .glb, sinon devinée d'après le nom */
      var ud = o.userData || {}, ov = LY[ud.layer || o.name] || null, cat = (ov && ov.cat) || ud.cat || null, isGlass, isGrd, isRoof, isTerr = false, zone = null;
      if(cat === 'hide' || (ov && ov.hide)){ drop.push(o); return; }
      if(cat){ isGlass = cat === 'glass'; isGrd = cat === 'ground'; isRoof = cat === 'roof'; isTerr = cat === 'terr'; zone = CZ[cat] || null; }
      else {
        isGlass = RE_GLASS.test(path) || (o.material && o.material.transparent && o.material.opacity < .8);
        isGrd = RE_GROUND.test(path); isRoof = reRoof.test(path);
        cat = isGlass ? 'glass' : isGrd ? 'ground' : isRoof ? 'roof' : /portail/i.test(path) ? 'gate' : /porte|door/i.test(path) ? 'door' : /allee|allée/i.test(path) ? 'allee' : /volet|menuis|cadre|fenetr|fenêtr|baie/i.test(path) ? 'frame' : /dalle|plancher|soubass/i.test(path) ? 'dalle' : /cloison|doublage/i.test(path) ? 'cloison' : /cloture|clôture/i.test(path) ? 'vrd' : 'wall';
        isTerr = !isGrd && (cfg.terrRe ? new RegExp(cfg.terrRe,'i') : RE_TERR).test(path); if(isTerr) cat = 'terr';
      }
      o.userData.cat = cat; meshes.push(o);
      if(!keep) o.material = MAT[cat] || (cat==='terr' ? mGrd : mWall);
      else { o.material = o.material.clone(); }
      o.castShadow = !isGrd && !isTerr && !isGlass; o.receiveShadow = !isGlass;
      o.userData.isRoof = isRoof; o.userData.isGrd = isGrd || isTerr;
      if(isRoof) roofNodes.push(o);
      if(zone) (named[zone] = named[zone] || []).push(o);
      else if(!ud.cat) for(var i=0;i<KEYS.length;i++){ if(KEYS[i][1].test(path)){ (named[KEYS[i][0]] = named[KEYS[i][0]] || []).push(o); break; } }
    });
    /* normalisation : centré en x/z, posé à y = 0 (le dessin d'ArchiCAD peut être loin de l'origine).
       [Atelier] fichier converti par l'Atelier : déjà dans le bon repère, on n'y touche pas (les pastilles et vues y sont réglées). */
    if(cfg.baked){ root.position.set(0,0,0); root.updateMatrixWorld(true); }
    else {
      box.setFromObject(root); box.getCenter(ctr);
      root.position.set(-ctr.x, -box.min.y, -ctr.z); root.updateMatrixWorld(true);
      var gb = new THREE.Box3(); meshes.forEach(function(o){ if(o.userData.cat === 'ground') gb.expandByObject(o); });
      if(!gb.isEmpty()){ root.position.y -= gb.max.y; root.updateMatrixWorld(true); }
    }
    drop.forEach(function(o){ if(o.parent) o.parent.remove(o); }); root.updateMatrixWorld(true);
    box.setFromObject(root); box.getCenter(ctr); box.getSize(size);
    /* hauteur du bâti hors terrain/toiture, pour le nombre de niveaux */
    var bb = new THREE.Box3(), has = false;
    root.traverse(function(o){ if(o.isMesh && !o.userData.isGrd && !o.userData.isRoof && !(o.material && o.material.transparent)){ bb.expandByObject(o); has = true; } });
    var bf = new THREE.Box3(); root.traverse(function(o){ if(o.isMesh && !o.userData.isGrd) bf.expandByObject(o); });
    if(!bf.isEmpty()){ bf.getCenter(ctr); bf.getSize(size); }
    var top = has ? bb.max.y : size.y, etY = cfg.etY || 2.8;
    var fd = Math.max(size.x, size.z, 8); scene.fog = new THREE.Fog(0x0a1628, fd*1.6, fd*4.2);
    topH = top; var sl = 1e9; meshes.forEach(function(o){ if(o.userData.cat === 'dalle'){ var b2 = new THREE.Box3().setFromObject(o); sl = Math.min(sl, b2.max.y); } }); baseH = (sl < 1e8 ? sl : .3) + .02;
    cuts = (cfg.cuts && cfg.cuts.length) ? cfg.cuts.slice() : (top > 5.2 ? [1.4, etY + 1.4] : [Math.max(1.2, Math.min(1.4, top*.5))]);
    M.cuts = cuts; cutsSaved = null;   /* [Coupe réglable 29/10] nouvelle maquette : hauteurs de référence relues */
    /* matériaux découpables */
    var seen = [];
    root.traverse(function(o){ if(o.isMesh && seen.indexOf(o.material) < 0){ seen.push(o.material); o.material.clippingPlanes = (o.material === MAT.wall) ? [plane, growPl] : [plane]; o.material.clipShadows = true; } });
    /* pastilles : celles du projet, sinon automatiques d'après les noms de calques */
    var list = (cfg.spots && cfg.spots.length) ? cfg.spots : autoSpots(named);
    var layer = host.querySelector('.h3-layer');
    list.forEach(function(s){
      var z = null; zones.forEach(function(q){ if(q.id === s.id) z = q; }); if(!z) return;
      var m = s.m || z.m; if(m === 'room') m = 'in';
      var p = new THREE.Vector3(s.p[0], s.p[1], s.p[2]);
      var n = s.n ? new THREE.Vector3(s.n[0], s.n[1], s.n[2]) : new THREE.Vector3(p.x-ctr.x, 0, p.z-ctr.z);
      if(n.lengthSq() < 1e-6) n.set(0,1,0); n.normalize();
      var el = document.createElement('div'); el.className = 'h3-sp'; el.setAttribute('data-z', s.id);
      el.innerHTML = '<button class="h3-dot" type="button" aria-label="'+z.t+'"></button><span class="h3-line"></span><button class="h3-lab" type="button"><b>'+z.t+'</b><small></small><em>Toucher pour choisir ›</em></button>';
      layer.appendChild(el);
      var key = s.id + (spots[s.id] ? '_' + Object.keys(spots).length : '');
      spots[key] = { el:el, z:z, p:p, n:n, m:m, fl:(s.fl|0) };
      el.querySelector('.h3-dot').addEventListener('click', function(ev){ ev.stopPropagation(); activate(key); });
      el.querySelector('.h3-lab').addEventListener('click', function(ev){ ev.stopPropagation(); onPick(z.id); });
    });
    var o = overviewPose(); camera.position.copy(o.p); controls.target.copy(o.t);
    controls.minDistance = Math.max(2, size.length()*.12); controls.maxDistance = size.length()*3.2;
    var L = scene.getObjectByName('px-sun'); if(L){ var e = Math.max(size.x, size.z)*.9 + 6; L.shadow.camera.left = -e; L.shadow.camera.right = e; L.shadow.camera.top = e; L.shadow.camera.bottom = -e; L.shadow.camera.far = size.length()*4 + 60; L.shadow.camera.updateProjectionMatrix(); L.position.set(ctr.x + size.length()*.8, size.length()*1.1, ctr.z + size.length()*.5); L.target.position.copy(ctr); L.target.updateMatrixWorld(); }
    MAT.ghost.clippingPlanes = [plane]; applyLook();
    updFl(); applyStates(); dirty = true; kick();
  }
  function autoSpots(named){
    var out = [];
    Object.keys(named).forEach(function(id){
      var b = new THREE.Box3(); named[id].forEach(function(o){ b.expandByObject(o); }); var c = b.getCenter(new THREE.Vector3());
      var p = [c.x, c.y, c.z], n = null;
      if(id === 'couverture'){ p = [c.x, b.max.y, c.z]; n = [0,1,0]; }
      else if(id === 'plancher'){ p = [b.max.x, b.max.y, c.z]; }
      else { var d = new THREE.Vector3(c.x-ctr.x, 0, c.z-ctr.z); if(d.lengthSq() > .01){ d.normalize(); p = [c.x + d.x*(b.max.x-b.min.x)*.5, Math.max(1.1, Math.min(c.y, 2.4)), c.z + d.z*(b.max.z-b.min.z)*.5]; } }
      out.push({ id:id, p:p, n:n, m:'out' });
    });
    return out;
  }
  function activate(key){
    var s = spots[key]; if(!s) return;
    if(forceId === key){ onPick(s.z.id); return; }
    forceId = key; dirty = true; kick();
    var d = camera.position.clone().sub(controls.target), len = Math.max(d.length()*.62, controls.minDistance*1.6);
    var tg = s.p.clone(); d.normalize().multiplyScalar(len); fly(tg.clone().add(d), tg, 700);
  }
  function placeSpots(){
    if(!host) return;
    var w = host.clientWidth, h = host.clientHeight, cand = [];
    Object.keys(spots).forEach(function(k){
      var s = spots[k], el = s.el;
      var show = stage == null && (s.m === mode) && (mode === 'out' || s.fl === floorI);
      v3.copy(s.p).project(camera);
      var behind = v3.z > 1;
      cd.copy(camera.position).sub(mp.copy(s.p)); var dist = cd.length();
      var facing = cd.normalize().dot(mn.copy(s.n)) > .12;
      if(!show || behind){ el.style.display = 'none'; return; }
      el.style.display = '';
      var sx = (v3.x*.5+.5)*w, sy = (-v3.y*.5+.5)*h;
      el.style.transform = 'translate('+sx.toFixed(1)+'px,'+sy.toFixed(1)+'px)';
      el.classList.toggle('back', !facing); el.classList.toggle('flip', sy < 110);
      s.sx = sx; el.style.zIndex = String(1000 - Math.round(dist));
    });
    Object.keys(spots).forEach(function(k){ var s = spots[k], o = (forceId === k && s.el.style.display !== 'none'); s.el.classList.toggle('open', o);
      if(o){ var lab = s.el.querySelector('.h3-lab'), lw = lab.offsetWidth, x = s.sx - lw/2, nx = Math.max(8, Math.min(x, w - 8 - lw)); lab.style.marginLeft = (nx - x).toFixed(0) + 'px'; } });
  }
  function applyStates(){
    Object.keys(spots).forEach(function(k){
      var s = spots[k], st = states[s.z.id] || {};
      s.el.classList.toggle('done', st.state === 'done'); s.el.classList.toggle('imp', st.state === 'imposed');
      s.el.setAttribute('data-state', st.state || '');   /* [Moteur partagé] état exposé en attribut : le Chantier colore ses pastilles (à faire / en cours / fait / réserve) */
      var sm = s.el.querySelector('small'); if(sm) sm.textContent = st.sub || '';
    });
    dirty = true; kick();
  }
  /* [Coupe réglable 29/10] en vue intérieure : niveaux (si plusieurs) + hauteur de coupe ▼ ▲ par pas de 10 cm.
     Tout le monde peut régler sa vue ; Phénix peut « Enregistrer » la hauteur pour ce projet (fiche.maquette.cuts). */
  var cutsSaved = null;
  function cutTxt(v){ return (Math.round(v*100)/100).toFixed(2).replace('.', ',') + ' m'; }
  function cutMove(d){
    var i = Math.min(floorI, cuts.length-1), lo = (i > 0 ? cuts[i-1] + .3 : baseH + .15), hi = (i < cuts.length-1 ? cuts[i+1] - .3 : topH + .3);
    cuts[i] = Math.max(lo, Math.min(hi, Math.round((cuts[i] + d)*10)/10)); M.cuts = cuts; applyCut(); updFl();
  }
  function cutSave(){
    var P = window.PXC; if(!P || !P.S || !P.S.owner || !P.saveFiche) return;
    var m = P.S.fiche.maquette = P.S.fiche.maquette || {}; m.cuts = cuts.map(function(x){ return Math.round(x*100)/100; });
    if(M.cfg) M.cfg.cuts = m.cuts.slice(); cutsSaved = m.cuts.join('|'); P.S.dirty = true; P.saveFiche();
    try{ if(P.logJ) P.logJ('fiche', 'Hauteur de coupe de la maquette réglée : ' + m.cuts.map(cutTxt).join(' / ') + '.'); }catch(x){}
    updFl();
  }
  function updFl(){
    if(!flb) return;
    if(cutsSaved == null) cutsSaved = cuts.map(function(x){ return Math.round(x*100)/100; }).join('|');
    flb.style.display = (mode === 'in') ? 'flex' : 'none'; flb.style.flexWrap = 'wrap'; flb.style.alignItems = 'stretch'; flb.style.background = '#fff';
    var names = ['RDC','Étage','Étage 2','Étage 3'], i = Math.min(floorI, cuts.length-1);
    var P = window.PXC, own = !!(P && P.S && P.S.owner), chg = cuts.map(function(x){ return Math.round(x*100)/100; }).join('|') !== cutsSaved;
    var B = 'border:0;padding:9px 12px;font:600 13px system-ui,sans-serif;cursor:pointer;background:#fff;color:#1f2a44;';
    var h = (cuts.length > 1 ? cuts.map(function(c,k){ return '<button type="button" data-f="'+k+'" aria-pressed="'+(k===i)+'">'+(names[k]||('Niv. '+k))+'</button>'; }).join('') : '') +
      '<span style="'+B+'cursor:default;border-left:'+(cuts.length > 1 ? '1px solid #d6deea' : '0')+';font-weight:500">Coupe</span>' +
      '<button type="button" data-c="-1" aria-label="Descendre la coupe de 10 cm" title="Descendre la coupe">▼</button>' +
      '<span style="'+B+'cursor:default;min-width:64px;text-align:center;font-variant-numeric:tabular-nums" aria-live="polite">'+cutTxt(cuts[i])+'</span>' +
      '<button type="button" data-c="1" aria-label="Monter la coupe de 10 cm" title="Monter la coupe">▲</button>' +
      (own && chg ? '<button type="button" data-s="1" title="Garder cette hauteur de coupe pour ce projet" style="">Enregistrer</button>' : '');
    flb.innerHTML = h;
    [].forEach.call(flb.querySelectorAll('button'),function(b){
      var f = b.getAttribute('data-f'), on = f != null && +f === i, sv = b.getAttribute('data-s');
      b.style.cssText = B + (on ? 'background:#1f2a44;color:#fff;' : '') + (sv ? 'background:#4da3f0;color:#0a1628;border-left:1px solid #d6deea;' : '');
      b.addEventListener('click',function(ev){ ev.stopPropagation(); if(f != null) setFloor(+f); else if(sv) cutSave(); else cutMove(+b.getAttribute('data-c') * .1); });
    });
  }
  function applyCut(){
    var inside = (mode === 'in'), st = stage, keep = !!(M.cfg && M.cfg.keepMaterials);
    plane.constant = inside ? cuts[Math.min(floorI, cuts.length-1)] : 999;
    meshes.forEach(function(o){
      var c = o.userData.cat, v = true, mat = null;
      if(st != null){ /* [Atelier] étape d'apparition par catégorie (réglable dans l'Atelier) */
        var need = stOf(c);
        if(c === 'terr' || c === 'ground' || need <= 0) v = true;
        else if(c === 'roof'){ v = st >= Math.min(need, stOf('charpente')); mat = st >= need ? MAT.roof : MAT.ghost; }
        else v = st >= need;
      } else if(c === 'roof') mat = MAT.roof;
      if(c === 'roof' && inside) v = false;
      o.visible = v; if(mat && !keep) o.material = mat;
    });
    dirty = true; kick();
  }
  function stOf(c){ var s = M.cfg && M.cfg.stages && M.cfg.stages[c]; if(s != null) return s; var d = (window.PXCATS || []).filter(function(x){ return x[0] === c; })[0]; return d ? d[2] : 6; }
  function applyLook(){
    if(!MAT.wall || (M.cfg && M.cfg.keepMaterials)) return; var l = M._look || {};
    var N = { wall:0xf4f6fa, roof:0xdfe5ee, frame:0x9fb2c6, door:0xb9c6da, gate:0xb9c6da, allee:0xc6cedc }, CC = (M.cfg && M.cfg.colors) || {};
    Object.keys(N).forEach(function(k){ if(CC[k] != null) N[k] = CC[k]; });
    Object.keys(N).forEach(function(k){ if(MAT[k]) MAT[k].color.setHex(l[k] != null ? l[k] : N[k]); });
    if(l.wallTex === 'brique') MAT.wall.color.setHex(0xffffff);
    dirty = true; kick();
  }
  function setFloor(i){ floorI = Math.max(0, Math.min(cuts.length-1, i)); forceId = null; applyCut(); updFl(); }
  function setMode(m){
    if(m === 'room') m = 'in'; if(m !== 'in') m = 'out';
    mode = m; forceId = null; host.setAttribute('data-mode', mode);
    if(m === 'in'){ floorI = 0; } applyCut(); updFl();
    var o = (m === 'in') ? inPose() : overviewPose(); fly(o.p, o.t, 900);
  }
  function resize(){
    if(!host || !renderer) return; var w = host.clientWidth || 600, h = host.clientHeight || 420;
    renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix(); dirty = true; kick();
  }
  function frame(now){
    loopOn = false; if(!active) return;
    var busy = false;
    if(growAnim){ var tg = Math.min(1, (now-growAnim.t0)/700); growH = growAnim.a + (growAnim.b-growAnim.a)*ease(tg); growPl.constant = growH; busy = true; dirty = true; if(tg >= 1){ growH = growAnim.b >= topH + 1 ? 999 : growAnim.b; growPl.constant = growH; growAnim = null; } }
    if(anim){ var t = Math.min(1, (now-anim.t0)/anim.ms), e = ease(t); camera.position.lerpVectors(anim.p0, anim.p1, e); controls.target.lerpVectors(anim.t0v, anim.t1, e); if(t >= 1) anim = null; busy = true; dirty = true; }
    var moved = controls.update(); if(moved) dirty = true;
    if(dirty){ renderer.render(scene, camera); placeSpots(); dirty = false; if(moved || busy){ loopOn = true; requestAnimationFrame(frame); } }
  }
  function pickAt(cx, cy){
    var r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx-r.left)/r.width)*2-1, -((cy-r.top)/r.height)*2+1); ray.setFromCamera(ndc, camera);
    var best = null, bd = 1e9;
    Object.keys(spots).forEach(function(k){ var s = spots[k]; if(s.el.style.display === 'none') return; var dx = (s.sx||0) - (cx-r.left); if(Math.abs(dx) < 1e9){ v3.copy(s.p).project(camera); var sy = (-v3.y*.5+.5)*r.height, d = Math.hypot(dx, sy-(cy-r.top)); if(d < 28 && d < bd){ bd = d; best = k; } } });
    if(best){ activate(best); return true; } return false;
  }

  M.init = function(el, zs, pick){
    if(M.ready) return; host = el; zones = zs; onPick = pick;
    try{ renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false, powerPreference:'high-performance' }); }
    catch(e){ try{ renderer = new THREE.WebGLRenderer({ antialias:false, alpha:false }); } catch(e2){ window.dispatchEvent(new Event('px3d-fail')); return; } }
    var small = Math.min(window.innerWidth, window.innerHeight) < 700;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, small ? 1.5 : 2));
    renderer.localClippingEnabled = true; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0a1628, 1);
    var cv = renderer.domElement; cv.className = 'h3-cv'; cv.setAttribute('aria-label','Maquette 3D de votre projet'); cv.setAttribute('role','img'); host.appendChild(cv);
    var layer = document.createElement('div'); layer.className = 'h3-layer'; host.appendChild(layer);
    ldr = document.createElement('div'); ldr.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:600 14px system-ui,sans-serif;color:#1f2a44;pointer-events:none;z-index:5'; ldr.textContent = 'Chargement de votre maquette…'; host.appendChild(ldr);
    flb = document.createElement('div'); flb.style.cssText = 'position:absolute;left:12px;top:54px;display:none;z-index:6;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.4);pointer-events:auto'; host.appendChild(flb);
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a1628);
    camera = new THREE.PerspectiveCamera(38, 1.4, .1, 600);
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x1c2a44, 1.0));
    var sun = new THREE.DirectionalLight(0xffe7c4, 2.3); sun.name = 'px-sun'; sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .05;
    sun.position.set(14,18,10); scene.add(sun); scene.add(sun.target);
    controls = new OrbitControls(camera, cv); controls.enableDamping = true; controls.dampingFactor = .08; controls.maxPolarAngle = Math.PI/2 - .03; controls.screenSpacePanning = false;
    controls.addEventListener('change', function(){ dirty = true; kick(); });
    controls.addEventListener('start', function(){ anim = null; forceId = null; dirty = true; kick(); if(!M._touched){ M._touched = true; window.dispatchEvent(new Event('px3d-touch')); } var t = document.getElementById('h3-hint'); if(t) t.style.display = 'none'; });
    resize(); if(window.ResizeObserver) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);
    var down = null;
    cv.addEventListener('pointerdown', function(ev){ down = { x:ev.clientX, y:ev.clientY, t:performance.now() }; });
    cv.addEventListener('pointerup', function(ev){ if(!down) return; var mv = Math.hypot(ev.clientX-down.x, ev.clientY-down.y), dt = performance.now()-down.t; down = null;
      if(mv < 7 && dt < 600){ if(!pickAt(ev.clientX, ev.clientY) && forceId){ forceId = null; dirty = true; kick(); } } });
    cv.addEventListener('webglcontextlost', function(ev){ ev.preventDefault(); });
    cv.addEventListener('webglcontextrestored', function(){ dirty = true; kick(); });
    document.addEventListener('visibilitychange', function(){ if(!document.hidden){ dirty = true; kick(); } });
    M.ready = true;
    Promise.resolve(M.loader ? M.loader() : null).then(function(buf){
      if(!buf) throw new Error('modèle absent');
      return new Promise(function(ok, ko){ new GLTFLoader().parse(buf, '', ok, ko); });
    }).then(function(g){ prepare(g); if(ldr){ ldr.remove(); ldr = null; } renderer.render(scene, camera); placeSpots(); window.dispatchEvent(new Event('px3d-model-ok')); })
      .catch(function(e){ try{ console.error('PXMODEL '+(e&&e.message||e)); }catch(_){} window.dispatchEvent(new Event('px3d-fail')); });
  };
  M.setLook = function(l){ M._look = l; applyLook(); };
  M.setStage = function(n){
    if(!(M.ready && root)) return; var prev = stage; stage = (n == null) ? null : n;
    var tgt = stage == null ? 999 : stage < 6 ? baseH : stage >= 9 ? 999 : baseH + (topH - baseH)*((stage-5)/4);
    var a = growH >= 999 ? topH + 5 : growH, b = tgt >= 999 ? topH + 5 : tgt;
    growAnim = { a:a, b:b, t0:performance.now() }; if(prev == null){ growH = a; growPl.constant = a; }
    forceId = null;
    var wantIn = stage != null && stage >= 16;
    if(wantIn && mode !== 'in'){ stageIn = true; setMode('in'); }
    else if(!wantIn && stageIn){ stageIn = false; setMode('out'); }
    else if(prev == null && stage != null && mode === 'out'){ var o = overviewPose(); fly(o.p, o.t, 800); }
    applyCut(); dirty = true; kick();
  };
  M.setSun = function(){}; M.vent = function(){ if(M.ready) setMode('in'); };
  M.setActive = function(on){ active = !!on; if(on){ resize(); dirty = true; kick(); } };
  M.update = function(s){ states = s || {}; if(M.ready) applyStates(); };
  M.room = function(){}; M.setMode = function(m){ if(M.ready && root) setMode(m); }; M.getMode = function(){ return mode; };
  M.coupe = function(){ if(M.ready && root) setMode('in'); };
  M.overview = function(){ if(!(M.ready && root)) return; forceId = null; var o = (mode === 'in') ? inPose() : overviewPose(); fly(o.p, o.t, 800); };
  M.focus = function(id){ if(!(M.ready && root)) return; Object.keys(spots).forEach(function(k){ if(spots[k].z.id === id){ if(spots[k].m !== mode) setMode(spots[k].m); activate(k); } }); };
  M.views = function(){ return (M.cfg && M.cfg.views) || []; };
  M.goView = function(id){ if(!(M.ready && root)) return; var v = M.views().filter(function(x){ return x.id === id; })[0]; if(v) fly(new THREE.Vector3(v.p[0],v.p[1],v.p[2]), new THREE.Vector3(v.tg[0],v.tg[1],v.tg[2]), 900); };
  M.zoomIn = function(f){ if(!M.ready) return; var d = camera.position.clone().sub(controls.target); d.multiplyScalar(f); camera.position.copy(controls.target).add(d); dirty = true; kick(); };
  window.PXModel = M;
  window.dispatchEvent(new Event('px3dm-ready'));
})();
