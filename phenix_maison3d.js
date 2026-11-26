/* ═════════════════════════════════════════════════════════════════
   phenix_maison3d.js — MAISON TYPE EN 3D PARTAGÉE (PXHouse) — 25/11/2026
   La maison blanche générique du carnet, quand le dossier n'a pas encore sa maquette ArchiCAD.
   Extraite telle quelle de phenix_carnet.html pour être écrite UNE seule fois : chargée par le
   carnet (Atelier) et par l'espace client (Mon carnet). Même API que PXModel (phenix_maquette3d.js) :
   init(el, zones, pick), update(états), setLook(teintes), setActive, setMode, focus, overview…
   Prérequis de la page hôte : <script type="importmap"> pour « three » (0.160) et « three/addons/ ».
   ═════════════════════════════════════════════════════════════════ */
/* Maquette 3D interactive — maison blanche générique (three.js) */
(async function(){
  var THREE, OrbitControls;
  try{
    THREE = await import('three');
    OrbitControls = (await import('three/addons/controls/OrbitControls.js')).OrbitControls;
  }catch(e1){
    try{ /* navigateurs sans « import map » : versions regroupées par le CDN */
      THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/+esm');
      OrbitControls = (await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js/+esm')).OrbitControls;
    }catch(e2){ window.dispatchEvent(new Event('px3d-fail')); return; }
  }

  var H = { ready:false };
  var gndM = null, slabM = null, videL = [], riseL = [], videY = 0, videWant = false, videAnim = null;
  var host, renderer, scene, camera, controls, wallsG, roofG, interiorG, pacG, outG, spots = {}, zones = [], onPick = function(){};
  var stage = null, riseK = 1, rise = null, forceId = null;
  var etG = null, vmcG = null, floorUp = false, ETY = 2.8, flb = null;
  var mode = 'out', active = false, dirty = true, anim = null, loopOn = false, wallK = 1, roofOp = 1;
  var states = {};
  var up = new THREE.Vector3(0,1,0);
  var NS = 25, wallH = 99, wallTo = 99, clipPl = new THREE.Plane(new THREE.Vector3(0,-1,0), 99), partsIn = false;
  var workG, workers = [], diggerG = null, boomP = null, wallInRaw = false, lookWallIn = 0xf4f6fa;
  function canvasTex(draw,w,h,rx,ry){
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'),w,h);
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx,ry);
    if(THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  var TEXB = canvasTex(function(c,w,h){ c.fillStyle='#fff'; c.fillRect(0,0,w,h); c.strokeStyle='#8f9bb0'; c.lineWidth=3;
    for(var r=0;r<5;r++){ var y=r*h/5; c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke();
      var off=(r%2)*w/4; for(var k=0;k<3;k++){ var x=off+k*w/2; c.beginPath(); c.moveTo(x,y); c.lineTo(x,y+h/5); c.stroke(); } } },256,256,1,1);
  var TEXT = canvasTex(function(c,w,h){ c.fillStyle='#fff'; c.fillRect(0,0,w,h); c.strokeStyle='#a9b4c6'; c.lineWidth=3;
    c.beginPath(); c.moveTo(0,1); c.lineTo(w,1); c.moveTo(0,h/2); c.lineTo(w,h/2); c.stroke();
    c.beginPath(); c.moveTo(w/2,0); c.lineTo(w/2,h/2); c.moveTo(0,h/2); c.lineTo(0,h); c.moveTo(w,h/2); c.lineTo(w,h); c.stroke(); },64,64,33,7.5);


  /* ---------- textures de matières (motifs volontairement marqués pour bien ressortir) ---------- */
  function rnd(seed){ var s = seed>>>0; return function(){ s = (s*1664525+1013904223)>>>0; return s/4294967296; }; }
  var TXC = {};
  function matTex(key){
    if(TXC[key]) return TXC[key];
    var d = null;
    if(key === 'bardage'){            /* lames de bois verticales, rainures profondes, fil du bois */
      d = { bs:2.2, t:canvasTex(function(c,w,h){ var r = rnd(7), n = 6, bw = w/n; c.fillStyle='#eee'; c.fillRect(0,0,w,h);
        for(var i=0;i<n;i++){ var tone = 226+Math.floor(r()*26); c.fillStyle='rgb('+tone+','+tone+','+tone+')'; c.fillRect(i*bw,0,bw,h);
          for(var k=0;k<34;k++){ var x = i*bw+r()*bw; c.strokeStyle='rgba(70,48,22,'+(.06+r()*.14).toFixed(2)+')'; c.lineWidth=1+r()*2; c.beginPath(); c.moveTo(x,0); c.lineTo(x+(r()-.5)*8,h); c.stroke(); }
          c.fillStyle='rgba(30,20,8,.9)'; c.fillRect(i*bw-3,0,7,h); c.fillStyle='rgba(255,255,255,.5)'; c.fillRect(i*bw+5,0,3,h); } },512,512,1,1) };
    } else if(key === 'enduitf' || key === 'enduitg'){   /* enduit : mouchetis et grain exagérés */
      var big = key === 'enduitg';
      d = { bs: big ? 1.0 : .7, t:canvasTex(function(c,w,h){ var r = rnd(big?31:11); c.fillStyle='#ececec'; c.fillRect(0,0,w,h);
        for(var i=0;i<(big?120:180);i++){ var x=r()*w,y=r()*h,rad=(big?9:6)+r()*(big?26:16); c.fillStyle = r()<.5 ? 'rgba(120,120,120,.05)' : 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(x,y,rad,0,6.3); c.fill(); }
        for(var j=0;j<(big?380:520);j++){ var x2=r()*w,y2=r()*h,r2=1.5+r()*(big?4:3); c.fillStyle='rgba(90,90,90,'+(.06+r()*.10).toFixed(2)+')'; c.beginPath(); c.arc(x2,y2,r2,0,6.3); c.fill(); } },512,512, big?.35:.5, big?.35:.5) };
    } else if(key === 'pierre'){      /* pierre de taille irrégulière, tons clairs et joints creux */
      d = { bs:3.4, t:canvasTex(function(c,w,h){ var r = rnd(17); c.fillStyle='#8c8c8e'; c.fillRect(0,0,w,h); var y=0; while(y<h){ var rh=44+r()*40, x=-r()*60; while(x<w){ var bw=60+r()*90, t=222+Math.floor(r()*30); c.fillStyle='rgb('+t+','+t+','+(t-3)+')'; c.beginPath(); c.roundRect(x+3,y+3,bw-6,rh-6,5+r()*8); c.fill(); x+=bw; } y+=rh; } },512,512,1,1) };
    } else if(key === 'brique'){      /* briques apparentes : couleurs cuites dans la texture, joints clairs */
      d = { bs:2.0, t:canvasTex(function(c,w,h){ var r = rnd(5), rows=13, rh=h/rows, bl=w/4; c.fillStyle='#e6dcc8'; c.fillRect(0,0,w,h);
        for(var j=0;j<rows;j++){ var off=(j%2)*bl/2; for(var i=-1;i<5;i++){ var hh=14+Math.floor(r()*6), li=40+Math.floor(r()*14), ss=44+Math.floor(r()*14);
          c.fillStyle='hsl('+hh+','+ss+'%,'+li+'%)'; c.fillRect(i*bl+off+3,j*rh+3,bl-6,rh-6);
          c.fillStyle='rgba(0,0,0,.12)'; c.fillRect(i*bl+off+3,j*rh+rh-8,bl-6,5); } }
        for(var k=0;k<1600;k++){ c.fillStyle='rgba(30,10,0,'+(r()*.18).toFixed(2)+')'; c.fillRect(r()*w,r()*h,2+r()*3,2); } },512,512,1,1) };
    } else if(key === 'terre'){       /* tuile terre cuite à emboîtement : côtes, recouvrement net */
      d = { bs:2.6, t:canvasTex(function(c,w,h){ var g = c.createLinearGradient(0,0,0,h); g.addColorStop(0,'#9a9a9a'); g.addColorStop(.18,'#e8e8e8'); g.addColorStop(.85,'#fafafa'); g.addColorStop(1,'#bcbcbc'); c.fillStyle=g; c.fillRect(0,0,w,h);
        c.fillStyle='#555'; c.fillRect(0,h-12,w,12);
        c.fillStyle='rgba(0,0,0,.55)'; c.fillRect(0,0,9,h); c.fillRect(w-9,0,9,h);
        c.fillStyle='rgba(255,255,255,.55)'; c.fillRect(w*.30,10,w*.4,h-26); c.fillStyle='rgba(0,0,0,.25)'; c.fillRect(w*.30-5,10,5,h-26); c.fillRect(w*.7,10,5,h-26); },128,128,44,13.5) };
    } else if(key === 'beton'){       /* tuile béton : plus large, plate, rainures fines */
      d = { bs:1.8, t:canvasTex(function(c,w,h){ var g = c.createLinearGradient(0,0,0,h); g.addColorStop(0,'#b0b0b0'); g.addColorStop(.2,'#e4e4e4'); g.addColorStop(1,'#f2f2f2'); c.fillStyle=g; c.fillRect(0,0,w,h);
        c.fillStyle='#606060'; c.fillRect(0,h-9,w,9); c.fillStyle='rgba(0,0,0,.5)'; c.fillRect(0,0,6,h); c.fillStyle='rgba(255,255,255,.5)'; c.fillRect(6,0,3,h);
        c.fillStyle='rgba(0,0,0,.35)'; c.fillRect(w*.5-3,14,6,h-30); },128,128,38,13.5) };
    } else if(key === 'ardoise'){     /* ardoise : rangs décalés, joints sombres, nuances */
      d = { bs:2.4, t:canvasTex(function(c,w,h){ var r = rnd(19), ch=h/2, sw=w/2; c.fillStyle='#222'; c.fillRect(0,0,w,h);
        for(var j=0;j<2;j++){ var off=(j%2)*sw/2; for(var i=-1;i<3;i++){ var t=170+Math.floor(r()*70); c.fillStyle='rgb('+t+','+t+','+(t+6)+')'; c.fillRect(i*sw+off+3,j*ch+2,sw-6,ch-12);
            c.fillStyle='rgba(255,255,255,.18)'; c.fillRect(i*sw+off+3,j*ch+2,sw-6,3); } } },256,256,22,10.5) };
    } else if(key === 'bac'){          /* bac acier : joints debout réguliers dans le sens de la pente */
      d = { bs:2.0, t:canvasTex(function(c,w,h){ var g = c.createLinearGradient(0,0,w,0); g.addColorStop(0,'#f6f6f6'); g.addColorStop(.5,'#dedede'); g.addColorStop(1,'#f6f6f6'); c.fillStyle=g; c.fillRect(0,0,w,h);
        c.fillStyle='#4a4a4a'; c.fillRect(0,0,10,h); c.fillStyle='#ffffff'; c.fillRect(10,0,6,h); c.fillStyle='rgba(0,0,0,.25)'; c.fillRect(w*.5-3,0,6,h); },128,16,39,1) };
    } else if(key === 'plate'){       /* tuile plate : petits écailles rectangulaires à bout arrondi, recouvrement serré */
      d = { bs:3.0, t:canvasTex(function(c,w,h){ var r = rnd(23); c.fillStyle='#2e2e2e'; c.fillRect(0,0,w,h);
        for(var j=0;j<2;j++){ var off=j*32, y0=j*64;
          for(var i=-1;i<3;i++){ var x=i*64+off, tn=196+Math.floor(r()*52);
            c.beginPath(); c.moveTo(x+3,y0); c.lineTo(x+61,y0); c.lineTo(x+61,y0+50); c.quadraticCurveTo(x+32,y0+74,x+3,y0+50); c.closePath();
            var g=c.createLinearGradient(0,y0,0,y0+64); g.addColorStop(0,'rgb('+(tn-60)+','+(tn-60)+','+(tn-60)+')'); g.addColorStop(.25,'rgb('+tn+','+tn+','+tn+')'); g.addColorStop(1,'rgb('+(tn-30)+','+(tn-30)+','+(tn-30)+')'); c.fillStyle=g; c.fill(); } } },128,128,32,18) };
    } else if(key === 'canal'){       /* tuile canal : demi-cylindres creux / couvrants en alternance */
      d = { bs:3.4, t:canvasTex(function(c,w,h){ var r = rnd(29); c.fillStyle='#bdbdbd'; c.fillRect(0,0,w,h);
        for(var j=0;j<2;j++){ var y0=j*128, tn=(j?-14:0);
          for(var k=0;k<2;k++){ var x0=k*64, g=c.createLinearGradient(x0,0,x0+64,0);
            if(k===0){ g.addColorStop(0,'rgb('+(200+tn)+','+(200+tn)+','+(200+tn)+')'); g.addColorStop(.5,'rgb('+(70+tn)+','+(70+tn)+','+(70+tn)+')'); g.addColorStop(1,'rgb('+(200+tn)+','+(200+tn)+','+(200+tn)+')'); }
            else { g.addColorStop(0,'rgb('+(110+tn)+','+(110+tn)+','+(110+tn)+')'); g.addColorStop(.3,'rgb('+(250+tn)+','+(250+tn)+','+(250+tn)+')'); g.addColorStop(.7,'rgb('+(250+tn)+','+(250+tn)+','+(250+tn)+')'); g.addColorStop(1,'rgb('+(110+tn)+','+(110+tn)+','+(110+tn)+')'); }
            c.fillStyle=g; c.fillRect(x0,y0,64,128);
            c.fillStyle='rgba(0,0,0,.55)'; c.fillRect(x0,y0+(k?112:0),64,k?16:8); } } },128,256,32,8.6) };
    } else if(key === 'al_gravier'){   /* gravier stabilisé en alvéoles */
      d = { bs:2.4, t:canvasTex(function(c,w,h){ var r = rnd(61); c.fillStyle='#b9ad98'; c.fillRect(0,0,w,h);
        for(var i=0;i<1500;i++){ var tn=120+Math.floor(r()*110); c.fillStyle='rgb('+tn+','+(tn-6)+','+(tn-16)+')'; c.beginPath(); c.arc(r()*w,r()*h,1.2+r()*2.8,0,6.3); c.fill(); }
        c.strokeStyle='rgba(55,55,55,.6)'; c.lineWidth=3; for(var k=0;k<=4;k++){ c.beginPath(); c.moveTo(0,k*h/4); c.lineTo(w,k*h/4); c.stroke(); c.beginPath(); c.moveTo(k*w/4,0); c.lineTo(k*w/4,h); c.stroke(); } },256,256,1,1) };
    } else if(key === 'al_enrobe'){    /* enrobé : grain fin noir */
      d = { bs:1.8, t:canvasTex(function(c,w,h){ var r = rnd(62); c.fillStyle='#43464c'; c.fillRect(0,0,w,h);
        for(var i=0;i<3200;i++){ var tn=60+Math.floor(r()*110); c.fillStyle='rgba('+tn+','+tn+','+(tn+4)+','+(.35+r()*.5).toFixed(2)+')'; c.beginPath(); c.arc(r()*w,r()*h,.6+r()*1.7,0,6.3); c.fill(); } },256,256,1,1) };
    } else if(key === 'al_beton'){     /* béton balayé : stries et joints de retrait */
      d = { bs:1.0, t:canvasTex(function(c,w,h){ var r = rnd(63); c.fillStyle='#bdbfc3'; c.fillRect(0,0,w,h);
        for(var i=0;i<120;i++){ c.strokeStyle='rgba('+(r()<.5?'255,255,255':'80,80,85')+','+(.06+r()*.12).toFixed(2)+')'; c.lineWidth=1+r()*2; var y=r()*h; c.beginPath(); c.moveTo(0,y); c.lineTo(w,y+(r()-.5)*4); c.stroke(); }
        c.strokeStyle='#6f7278'; c.lineWidth=5; c.strokeRect(0,0,w,h); },256,256,1,1) };
    } else if(key === 'al_paves'){     /* pavés béton : appareil à joints décalés */
      d = { bs:1.8, t:canvasTex(function(c,w,h){ var r = rnd(64); c.fillStyle='#2f2f31'; c.fillRect(0,0,w,h); var rows=12, rh=h/rows, pw=w/6;
        for(var j=0;j<rows;j++){ var off=(j%2)*pw/2; for(var i=-1;i<7;i++){ var l=44+Math.floor(r()*14), hh=16+Math.floor(r()*10); c.fillStyle='hsl('+hh+',16%,'+l+'%)'; c.fillRect(i*pw+off+2,j*rh+2,pw-4,rh-4); } } },256,256,1,1) };
    } else if(key === 'al_gazon'){     /* dalles alvéolées engazonnées */
      d = { bs:1.2, t:canvasTex(function(c,w,h){ var r = rnd(65); c.fillStyle='#5f8d4b'; c.fillRect(0,0,w,h);
        for(var i=0;i<900;i++){ c.fillStyle='hsl('+(90+Math.floor(r()*30))+','+(35+Math.floor(r()*20))+'%,'+(26+Math.floor(r()*20))+'%)'; c.fillRect(r()*w,r()*h,1.5+r()*2,3+r()*4); }
        c.strokeStyle='#a6a69f'; c.lineWidth=5; for(var a=0;a<=2;a++){ c.beginPath(); c.moveTo(0,a*h/2); c.lineTo(w,a*h/2); c.stroke(); c.beginPath(); c.moveTo(a*w/2,0); c.lineTo(a*w/2,h); c.stroke(); }
        c.strokeStyle='rgba(150,150,145,.8)'; c.lineWidth=2.5; for(var q=1;q<8;q++){ c.beginPath(); c.moveTo(0,q*h/8); c.lineTo(w,q*h/8); c.stroke(); c.beginPath(); c.moveTo(q*w/8,0); c.lineTo(q*w/8,h); c.stroke(); } },256,256,1,1) };
    } else if(key === 'carr120' || key === 'carr60'){   /* carrelage : joints nets, légères veines */
      var nx = key==='carr120' ? 2 : 2, ny = key==='carr120' ? 1 : 2;
      d = { bs:.8, t:canvasTex(function(c,w,h){ var r = rnd(key==='carr120'?41:43); c.fillStyle='#7d8493'; c.fillRect(0,0,w,h); var tw=w/nx, th=h/ny;
        for(var i=0;i<nx;i++) for(var j=0;j<ny;j++){ var tn=222+Math.floor(r()*20); c.fillStyle='rgb('+tn+','+tn+','+(tn+3)+')'; c.fillRect(i*tw+3,j*th+3,tw-6,th-6);
          for(var v=0;v<5;v++){ c.strokeStyle='rgba(120,125,140,'+(.05+r()*.1).toFixed(2)+')'; c.lineWidth=1+r()*2; c.beginPath(); var x=i*tw+r()*tw,y=j*th+r()*th; c.moveTo(x,y); c.bezierCurveTo(x+r()*60-30,y+r()*60-30,x+r()*60-30,y+r()*60-30,x+r()*80-40,y+r()*80-40); c.stroke(); } } },256,256,1,1) };
    } else if(key === 'parquet' || key === 'strat' || key === 'lvt' || key === 'carrb'){   /* lames : joints, bouts décalés, fil du bois */
      var rows = key==='parquet' ? 8 : 6, H0 = key==='parquet'?28:(key==='lvt'?44:40);
      d = { bs: key==='lvt'?.5:1.1, t:canvasTex(function(c,w,h){ var r = rnd(50+rows+key.length); c.fillStyle = key==='carrb' ? '#4d443c' : (key==='lvt' ? '#9a9690' : (key==='strat' ? '#8a7660' : '#4a3018')); c.fillRect(0,0,w,h); var rh=h/rows;
        for(var j=0;j<rows;j++){ var e=Math.floor(40+r()*170); [[0,e],[e,w]].forEach(function(sg){ var hh, ss, ll;
            if(key==='parquet'){ hh=28+r()*6; ss=50; ll=50+r()*10; } else if(key==='strat'){ hh=30+r()*4; ss=30; ll=58+r()*8; } else if(key==='lvt'){ hh=38; ss=9; ll=72+r()*5; } else { hh=26+r()*5; ss=30; ll=42+r()*8; }
            c.fillStyle='hsl('+hh+','+ss+'%,'+ll+'%)'; var jw = key==='lvt'?1.5:2.5; c.fillRect(sg[0]+jw,j*rh+jw,sg[1]-sg[0]-2*jw,rh-2*jw);
            for(var g=0;g<14;g++){ c.strokeStyle='rgba(60,35,10,'+(.05+r()*.14).toFixed(2)+')'; c.lineWidth=.8+r()*1.4; var gy=j*rh+4+r()*(rh-8); c.beginPath(); c.moveTo(sg[0]+jw+r()*10,gy); c.lineTo(sg[1]-jw-r()*10,gy+(r()-.5)*3); c.stroke(); } }); } },256,256,1,1) };
    }
    if(d) d.map = d.t;
    return TXC[key] = d;
  }
  var curWT = null, curRT = null, curCharp = 'ferm', curIso = 'comb', coupeOn = false, ventOn = false, FTC = {};
  var VMC = { df:[], sf:[] }, CP = { base:[], ferm:[], trad:[], comb:[], ramp:[] }, CR = null;
  function ftex(key,sx,sz){ var id = key+'|'+sx+'|'+sz; if(FTC[id]) return FTC[id]; var m = matTex(key); if(!m) return null;
    var t = m.t.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(sx/1.2,sz/1.2); return FTC[id] = t; }
  function labelSprite(txt,col){
    var cv = document.createElement('canvas'); cv.width = 900; cv.height = 96; var c = cv.getContext('2d');
    c.font = '600 40px sans-serif'; var tw = Math.min(880,c.measureText(txt).width+36), cx = 450;
    c.fillStyle = 'rgba(10,20,40,.88)'; c.beginPath(); c.moveTo(cx-tw/2+16,8); c.lineTo(cx+tw/2-16,8); c.quadraticCurveTo(cx+tw/2,8,cx+tw/2,24); c.lineTo(cx+tw/2,72); c.quadraticCurveTo(cx+tw/2,88,cx+tw/2-16,88); c.lineTo(cx-tw/2+16,88); c.quadraticCurveTo(cx-tw/2,88,cx-tw/2,72); c.lineTo(cx-tw/2,24); c.quadraticCurveTo(cx-tw/2,8,cx-tw/2+16,8); c.fill();
    c.fillStyle = col || '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt,cx,50);
    var t = new THREE.CanvasTexture(cv); if(THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:t, depthTest:false, transparent:true })); sp.scale.set(900*.0046,96*.0046,1); sp.renderOrder = 999; return sp;
  }
  function refreshCoupe(){
    CP.ferm.forEach(function(o){ o.userData.off = (curCharp !== 'ferm'); }); CP.trad.forEach(function(o){ o.userData.off = (curCharp !== 'trad'); });
    CP.comb.forEach(function(o){ o.userData.off = (curIso !== 'comb'); }); CP.ramp.forEach(function(o){ o.userData.off = (curIso !== 'ramp'); });
    if(coupeOn) applyStage();
  }

  /* ---------- matières « maquette blanche » ---------- */
  var M = {
    white: new THREE.MeshStandardMaterial({ color:0xf4f6fa, roughness:.92, metalness:0 }),
    roof:  new THREE.MeshStandardMaterial({ color:0xdfe5ee, roughness:.9, transparent:true }),
    floor: new THREE.MeshStandardMaterial({ color:0xe9edf3, roughness:1 }),
    slab:  new THREE.MeshStandardMaterial({ color:0xcfd6e2, roughness:1 }),
    ground:new THREE.MeshStandardMaterial({ color:0x16294a, roughness:1 }),
    lot:   new THREE.MeshStandardMaterial({ color:0x1d3560, roughness:1 }),
    road:  new THREE.MeshStandardMaterial({ color:0x0f1f3a, roughness:1 }),
    path:  new THREE.MeshStandardMaterial({ color:0xc6cedc, roughness:1 }),
    glass: new THREE.MeshStandardMaterial({ color:0x8cc6f2, roughness:.15, metalness:.1, transparent:true, opacity:.38 }),
    frame: new THREE.MeshStandardMaterial({ color:0x9fb2c6, roughness:.6 }),
    accent:new THREE.MeshStandardMaterial({ color:0xb9c6da, roughness:.8 }),
    dark:  new THREE.MeshStandardMaterial({ color:0x7d8ca6, roughness:.7 })
  };
  function clone(m){ var c = m.clone(); return c; }
  var LK = {  /* matières modifiables par les choix du client (blanc tant que rien n'est choisi) */
    wall: clone(M.white), roof: M.roof, frame: clone(M.frame), door: clone(M.accent), gate: clone(M.accent),
    fence: new THREE.MeshStandardMaterial({ color:0x9fb2c6, transparent:true, opacity:.28, roughness:.8 }),
    fencePost: clone(M.dark), allee: clone(M.path), floorV: new THREE.MeshStandardMaterial({ color:0xc9d3e2, roughness:1 }),
    floorB: new THREE.MeshStandardMaterial({ color:0xbac5d6, roughness:1 }), floorK: new THREE.MeshStandardMaterial({ color:0xc9d3e2, roughness:1 }), floorM: new THREE.MeshStandardMaterial({ color:0xbac5d6, roughness:1 }), wallIn: clone(M.white), kitchen: clone(M.accent), slabIn: clone(M.floor), plate: clone(M.white), wallCh: clone(M.white), wallSdb: clone(M.white), doorI: new THREE.MeshStandardMaterial({ color:0xe9edf4, roughness:.7 })
  };
  LK.wall.side = THREE.DoubleSide; LK.wall.clippingPlanes = [clipPl]; LK.wall.clipShadows = true;
  M.roof.map = TEXT;
  var cutC = 99;
  function cclone(m){ var c = m.clone(); c.clippingPlanes = [clipPl]; c.clipShadows = true; return c; }
  var FRC = cclone(LK.frame), DRC = cclone(LK.door), GLC = cclone(M.glass); GLC.depthWrite = false; FRC.polygonOffset = true; FRC.polygonOffsetFactor = 1; FRC.polygonOffsetUnits = 1;
  function syncClip(){ clipPl.constant = Math.min(wallH, cutC); }
  var ASS = { tae:[], micro:[] }, PLV = { reseau:[], cuve:[], noue:[] }, FP = [], FPO = [], BAH = [];
  var LKP = null, LKS = null, LKT = null, IDR = [], DV = [], SH = [], SHB = [], SHBW = [], SHBB = [], bathM = null, showerM = [], italM = []; /* volets, baignoire / douche */

  function tag(o,a,b){ o.userData.stage = [a, b==null?99:b]; return o; }
  function isDyn(o){ while(o){ if(o === workG || o === diggerG) return true; o = o.parent; } return false; }
  /* barre entre deux points (y,z) d'un plan x : fermes, chevrons… */
  function bar(x,y1,z1,y2,z2,w,t,mat,parent){
    var len = Math.hypot(y2-y1,z2-z1), m = new THREE.Mesh(new THREE.BoxGeometry(w,t,len), mat);
    m.position.set(x,(y1+y2)/2,(z1+z2)/2); m.rotation.x = Math.atan2(-(y2-y1), z2-z1);
    m.castShadow = true; if(parent) parent.add(m); return m;
  }
  /* barre horizontale (x1→x2) ou verticale */
  function seg(x1,y1,z1,x2,y2,z2,t,mat,parent){
    var dx=x2-x1, dy=y2-y1, dz=z2-z1, len=Math.hypot(dx,dy,dz);
    var m = new THREE.Mesh(new THREE.BoxGeometry(t,t,len), mat);
    m.position.set((x1+x2)/2,(y1+y2)/2,(z1+z2)/2); m.lookAt(x2,y2,z2); m.castShadow = true;
    if(parent) parent.add(m); return m;
  }

  function zn(o,id){ o.userData.zone = id; return o; }
  function box(w,h,d,mat,x,y,z,parent){
    var m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat||M.white);
    m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true;
    if(parent) parent.add(m); return m;
  }
  function wallShape(len, h, holes, gable){
    var s = new THREE.Shape();
    s.moveTo(-len/2,0); s.lineTo(len/2,0);
    if(gable){ var cc = gable - (len/2)*Math.tan(40*Math.PI/180) + .13;   /* le pignon monte jusque sous les liteaux : plus de jour avec la toiture */
      s.lineTo(len/2,h+cc); s.lineTo(0,h+gable+.13); s.lineTo(-len/2,h+cc); }
    else { s.lineTo(len/2,h); s.lineTo(-len/2,h); }
    s.lineTo(-len/2,0);
    (holes||[]).forEach(function(o){
      var p = new THREE.Path();
      if(o.poly){ o.poly.forEach(function(q,i){ if(i) p.lineTo(q[0],q[1]); else p.moveTo(q[0],q[1]); }); p.lineTo(o.poly[0][0],o.poly[0][1]); s.holes.push(p); return; }
      p.moveTo(o.x-o.w/2,o.y); p.lineTo(o.x+o.w/2,o.y); p.lineTo(o.x+o.w/2,o.y+o.h); p.lineTo(o.x-o.w/2,o.y+o.h); p.lineTo(o.x-o.w/2,o.y);
      s.holes.push(p);
    });
    return s;
  }
  function wallMesh(len,h,t,holes,gable){
    var g = new THREE.ExtrudeGeometry(wallShape(len,h,holes,gable), { depth:t, bevelEnabled:false });
    g.translate(0,0,-t/2);
    var m = new THREE.Mesh(g, M.white); m.castShadow = true; m.receiveShadow = true; return m;
  }

  /* ---------- construction de la maison ---------- */
  function build(){
    scene = new THREE.Scene(); scene.scale.z = -1;   /* miroir : l’annexe apparaît à gauche du pignon vitré */
    scene.background = new THREE.Color(0x0a1628);
    scene.fog = new THREE.Fog(0x0a1628, 60, 140);
    scene.add(new THREE.HemisphereLight(0xdbe8ff, 0x1a2b4a, .95));
    var sun = new THREE.DirectionalLight(0xffffff, 1.35);
    sun.position.set(14,26,18); sun.castShadow = true;
    var sm = 2048;
    sun.shadow.mapSize.set(sm,sm);
    var sc = sun.shadow.camera; sc.left=-24; sc.right=24; sc.top=24; sc.bottom=-24; sc.near=1; sc.far=90;
    sun.shadow.bias = -0.0003; sun.shadow.normalBias = .035;
    scene.add(sun);

    var L=12, W=8, T=.3, HT=5.6, PITCH=Math.tan(40*Math.PI/180);

    /* terrain, voirie */
    var g = new THREE.Mesh(new THREE.BoxGeometry(80,.3,60), M.ground); g.position.set(0,-.15,-4); g.receiveShadow = true; scene.add(g); gndM = [g];
    var lot = new THREE.Mesh(new THREE.BoxGeometry(26,.06,34), M.lot); lot.position.set(0,.03,-3); lot.receiveShadow = true; scene.add(lot);
    var road = new THREE.Mesh(new THREE.BoxGeometry(80,.08,5), M.road); road.position.set(0,.04,17.5); road.receiveShadow = true; scene.add(road); gndM.push(lot,road);

    /* étape 1 : plateforme et tranchées de réseaux */
    var plat = box(L+5,.1,W+5,new THREE.MeshStandardMaterial({ color:0x2a4472, roughness:1 }),0,.09,0,scene); tag(plat,1,5);
    var trMat = new THREE.MeshStandardMaterial({ color:0x07101f, roughness:1 });
    [[-4,.1,9.8,.5,.06,10.2],[-8.5,.1,3.4,6.6,.06,.5]].forEach(function(t){ tag(box(t[3],t[4],t[5],trMat,t[0],t[1],t[2],scene),2,4); });
    /* étape 2 : fondations (semelles filantes) */
    var fMat = new THREE.MeshStandardMaterial({ color:0x9aa3b2, roughness:1 });
    var pitMat = new THREE.MeshStandardMaterial({ color:0x4a3828, roughness:1 }), rebMat = new THREE.MeshStandardMaterial({ color:0xc0794a, roughness:.6, metalness:.3 });
    [[0,W/2+.1,L+.8,.9],[0,-W/2-.1,L+.8,.9],[-L/2-.1,0,.9,W+.8],[L/2+.1,0,.9,W+.8],[0,0,L,.6],[-0,0,.6,W]].forEach(function(f){
      tag(box(f[2],.28,f[3],fMat,f[0],.2,f[1],scene),4,4);
      /* étape 3 : fouille + armatures de la semelle */
      tag(box(f[2]+.3,.03,f[3]+.3,pitMat,f[0],.115,f[1],scene),3,3);
      var along = f[2] > f[3];
      [-1,1].forEach(function(sd){ [0,.07].forEach(function(dy){
        var rb = along ? box(f[2]-.1,.04,.04,rebMat,f[0],.17+dy,f[1]+sd*f[3]*.3,scene) : box(.04,.04,f[3]-.1,rebMat,f[0]+sd*f[2]*.3,.17+dy,f[1],scene);
        tag(rb,3,3); }); });
    });
    /* armatures en attente : elles sortent des semelles et se lient au chaînage */
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(c){ [[0,0],[.14,0],[0,.14],[.14,.14]].forEach(function(o){
      tag(box(.035,1.05,.035,rebMat,c[0]*(L/2-.2)-c[0]*o[0],.62,c[1]*(W/2-.2)-c[1]*o[1],scene),3,7); }); });
    [-3.6,0,3.6].forEach(function(x){ [-1,1].forEach(function(sd){ tag(box(.035,1.05,.035,rebMat,x,.62,sd*(W/2-.15),scene),3,7); }); });
    [-1.6,1.6].forEach(function(z){ [-1,1].forEach(function(sd){ tag(box(.035,1.05,.035,rebMat,sd*(L/2-.15),.62,z,scene),3,7); }); });
    (function(){
    })();
    /* étape 5 : dalle / plancher bas */
    slabM = zn(tag(box(L+.6,.22,W+.6,M.slab,0,.11,0,scene),6),'plancher');
    /* étape 5 : avant le coulage — béton translucide, treillis soudé et aciers de liaison avec les fers en attente des murs */
    (function(){
      var fresh = new THREE.Mesh(new THREE.BoxGeometry(L+.6,.22,W+.6), new THREE.MeshStandardMaterial({ color:0xc9ced8, roughness:1, transparent:true, opacity:.22, depthWrite:false }));
      fresh.position.set(0,.11,0); fresh.renderOrder = 1; tag(fresh,5,5); scene.add(fresh);
      var gravel = box(L+.6,.06,W+.6,new THREE.MeshStandardMaterial({ color:0x6d6860, roughness:1 }),0,.03,0,scene); tag(gravel,5,5);
      var mesh = new THREE.MeshStandardMaterial({ color:0xb4bac4, roughness:.45, metalness:.5 });
      var lk = new THREE.MeshStandardMaterial({ color:0xe0733a, roughness:.5, metalness:.3 });
      var x0 = L/2-.45, z0 = W/2-.45, st = .3, y = .15, i;
      for(i = -x0; i <= x0+.001; i += st) tag(box(.025,.025,2*z0,mesh,i,y,0,scene),5,5);
      for(i = -z0; i <= z0+.001; i += st) tag(box(2*x0,.025,.025,mesh,0,y+.03,i,scene),5,5);
      /* cales qui maintiennent le treillis au milieu de l'épaisseur */
      for(i = -x0+.6; i < x0; i += 2.4) [-z0+.6,0,z0-.6].forEach(function(z){ tag(box(.07,.06,.07,new THREE.MeshStandardMaterial({ color:0x4b5563, roughness:.9 }),i,.09,z,scene),5,5); });
      /* aciers de liaison : ils partent des fers en attente des murs et recouvrent le treillis sur 60 cm */
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(c){
        tag(box(.04,.04,.9,lk,c[0]*(L/2-.2),y+.05,c[1]*(W/2-.2-.45),scene),5,5);
        tag(box(.9,.04,.04,lk,c[0]*(L/2-.2-.45),y+.05,c[1]*(W/2-.2),scene),5,5); });
      [-3.6,0,3.6].forEach(function(x){ [-1,1].forEach(function(sd){ tag(box(.04,.04,.9,lk,x,y+.05,sd*(W/2-.15-.45),scene),5,5); }); });
      [-1.6,1.6].forEach(function(z){ [-1,1].forEach(function(sd){ tag(box(.9,.04,.04,lk,sd*(L/2-.15-.45),y+.05,z,scene),5,5); }); });
    })();

    /* murs */
    wallsG = new THREE.Group(); wallsG.position.y = .22; scene.add(wallsG);
    function wm(len,h,t,holes,gable){ var m = wallMesh(len,h,t,holes,gable); m.material = LK.wall; zn(m,'murs'); return m; }
    var front = wm(L,HT,T,[{x:-1.95,y:0,w:1.0,h:2.1},{x:-4.1,y:.9,w:1.4,h:1.3},{x:2.9,y:0,w:3.2,h:2.2},{x:-4.1,y:3.5,w:1.4,h:1.3},{x:-1.95,y:3.5,w:1.0,h:1.3},{x:1.7,y:3.5,w:1.2,h:1.3},{x:4.1,y:3.5,w:1.2,h:1.3}]);
    front.position.set(0,0,W/2-T/2); tag(front,6); wallsG.add(front);
    var back = wm(L,HT,T,[{x:-4,y:.9,w:1.4,h:1.3},{x:-.45,y:1.4,w:.6,h:.6},{x:-4,y:3.5,w:1.4,h:1.3},{x:0,y:3.5,w:1.2,h:1.3},{x:-1.5,y:3.5,w:1.0,h:1.3}]);
    back.position.set(0,0,-W/2+T/2); tag(back,6); wallsG.add(back);
    [-1,1].forEach(function(s){
      var e = wm(W-2*T,HT,T,s<0?[{x:0,y:.9,w:1.2,h:1.3},{x:0,y:3.5,w:1.2,h:1.3}]:[{x:0,y:.1,w:4.7,h:2.8},{poly:[[-2.35,3.35],[2.35,3.35],[2.35,6.5],[0,8.5],[-2.35,6.5]]}],(W/2)*PITCH);
      e.rotation.y = Math.PI/2; e.position.set(s*(L/2-T/2),0,0); tag(e,6); wallsG.add(e);
    });

    /* étape 7 : menuiseries */
    function pane(x,y,w,h,z,par){
      var gl = new THREE.Mesh(new THREE.BoxGeometry(w,h,.04), GLC); gl.renderOrder = 2; gl.position.set(x,y+h/2,z); zn(tag(gl,15),'menuiseries'); (par||wallsG).add(gl);
      var f = .06;
      [[w+f*2,f,0,h/2+f/2-.006],[w+f*2,f,0,-h/2-f/2+.006],[f,h,-w/2-f/2+.006,0],[f,h,w/2+f/2-.006,0],[.04,h,0,0]].forEach(function(p,i){
        var b = new THREE.Mesh(new THREE.BoxGeometry(p[0],p[1],i<4?T+.04:.06), FRC); b.position.set(x+p[2],y+h/2+p[3],z); b.castShadow = true; zn(tag(b,15),'menuiseries'); (par||wallsG).add(b);
      });
    }
    pane(-4.1,.9,1.4,1.3,W/2-T/2); pane(2.9,0,3.2,2.2,W/2-T/2);
    pane(-4.1,3.5,1.4,1.3,W/2-T/2); pane(-1.95,3.5,1.0,1.3,W/2-T/2); pane(1.7,3.5,1.2,1.3,W/2-T/2); pane(4.1,3.5,1.2,1.3,W/2-T/2);
    pane(-4,.9,1.4,1.3,-W/2+T/2); pane(-.45,1.4,.6,.6,-W/2+T/2); pane(-4,3.5,1.4,1.3,-W/2+T/2); pane(0,3.5,1.2,1.3,-W/2+T/2); pane(-1.5,3.5,1.0,1.3,-W/2+T/2);
    var gg = new THREE.Group(); gg.position.set(-(L/2-T/2),0,0); gg.rotation.y = Math.PI/2; wallsG.add(gg); pane(0,.9,1.2,1.3,0,gg); pane(0,3.5,1.2,1.3,0,gg);
    /* pignon droit : grande baie vitrée sur deux niveaux */
    var gr = new THREE.Group(); gr.position.set(L/2-T/2,0,0); gr.rotation.y = -Math.PI/2; wallsG.add(gr); pane(0,.1,4.7,2.8,0,gr);
    (function(){
      var PEN = [[-2.35,3.35],[2.35,3.35],[2.35,6.5],[0,8.5],[-2.35,6.5]], sh = new THREE.Shape(); PEN.forEach(function(q,i){ if(i) sh.lineTo(q[0],q[1]); else sh.moveTo(q[0],q[1]); }); sh.closePath();
      var gl = new THREE.Mesh(new THREE.ShapeGeometry(sh), GLC); gl.renderOrder = 2; zn(tag(gl,15),'menuiseries'); gr.add(gl);
      for(var i=0;i<PEN.length;i++){ var a = PEN[i], b = PEN[(i+1)%PEN.length], len = Math.hypot(b[0]-a[0],b[1]-a[1]);
        var fb = new THREE.Mesh(new THREE.BoxGeometry(len+.06,.07,T+.04), FRC); fb.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,0); fb.rotation.z = Math.atan2(b[1]-a[1],b[0]-a[0]); fb.castShadow = true; zn(tag(fb,15),'menuiseries'); gr.add(fb); }
    })();
    [[-1.18,1.5,2.8],[1.18,1.5,2.8],[-1.18,5.4,4.1],[1.18,5.4,4.1],[0,5.7,4.7]].forEach(function(m){ var mb = new THREE.Mesh(new THREE.BoxGeometry(.06,m[2],.08), FRC); mb.position.set(m[0],m[1],0); zn(tag(mb,15),'menuiseries'); gr.add(mb); });
    var band = new THREE.Mesh(new THREE.BoxGeometry(4.9,.4,T+.06), FRC); band.position.set(0,3.1,0); zn(tag(band,15),'menuiseries'); gr.add(band);
    var door = new THREE.Mesh(new THREE.BoxGeometry(.96,2.08,.08), DRC); door.position.set(-1.95,1.04,W/2-T/2); door.castShadow = true; zn(tag(door,15),'porte'); wallsG.add(door);
    /* porte design vitrée : grande fente vitrée verticale + tirant inox + liseré */
    DV = [];
    (function(){
      var gx = -1.95+.17, dz = W/2-T/2+.045;
      var gl2 = new THREE.Mesh(new THREE.BoxGeometry(.3,1.78,.03), GLC); gl2.renderOrder = 2; gl2.position.set(gx,1.04+.06,dz); zn(tag(gl2,15),'porte'); wallsG.add(gl2); DV.push(gl2);
      var inox = new THREE.MeshStandardMaterial({ color:0xc9ced6, roughness:.25, metalness:.9 });
      var bar = new THREE.Mesh(new THREE.BoxGeometry(.035,1.1,.05), inox); bar.position.set(-1.95-.38,1.05,dz+.04); zn(tag(bar,15),'porte'); wallsG.add(bar); DV.push(bar);
      [.5,-.5].forEach(function(dx,i){ var st = new THREE.Mesh(new THREE.BoxGeometry(.02,.06,.06), inox); st.position.set(-1.95-.38,1.05+(i?-.5:.5),dz+.015); zn(tag(st,15),'porte'); wallsG.add(st); DV.push(st); });
      var lis = new THREE.Mesh(new THREE.BoxGeometry(.04,1.78,.02), inox); lis.position.set(gx-.17,1.1,dz+.005); zn(tag(lis,15),'porte'); wallsG.add(lis); DV.push(lis);
    })();
    // volets roulants (coffres au-dessus des ouvertures sud)
    [[-4.1,2.38,1.5],[2.9,2.4,3.3]].forEach(function(v,vi){
      var c = new THREE.Mesh(new THREE.BoxGeometry(v[2],.2,.22), FRC); c.position.set(v[0],v[1],W/2+.05); tag(c,15); if(vi===0) zn(c,'volets'); wallsG.add(c); SH.push(c); if(vi===1) c.userData.bayC = 1;
    });
    /* volets battants : deux vantaux de chaque côté, repliés contre la façade */
    var shW = new THREE.MeshStandardMaterial({ color:0x9a6a3c, roughness:.85 }), shD = new THREE.MeshStandardMaterial({ color:0x5a3a1c, roughness:.9 });
    SHBW = []; SHBB = [];
    [[-4.1,.9,1.4,1.3,1,0],[-4,.9,1.4,1.3,-1,0],[2.9,0,3.2,2.2,1,1]].forEach(function(v){
      var side = v[4], arr = v[5] ? SHBB : SHBW, zf = side*(W/2+.045);
      [-1,1].forEach(function(sd){ [0,1].forEach(function(k){
        var pw = v[5] ? .4 : .28, px = v[0]+sd*(v[2]/2+.04+pw/2+k*(pw+.02)), pH = v[3]+.04, py = v[1]+v[3]/2;
        var pn = new THREE.Mesh(new THREE.BoxGeometry(pw,pH,.035), shW); pn.position.set(px,py,zf); pn.castShadow = true; zn(tag(pn,15),'volets'); wallsG.add(pn); arr.push(pn);
        for(var q=0;q<Math.floor(pH/.09);q++){ var lv = new THREE.Mesh(new THREE.BoxGeometry(pw-.04,.018,.05), shD); lv.position.set(px,v[1]-.02+.06+q*.09,zf+side*.015); zn(tag(lv,15),'volets'); wallsG.add(lv); arr.push(lv); }
      }); });
    });

    /* étapes 6-9 : chaînages, linteaux */
    var chMat = new THREE.MeshStandardMaterial({ color:0x7d889a, roughness:.9 });
    var chMatC = chMat.clone(); chMatC.clippingPlanes = [clipPl]; chMatC.clipShadows = true;
    [-1,1].forEach(function(sx){ [-1,1].forEach(function(sz){
      tag(box(T+.06,HT,T+.06,chMatC,sx*(L/2-T/2),.22+HT/2,sz*(W/2-T/2),scene),6,14); }); });
    [[0,W/2-T/2,L,T+.04],[0,-W/2+T/2,L,T+.04]].forEach(function(r){ tag(box(r[2],.2,r[3],chMat,r[0],.32,r[1],scene),6,14); tag(box(r[2],.2,r[3],chMat,r[0],.22+HT-.1,r[1],scene),9,14); });
    [-1,1].forEach(function(sx){ tag(box(T+.04,.2,W,chMat,sx*(L/2-T/2),.32,0,scene),6,14); tag(box(T+.04,.2,W,chMat,sx*(L/2-T/2),.22+HT-.1,0,scene),9,14); });
    var slabEt = cclone(M.floor); slabEt.side = THREE.DoubleSide;
    tag(box(3.3,.22,4.95,slabEt,-4.05,2.95,-1.175,scene),9); tag(box(6.6,.22,W-2*T,slabEt,.9,2.95,0,scene),9);
    var railM = cclone(M.frame), railG = cclone(M.glass);
    tag(box(.05,.05,W-2*T,railM,4.2,4.06,0,scene),9); tag(box(.03,.9,W-2*T,railG,4.2,3.6,0,scene),9);
    tag(box(3.3,.05,.05,railM,-4.05,4.06,1.3,scene),9); tag(box(3.3,.9,.03,railG,-4.05,3.6,1.3,scene),9);
    var linMat = new THREE.MeshStandardMaterial({ color:0xb07a48, roughness:.8 });
    [[-1.95,1.0,W/2-T/2,2.1],[-4.1,1.4,W/2-T/2,2.2],[2.9,3.2,W/2-T/2,2.2],[-4,1.4,-W/2+T/2,2.2],[-.45,.6,-W/2+T/2,2.0],[3,1.4,-W/2+T/2,2.2]].forEach(function(o){
      tag(box(o[1]+.6,.2,T+.05,linMat,o[0],.22+o[3]+.1,o[2],scene),8,14); });
    tag(box(T+.05,.2,1.8,linMat,-(L/2-T/2),.22+2.2+.1,0,scene),8,14);

    /* étapes 10-14 : charpente (fermes, pannes, chevrons, liteaux) puis couverture */
    roofG = new THREE.Group(); roofG.position.y = .22+HT; scene.add(roofG);
    var ang = 40*Math.PI/180, half = W/2+.55, slope = half/Math.cos(ang), RY = (W/2)*PITCH;
    function Ly(z){ return RY - Math.abs(z)*PITCH; }
    var wood = new THREE.MeshStandardMaterial({ color:0xc9a26b, roughness:.9 });
    var wood2 = new THREE.MeshStandardMaterial({ color:0xa9824c, roughness:.9 });
    var memb = new THREE.MeshStandardMaterial({ color:0x3b4658, roughness:.9 });
    var n0 = roofG.children.length;
    [-5.4,-3.6,-1.8,0,1.8,3.6,5.4].forEach(function(x){
      var y0 = Ly(0)-.08;
      tag(bar(x,.08,-W/2-.15,.08,W/2+.15,.07,.16,wood,roofG),10,13);
      [1,-1].forEach(function(sd){
        tag(bar(x,RY-.08,0,Ly(half)-.08,sd*half,.07,.16,wood,roofG),10,13);
        tag(bar(x,.08,0,Ly(W/4)-.08,sd*W/4,.05,.1,wood,roofG),10,13);
      });
      tag(bar(x,.08,0,RY-.1,0,.05,.1,wood,roofG),10,13);
    });
    CH_F = roofG.children.slice(n0); CH_T = [];
    /* charpente traditionnelle : 3 fermes en bois massif (entrait, arbalétriers, poinçon, jambes de force) */
    [-5.4,0,5.4].forEach(function(x){
      var a = [ tag(bar(x,.1,-W/2-.15,.1,W/2+.15,.12,.24,wood,roofG),10,13), tag(bar(x,.1,0,RY-.1,0,.12,.14,wood,roofG),10,13) ];
      [1,-1].forEach(function(sd){
        a.push(tag(bar(x,RY-.1,0,Ly(half)-.1,sd*half,.12,.22,wood,roofG),10,13));
        a.push(tag(bar(x,.1,sd*W/4.2,Ly(W/5)-.2,sd*W/9,.1,.14,wood,roofG),10,13));
      });
      a.forEach(function(o){ o.userData.off = true; CH_T.push(o); });
    });
    [.3,.62,.93].forEach(function(f){ [1,-1].forEach(function(sd){
      var z = sd*f*half; tag(box(L+1.1,.12,.12,wood2,0,Ly(z)+.06,z,roofG),11,13);
    }); });
    tag(box(L+1.1,.2,.18,wood2,0,RY+.04,0,roofG),11,13);
    [1,-1].forEach(function(sd){
      for(var i=-9;i<=9;i++){
        var r = new THREE.Mesh(new THREE.BoxGeometry(.06,.08,slope), wood);
        r.position.set(i*.6, Ly(half/2)+.16, sd*half/2); r.rotation.x = sd*ang; r.castShadow = true; tag(r,12,13); roofG.add(r);
      }
      var mb = new THREE.Mesh(new THREE.BoxGeometry(L+1.1,.012,slope), memb); mb.position.set(0,Ly(half/2)+.21,sd*half/2); mb.rotation.x = sd*ang; tag(mb,13,13); roofG.add(mb);
      for(var f=.08;f<=.99;f+=.075){
        var z = sd*f*half, lt = new THREE.Mesh(new THREE.BoxGeometry(L+1.1,.04,.05), wood2);
        lt.position.set(0,Ly(z)+.24,z); lt.rotation.x = sd*ang; tag(lt,13,13); roofG.add(lt);
      }
      var p = new THREE.Mesh(new THREE.BoxGeometry(L+1.1,.1,slope), LK.roof);
      p.castShadow = true; p.receiveShadow = true;
      p.position.set(0, Ly(half/2)+.32, sd*half/2); p.rotation.x = sd*ang; zn(tag(p,14),'couverture'); roofG.add(p);
      tag(box(L+1.1,.1,.12,M.frame,0,Ly(half)+.2,sd*(half+.03),roofG),14);
    });
    tag(box(L+1.15,.12,.3,LK.roof,0,RY+.3,0,roofG),14);
    tag(box(.35,.8,.35,M.roof,-1.2,RY+.6,-.2,roofG),14);

    /* étape 10 : extérieurs */
    /* terrasse : une seule grande dalle en L, devant la façade et le long du pignon vitré */
    tag(box(6.6,.16,4.0,M.path,2.7,.08,W/2+2.0,scene),26);
    tag(box(4.8,.16,7.5,M.path,L/2+2.4,.08,.25,scene),26);
    tag(box(1.2,.16,4.0,M.path,6.6,.08,W/2+2.0,scene),26);
    [-.5,.8,2.1,3.4,4.7,5.95].forEach(function(x){ tag(box(.08,.32,.08,M.frame,x,.16,W/2+3.95,scene),26); });
    [6.5,7.8,9.1,10.4].forEach(function(x){ tag(box(.08,.32,.08,M.frame,x,.16,W/2+3.95,scene),26); });
    [-3.3,-1.6,0,1.6,3.3].forEach(function(zz){ tag(box(.08,.32,.08,M.frame,L/2+4.75,.16,zz,scene),26); });
    /* mobilier de terrasse, pots, arbres */
    (function(){
      var fm = M.frame, tm = M.white, canopy = new THREE.MeshStandardMaterial({ color:0xdde4ef, roughness:1, flatShading:true }), trunk = new THREE.MeshStandardMaterial({ color:0xb7c0cf, roughness:1 });
      function E(o){ tag(o,26); o.castShadow = true; scene.add(o); return o; }
      [[9.4,1.9],[9.4,-2.4]].forEach(function(t){
        E(box(.9,.05,2.2,tm,t[0],.8,t[1],null)); [[-.38,-1.0],[.38,-1.0],[-.38,1.0],[.38,1.0]].forEach(function(l){ E(box(.05,.72,.05,fm,t[0]+l[0],.44,t[1]+l[1],null)); });
        [[-.75,-.7],[-.75,0],[-.75,.7],[.75,-.7],[.75,0],[.75,.7]].forEach(function(c){ E(box(.42,.05,.42,fm,t[0]+c[0],.5,t[1]+c[1],null)); E(box(.05,.4,.42,fm,t[0]+c[0]+(c[0]<0?-.2:.2),.72,t[1]+c[1],null)); E(box(.04,.5,.04,fm,t[0]+c[0]+.15,.27,t[1]+c[1]+.15,null)); E(box(.04,.5,.04,fm,t[0]+c[0]-.15,.27,t[1]+c[1]-.15,null)); });
      });
      function pot(x,z,r){ var p = new THREE.Mesh(new THREE.CylinderGeometry(.26,.2,.45,14), fm); p.position.set(x,.4,z); E(p); var b = new THREE.Mesh(new THREE.IcosahedronGeometry(r,1), canopy); b.position.set(x,.45+r+.1,z); E(b); }
      pot(6.6,3.4,.38); pot(6.6,-3.4,.38); pot(10.5,3.4,.38); pot(10.5,-3.4,.38); pot(6.6,.2,.3);
      function tree(x,z,s){ var t = new THREE.Mesh(new THREE.CylinderGeometry(.14*s,.2*s,2.2*s,8), trunk); t.position.set(x,1.1*s,z); E(t);
        [[0,2.9,0,1.5],[.7,2.4,.4,1.1],[-.6,2.5,-.3,1.0]].forEach(function(c){ var b = new THREE.Mesh(new THREE.IcosahedronGeometry(c[3]*s,1), canopy); b.position.set(x+c[0]*s,c[1]*s,z+c[2]*s); E(b); }); }
      tree(-10,-4,.8); tree(-8,-14,.8); tree(1,-15,.9); tree(8,-17,.9); tree(13.5,-14,.8); tree(-12,9,.7); tree(12.5,-19,.9);
    })();
    /* annexe (volume bas à l'arrière, côté pignon vitré) */
    var clTex = (function(){ var c = document.createElement('canvas'); c.width = 128; c.height = 8; var g = c.getContext('2d'); g.fillStyle = '#f2f4f8'; g.fillRect(0,0,128,8); g.fillStyle = '#b9c2d0'; for(var i=0;i<4;i++) g.fillRect(i*32,0,3,8);
      var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5,1); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    (function(){
      var am = clone(M.white), ax0 = 1.3, ax1 = 5.2, az0 = -9.2, az1 = -W/2+.02, ah = 4.9;
      am.map = clTex;
      var ab = new THREE.Mesh(new THREE.BoxGeometry(ax1-ax0,ah,az1-az0), am); ab.position.set((ax0+ax1)/2,ah/2+.22,(az0+az1)/2); ab.castShadow = true; ab.receiveShadow = true; zn(tag(ab,6),'murs'); scene.add(ab);
      var ar = new THREE.Mesh(new THREE.BoxGeometry(ax1-ax0+.5,.14,az1-az0+.5), LK.roof); ar.position.set((ax0+ax1)/2,ah+.22+.2,(az0+az1)/2); ar.rotation.z = .07; ar.castShadow = true; zn(tag(ar,14),'couverture'); scene.add(ar);
      [[-6.7,1.1,2.4,1.5],[-5.2,3.3,.9,1.2]].forEach(function(w){
        var gl = new THREE.Mesh(new THREE.BoxGeometry(.04,w[3],w[2]), GLC); gl.renderOrder = 2; gl.position.set(ax1+.01,w[1]+w[3]/2+.22,w[0]); zn(tag(gl,15),'menuiseries'); scene.add(gl);
        var fr = new THREE.Mesh(new THREE.BoxGeometry(.06,w[3]+.12,w[2]+.12), FRC); fr.position.set(ax1+.005,w[1]+w[3]/2+.22,w[0]); fr.castShadow = true; zn(tag(fr,15),'menuiseries'); scene.add(fr); });
      [[(ax0+ax1)/2+.7,3.6,.9,1.3],[(ax0+ax1)/2-.7,1.5,1.6,1.2]].forEach(function(w){ var wf = new THREE.Mesh(new THREE.BoxGeometry(w[2],w[3],.08), FRC); wf.position.set(w[0],w[1],az0-.02); scene.add(wf); zn(tag(wf,15),'menuiseries'); });
    })();
    var allee = new THREE.Mesh(new THREE.BoxGeometry(1.3,.05,10.3), LK.allee); allee.position.set(-1.95,.085,W/2+5.4); allee.receiveShadow = true; zn(tag(allee,26),'allee'); scene.add(allee);
    /* stationnement à gauche de la maison + voiture */
    LKP = LK.allee.clone(); LKS = LK.allee.clone();
    var pad = new THREE.Mesh(new THREE.BoxGeometry(3.4,.05,14.7), LKP); pad.position.set(-8.3,.085,7.15); pad.receiveShadow = true; zn(tag(pad,26),'allee'); scene.add(pad);
    var lnk = new THREE.Mesh(new THREE.BoxGeometry(4.0,.05,1.3), LKS); lnk.position.set(-4.6,.085,4.95); lnk.receiveShadow = true; zn(tag(lnk,26),'allee'); scene.add(lnk);
    LKT = LK.allee.clone(); var lnk2 = new THREE.Mesh(new THREE.BoxGeometry(.75,.05,1.3), LKT); lnk2.position.set(-.95,.085,4.95); lnk2.receiveShadow = true; zn(tag(lnk2,26),'allee'); scene.add(lnk2);
    (function(){
      var car = new THREE.Group(); car.position.set(-8.3,.1,2.6);
      var bodyM = new THREE.MeshStandardMaterial({ color:0x8e9db8, roughness:.5, metalness:.1 }), glM = new THREE.MeshStandardMaterial({ color:0x3b4a5e, roughness:.3, metalness:.1 }), tyM = new THREE.MeshStandardMaterial({ color:0x1a1a1c, roughness:.9 }), rimM = new THREE.MeshStandardMaterial({ color:0xb8bec8, roughness:.3, metalness:.8 });
      function cb(w,h,d,m,x,y,z){ var b = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); b.position.set(x,y,z); b.castShadow = true; b.receiveShadow = true; car.add(b); return b; }
      cb(1.8,.5,4.5,bodyM,0,.58,0);
      cb(1.7,.5,2.3,glM,0,1.05,-.1);
      cb(1.62,.04,1.9,bodyM,0,1.32,-.1);
      cb(1.8,.12,.1,tyM,0,.38,2.25); cb(1.8,.12,.1,tyM,0,.38,-2.25);
      cb(.35,.1,.06,new THREE.MeshStandardMaterial({ color:0xfff6c8, emissive:0x554400 }),.6,.72,2.26); cb(.35,.1,.06,new THREE.MeshStandardMaterial({ color:0xfff6c8, emissive:0x554400 }),-.6,.72,2.26);
      cb(.35,.1,.06,new THREE.MeshStandardMaterial({ color:0xc0302a }),.6,.72,-2.26); cb(.35,.1,.06,new THREE.MeshStandardMaterial({ color:0xc0302a }),-.6,.72,-2.26);
      [[.9,1.4],[-.9,1.4],[.9,-1.4],[-.9,-1.4]].forEach(function(w){
        var t = new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.24,20), tyM); t.rotation.z = Math.PI/2; t.position.set(w[0],.36,w[1]); t.castShadow = true; car.add(t);
        var r = new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.26,16), rimM); r.rotation.z = Math.PI/2; r.position.set(w[0]+(w[0]>0?.01:-.01),.36,w[1]); car.add(r);
      });
      car.traverse(function(o){ tag(o,26); zn(o,'allee'); }); scene.add(car);
    })();
    var BZ = 14.5;
    [-10.4,-6.2].forEach(function(x){ zn(tag(box(.28,1.7,.28,LK.gate,x,.85,BZ,scene),26),'portail'); });
    zn(tag(box(3.9,1.4,.07,LK.gate,-8.3,.8,BZ,scene),26),'portail');
    for(var i=-4;i<=4;i++){ zn(tag(box(.04,1.3,.09,LK.gate,-8.3+i*.43,.8,BZ,scene),26),'portail'); }
    /* portillon piéton dans le prolongement de la porte d'entrée */
    [-2.62,-1.28].forEach(function(x){ zn(tag(box(.16,1.4,.16,LK.gate,x,.7,BZ,scene),26),'portail'); });
    zn(tag(box(1.1,1.1,.06,LK.gate,-1.95,.7,BZ,scene),26),'portail');
    for(var i=-2;i<=2;i++){ zn(tag(box(.04,1.0,.08,LK.gate,-1.95+i*.22,.7,BZ,scene),26),'portail'); }
    tag(box(3.9,.08,.08,M.dark,-8.3,.14,BZ,scene),26);
    var bahM = new THREE.MeshStandardMaterial({ color:0xd8d2c6, roughness:1 });
    var segs = [[-13,BZ,-10.5,BZ],[-6.1,BZ,-2.7,BZ],[-1.2,BZ,13,BZ],[13,BZ,13,-20],[-13,BZ,-13,-20],[-13,-20,13,-20]];
    segs.forEach(function(s){
      var dx = s[2]-s[0], dz = s[3]-s[1], len = Math.hypot(dx,dz), n = Math.max(1,Math.round(len/3));
      var a = Math.atan2(dz,dx);
      var pan = new THREE.Mesh(new THREE.BoxGeometry(len,1.2,.03), LK.fence);
      pan.position.set((s[0]+s[2])/2,.7,(s[1]+s[3])/2); pan.rotation.y = -a; zn(tag(pan,26),'cloture'); scene.add(pan); FP.push(pan);
      var bw = new THREE.Mesh(new THREE.BoxGeometry(len,.62,.22), bahM); bw.position.set((s[0]+s[2])/2,.31,(s[1]+s[3])/2); bw.rotation.y = -a; bw.castShadow = true; bw.receiveShadow = true; zn(tag(bw,26),'cloture'); bw.userData.off = true; scene.add(bw); BAH.push(bw);
      for(var k=0;k<=n;k++){ var po = box(.07,1.3,.07,LK.fencePost,s[0]+dx*k/n,.65,s[1]+dz*k/n,scene); zn(tag(po,26),'cloture'); FPO.push(po); }
    });
    /* haie vive : apparaît (pousse) quand le client choisit « grillage et haie vive » */
    (function(){
      var pts = [], sd = 7;
      function rnd(){ sd = (sd*16807)%2147483647; return sd/2147483647; }
      segs.forEach(function(s){
        var dx = s[2]-s[0], dz = s[3]-s[1], len = Math.hypot(dx,dz), n = Math.max(2,Math.round(len/.42));
        var nx = -dz/len, nz = dx/len, mx = (s[0]+s[2])/2, mz = (s[1]+s[3])/2;
        if(nx*(0-mx)+nz*(2-mz) < 0){ nx = -nx; nz = -nz; }   /* vers l'intérieur du terrain */
        for(var k=0;k<=n;k++){ var u = k/n; pts.push([s[0]+dx*u+nx*.5+(rnd()-.5)*.12, s[1]+dz*u+nz*.5+(rnd()-.5)*.12, .55+rnd()*.35, .8+rnd()*.5]); }
      });
      var im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.5,1), new THREE.MeshStandardMaterial({ color:0xffffff, roughness:1, flatShading:true }), pts.length);
      var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
      pts.forEach(function(p,i){
        m4.compose(new THREE.Vector3(p[0],p[2]*.9,p[1]), q.setFromEuler(new THREE.Euler(rnd()*3,rnd()*3,rnd()*3)), new THREE.Vector3(p[3]*.95,p[3]*1.1,p[3]*.95));
        im.setMatrixAt(i,m4); c.setHSL(.27+rnd()*.06,.45+rnd()*.15,.2+rnd()*.12); im.setColorAt(i,c);
      });
      im.castShadow = true; im.receiveShadow = true; im.raycast = function(){}; im.frustumCulled = false; im.userData.noEdge = true;
      hedgeG = new THREE.Group(); hedgeG.add(im); hedgeG.visible = false; scene.add(hedgeG);
    })();
    var cover = new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.05,24), M.dark); cover.position.set(-7.2,.08,3.4); zn(tag(cover,26),'assain'); scene.add(cover);

    /* réseaux visibles : tout-à-l'égout, micro-station, eaux de pluie */
    (function(){
      var pipeM = new THREE.MeshStandardMaterial({ color:0x9a6a36, roughness:.8 }), lidD = new THREE.MeshStandardMaterial({ color:0x39465a, roughness:.7 }), ringM = new THREE.MeshStandardMaterial({ color:0x8b97a8, roughness:.7 });
      var lidG = new THREE.MeshStandardMaterial({ color:0x4f8f6a, roughness:.7 }), lidB = new THREE.MeshStandardMaterial({ color:0x3d6a9a, roughness:.7 }), grn = new THREE.MeshStandardMaterial({ color:0x5d8f4e, roughness:1 }), boxM = new THREE.MeshStandardMaterial({ color:0xcfd6e2, roughness:.8 });
      function X(o,zone,arr){ zn(tag(o,26),zone); o.userData.off = true; o.castShadow = false; arr.push(o); scene.add(o); return o; }
      function strip(w,d,x,z,mat){ return box(w,.03,d,mat,x,.075,z,null); }
      function lid(r,x,z,mat){ var m = new THREE.Mesh(new THREE.CylinderGeometry(r,r,.05,28),mat); m.position.set(x,.1,z); m.receiveShadow = true; return m; }
      /* tout-à-l'égout : tuyau jusqu'au regard sous la rue */
      X(strip(.26,10.4,-4,10.0,pipeM),'assain',ASS.tae); X(strip(1.9,.26,-5.05,4.75,pipeM),'assain',ASS.tae); X(lid(.32,-4,4.75,lidD),'assain',ASS.tae);
      X(lid(.52,-4,15.7,lidD),'assain',ASS.tae); X(lid(.34,-4,15.7,ringM),'assain',ASS.tae); X(box(.3,.05,.3,ringM,-4,.12,15.7,null),'assain',ASS.tae);
      /* micro-station : cuve enterrée, regards verts, coffret électrique */
      X(strip(.26,2.6,-4,6.1,pipeM),'assain',ASS.micro); X(strip(1.9,.26,-5.05,4.75,pipeM),'assain',ASS.micro); X(lid(.32,-4,4.75,lidD),'assain',ASS.micro);
      X(lid(.7,-4,8.2,lidG),'assain',ASS.micro); X(lid(.4,-4,8.2,ringM),'assain',ASS.micro); X(lid(.26,-4,9.4,lidD),'assain',ASS.micro); X(box(.5,.45,.32,boxM,-5.3,.25,8.2,null),'assain',ASS.micro);
      /* eaux de pluie */
      X(strip(.22,11.0,6.4,10.1,pipeM),'pluvial',PLV.reseau); X(lid(.45,6.4,15.7,lidD),'pluvial',PLV.reseau); X(lid(.28,6.4,15.7,ringM),'pluvial',PLV.reseau);
      X(strip(2.2,.2,7.5,4.6,pipeM),'pluvial',PLV.cuve); X(lid(.85,8.6,4.6,lidB),'pluvial',PLV.cuve); X(lid(.5,8.6,4.6,ringM),'pluvial',PLV.cuve);
      X(box(.9,.05,15,grn,10.6,.06,3,null),'pluvial',PLV.noue);
    })();
    cover.userData.off = true;
    pacG = new THREE.Group(); scene.add(pacG);
    zn(tag(box(.9,1.0,.5,M.accent,6.55,.75,-3.6,pacG),21),'chauffage');
    var fan = new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.04,20), M.dark); fan.rotation.z = Math.PI/2; fan.position.set(6.82,.8,-3.6); zn(tag(fan,21),'chauffage'); pacG.add(fan);
    zn(tag(box(.09,2.6,.09,M.frame,5.85,1.4,W/2+.08,scene),14),'pluvial');
    tag(box(.09,.09,.55,M.frame,5.85,.12,W/2+.35,scene),14);

    /* étapes 16-25 : travaux intérieurs (vue « toit retiré », murs coupés à mi-hauteur) */
    interiorG = new THREE.Group(); scene.add(interiorG);
    etG = new THREE.Group(); etG.position.y = ETY; interiorG.add(etG); vmcG = new THREE.Group(); vmcG.position.y = ETY; interiorG.add(vmcG);
    var DH = 1.03, FY = .26;
    function IT(o,a,b,z){ tag(o,a,b); if(z) zn(o,z); return o; }
    function path(pts,y,t,mat,a,b,g){ for(var k=0;k<pts.length-1;k++) tag(seg(pts[k][0],y,pts[k][1],pts[k+1][0],y,pts[k+1][1],t,mat,g||interiorG),a,b); }
    function spans(a,b,gaps){ var r=[],c=a; gaps.slice().sort(function(p,q){return p[0]-q[0]}).forEach(function(g){ if(g[0]>c) r.push([c,g[0]]); c=Math.max(c,g[1]); }); if(c<b) r.push([c,b]); return r; }
    var metal = new THREE.MeshStandardMaterial({ color:0xf4f6fa, roughness:.5, metalness:.2 });
    var pBlue = new THREE.MeshStandardMaterial({ color:0x3b8fe0, roughness:.5 }), pRed = new THREE.MeshStandardMaterial({ color:0xe04a3b, roughness:.5 });
    var pGrey = new THREE.MeshStandardMaterial({ color:0x6a7280, roughness:.6 }), cOra = new THREE.MeshStandardMaterial({ color:0xf2a23a, roughness:.5 });
    var pHeat = new THREE.MeshStandardMaterial({ color:0xf0814b, roughness:.5 }), isoMat = new THREE.MeshStandardMaterial({ color:0xf2d04a, roughness:1 });
    var ceilY = .22+2.45;
    zn(tag(box(L-2*T,.04,W-2*T,LK.slabIn,0,.24,0,interiorG),6),'solsvie');

    /* cloisons : segments (axe, position, début, fin) — les vides sont les portes */
    var SEG = [['z',-2.4,-3.7,-2.9],['z',-2.4,-2.0,-.45],['z',-2.4,.45,2.0],['z',-2.4,2.9,3.7],
      ['z',-1.5,-3.7,-3.5],['z',-1.5,-2.7,-1.75],['z',-1.5,-.95,-.2],['z',.6,-3.7,-.2],
      ['x',-1.23,-5.7,-2.4],['x',1.23,-5.7,-2.4],['x',-2.5,-1.5,.6],['x',-.2,-1.5,.6]];
    function frameRun(ax,f,a,b,ta,tb,th,g){
      var len = b-a, c = (a+b)/2, z = ax==='z';
      tag(z ? box(th,.05,len,metal,f,FY+.025,c,(g||interiorG)) : box(len,.05,th,metal,c,FY+.025,f,(g||interiorG)),ta,tb);
      tag(z ? box(th,.05,len,metal,f,FY+DH-.025,c,(g||interiorG)) : box(len,.05,th,metal,c,FY+DH-.025,f,(g||interiorG)),ta,tb);
      var last = a; for(var p=a;p<=b+.01;p+=.6){ var q = Math.min(p,b); last = q;
        tag(z ? box(th,DH,.05,metal,f,FY+DH/2,q,(g||interiorG)) : box(.05,DH,th,metal,q,FY+DH/2,f,(g||interiorG)),ta,tb); }
      if(b-last > .08) tag(z ? box(th,DH,.05,metal,f,FY+DH/2,b,(g||interiorG)) : box(.05,DH,th,metal,b,FY+DH/2,f,(g||interiorG)),ta,tb);
    }
    /* 16 : doublage intérieur (isolant jaune entre montants) ; 22 : plaques de plâtre */
    function dbl(len,t,holes,mat,x,z,ry,a,b,zone,pg){
      var hs = []; holes.forEach(function(o){ var top = Math.min(o.y+o.h, DH-.012); if(top-o.y > .25) hs.push({ x:o.x, y:o.y, w:o.w, h:top-o.y }); });
      var g = new THREE.ExtrudeGeometry(wallShape(len,DH,hs,0), { depth:t, bevelEnabled:false }); g.translate(0,0,-t/2);
      var m = new THREE.Mesh(g, mat); m.position.set(x,.22,z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true;
      (pg||interiorG).add(m); tag(m,a,b); if(zone) zn(m,zone); return m;
    }
    var HF = [{x:-1.95,y:0,w:1.0,h:2.1},{x:-4.1,y:.9,w:1.4,h:1.3},{x:2.9,y:0,w:3.2,h:2.2}], HB = [], HW = [], HE = [];
    var IW = L-2*T, IWd = W-2*T;
    [[IW,3.7,0,HF,1],[IW,-3.7,0,HB,-1]].forEach(function(d){   /* façades avant / arrière */
      var sg = d[4];
      dbl(d[0],.12,d[3],isoMat,0,d[1]-sg*.06,0,16,21);
      dbl(d[0],.05,d[3],LK.wallIn,0,d[1]-sg*.145,0,22,99,sg>0?'finition':null);
      spans(-5.6,5.6,sg>0?[[-2.5,-1.4],[1.3,4.5]]:[]).forEach(function(r){ frameRun('x',d[1]-sg*.11,r[0],r[1],16,21,.04); });
    });
    var HR = [{x:0,y:.1,w:4.7,h:2.8}];
    [[-5.7,1],[5.7,-1]].forEach(function(d){                     /* pignons */
      dbl(IWd,.12,d[1]<0?HR:[],isoMat,d[0]+d[1]*.06,0,Math.PI/2,16,21);
      dbl(IWd,.05,d[1]<0?HR:[],LK.wallIn,d[0]+d[1]*.145,0,Math.PI/2,22,99);
      frameRun('z',d[0]+d[1]*.11,-3.6,3.6,16,21,.04);
    });
    /* niveau R+1 : doublage et plaques des murs de l'étage */
    var HFu = [{x:-4.1,y:.7,w:1.4,h:1.3},{x:-1.95,y:.7,w:1.0,h:1.3},{x:1.7,y:.7,w:1.2,h:1.3},{x:4.1,y:.7,w:1.2,h:1.3}], HBu = [{x:-4,y:.7,w:1.4,h:1.3},{x:0,y:.7,w:1.2,h:1.3},{x:-1.5,y:.7,w:1.0,h:1.3}];
    [[IW,3.7,HFu,1],[IW,-3.7,HBu,-1]].forEach(function(d){
      var sg = d[3];
      dbl(d[0],.12,d[2],isoMat,0,d[1]-sg*.06,0,16,21,null,etG);
      dbl(d[0],.05,d[2],LK.wallIn,0,d[1]-sg*.145,0,22,99,null,etG);
    });
    [[-5.7,1,[{x:0,y:.7,w:1.2,h:1.3}]],[5.7,-1,[{x:0,y:.55,w:4.7,h:1.3}]]].forEach(function(d){
      dbl(IWd,.12,d[2],isoMat,d[0]+d[1]*.06,0,Math.PI/2,16,21,null,etG);
      dbl(IWd,.05,d[2],LK.wallIn,d[0]+d[1]*.145,0,Math.PI/2,22,99,null,etG);
    });
    /* 17 : faux plafonds */
    for(var zc=-3.4;zc<=3.5;zc+=1.15) tag(box(L-2*T,.04,.05,metal,0,ceilY,zc,vmcG),17,17);
    for(var xc=-5.4;xc<=5.5;xc+=.6) tag(box(.05,.04,W-2*T,metal,xc,ceilY+.025,0,vmcG),17,17);
    var cpl = tag(box(5.6,.03,W-2*T-.1,new THREE.MeshStandardMaterial({ color:0xffffff, roughness:1, transparent:true, opacity:.3, depthWrite:false }),-2.9,ceilY+.06,0,vmcG),17,17);
    var isoC = tag(box(5.6,.3,W-2*T-.1,new THREE.MeshStandardMaterial({ color:0xf2d04a, roughness:1, transparent:true, opacity:.85 }),2.9,ceilY+.2,0,vmcG),17,17); /* isolation du plafond / des rampants */
    /* ---- VMC : gaines dans les combles (étape 17, et vue « ventilation ») ---- */
    (function(){
      var yD = ceilY+.62, cBlue = new THREE.MeshStandardMaterial({ color:0x3aa0ff, roughness:.5 }), cRed = new THREE.MeshStandardMaterial({ color:0xff6a3d, roughness:.5 });
      var cUnit = new THREE.MeshStandardMaterial({ color:0x8b97a8, roughness:.6 }), cDark = new THREE.MeshStandardMaterial({ color:0x39465a, roughness:.7 });
      var plane = new THREE.MeshStandardMaterial({ color:0xdfe8f5, roughness:1, transparent:true, opacity:.22, depthWrite:false });
      function V(o,arr,ventOnly){ tag(o,17,17); o.userData.vent = true; if(ventOnly) o.userData.ventOnly = true; if(arr) arr.push(o); vmcG.add(o); return o; }
      function cyl(a,b,r,mat,arr){
        var len = Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]), g = new THREE.CylinderGeometry(r,r,len,14); g.rotateX(Math.PI/2);
        var m = new THREE.Mesh(g,mat); m.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2); m.lookAt(b[0],b[1],b[2]); m.castShadow = true; return V(m,arr);
      }
      function ball(p,r,mat,arr){ var m = new THREE.Mesh(new THREE.SphereGeometry(r,12,10),mat); m.position.set(p[0],p[1],p[2]); return V(m,arr); }
      function run(pts,y,mat,arr,r){ for(var i=0;i<pts.length-1;i++){ cyl([pts[i][0],y,pts[i][1]],[pts[i+1][0],y,pts[i+1][1]],r||.075,mat,arr); if(i>0) ball([pts[i][0],y,pts[i][1]],r||.075,mat,arr); } }
      function bouche(x,z,mat,arr,hy){ var d = new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.03,20),mat); d.position.set(x,ceilY-.02,z); V(d,arr); cyl([x,ceilY,z],[x,yD,z],.055,mat,arr); }
      var U = [-1.2,.2]; /* caisson */
      var unit = new THREE.Mesh(new THREE.BoxGeometry(1.1,.4,.7),cUnit); unit.position.set(U[0],yD,U[1]); unit.castShadow = true; V(unit,null);
      var uf = new THREE.Mesh(new THREE.BoxGeometry(.5,.43,.72),cDark); uf.position.set(U[0],yD,U[1]); V(uf,VMC.df);
      /* extraction : cuisine, salle de bain, WC (rouge) */
      run([U,[U[0],-1.35],[-.45,-1.35]],yD,cRed,null); run([[U[0],-1.35],[U[0],-3.1],[-.45,-3.1]],yD,cRed,null); run([U,[3.3,U[1]],[3.3,-3.0]],yD,cRed,null);
      bouche(-.45,-1.35,cRed,null); bouche(-.45,-3.1,cRed,null); bouche(3.3,-3.0,cRed,null);
      /* soufflage double flux (bleu) : chambres et séjour */
      run([U,[-3.3,U[1]]],yD+.0,cBlue,VMC.df); run([[-3.3,-2.4],[-3.3,2.45]],yD,cBlue,VMC.df); [[-2.4],[U[1]],[2.45]].forEach(function(z){ run([[-3.3,z[0]],[-4.05,z[0]]],yD,cBlue,VMC.df); bouche(-4.05,z[0],cBlue,VMC.df); });
      run([U,[U[0],1.7],[3.0,1.7]],yD,cBlue,VMC.df); bouche(3.0,1.7,cBlue,VMC.df); run([[3.0,1.7],[4.9,1.7]],yD,cBlue,VMC.df); bouche(4.9,1.7,cBlue,VMC.df);
      /* prise d'air neuf et rejet en toiture (double flux) / rejet seul (simple flux) */
      cyl([U[0]-.35,yD,U[1]],[U[0]-.35,yD+1.15,U[1]],.075,cBlue,VMC.df); cyl([U[0]+.35,yD,U[1]],[U[0]+.35,yD+1.15,U[1]],.075,cRed,null);
      /* entrées d'air sur les fenêtres (simple flux) */
      [[-4.1,3.62],[2.9,3.62],[-4,-3.62],[-.45,-3.62],[3,-3.62]].forEach(function(p){ var e = new THREE.Mesh(new THREE.BoxGeometry(.42,.07,.09),cBlue); e.position.set(p[0],2.36,p[1]); V(e,VMC.sf); });
      var e2 = new THREE.Mesh(new THREE.BoxGeometry(.09,.07,.42),cBlue); e2.position.set(-5.62,2.36,0); V(e2,VMC.sf);
      var pl = new THREE.Mesh(new THREE.BoxGeometry(L-2*T,.01,W-2*T),plane); pl.position.set(0,ceilY+.01,0); pl.castShadow = false; V(pl,null,true);
      function lab(t,col,x,y,z,arr){ var sp = labelSprite(t,col); sp.position.set(x,y,z); V(sp,arr,true); }
      lab('Caisson de ventilation (VMC)','#fff',U[0],yD+.6,U[1]-.2,null);
      lab('Air neuf soufflé','#8cc8ff',-3.3,yD+.55,-.9,VMC.df); lab('Air vicié extrait','#ffa98a',-.1,yD+.5,-2.2,null);
      lab('Prise d’air neuf','#8cc8ff',U[0]-.35,yD+1.5,U[1]+.2,VMC.df); lab('Rejet de l’air vicié','#ffa98a',U[0]+.4,yD+1.45,U[1]-.3,null);
      lab('Entrées d’air sur les fenêtres','#8cc8ff',-1.0,2.95,3.55,VMC.sf); lab('Cuisine : extraction','#ffa98a',3.3,yD+.45,-3.0,null);
      lab('Séjour : soufflage','#8cc8ff',3.9,yD+.45,1.7,VMC.df);
      if(isoC) isoC.userData.hideInVent = true; if(cpl) cpl.userData.hideInVent = true;
    })();

    /* ---- coupe de la toiture : fermettes ou charpente traditionnelle, isolation sous plafond ou sous rampants ---- */
    (function(){
      CR = new THREE.MeshStandardMaterial({ color:0xdfe5ee, roughness:.9 });
      var base = .22+HT, XL = 2.2, XC = -.9, hf = W/2+.55;
      var cWall = new THREE.MeshStandardMaterial({ color:0xcfd6e2, roughness:.9 }), cWd = new THREE.MeshStandardMaterial({ color:0xc9a26b, roughness:.9 }), cWd2 = new THREE.MeshStandardMaterial({ color:0xa9824c, roughness:.9 });
      var cIso = new THREE.MeshStandardMaterial({ color:0xf2c200, roughness:1 }), cPl = new THREE.MeshStandardMaterial({ color:0xf4f6fa, roughness:.9 });
      var cVolC = new THREE.MeshStandardMaterial({ color:0x6f86a8, roughness:1, transparent:true, opacity:.18, depthWrite:false }), cVolW = new THREE.MeshStandardMaterial({ color:0xff9a52, roughness:1, transparent:true, opacity:.22, depthWrite:false });
      var cFl = new THREE.MeshStandardMaterial({ color:0x9aa6ba, roughness:1 });
      function C(o,grp){ tag(o,40,40); o.userData.coupe = true; if(grp) grp.push(o); scene.add(o); return o; }
      function Bx(w,h,d,mat,x,y,z,grp){ var m = box(w,h,d,mat,x,y,z,null); m.castShadow = true; return C(m,grp); }
      function Br(x,y1,z1,y2,z2,w,t,mat,grp){ var m = bar(x,y1+base,z1,y2+base,z2,w,t,mat,null); return C(m,grp); }
      function Pr(pts,depth,mat,x0,grp){ var sh = new THREE.Shape(); pts.forEach(function(p,i){ if(i) sh.lineTo(p[0],p[1]+base); else sh.moveTo(p[0],p[1]+base); }); sh.closePath();
        var g = new THREE.ExtrudeGeometry(sh,{ depth:depth, bevelEnabled:false }); var m = new THREE.Mesh(g,mat); m.rotation.y = -Math.PI/2; m.position.x = x0; m.castShadow = true; return C(m,grp); }
      function Lb(t,col,x,y,z,grp){ var sp = labelSprite(t,col); sp.position.set(x,y,z); return C(sp,grp); }
      /* base commune : murs porteurs, dalle, couverture */
      [-1,1].forEach(function(sd){ Bx(XL,base+.2,T,cWall,XC,(base-.2)/2,sd*(W/2-T/2),CP.base); });
      [-1,1].forEach(function(sd){ Br(XC,RY+.3,0,Ly(hf)+.3,sd*hf,XL,.1,CR,CP.base); });
      Bx(XL,.14,.3,CR,XC,base+RY+.34,0,CP.base);
      /* fermettes (W) */
      [0,-1.8].forEach(function(x){ var g = CP.ferm;
        Br(x,.08,-W/2-.15,.08,W/2+.15,.09,.2,cWd,g);
        [1,-1].forEach(function(sd){ Br(x,RY-.08,0,Ly(hf)-.08,sd*hf,.09,.2,cWd,g); Br(x,.08,0,Ly(W/4)-.08,sd*W/4,.07,.14,cWd,g); });
        Br(x,.08,0,RY-.1,0,.07,.14,cWd,g); });
      /* charpente traditionnelle (fermes + pannes) */
      [0,-1.8].forEach(function(x){ var g = CP.trad;
        Br(x,.1,-W/2-.15,.1,W/2+.15,.14,.3,cWd,g); Br(x,.1,0,RY-.1,0,.14,.2,cWd,g);
        [1,-1].forEach(function(sd){ Br(x,RY-.1,0,Ly(hf)-.1,sd*hf,.14,.28,cWd,g); Br(x,.1,sd*W/4.2,Ly(W/5)-.2,sd*W/9,.12,.18,cWd,g); }); });
      [.3,.62,.93].forEach(function(f){ [1,-1].forEach(function(sd){ var z = sd*f*half(); Bx(XL,.14,.14,cWd2,XC,base+Ly(z)+.07,z,CP.trad); }); });
      function half(){ return hf; }
      Bx(XL,.2,.2,cWd2,XC,base+RY+.04,0,CP.trad);
      /* isolation sous le plafond (combles perdus) */
      Bx(XL,.03,W-2*T,cPl,XC,base-.25,0,CP.comb); Bx(XL,.32,W-2*T-.1,cIso,XC,base-.075,0,CP.comb);
      Pr([[-(W/2-T),Ly(W/2-T)-.12],[W/2-T,Ly(W/2-T)-.12],[0,RY-.2]],XL,cVolC,.2,CP.comb);
      Lb('Isolant sur le plafond','#ffe27a',.7,base-.05,-2.3,CP.comb); Lb('Plaque de plâtre','#fff',.7,base-.5,2.0,CP.comb); Lb('Combles perdus : non utilisables','#b9c8e0',.7,base+1.4,0,CP.comb);
      /* isolation sous les rampants (combles aménageables) */
      [1,-1].forEach(function(sd){
        var z0 = sd*(W/2-T), z1 = 0, th = .3;
        Pr([[z0,Ly(z0)-.1],[z1,RY-.1],[z1,RY-.1-th],[z0,Ly(z0)-.1-th]],XL,cIso,.2,CP.ramp);
        Pr([[z0,Ly(z0)-.1-th],[z1,RY-.1-th],[z1,RY-.13-th],[z0,Ly(z0)-.13-th]],XL,cPl,.2,CP.ramp);
      });
      Pr([[-(W/2-T),Ly(W/2-T)-.43],[W/2-T,Ly(W/2-T)-.43],[0,RY-.43]],XL,cVolW,.2,CP.ramp);
      Bx(XL,.1,W-2*T,cFl,XC,base-.4,0,CP.ramp);
      Lb('Isolant le long des rampants','#ffe27a',.7,base+.95,-2.2,CP.ramp); Lb('Combles aménagés : volume chauffé','#ffc9a0',.7,base+.2,.3,CP.ramp); Lb('Plancher de l’étage ou des combles','#fff',.7,base-.7,1.9,CP.ramp);

      /* ===== coupe complète : fondations, dalle, murs, plancher d'étage, sous-plafonds ===== */
      function Bs(lv,y1,y2,d,mat,zc,grp){ var m = box(XL+.02*lv,y2-y1,d,mat,XC,(y1+y2)/2,zc,null); m.castShadow = true; return C(m,grp); }
      function mt(c,o){ return new THREE.MeshStandardMaterial({ color:c, roughness:.9, transparent:!!o, opacity:o||1, emissive:c, emissiveIntensity:.5 }); }
      var kEarth = mt(0x6b5a48), kGrav = mt(0x8b8478), kConc = mt(0xb8bec9), kChain = mt(0x98a0ad), kFilm = mt(0x3a7bd5), kHour = mt(0xd9dce2), kPout = mt(0x7f8898), kWood = mt(0xc9a26b), kBA = mt(0xffffff), kRail = mt(0x5b6676), kDuct = mt(0x8fa3bd), kReb = mt(0xe0733a), kMesh = mt(0xe6e9ee), kLaine = mt(0xf2c200,.92);
      var hw = W/2, ZI = hw-T, YS = 2.84, YF = 3.06, YC = 2.67; /* arase intérieure, dessous du plancher, dessus du plancher fini, plafond RDC */
      /* terre, semelles, hérisson, film, dalle, treillis, fers */
      Bs(0,-.9,-.5,12.4,kEarth,0,CP.base);
      [-1,1].forEach(function(sd){
        Bs(0,-.5,-.2,6.2-(hw+.15),kEarth,sd*((6.2+hw+.15)/2),CP.base); Bs(0,-.2,0,6.2-hw,kEarth,sd*((6.2+hw)/2),CP.base);
        Bs(1,-.5,-.2,.9,kChain,sd*(hw-.3),CP.base);
      });
      Bs(0,-.5,-.2,2*(hw-.75),kEarth,0,CP.base);
      Bs(1,-.2,0,2*ZI,kGrav,0,CP.base); Bs(2,-.012,.0,2*ZI,kFilm,0,CP.base); Bs(1,0,.22,2*ZI,kConc,0,CP.base);
      for(var zt=-(ZI-.15); zt<=ZI-.14; zt+=.3){ var mb = box(XL+.14,.035,.035,kMesh,XC,.11,zt,null); C(mb,CP.base); }
      [-1,1].forEach(function(sd){
        var va = box(.05,1.2,.05,kReb,XC+XL/2+.06,.4,sd*(ZI-.09),null); C(va,CP.base);
        var ha = box(.05,.04,.7,kReb,XC+XL/2+.06,.16,sd*(ZI-.09-.35),null); C(ha,CP.base);
      });
      /* chaînage et plancher d'étage (poutrelles + hourdis + dalle de compression + sol) */
      [-1,1].forEach(function(sd){ Bs(2,YS,YF,T,kChain,sd*(hw-T/2),CP.base); });
      Bs(1,YS,YF-.06,2*ZI,kHour,0,CP.base); Bs(2,YF-.06,YF,2*ZI,kWood,0,CP.base);
      [0,-.6].forEach(function(dx,i){ var p = box(.12,.16,2*ZI,kPout,XC+XL/2-.06-dx*0,YS+.08,0,null); p.position.x = XC+XL/2-.03; C(p,CP.base); });
      /* doublage : montants + laine + plaque, RDC et étage, des deux côtés */
      [[.22,YS-.03],[YF,YF+2.5]].forEach(function(rg){ [-1,1].forEach(function(sd){
        Bs(2,rg[0],rg[1],.1,kLaine,sd*(ZI-.05),CP.base); Bs(3,rg[0],rg[1],.014,kBA,sd*(ZI-.107),CP.base);
        Bs(3,rg[0],rg[0]+.03,.05,kRail,sd*(ZI-.05),CP.base); Bs(3,rg[1]-.03,rg[1],.05,kRail,sd*(ZI-.05),CP.base); }); });
      /* faux plafond du RDC : plaque sur fourrures suspendues sous le plancher, plénum pour gaines */
      Bs(2,YC-.04,YC-.026,2*ZI,kBA,0,CP.base);
      for(var zf=-ZI+.3; zf<ZI; zf+=.6) Bs(3,YC-.026,YC+.01,.045,kRail,zf,CP.base);
      for(var zs=-ZI+.9; zs<ZI; zs+=1.2){ var sp = box(.02,YS-YC-.04,.02,kRail,XC+XL/2+.05,(YS+YC)/2,zs,null); C(sp,CP.base); }
      var dc1 = box(XL*.9,.17,.17,kDuct,XC,YC+.11,-1.5,null); dc1.position.x = XC; C(dc1,CP.base);
      var dc2 = box(XL*.9,.07,.09,mt(0xff9a52),XC,YC+.08,1.3,null); C(dc2,CP.base);
      /* plafond de l'étage : fourrures sous la plaque des combles perdus */
      for(var zq=-ZI+.3; zq<ZI; zq+=.6) Bs(3,base-.30,base-.26,.045,kRail,zq,CP.comb);
      /* légendes */
      Lb('Terre compactée','#c9b79a',.7,-.7,-5.2,CP.base); Lb('Semelle en béton armé','#fff',.7,-.38,5.3,CP.base);
      Lb('Hérisson + film étanche','#b9c8e0',.7,-.1,-5.0,CP.base); Lb('Dalle + treillis soudé','#fff',.7,.1,5.6,CP.base);
      Lb('Fers de liaison avec les murs','#ffb07a',.7,.8,-5.2,CP.base);
      Lb('Doublage : laine + plaque','#ffe27a',.7,1.6,-5.4,CP.base); Lb('Mur en parpaings','#fff',.7,1.4,5.6,CP.base);
      Lb('Chaînage + plancher d’étage','#fff',.7,2.92,5.6,CP.base);
      Lb('Plafond : plaque sur fourrures','#fff',.7,2.15,0,CP.base); Lb('Plénum : gaines VMC et câbles','#a8c8ff',.7,3.45,-2.0,CP.base);
      /* légendes communes */
      Lb('Couverture','#fff',.7,base+Ly(2.6)+.9,2.6,CP.base); Lb('Mur porteur','#fff',.7,base-1.0,-3.9,CP.base);
      Lb('Fermettes (treillis en W)','#ffd9a8',.7,base+RY+.65,-.4,CP.ferm); Lb('Charpente traditionnelle : fermes et pannes','#ffd9a8',.7,base+RY+.65,-.4,CP.trad);
    })();

    /* 18 : ossature des cloisons ; 22 : plaques */
    SEG.forEach(function(sg){
      var ax = sg[0], f = sg[1], a = sg[2], b = sg[3], len = b-a, c = (a+b)/2;
      frameRun(ax,f,a,b,18,21,.06,etG);
      IT(ax==='z' ? box(.07,DH,len,LK.wallIn,f,FY+DH/2,c,etG) : box(len,DH,.07,LK.wallIn,c,FY+DH/2,f,etG),22,99,'portesint');
    });
    /* 19 : plomberie (collecteurs sous dalle, colonnes dans les cloisons et le doublage) */
    path([[-5.9,3.4],[-1.8,3.4],[-1.8,-3.1],[-.5,-3.1]],.34,.1,pBlue,19,22);
    path([[-1.8,-1.5],[-.2,-1.5]],.34,.1,pBlue,19,22);
    path([[-1.8,.1],[.75,.1],[.75,-3.2],[3.2,-3.2]],.34,.1,pBlue,19,22);
    path([[1.05,-3.0],[1.05,-.9],[-.5,-.9]],.34,.1,pRed,19,22);
    path([[1.05,-3.0],[3.4,-3.0]],.34,.1,pRed,19,22);
    path([[3.3,-3.05],[3.3,-.6],[-2.15,-.6],[-2.15,3.55],[-7.2,3.55]],.3,.18,pGrey,19,22);
    path([[.3,-3.3],[.3,-.6]],.3,.18,pGrey,19,22); path([[-.4,-1.2],[-.4,-.6]],.3,.18,pGrey,19,22);
    [[-.5,-3.1,pBlue],[-.2,-3.1,pRed],[.3,-3.3,pGrey],[-.4,-1.2,pGrey]].forEach(function(v){ tag(box(.09,2.9,.09,v[2],v[0],1.7,v[1],interiorG),19,22); });
    path([[-.5,-3.1],[.05,-3.1]],.34,.1,pBlue,19,22,etG); path([[-.5,-3.1],[-.5,-2.1]],.34,.1,pBlue,19,22,etG); path([[-.2,-3.1],[-.2,-2.1]],.34,.1,pRed,19,22,etG); path([[-.4,-1.2],[-.4,-.6]],.3,.18,pGrey,19,22,etG);
    var ball = new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.9,18), M.accent); ball.position.set(1.05,.72,-3.3); ball.castShadow = true; tag(ball,19,25); interiorG.add(ball);
    [[3.35,-3.64,pBlue],[3.65,-3.64,pRed],[-.7,-.25,pBlue],[-.4,-.25,pRed],[.05,-3.5,pBlue],[-.35,-2.46,pBlue],[-.65,-2.46,pRed]].forEach(function(v){ tag(box(.07,.8,.07,v[2],v[0],.62,v[1],interiorG),19,21); });
    /* 20 : électricité (gaines orange dans les cloisons et le doublage, tableau, prises) */
    tag(box(.45,.6,.1,new THREE.MeshStandardMaterial({ color:0xd9d4c4, roughness:.8 }),-1.2,.78,3.55,interiorG),20,25);
    path([[-1.2,3.62],[-5.6,3.62]],.85,.07,cOra,20,21); path([[-1.2,3.62],[1.1,3.62]],.85,.07,cOra,20,21); path([[4.7,3.62],[5.62,3.62]],.85,.07,cOra,20,21);
    path([[-5.62,3.6],[-5.62,-3.6]],.85,.07,cOra,20,21); path([[5.62,3.6],[5.62,-3.6]],.85,.07,cOra,20,21); path([[-5.6,-3.62],[5.6,-3.62]],.85,.07,cOra,20,21);
    SEG.forEach(function(sg){ var ax = sg[0], f = sg[1]; path(ax==='z' ? [[f,sg[2]+.05],[f,sg[3]-.05]] : [[sg[2]+.05,f],[sg[3]-.05,f]],.85,.07,cOra,20,21,etG); });
    function UG(o){ return ((o[0]<=-1.0 && o[1]<1.2) || (o[0]===-.2 && o[1]===-3.0)) ? etG : interiorG; }
    [[-5.55,-3.0],[-5.55,-1.9],[-5.55,.6],[-5.55,-.6],[-5.55,1.9],[-5.55,3.0],[5.55,-1.5],[5.55,.5],[5.55,2.9],[1.5,3.55],[-.3,3.55],[1.9,-3.55],[4.4,-3.55],[-.2,-3.0]].forEach(function(o,n){
      var hy = (n%2)?1.0:.45; tag(box(.07,.85-hy+.04,.07,cOra,o[0],(.85+hy)/2,o[1],UG(o)),20,21);
      tag(box(.2,.2,.1,LK.plate,o[0],hy,o[1],UG(o)),20,99); });
    [[-2.5,-2.95],[-2.5,.6],[-2.5,3.0],[-1.42,-.7],[-1.0,-2.58],[-.7,3.55],[.9,3.55],[1.4,-3.55]].forEach(function(o){ tag(box(.12,.2,.12,LK.plate,o[0],.95,o[1],UG(o)),20,99); });
    zn(tag(box(.5,.25,.4,M.dark,.2,1.15,-3.0,etG),20,99),'ventilation');
    /* 21 : chauffage (plancher chauffant, radiateurs, réseau) */
    path([[6.4,.9],[5.4,.9]],.34,.1,pHeat,21,22);
    for(var k=0;k<7;k++){ var hz = -2.4+k*.97; path([[1.3,hz],[5.4,hz]],.34,.1,pHeat,21,22); if(k<6) path([[(k%2)?1.3:5.4,hz],[(k%2)?1.3:5.4,hz+.97]],.34,.1,pHeat,21,22); }
    path([[1.3,.9],[-5.0,.9]],.34,.1,pHeat,21,22); path([[-5.0,.9],[-5.0,-2.9]],.34,.1,pHeat,21,22); path([[-5.0,.9],[-5.0,2.5]],.34,.1,pHeat,21,22);
    [[-5.5,-2.9],[-5.5,.5],[-5.5,2.5]].forEach(function(r){ tag(box(.12,.5,1.0,M.white,r[0],.62,r[1],r[1]<1.2?etG:interiorG),21,99); });
    tag(box(.12,.6,.5,M.white,-1.38,.7,-1.45,etG),21,99);
    /* 22 : portes intérieures */
    [[-2.4,-2.45,'z'],[-2.4,0,'z'],[-1.5,-3.1,'z'],[-1.5,-1.35,'z']].forEach(function(d){
      var dm = IT(box(.045,2.04,1,LK.doorI,d[0],FY+1.02,d[1],etG),22,99,'portesint'); dm.userData.gap = (d[0]===-1.5?.8:.9); IDR.push(dm); });
    /* 23 : sols et peinture */
    zn(tag(box(3.3,.02,5.0,LK.floorB,-4.05,.265,-1.2,etG),23,99),'solsch');
    zn(tag(box(6.6,.02,7.4,LK.floorM,.9,.265,0,etG),23,99),'solsch');
    zn(tag(box(11.4,.02,7.4,LK.floorV,0,.265,0,interiorG),23,99),'solsvie');
    zn(tag(box(3.7,.02,2.9,LK.floorK,3.85,.272,-2.25,interiorG),23,99),'solcuis');
    /* 23 : murs peints / faïence par pièce (peaux fines devant les plaques) */
    function skin(r,mat,zone,gaps,pg){
      var x0=r[0], x1=r[1], z0=r[2], z1=r[3];
      [[z0,'x'],[z1,'x'],[x0,'z'],[x1,'z']].forEach(function(e,i){
        var along = e[1]==='x', a = along?x0:z0, b = along?x1:z1, g = (gaps && gaps[i]) || [];
        spans(a,b,g).forEach(function(sp){ var len = sp[1]-sp[0], c = (sp[0]+sp[1])/2;
          var m = along ? box(len,DH,.02,mat,c,FY+DH/2,e[0],pg||interiorG) : box(.02,DH,len,mat,e[0],FY+DH/2,c,pg||interiorG); zn(tag(m,23,99),zone); });
      });
    }
    skin([-5.53,-2.45,-3.53,-1.28],LK.wallCh,'muchambres',{3:[[-2.9,-2.0]]},etG);
    skin([-5.53,-2.45,-1.18,1.18],LK.wallCh,'muchambres',{3:[[-.45,.45]]},etG);
    skin([-1.45,.55,-2.45,-.25],LK.wallSdb,'sdb',{2:[[-1.75,-.95]]},etG);
    skin([-1.45,.55,-3.53,-2.55],LK.wallSdb,'sdb',{2:[[-3.5,-2.7]]},etG);
    /* 24 : cuisine et salle de bains */
    IT(box(3.2,.9,.62,LK.kitchen,3.2,.71,-3.2,interiorG),24,99,'cuisine');
    IT(box(2.0,.9,.9,LK.kitchen,3.4,.71,-1.6,interiorG),24,99,'cuisine');
    IT(box(.7,1.1,.65,LK.kitchen,5.15,.82,-3.2,interiorG),24,99,'cuisine');
    tag(box(.6,.03,.5,M.dark,2.6,1.17,-3.2,interiorG),24,99); tag(box(.6,.05,.45,M.frame,3.65,1.17,-3.2,interiorG),24,99);
    bathM = tag(box(1.7,.55,.75,M.white,-.5,.55,-2.05,etG),24,99); zn(bathM,'sdb');
    showerM = [tag(box(1.0,.07,1.0,M.white,-.5,.32,-1.95,etG),24,99), tag(box(.04,.85,1.0,M.glass,.0,.72,-1.95,etG),24,99)]; showerM.forEach(function(o){ zn(o,'sdb'); o.userData.off = true; });
    italM = [tag(box(1.0,.008,1.0,new THREE.MeshStandardMaterial({ color:0x8fa3b8, roughness:.7 }),-.5,.274,-1.95,etG),24,99), tag(box(.9,.012,.035,new THREE.MeshStandardMaterial({ color:0x5b6572, roughness:.4, metalness:.8 }),-.5,.28,-1.55,etG),24,99)]; italM.forEach(function(o){ zn(o,'sdb'); o.userData.off = true; });
    tag(box(.9,.9,.5,M.white,-.6,.7,-.45,etG),24,99);
    tag(box(.4,.4,.65,M.white,.05,.45,-3.3,etG),24,99); tag(box(.4,.5,.2,M.white,.05,.7,-3.58,etG),24,99);
    tag(box(.35,.8,.3,M.white,-1.2,.7,-3.5,etG),24,99);
    /* 25 : mobilier */
    [[-4.7,-2.7],[-4.7,-.1]].forEach(function(b){ tag(box(2.0,.45,1.4,M.accent,b[0],.5,b[1],etG),25,99); tag(box(.35,.12,.9,M.white,b[0]-.75,.78,b[1],etG),25,99); });
    [[-4.2,-1.55],[-4.2,.95]].forEach(function(b){ tag(box(1.3,1.0,.55,M.frame,b[0],.78,b[1],etG),25,99); });
    /* rez-de-chaussée : escalier, coin salon à gauche */
    var stM = cclone(M.white);
    for(var si=0;si<14;si++){ var sh = .2*(si+1); tag(box(.23,sh,1.0,stM,-5.55+.23*si+.115,.26+sh/2,2.6,interiorG),18,99); }
    tag(box(3.3,.05,.06,cclone(M.frame),-3.95,.26+1.45,3.12,interiorG),18,99);
    tag(box(2.4,.45,.9,M.accent,-4.2,.47,-3.0,interiorG),25,99); tag(box(2.4,.55,.2,M.accent,-4.2,.75,-3.4,interiorG),25,99);
    tag(box(1.1,.35,.6,M.white,-4.2,.45,-1.8,interiorG),25,99); tag(box(.4,.55,1.6,M.dark,-5.45,.52,-1.5,interiorG),25,99);
    tag(box(.3,1.2,1.8,M.frame,-5.42,.86,-.1,interiorG),25,99);
    /* mezzanine (étage) : salon haut ouvert sur la baie */
    tag(box(2.2,.45,.9,M.accent,1.9,.47,2.6,etG),25,99); tag(box(2.2,.55,.2,M.accent,1.9,.75,3.0,etG),25,99);
    tag(box(1.6,.06,.8,M.white,2.5,.75,-3.0,etG),25,99); [[-.7,-.3],[.7,-.3],[-.7,.3],[.7,.3]].forEach(function(p){ tag(box(.05,.5,.05,M.frame,2.5+p[0],.5,-3.0+p[1],etG),25,99); });
    tag(box(.4,.45,.4,M.accent,2.5,.48,-2.3,etG),25,99); tag(box(.4,1.1,2.4,M.frame,3.6,.8,-1.2,etG),25,99);
    tag(box(1.8,.06,.9,M.white,2.6,.95,.9,interiorG),25,99);
    [[-.78,-.38],[.78,-.38],[-.78,.38],[.78,.38]].forEach(function(p){ tag(box(.06,.7,.06,M.frame,2.6+p[0],.6,.9+p[1],interiorG),25,99); });
    [[1.9,.1],[3.3,.1],[1.9,1.7],[3.3,1.7],[2.6,-.05],[2.6,1.85]].forEach(function(c){ tag(box(.4,.45,.4,M.accent,c[0],.48,c[1],interiorG),25,99); });
    tag(box(2.2,.45,.9,M.accent,4.4,.47,2.9,interiorG),25,99); tag(box(2.2,.55,.2,M.accent,4.4,.75,3.33,interiorG),25,99);
    tag(box(1.0,.35,.6,M.white,4.4,.45,1.8,interiorG),25,99); tag(box(.4,.5,1.6,M.dark,5.45,.52,1.8,interiorG),25,99);

    var w = host.clientWidth||600, h = host.clientHeight||420;
    camera = new THREE.PerspectiveCamera(38, w/h, .5, 220);
    camera.position.set(15,10,21);
    /* vide sanitaire : murettes + grilles de ventilation (visibles seulement si le client choisit un plancher sur vide) */
    (function(){
      var mur = new THREE.MeshStandardMaterial({ color:0xb4bdcb, roughness:.9 }), vent = new THREE.MeshStandardMaterial({ color:0x2c323c, roughness:1 });
      function add(m){ m.userData.off = true; tag(m,5); videL.push(m); return m; }
      add(box(L+.4,.3,.2,mur,0,.15,(W+.4)/2-.1,scene)); add(box(L+.4,.3,.2,mur,0,.15,-(W+.4)/2+.1,scene));
      add(box(.2,.3,W,mur,(L+.4)/2-.1,.15,0,scene)); add(box(.2,.3,W,mur,-(L+.4)/2+.1,.15,0,scene));
      for(var i=0;i<4;i++){ var x = -L/2+1.5+i*(L-3)/3;
        [1,-1].forEach(function(sd){ var v = add(box(.46,.15,.06,vent,x,.15,sd*((W+.4)/2),scene)); v.castShadow = false; }); }
      for(var j=0;j<3;j++){ var z = -W/3+j*W/3;
        [1,-1].forEach(function(sd){ var v = add(box(.06,.15,.46,vent,sd*((L+.4)/2),.15,z,scene)); v.castShadow = false; }); }
      scene.children.forEach(function(o){ var st = o.userData && o.userData.stage; if(st && st[0] >= 4 && st[0] <= 9 && st[1] >= 6 && videL.indexOf(o) < 0) riseL.push(o); });
      if(slabM) riseL.push(slabM);
    })();
    scene.traverse(function(o){ if(o !== scene && o !== wallsG && o !== roofG && o !== pacG && o !== interiorG){ o.updateMatrix(); o.matrixAutoUpdate = false; } });
  }

  /* ---------- ancres des zones ---------- */
  var ANCH = {
    couverture:{p:[3.5,7.15,2.1],n:[0,.82,.57],m:'out'},
    murs:{p:[-5.55,2.9,4.2],n:[0,.15,1],m:'out'},
    menuiseries:{p:[-4.1,1.55,4.25],n:[0,0,1],m:'out'},
    volets:{p:[-3.1,1.5,4.3],n:[0,0,1],m:'out'},
    porte:{p:[-1.95,2.2,4.25],n:[0,0,1],m:'out'},
    plancher:{p:[5.4,.15,4.7],n:[0,.3,1],m:'out'},
    chauffage:{p:[6.55,1.3,-3.6],n:[1,0,0],m:'out'},
    pluvial:{p:[6.4,3.0,4.5],n:[.7,0,.7],m:'out'},
    assain:{p:[-4,.2,8.2],n:[0,1,.5],m:'out'},
    allee:{p:[-1.95,.15,10],n:[0,1,.6],m:'out'},
    portail:{p:[-5.5,1.6,14.55],n:[0,0,1],m:'out'},
    cloture:{p:[6,1.3,14.55],n:[0,0,1],m:'out'},
    isoltoit:{p:[-3,2.9,-1.5],n:[0,1,.2],m:'in'},
    isolant:{p:[3,2.9,-2.2],n:[0,1,.2],m:'in'},
    ventilation:{p:[.2,4.2,-3.0],n:[0,1,.3],m:'in',fl:'up'},
    solsvie:{p:[3,.35,1],n:[0,1,.4],m:'in'},
    solsch:{p:[-4.0,3.15,-.9],n:[0,1,.4],m:'in',fl:'up'},
    finition:{p:[1.2,1.05,-3.55],n:[0,0,1],m:'in'},
    cuisine:{p:[3.2,1.3,-3.2],n:[0,.3,1],m:'in'},
    portesint:{p:[-2.4,3.8,0],n:[1,0,.4],m:'in',fl:'up'}
  };

  /* pièces : zoom, détails (prises, interrupteurs, murs, sols…) */
  var roomSel = null;
  var ROOMS = [
    {id:'chambres',t:'Les chambres',c:[-4.05,0,-1.2],cam:[[.5,9.2,1.0],[-4.05,.3,-1.2]],items:[['muchambres','Murs des chambres',[-5.5,.9,-1.2]],['solsch','Sol des chambres',[-4,.3,-1.2]],['appareillage','Prises et interrupteurs',[-5.5,.5,-1.6]]]},
    {id:'sdbwc',t:'Salle de bain et WC',c:[-.45,0,-2.2],cam:[[2.4,6.2,.2],[-.45,.3,-2.2]],items:[['sdb','Baignoire ou douche, WC',[-.5,.9,-2.2]],['ventilation','Ventilation',[.2,1.3,-3.0]]]},
    {id:'sejour',t:'Séjour et cuisine',c:[3.3,0,0],cam:[[7.5,7.5,6.8],[3.0,.3,-.2]],items:[['cuisine','Cuisine',[3.2,1.3,-3.2]],['finition','Murs du séjour',[5.5,1.0,.3]],['solsvie','Sol',[3.0,.3,1.2]],['menuiseries','Baie vitrée',[2.9,1.0,3.5]],['volets','Volets roulants',[4.4,1.1,3.6]],['chauffage','Plancher chauffant',[4.5,.3,-.6]],['appareillage','Prises et interrupteurs',[5.55,.5,2.9]]]},
    {id:'entree',t:'Entrée et couloir',c:[-1.95,0,.8],cam:[[1.3,5.6,6.6],[-1.9,.3,.4]],items:[['porte','Porte d’entrée',[-1.95,1.0,3.6]],['solsvie','Sol',[-1.95,.3,1.5]],['appareillage','Interrupteurs',[-.7,.95,3.55]]]},
    {id:'ch1',t:'Chambre 1',c:[-4.05,0,-2.4],cam:[[-1.2,5.0,.9],[-4.0,.3,-2.4]],items:[['solsch','Sol',[-4.0,.3,-2.5]],['muchambres','Murs',[-5.5,.9,-2.2]],['appareillage','Prises et interrupteurs',[-5.5,.5,-3.0]],['chauffage','Radiateur',[-5.5,.9,-2.9]],['menuiseries','Fenêtre',[-4,1.0,-3.6]],['portesint','Porte',[-2.4,.9,-2.45]]]},
    {id:'ch2',t:'Chambre 2',c:[-4.05,0,0],cam:[[-1.2,5.0,3.6],[-4.0,.3,0]],items:[['solsch','Sol',[-4.0,.3,-.2]],['muchambres','Murs',[-5.5,.9,.9]],['appareillage','Prises et interrupteurs',[-5.5,.5,-.8]],['chauffage','Radiateur',[-5.5,.9,.5]],['menuiseries','Fenêtre',[-5.7,1.0,-.2]],['portesint','Porte',[-2.4,.9,0]]]},
    {id:'sdb',t:'Salle de bain',c:[-.45,0,-1.35],cam:[[2.4,4.6,1.4],[-.45,.3,-1.4]],items:[['sdb','Baignoire / douche',[-.5,.9,-2.0]],['solsvie','Sol et faïence',[-.5,.3,-.9]],['chauffage','Sèche-serviettes',[-1.38,.9,-1.45]],['appareillage','Prises et interrupteurs',[-1.4,.95,-.7]],['portesint','Porte',[-1.5,.9,-1.35]]]},
    {id:'wc',t:'WC',c:[-.45,0,-3.1],cam:[[1.9,4.2,-.3],[-.45,.3,-3.1]],items:[['sdb','WC et lave-mains',[.05,.9,-3.3]],['solsvie','Sol',[-.5,.3,-3.0]],['ventilation','Ventilation',[.2,1.3,-3.0]],['appareillage','Interrupteur',[-1.0,.95,-2.58]],['portesint','Porte',[-1.5,.9,-3.1]]]}
  ];
  ROOMS.forEach(function(r){ r.up = (r.id !== 'entree' && r.id !== 'sejour'); if(r.up){ r.cam[0][1] += ETY; r.cam[1][1] += ETY; r.items.forEach(function(i){ i[2][1] += ETY; }); } });
  H.rooms = ROOMS.map(function(r){ return { id:r.id, t:r.t, items:r.items.map(function(i){ return { id:i[0], t:i[1] }; }) }; });
  function mkOne(layer,key,z,p,n,m,room,entry){
    var el = document.createElement('div'); el.className = 'h3-sp' + (entry ? ' room' : ''); el.setAttribute('data-z', key);
    el.innerHTML = '<button class="h3-dot" type="button" aria-label="'+z.t+'"></button><span class="h3-line"></span><button class="h3-lab" type="button"><b>'+z.t+'</b><small></small><em>Toucher pour choisir ›</em></button>';
    layer.appendChild(el);
    spots[key] = { el:el, z:z, p:new THREE.Vector3(p[0],p[1],p[2]), n:new THREE.Vector3(n[0],n[1],n[2]).normalize(), m:m, open:false, room:room||null, entry:entry||null };
    el.querySelector('.h3-dot').addEventListener('click', function(ev){ ev.stopPropagation(); if(entry) H.room(entry); else activate(key); });
    el.querySelector('.h3-lab').addEventListener('click', function(ev){ ev.stopPropagation(); onPick(z.id); });
  }
  function mkSpots(layer){
    zones.forEach(function(z){ var a = ANCH[z.id]; if(a){ mkOne(layer,z.id,z,a.p,a.n,a.m); spots[z.id].fl = a.fl || null; } });
    ROOMS.forEach(function(r){
      mkOne(layer,'room:'+r.id,{ id:r.id, t:r.t },[r.c[0],.5+(r.up?ETY:0),r.c[2]],[0,1,.3],'in',null,r.id); spots['room:'+r.id].fl = r.up ? 'up' : null;
      r.items.forEach(function(it,i){ mkOne(layer,r.id+':'+i,{ id:it[0], t:it[1] },it[2],[0,1,.3],'room',r.id,null); spots[r.id+':'+i].fl = r.up ? 'up' : null; });
    });
  }
  function roomKeyFor(zid){ var k = null; Object.keys(spots).forEach(function(key){ var s = spots[key]; if(s.room === roomSel && s.z.id === zid && !s.entry && !k) k = key; }); return k; }
  function mkSpotsOld(layer){
    zones.forEach(function(z){
      var a = ANCH[z.id]; if(!a) return;
      var el = document.createElement('div'); el.className = 'h3-sp'; el.setAttribute('data-z', z.id);
      el.innerHTML = '<button class="h3-dot" type="button" aria-label="'+z.t+'"></button><span class="h3-line"></span><button class="h3-lab" type="button"><b>'+z.t+'</b><small></small><em>Toucher pour choisir ›</em></button>';
      layer.appendChild(el);
      var s = { el:el, z:z, p:new THREE.Vector3(a.p[0],a.p[1],a.p[2]), n:new THREE.Vector3(a.n[0],a.n[1],a.n[2]).normalize(), m:a.m, open:false };
      el.querySelector('.h3-dot').addEventListener('click', function(ev){ ev.stopPropagation(); activate(z.id); });
      el.querySelector('.h3-lab').addEventListener('click', function(ev){ ev.stopPropagation(); onPick(z.id); });
      spots[z.id] = s;
    });
  }

  function activate(id){
    var sp0 = spots[id]; if(!sp0) return;
    if(forceId === id){ onPick(sp0.z.id); return; }
    forceId = id; if(sp0.m !== 'room') focusOn(id); dirty = true; kick();
  }
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function visibleChain(o){ while(o){ if(!o.visible) return false; o = o.parent; } return true; }
  function pickAt(cx, cy){
    var r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx-r.left)/r.width)*2-1, -((cy-r.top)/r.height)*2+1);
    ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObjects(scene.children, true);
    for(var i=0;i<hits.length;i++){
      var o = hits[i].object, z = o.userData && o.userData.zone;
      if(!visibleChain(o)) continue;
      if(!z){ if(o.material && o.material.transparent && o.material.opacity < .5) continue; break; }
      if(mode === 'room'){ var rk = roomKeyFor(z); if(rk){ activate(rk); return true; } continue; }
      var sp = spots[z];
      if(sp && sp.m === mode){ activate(z); return true; }
      if(sp && sp.m !== mode) continue;
    }
    return false;
  }

  var v3 = new THREE.Vector3(), cd = new THREE.Vector3();
  var mp = new THREE.Vector3(), mn = new THREE.Vector3();
  function placeSpots(){
    if(!host) return;
    var w = host.clientWidth, h = host.clientHeight, cand = [];
    Object.keys(spots).forEach(function(id){
      var s = spots[id], el = s.el;
      var show = (s.m === mode) && (!s.room || s.room === roomSel) && (s.m === 'out' || s.m === 'room' || (s.fl === 'up') === floorUp);
      v3.set(s.p.x,s.p.y,-s.p.z).project(camera);
      var behind = v3.z > 1;
      cd.copy(camera.position).sub(mp.set(s.p.x,s.p.y,-s.p.z));
      var dist = cd.length();
      var facing = cd.normalize().dot(mn.set(s.n.x,s.n.y,-s.n.z)) > .12;
      if(!show || behind){ el.style.display = 'none'; s.near = false; return; }
      el.style.display = '';
      var sx = (v3.x*.5+.5)*w, sy = (-v3.y*.5+.5)*h;
      el.style.transform = 'translate('+sx.toFixed(1)+'px,'+sy.toFixed(1)+'px)';
      el.classList.toggle('back', !facing);
      el.classList.toggle('flip', sy < 110);
      s.sx = sx;
      el.style.zIndex = String(1000 - Math.round(dist));
      s.near = dist < 17 && facing && sy > 70;
      s.sc = Math.hypot(v3.x, v3.y);
      if(s.near) cand.push(s);
    });
    cand.sort(function(a,b){ return a.sc - b.sc; });
    var w2 = host.clientWidth;
    var top2 = (forceId && spots[forceId] && spots[forceId].m === mode) ? [spots[forceId]] : []; /* texte uniquement après un clic */
    Object.keys(spots).forEach(function(id){ var s = spots[id], o = top2.indexOf(s) >= 0; s.el.classList.toggle('open', o);
      if(o){ var lab = s.el.querySelector('.h3-lab'), lw = lab.offsetWidth, x = s.sx - lw/2, nx = Math.max(8, Math.min(x, w2 - 8 - lw)); lab.style.marginLeft = (nx - x).toFixed(0) + 'px'; } });
  }

  function applyStates(){
    Object.keys(spots).forEach(function(id){
      var s = spots[id], st = states[s.z.id] || {};
      s.el.classList.toggle('done', st.state === 'done');
      s.el.classList.toggle('imp', st.state === 'imposed');
      var sm = s.el.querySelector('small');
      sm.textContent = st.sub || '';
    });
    dirty = true; kick();
  }

  function animWorkers(t){
    for(var i=0;i<workers.length;i++){
      var w = workers[i], g = w.g; if(!g.visible) continue;
      var sw = (w.ph>3.1) ? .8 : -.2;
      if(w.kind === 'walk'){
        var p = 0, u = .5, dir = true, hd = Math.atan2(w.b[0]-w.a[0], w.b[1]-w.a[1]);
        g.position.set(w.a[0]+(w.b[0]-w.a[0])*u, w.y, w.a[1]+(w.b[1]-w.a[1])*u);
        g.rotation.y = dir ? hd : hd+Math.PI;
        w.legs[0].rotation.x = sw*.6; w.legs[1].rotation.x = -sw*.6;
        if(w.carry){ w.arms[0].rotation.x = w.arms[1].rotation.x = -1.3; } else { w.arms[0].rotation.x = -sw*.5; w.arms[1].rotation.x = sw*.5; }
      } else {
        g.rotation.y = Math.atan2(w.b[0]-w.a[0], w.b[1]-w.a[1]);
        g.position.y = w.y + Math.abs(sw)*.02;
        if(w.up){ w.arms[0].rotation.x = -2.7; w.arms[1].rotation.x = -2.7; }
        else { w.arms[1].rotation.x = -1.9; w.arms[0].rotation.x = -.6; }
      }
    }
  }
  var CAMS = {
    1:[[16,12,18],[0,0,3]], 2:[[14,9,16],[-3,0,5]], 3:[[11,7.5,11],[0,.1,0]], 4:[[11,7.5,11],[0,.2,0]], 5:[[11,8.5,13],[0,.3,0]],
    6:[[9.5,5,11.5],[0,.7,1.5]], 7:[[10.5,6,12],[0,1.2,1.5]], 8:[[9,5.5,13],[0,2,3]], 9:[[13,8,15],[0,2,0]],
    10:[[11,9,12],[0,3.4,0]], 11:[[11,9,12],[0,3.6,0]], 12:[[11,9.5,12],[0,3.8,0]], 13:[[11,10,12],[0,4,0]], 14:[[13,11,15],[0,3.6,0]],
    15:[[8,3.6,14.5],[0,1.4,3.8]],
    16:[[.5,15,8.5],[0,.2,.2]], 17:[[.5,15,8.5],[0,.2,.2]], 18:[[.5,15,8.5],[0,.2,.2]], 19:[[.5,15,8.5],[0,.2,.2]], 20:[[.5,15,8.5],[0,.2,.2]],
    21:[[.5,15,8.5],[0,.2,.2]], 22:[[.5,15,8.5],[0,.2,.2]], 23:[[.5,15,8.5],[0,.2,.2]], 24:[[.5,15,8.5],[0,.2,.2]], 25:[[.5,15,8.5],[0,.2,.2]],
    26:[[15,10,24],[0,1,6]]
  };
  [7,8,9,10,11,12,13,14,15].forEach(function(k){ var c = CAMS[k]; c[1][1] += 2.2; c[0][1] += 3.2; c[0][0] *= 1.15; c[0][2] *= 1.15; });
  /* ---------- animation de caméra ---------- */
  function ease(t){ return t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
  function flyTo(pos, tgt, ms){ flyRaw(new THREE.Vector3(pos.x,pos.y,-pos.z), new THREE.Vector3(tgt.x,tgt.y,-tgt.z), ms); }
  function flyRaw(pos, tgt, ms){
    anim = { t0: performance.now(), ms: ms||850, p0: camera.position.clone(), t0v: controls.target.clone(), p1: pos, t1: tgt };
    kick();
  }
  function focusOn(id){
    var s = spots[id]; if(!s) return;
    if(s.m === 'in') setFloor(s.fl === 'up', false);
    var dir = s.n.clone(); if(Math.abs(dir.y) > .8) dir.set(0,.7,.7).normalize();
    var pos = s.p.clone().add(dir.multiplyScalar(s.m === 'out' && s.p.y > 2.5 ? 11 : 8.5)); pos.y = Math.max(pos.y + 1.5, 3);
    flyTo(pos, s.p.clone().add(new THREE.Vector3(0,-.2,0)), 900);
  }
  function overview(){
    if(coupeOn || ventOn){ leaveSpecial(); applyStage(); }
    if(mode === 'room'){ mode = 'in'; roomSel = null; forceId = null; host.setAttribute('data-mode','in'); window.dispatchEvent(new CustomEvent('px3d-room',{ detail:null })); }
    var ak = camera.aspect > .8 ? 1 : 1.9;
    var fy = floorUp ? ETY : 0;
    if(mode === 'in') flyTo(new THREE.Vector3(.5*ak,15*(ak>1?1.25:1)+fy,8.5*ak), new THREE.Vector3(0,.2+fy,.2), 900);
    else flyTo(new THREE.Vector3(30*ak,6+7*ak,-11*ak), new THREE.Vector3(.5,2.8,-.5), 900);
  }

  function setMode(m){
    if(coupeOn || ventOn){ leaveSpecial(); applyStage(); }
    if(m === mode) return;
    if(stage != null) setStage(null);
    if(m === mode) { overview(); return; }
    if(roomSel){ roomSel = null; window.dispatchEvent(new CustomEvent('px3d-room',{ detail:null })); }
    mode = m; partsIn = (m === 'in'); if(!partsIn) floorUp = false; applyStage();
    anim = anim; // la vue est recadrée plus bas
    overview();
    tweenParts(m === 'in');
    host.setAttribute('data-mode', m);
    dirty = true; kick();
  }
  function cutOf(k){ return k >= .999 ? 99 : .22 + 2.7*k + (floorUp ? ETY : 0); }
  function updFl(){ if(!flb) return; flb.style.display = partsIn ? 'flex' : 'none'; [].forEach.call(flb.children,function(b){ var on = (b.getAttribute('data-f') === '1') === floorUp; b.style.background = on ? '#4da3f0' : 'rgba(10,22,40,.82)'; b.style.color = on ? '#0a1628' : '#e6eefb'; }); }
  function setFloor(up, fly){
    up = !!up; if(up === floorUp) { updFl(); return; }
    floorUp = up; cutC = cutOf(wallK); syncClip(); applyStage(); updFl();
    if(fly){ var d = up ? ETY : -ETY; flyRaw(camera.position.clone().add(new THREE.Vector3(0,d,0)), controls.target.clone().add(new THREE.Vector3(0,d,0)), 700); }
    dirty = true; kick();
  }
  function setPartsNow(toIn){
    if(!toIn) floorUp = false;
    part = null; wallK = toIn ? .38 : 1; roofOp = toIn ? 0 : 1;
    wallsG.scale.y = 1; cutC = cutOf(wallK); syncClip(); M.roof.opacity = roofOp; roofG.visible = roofOp > .02; roofG.position.y = .22 + 5.6*wallK + (1-roofOp)*3;
  }
  var part = null;
  function tweenParts(toInterior){
    part = { t0: performance.now(), ms: 700, w0: wallK, w1: toInterior ? .38 : 1, r0: roofOp, r1: toInterior ? 0 : 1 };
    kick();
  }
  function stepParts(now){
    if(!part) return false;
    var k = Math.min(1,(now-part.t0)/part.ms), e = ease(k);
    wallK = part.w0 + (part.w1-part.w0)*e; roofOp = part.r0 + (part.r1-part.r0)*e;
    wallsG.scale.y = 1; cutC = cutOf(wallK); syncClip();
    M.roof.opacity = roofOp; roofG.visible = roofOp > .02;
    roofG.position.y = .22 + 5.6*wallK + (1-roofOp)*3;
    if(k >= 1) part = null;
    return true;
  }

  /* ---------- matières choisies par le client ---------- */
  var NEUTRAL = { doorI:0xe9edf4, wall:0xf4f6fa, roof:0xdfe5ee, frame:0x9fb2c6, door:0xb9c6da, gate:0xb9c6da, fencePost:0x7d8ca6, allee:0xc6cedc, floorV:0xc9d3e2, floorB:0xbac5d6, floorK:0xc9d3e2, wallIn:0xf4f6fa, kitchen:0xb9c6da, plate:0xf4f6fa, wallCh:0xf4f6fa, wallSdb:0xe9eef5 };
  var CH_F = [], CH_T = [];
  var hedgeG = null, hedgeAnim = null, hedgeOn = false;
  function stepHedge(now){
    if(!hedgeAnim) return false;
    var k = Math.min(1,(now-hedgeAnim)/900), e = 1-Math.pow(1-k,3);
    hedgeG.scale.set(1,Math.max(.001,e),1); hedgeG.updateMatrix(); hedgeG.updateMatrixWorld(true);
    if(k>=1) hedgeAnim = null;
    return true;
  }
  function setLook(look){
    look = look || {};
    var trad = (look.charp === 'trad'); CH_F.forEach(function(o){ o.userData.off = trad; }); CH_T.forEach(function(o){ o.userData.off = !trad; });
    var wantH = !!(look.fence && look.fence.h);
    if(hedgeG && wantH !== hedgeOn){
      hedgeOn = wantH; hedgeG.visible = wantH;
      if(wantH){ hedgeAnim = performance.now(); hedgeG.scale.set(1,.001,1); hedgeG.updateMatrix(); hedgeG.updateMatrixWorld(true); }
    }
    Object.keys(NEUTRAL).forEach(function(k){
      var hex = look[k] != null ? look[k] : NEUTRAL[k];
      if(k === 'wallIn') lookWallIn = hex;
      if(LK[k]) LK[k].color.setHex(hex);
    });
    curWT = look.wallTex ? matTex(look.wallTex) : null; if(look.wallTex === 'brique') LK.wall.color.setHex(0xffffff);
    curRT = look.roofTex ? matTex(look.roofTex) : null;
    if(curRT){ M.roof.map = curRT.map; M.roof.bumpMap = curRT.map; M.roof.bumpScale = curRT.bs; M.roof.color.setHex(look.roof != null ? look.roof : 0xdfe5ee); }
    else { M.roof.map = TEXT; M.roof.bumpMap = null; }
    M.roof.needsUpdate = true;
    var FDIM = { floorV:[11.4,7.4], floorB:[3.3,5.0], floorM:[6.6,7.4], floorK:[3.7,2.9] };
    LK.floorM.color.copy(LK.floorB.color);
    ['floorV','floorB','floorM','floorK'].forEach(function(k){
      var key = look.floorTex && look.floorTex[k === 'floorM' ? 'floorB' : k], m = LK[k];
      if(key){ var t = ftex(key,FDIM[k][0],FDIM[k][1]); m.map = t; m.bumpMap = t; m.bumpScale = matTex(key).bs; m.color.setHex(0xffffff); m.roughness = .78; }
      else { m.map = null; m.bumpMap = null; m.roughness = 1; }
      m.needsUpdate = true;
    });
    curCharp = look.charp === 'trad' ? 'trad' : 'ferm'; curIso = look.iso || (curCharp === 'trad' ? 'ramp' : 'comb');
    var vm = look.vmc === 'sf' ? 'sf' : 'df';
    VMC.df.forEach(function(o){ o.userData.off = (vm !== 'df'); }); VMC.sf.forEach(function(o){ o.userData.off = (vm !== 'sf'); });
    CR.color.setHex(look.roof != null ? look.roof : 0xdfe5ee); refreshCoupe();
    var alt = look.alleeTex ? ftex('al_'+look.alleeTex,1.3,10.3) : null;
    if(alt){ LK.allee.map = alt; LK.allee.bumpMap = alt; LK.allee.bumpScale = matTex('al_'+look.alleeTex).bs; LK.allee.color.setHex(0xffffff); } else { LK.allee.map = null; LK.allee.bumpMap = null; }
    if(LKP){ [[LKP,3.4,14.7],[LKS,4.0,1.3],[LKT,.75,1.3]].forEach(function(a){ var m = a[0], tx = look.alleeTex ? ftex('al_'+look.alleeTex,a[1],a[2]) : null; m.color.copy(LK.allee.color); m.map = tx; m.bumpMap = tx; m.bumpScale = LK.allee.bumpScale; m.needsUpdate = true; }); }
    LK.allee.needsUpdate = true;
    ASS.tae.forEach(function(o){ o.userData.off = (look.assain !== 'collectif'); }); ASS.micro.forEach(function(o){ o.userData.off = (look.assain !== 'micro'); });
    var pl = look.pluv || []; ['reseau','cuve','noue'].forEach(function(k){ PLV[k].forEach(function(o){ o.userData.off = (pl.indexOf(k) < 0); }); });
    var bh = !!(look.fence && look.fence.b);
    BAH.forEach(function(o){ o.userData.off = !bh; });
    FP.forEach(function(o){ o.position.y = bh ? 1.19 : .7; o.scale.y = bh ? .95 : 1; o.updateMatrix(); });
    FPO.forEach(function(o){ o.position.y = bh ? .877 : .65; o.scale.y = bh ? 1.35 : 1; o.updateMatrix(); });
    FRC.color.copy(LK.frame.color); DRC.color.copy(LK.door.color);
    if(look.wallSdb != null) LK.wallSdb.color.setHex(look.wallSdb);
    if(look.fence){ LK.fence.color.setHex(look.fence.c); LK.fence.opacity = look.fence.o; }
    else { LK.fence.color.setHex(0x9fb2c6); LK.fence.opacity = .28; }
    SH.forEach(function(m){ m.userData.off = m.userData.bayC ? !(look.shutters === true || look.shutters === 'mix') : (look.shutters !== true); });
    DV.forEach(function(m){ m.userData.off = !look.doorVit; });
    IDR.forEach(function(m){ m.scale.z = Math.min(look.doorW || .83, m.userData.gap - .02); m.updateMatrix(); });
    SHBW.forEach(function(m){ m.userData.off = !(look.shutters === 'batt' || look.shutters === 'mix'); });
    SHBB.forEach(function(m){ m.userData.off = (look.shutters !== 'batt'); });
    if(bathM){ var it = (look.sdb === 'italienne'), sh = (look.sdb === 'douche' || look.sdb === 'duo' || it); bathM.userData.off = sh; showerM.forEach(function(o,k){ o.userData.off = !sh || (it && k === 0); }); italM.forEach(function(o){ o.userData.off = !it; }); }
    if(pacG) pacG.visible = (look.pac !== false);
    setVide(!!(look.plancher && look.plancher !== 'terre'));
    applyStage(); dirty = true; kick();
  }
  function setVide(w){
    if(w === videWant) return; videWant = w;
    videL.forEach(function(o){ o.userData.off = !w; });
    videAnim = { t0:performance.now(), ms:650, from:videY, to:(w ? .3 : 0) };
  }
  function stepVide(now){
    if(!videAnim) return false;
    var k = Math.min(1,(now-videAnim.t0)/videAnim.ms), e = 1-Math.pow(1-k,3), y = videAnim.from+(videAnim.to-videAnim.from)*e, d = y-videY; videY = y;
    if(k >= 1) videY = videAnim.to;
    [wallsG,roofG,interiorG].forEach(function(g){ if(g){ if(g.userData.y0 == null) g.userData.y0 = g.position.y - (videY-d); g.position.y = g.userData.y0 + videY; } });
    riseL.forEach(function(o){ if(o.userData.y0 == null) o.userData.y0 = o.position.y - (videY-d); o.position.y = o.userData.y0 + videY; o.updateMatrix(); });
    scene.updateMatrixWorld(true);
    if(k >= 1) videAnim = null;
    return true;
  }
  var WALLTO = {6:.9, 7:3.1, 8:4.7};
  function applyStage(){
    scene.traverse(function(o){
      var st = o.userData && o.userData.stage; if(!st) return;
      if(coupeOn){ o.visible = !!o.userData.coupe && !o.userData.off; return; }
      var v = (stage == null) ? (st[1] >= 99 && !o.userData.off) : (stage >= st[0] && stage <= st[1] && !o.userData.off);
      if(o.userData.ventOnly) v = v && ventOn; if(o.userData.hideInVent && ventOn) v = false;
      o.visible = v;
    });
    if(gndM) gndM.forEach(function(o){ o.visible = !coupeOn; }); if(etG) etG.visible = !partsIn || floorUp; updFl();
    LK.wallIn.color.setHex((stage != null && stage < 23) ? 0xcdd2dc : lookWallIn);
    LK.slabIn.color.setHex((stage != null && stage < 23) ? 0x7f8ca3 : 0xe9edf3);
    var cons = (stage != null && stage <= 14);
    var wantMap = cons ? TEXB : (curWT ? curWT.map : null), wantBump = cons ? null : (curWT ? curWT.map : null);
    if(LK.wall.map !== wantMap){ LK.wall.map = wantMap; LK.wall.needsUpdate = true; }
    if(LK.wall.bumpMap !== wantBump){ LK.wall.bumpMap = wantBump; LK.wall.bumpScale = curWT ? curWT.bs : 1; LK.wall.needsUpdate = true; }
  }
  function leaveSpecial(){ if(coupeOn || ventOn){ coupeOn = false; ventOn = false; if(mode === 'coupe') mode = 'out'; host.setAttribute('data-mode',mode); } }
  function setStage(n){
    leaveSpecial();
    var prev = stage;
    stage = (n == null) ? null : n;
    var toH;
    if(stage != null){
      var wantIn = stage >= 16 && stage <= 25;
      if(floorUp){ floorUp = false; }
      if(wantIn !== partsIn){ partsIn = wantIn; setPartsNow(wantIn); }
      mode = 'stage';
      toH = stage < 6 ? 0 : (WALLTO[stage] || 99);
      var cam = CAMS[stage] || CAMS[1];
      flyTo(new THREE.Vector3(cam[0][0],cam[0][1],cam[0][2]), new THREE.Vector3(cam[1][0],cam[1][1],cam[1][2]), prev == null ? 650 : 650);
    } else {
      if(partsIn){ partsIn = false; setPartsNow(false); }
      if(mode === 'stage') mode = 'out';
      toH = 99;
    }
    if(prev == null){ rise = null; wallH = toH; syncClip(); }
    else if(toH === 99 && stage != null && stage >= 9 && wallH < 99 && prev != null && prev < 9){ rise = { t0:performance.now(), ms:600, f:Math.min(wallH,.5), t:8, end:99 }; }
    else if(toH === wallH){ rise = null; }
    else if(toH === 99){ rise = null; wallH = 99; syncClip(); }
    else { rise = { t0:performance.now(), ms:(stage==null?1:500), f:Math.min(wallH,8), t:toH, end:toH }; }
    host.setAttribute('data-mode', mode);
    endGrow();
    applyStage();
    if(stage != null && prev != null && stage > prev) startGrow();
    dirty = true; kick();
  }
  var grow = null;
  function endGrow(){ if(!grow) return; grow.items.forEach(function(it){ it.o.position.y = it.y0; it.o.updateMatrix(); }); grow = null; }
  function startGrow(){
    endGrow();
    var items = [];
    scene.traverse(function(o){ var st = o.userData && o.userData.stage;
      if(st && st[0] === stage && o.visible && o.userData.zone !== 'murs' && o.isMesh) items.push({ o:o, y0:o.position.y, d:0 }); });
    if(!items.length) return;
    items.forEach(function(it,i){ it.d = (i/items.length)*350; it.o.position.y = it.y0 + 1.6; it.o.updateMatrix(); });
    grow = { t0:performance.now(), items:items }; kick();
  }
  function stepGrow(now){
    if(!grow) return false;
    var done = true;
    grow.items.forEach(function(it){
      var k = Math.max(0,Math.min(1,(now-grow.t0-it.d)/450)); if(k < 1) done = false;
      var e = 1-Math.pow(1-k,3); it.o.position.y = it.y0 + (1-e)*1.6; it.o.updateMatrix();
    });
    if(done){ endGrow(); }
    return true;
  }
  function stepRise(now){
    if(!rise) return false;
    var k = Math.min(1,(now-rise.t0)/rise.ms); wallH = rise.f + (rise.t-rise.f)*ease(k);
    syncClip();
    if(k >= 1){ wallH = rise.end; syncClip(); rise = null; }
    return true;
  }

  /* ---------- boucle de rendu à la demande ---------- */
  function resize(){
    if(!renderer || !host.clientWidth) return;
    var w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w,h,false); camera.aspect = w/h; camera.updateProjectionMatrix(); dirty = true; kick();
  }
  function frame(now){
    loopOn = false;
    if(!active || document.hidden) return;
    var moving = false;
    if(anim){
      var k = Math.min(1,(now-anim.t0)/anim.ms), e = ease(k);
      camera.position.lerpVectors(anim.p0, anim.p1, e);
      controls.target.lerpVectors(anim.t0v, anim.t1, e);
      if(k >= 1) anim = null; moving = true;
    }
    if(stepParts(now)) moving = true;
    if(stepRise(now)) moving = true;
    if(stepVide(now)) moving = true;
    if(stepHedge(now)) moving = true;
    if(stepGrow(now)) moving = true;
    if(controls.update()) moving = true;
    if(moving || dirty){ renderer.render(scene, camera); placeSpots(); dirty = false; }
    if(moving) kick();
  }
  function kick(){ if(loopOn || !active) return; loopOn = true; requestAnimationFrame(frame); }

  /* ---------- API publique ---------- */
  H.init = function(el, zs, pick){
    if(H.ready) return;
    host = el; zones = zs; onPick = pick;
    try{
      renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false, powerPreference:'high-performance' });
    }catch(e){
      try{ renderer = new THREE.WebGLRenderer({ antialias:false, alpha:false }); }
      catch(e2){ window.dispatchEvent(new Event('px3d-fail')); return; }
    }
    var small = Math.min(window.innerWidth, window.innerHeight) < 700;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, small ? 1.5 : 2));
    renderer.localClippingEnabled = true; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    var cv = renderer.domElement; cv.className = 'h3-cv'; cv.setAttribute('aria-label','Maquette 3D de la maison'); cv.setAttribute('role','img');
    host.appendChild(cv);
    var layer = document.createElement('div'); layer.className = 'h3-layer'; host.appendChild(layer);
    flb = document.createElement('div'); flb.className = 'h3-fl'; flb.style.cssText = 'position:absolute;left:12px;top:54px;display:none;z-index:6;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.4);pointer-events:auto';
    flb.innerHTML = '<button type="button" data-f="0">RDC</button><button type="button" data-f="1">Étage</button>';
    [].forEach.call(flb.children,function(b){ b.style.cssText = 'border:0;padding:9px 14px;font:600 13px system-ui,sans-serif;cursor:pointer'; b.addEventListener('click',function(ev){ ev.stopPropagation(); setFloor(b.getAttribute('data-f') === '1', true); }); });
    host.appendChild(flb); updFl();
    build();
    controls = new OrbitControls(camera, cv);
    controls.enableDamping = true; controls.dampingFactor = .08;
    controls.minDistance = 4; controls.maxDistance = 48; controls.maxPolarAngle = Math.PI/2 - .04;
    controls.target.set(.5,2.8,.5); controls.screenSpacePanning = false;
    (function(){ var ak = (host.clientWidth||600)/(host.clientHeight||420) > .8 ? 1 : 1.9; camera.position.set(30*ak,6+7*ak,11*ak);  })();
    controls.addEventListener('change', function(){ dirty = true; kick(); });
    controls.addEventListener('start', function(){ anim = null; forceId = null; dirty = true; kick(); if(!H._touched){ H._touched = true; window.dispatchEvent(new Event('px3d-touch')); } var t = document.getElementById('h3-hint'); if(t) t.style.display = 'none'; });
    mkSpots(layer);
    resize();
    if(window.ResizeObserver) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);
    H.ready = true;
    var down = null;
    cv.addEventListener('pointerdown', function(ev){ down = { x:ev.clientX, y:ev.clientY, t:performance.now() }; });
    cv.addEventListener('pointerup', function(ev){
      if(!down) return;
      var moved = Math.hypot(ev.clientX-down.x, ev.clientY-down.y), dt = performance.now()-down.t; down = null;
      if(moved < 7 && dt < 600){ if(!pickAt(ev.clientX, ev.clientY) && forceId){ forceId = null; dirty = true; kick(); } }
    });
    cv.addEventListener('webglcontextlost', function(ev){ ev.preventDefault(); });
    cv.addEventListener('webglcontextrestored', function(){ dirty = true; kick(); });
    document.addEventListener('visibilitychange', function(){ if(!document.hidden){ dirty = true; kick(); } });
    if(H._look) setLook(H._look);
    applyStates(); renderer.render(scene, camera); placeSpots();
  };
  H.setLook = function(l){ if(H.ready) setLook(l); else H._look = l; };
  H.setStage = function(n){ if(H.ready) setStage(n); };
  H.setActive = function(on){ active = !!on; if(on){ resize(); dirty = true; kick(); } };
  H.update = function(s){ states = s || {}; if(H.ready) applyStates(); };
  H.room = function(id){
    if(!H.ready) return; var r = null; ROOMS.forEach(function(x){ if(x.id === id) r = x; }); if(!r) return;
    if(stage != null) setStage(null);
    if(!partsIn){ partsIn = true; tweenParts(true); }
    floorUp = !!r.up; cutC = cutOf(wallK); syncClip(); applyStage();
    mode = 'room'; roomSel = id; forceId = null; host.setAttribute('data-mode', mode);
    var tg = new THREE.Vector3(r.cam[1][0],r.cam[1][1],r.cam[1][2]), cp = new THREE.Vector3(r.cam[0][0],r.cam[0][1],r.cam[0][2]);
    cp.sub(tg).multiplyScalar(1.35).add(tg); tg.z += 0.0;
    flyTo(cp, tg, 800);
    window.dispatchEvent(new CustomEvent('px3d-room',{ detail:id }));
    dirty = true; kick();
  };
  H.setMode = function(m){ if(H.ready) setMode(m); };
  H.getMode = function(){ return mode; };
  H.coupe = function(view){
    if(!H.ready) return; if(stage != null || coupeOn || ventOn) setStage(null);
    coupeOn = true; mode = 'coupe'; host.setAttribute('data-mode','coupe'); refreshCoupe(); applyStage();
    var k = camera.aspect > .8 ? 1 : 1.9, V = THREE.Vector3;
    var VW = { dalle:[[-.9+9*k,1.4,2.4+.8],[-.9,.2,2.4]], mur:[[-.9+10*k,2.4,2.6+.8],[-.9,1.5,2.6]], plafond:[[-.9+11*k,3.4,-.3+.8],[-.9,2.8,-.3]], toit:[[15*k,6.3,2.7*k],[0,6.0,0]] };
    var w = VW[view];
    if(w) flyTo(new V(w[0][0],w[0][1],w[0][2]), new V(w[1][0],w[1][1],w[1][2]), 800);
    else { var dc = camera.aspect > .8 ? 22 : 38; flyTo(new V(dc,dc*.2+3.0,dc*.12), new V(0,3.2,0), 800); }
    dirty = true; kick();
  };
  H.vent = function(){
    if(!H.ready) return; setStage(17); ventOn = true; floorUp = true; cutC = cutOf(wallK); syncClip(); applyStage();
    var dv = camera.aspect > .8 ? .62 : 1; flyTo(new THREE.Vector3(.8+6.2*dv,5.2+18.6*dv,-.2+16.2*dv), new THREE.Vector3(.8,5.2,-.2), 800); dirty = true; kick();
  };
  H.overview = function(){ if(H.ready) overview(); };
  H.focus = function(id){ if(H.ready) focusOn(id); };
  H.zoomIn = function(f){ if(!H.ready) return; var d = camera.position.clone().sub(controls.target); d.multiplyScalar(f); camera.position.copy(controls.target).add(d); dirty = true; kick(); };

  window.PXHouse = H;
  window.dispatchEvent(new Event('px3d-ready'));
})();
