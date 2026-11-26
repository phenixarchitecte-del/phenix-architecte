/* =====================================================================
   PHÉNIX — CARNET DE PROJET, ÉCRAN DU CLIENT (phenix_carnet_vue.js)
   Le carnet tel que le client le voit, dans son espace (phenix_client.html › Mon carnet) :
   accueil sur la maison en 3D (points dorés), questions pas à pas avec la maquette qui prend
   la couleur de l'option touchée, synthèse. Charte « avec caractère » (navy, or par touches,
   Italiana + Jost), téléphone en paysage, tablette et ordinateur.
   Aucun prix : seulement la plus-value en % de chaque choix. Les questions viennent de
   phenix_carnet_questions.js ; la 3D de phenix_maquette3d.js (maquette ArchiCAD du dossier)
   ou de phenix_maison3d.js (maison type, tant que la maquette n'est pas prête).

   Utilisation (la page hôte fournit l'accès aux données) :
     PhenixCarnetVue.ouvrir({ pid, nom, sousTitre, logo, filigrane, lireFiche, ecouterChoix, ecrireChoix,
       morceau, notifier, apercu, qui, onNav })

   HISTORIQUE
   25/11/2026 — Création (remplace la partie client de phenix_carnet.html, qui garde l'Atelier).
   ===================================================================== */
(function (global) {
  'use strict';
  var P = global.PhenixCarnet;
  var S = null;          // état de l'écran
  var root = null, css = false, eng = null;

  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var $ = function (id) { return document.getElementById(id); };

  // ── styles (une seule fois) ──
  function styles() {
    if (css) return; css = true;
    var st = document.createElement('style'); st.id = 'pcv-css';
    st.textContent = [
      '#pcv{position:fixed;inset:0;z-index:40;background:#0b1f4a;color:#fff;font-family:Jost,system-ui,sans-serif;font-weight:300;overflow:hidden}',
      '#pcv .wm{position:absolute;left:18%;top:-8%;height:120%;width:auto;opacity:.10;pointer-events:none}',
      '#pcv button{font-family:inherit;cursor:pointer}',
      '#pcv button:focus-visible,#pcv a:focus-visible,#pcv select:focus-visible{outline:2px solid #d4b26a;outline-offset:2px}',
      '#pcv .ital{font-family:Italiana,serif;font-weight:400}',
      /* zone 3D : plein écran sur l'accueil, à gauche en question */
      '#pcv-3d{position:absolute;left:var(--rail,0px);top:0;right:0;bottom:0;transition:right .35s ease;z-index:0;isolation:isolate}',
      '#pcv-ui{position:absolute;inset:0;z-index:1;pointer-events:none}#pcv-ui>*{pointer-events:auto}',
      '#pcv.q #pcv-3d{right:var(--pan,380px)}',
      '#pcv.s #pcv-3d{display:none}',
      '#pcv-3d .h3-cv{display:block;width:100%;height:100%;outline:0;cursor:grab}',
      '#pcv-3d .h3-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden}',
      '#pcv-3d .h3-sp{position:absolute;left:0;top:0;will-change:transform}',
      '#pcv-3d .h3-dot{pointer-events:auto;position:absolute;left:-9px;top:-9px;width:18px;height:18px;border-radius:50%;border:1.5px solid #f3dca6;background:#d4b26a;box-shadow:0 0 0 0 rgba(212,178,106,.6);animation:pcvp 2.4s infinite;padding:0;color:#0b1f4a}',
      '#pcv-3d .h3-dot::before{content:"";position:absolute;inset:-12px;border-radius:50%}',
      '#pcv-3d .h3-sp.done .h3-dot{background:#0b1f4a;animation:none}',
      '#pcv-3d .h3-sp.done .h3-dot::after{content:"✓";color:#f3dca6;font:500 10px/15px Jost,sans-serif}',
      '#pcv-3d .h3-sp.imp .h3-dot{background:#2f4f86;border-color:#8aa5cc;animation:none}',
      '#pcv-3d .h3-sp.imp .h3-dot::after{content:"P";color:#dfe9f6;font:500 9px/15px Jost,sans-serif}',
      '#pcv-3d .h3-sp.back .h3-dot{opacity:.4}',
      '#pcv-3d .h3-line,#pcv-3d .h3-lab{display:none}',
      '#pcv-3d .h3-sp.open .h3-line{display:block;position:absolute;left:0;bottom:9px;width:1px;height:30px;background:#d4b26a}',
      '#pcv-3d .h3-sp.open .h3-lab{display:block;pointer-events:auto;position:absolute;left:0;transform:translateX(-50%);bottom:40px;white-space:nowrap;text-align:left;background:rgba(11,31,74,.92);color:#fff;border:.75px solid #d4b26a;border-radius:12px;padding:7px 12px;font:400 13px Jost,sans-serif}',
      '#pcv-3d .h3-lab small,#pcv-3d .h3-lab em{display:block;font:300 11px Jost,sans-serif;color:#a9c1e3;font-style:normal;max-width:240px;overflow:hidden;text-overflow:ellipsis}',
      '#pcv-3d .h3-sp.flip.open .h3-line{bottom:auto;top:9px}#pcv-3d .h3-sp.flip.open .h3-lab{bottom:auto;top:40px}',
      '@keyframes pcvp{0%{box-shadow:0 0 0 0 rgba(212,178,106,.6)}70%{box-shadow:0 0 0 12px rgba(212,178,106,0)}100%{box-shadow:0 0 0 0 rgba(212,178,106,0)}}',
      '#pcv .chargement{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;color:#a9c1e3;pointer-events:none}',
      /* blocs flottants */
      '#pcv .tete{position:absolute;left:calc(var(--rail,0px) + 22px);top:16px;pointer-events:none;max-width:46%}',
      '#pcv .marque{display:flex;align-items:center;gap:10px}',
      '#pcv .marque img{width:24px;height:35px;object-fit:contain}',
      '#pcv .marque b{display:block;font-size:13px;font-weight:400;letter-spacing:6px;color:#d4b26a}',
      '#pcv .marque small{display:block;font-size:10px;color:#8aa5cc;margin-top:1px}',
      '#pcv .tete h1{margin:12px 0 0;font-family:Italiana,serif;font-weight:400;font-size:30px;line-height:1}',
      '#pcv .tete .l1{margin-top:5px;font-size:12px;color:#a9c1e3}#pcv .tete .l2{margin-top:4px;font-size:11px;color:#8aa5cc}',
      '#pcv .menu{position:absolute;right:16px;top:8px;display:flex;gap:14px;font-size:13px;z-index:3}',
      '#pcv .menu button{background:none;border:none;color:#dfe9f6;min-height:44px;padding:0 4px;font-size:13px;font-weight:300}',
      '#pcv .menu button[aria-current="page"]{text-decoration:underline;text-decoration-color:#d4b26a;text-underline-offset:6px}',
      '#pcv .prog{position:absolute;left:calc(var(--rail,0px) + 22px);bottom:calc(var(--bas,0px) + 18px);width:250px;pointer-events:none}',
      '#pcv .prog{padding:6px 10px;margin-left:-10px;border-radius:12px;background:rgba(11,31,74,.72);box-shadow:0 0 10px 4px rgba(11,31,74,.55)}',
      '#pcv .tete{padding:6px 10px;margin-left:-10px;border-radius:12px;background:rgba(11,31,74,.55);box-shadow:0 0 12px 6px rgba(11,31,74,.45)}',
      '#pcv-3d .h3-fl{left:14px!important;top:44px!important;border-radius:20px!important;border:.5px solid #3b5f96;box-shadow:none!important}#pcv-3d .h3-fl button{min-height:36px;padding:0 14px!important;background:rgba(11,31,74,.85)!important;color:#cfdcef!important;font:400 12px Jost,sans-serif!important}#pcv-3d .h3-fl button.on,#pcv-3d .h3-fl button[aria-pressed="true"]{background:rgba(212,178,106,.25)!important;color:#f3dca6!important}',
      '#pcv .prog .l{display:flex;justify-content:space-between;font-size:11px;color:#a9c1e3}#pcv .prog .l span+span{color:#f3dca6}',
      '#pcv .barre{margin-top:7px;height:3px;border-radius:2px;background:#2f4f86;overflow:hidden}#pcv .barre i{display:block;height:100%;background:#d4b26a}',
      '#pcv .vues{position:absolute;right:18px;bottom:calc(var(--bas,0px) + 10px);display:flex;gap:6px;z-index:3}',
      '#pcv .vues button{min-height:40px;padding:0 12px;border-radius:20px;border:.5px solid #3b5f96;background:rgba(11,31,74,.8);color:#cfdcef;font-size:12px;font-weight:400}',
      '#pcv .vues button[aria-pressed="true"]{border:1px solid #d4b26a;color:#f3dca6}',
      /* navigation de l'espace : rail à gauche (téléphone en paysage), barre en bas (tablette, ordinateur) */
      '#pcv .nav{position:absolute;z-index:4;display:flex;gap:8px}',
      '#pcv .nav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:.75px solid #2f4f86;background:rgba(11,31,74,.9);color:#cfdcef;font-size:11px;font-weight:400}',
      '#pcv .nav button[aria-current="page"]{color:#f3dca6;border:1px solid #d4b26a;background:rgba(212,178,106,.14)}',
      '#pcv .nav svg{stroke:currentColor}',
      '#pcv.rail{--rail:76px}#pcv.rail .nav{left:10px;top:0;bottom:0;flex-direction:column;justify-content:center}#pcv.rail .nav button{width:58px;height:58px;border-radius:16px}',
      '#pcv.barreb{--bas:74px}#pcv.barreb .nav{left:50%;bottom:12px;transform:translateX(-50%);padding:6px;border-radius:22px;background:#12285a;border:.75px solid #3b5f96}#pcv.barreb .nav button{width:96px;height:52px;border-radius:16px}',
      '#pcv.barreb.q .nav{left:calc((100% - var(--pan,380px)) / 2)}',
      /* question : panneau à droite */
      '#pcv .pan{position:absolute;right:0;top:0;bottom:0;width:var(--pan,380px);box-sizing:border-box;padding:16px 24px 0 22px;border-left:.5px solid #2f4f86;background:rgba(11,31,74,.92);display:flex;flex-direction:column;z-index:2}',
      '#pcv .pan .haut{display:flex;justify-content:space-between;align-items:center}',
      '#pcv .lien{background:none;border:none;color:#a9c1e3;font-size:11px;text-decoration:underline;text-underline-offset:3px;min-height:36px;padding:0}',
      '#pcv .pan .pos{margin-top:8px;display:flex;justify-content:space-between;font-size:10px;color:#8aa5cc}',
      '#pcv .pan h2{margin:8px 0 0;font-family:Italiana,serif;font-weight:400;font-size:27px;line-height:1.05}',
      '#pcv .pan .qq{margin-top:6px;font-size:12px;line-height:1.45;color:#a9c1e3}',
      '#pcv .opts{margin-top:12px;display:flex;flex-direction:column;gap:7px;overflow-y:auto;flex:1;padding-bottom:8px}',
      '#pcv .opt{display:flex;align-items:center;gap:12px;min-height:52px;padding:8px 14px;border-radius:16px;border:.5px solid #3b5f96;background:rgba(11,31,74,.7);color:#fff;text-align:left}',
      '#pcv .opt[aria-pressed="true"]{border:1px solid #d4b26a;background:rgba(212,178,106,.12)}',
      '#pcv .opt .rond{flex:none;width:18px;height:18px;border-radius:50%;border:1px solid #8aa5cc;display:flex;align-items:center;justify-content:center}',
      '#pcv .opt[aria-pressed="true"] .rond{border-color:#d4b26a;background:#d4b26a}#pcv .opt[aria-pressed="true"] .rond::after{content:"✓";color:#0b1f4a;font:500 11px Jost,sans-serif}',
      '#pcv .opt b{display:block;font-size:13px;font-weight:400}#pcv .opt small{display:block;font-size:10.5px;color:#a9c1e3;margin-top:1px}',
      '#pcv .opt .tag{flex:none;font-size:11px;font-weight:400;color:#cfdcef}#pcv .opt .tag.ref{color:#8aa5cc}',
      '#pcv .pan select{margin-top:6px;min-height:40px;border-radius:12px;border:.5px solid #3b5f96;background:#0b1f4a;color:#fff;padding:0 10px;font-family:inherit;font-size:13px}',
      '#pcv .pan .bas{display:flex;justify-content:space-between;align-items:center;padding:12px 0 14px}',
      '#pcv .btn-or{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:22px;border:none;background:#d4b26a;color:#0b1f4a;font-size:14px;font-weight:500;text-decoration:none}',
      '#pcv .btn-ligne{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:22px;border:.5px solid #3b5f96;background:rgba(11,31,74,.8);color:#a9c1e3;font-size:12px;font-weight:400}',
      '#pcv .cmp{position:absolute;left:calc(var(--rail,0px) + 18px);right:calc(var(--pan,380px) + 18px);bottom:calc(var(--bas,0px) + 12px);max-width:460px;padding:8px 14px 4px;background:rgba(11,31,74,.82);box-shadow:0 0 10px 4px rgba(11,31,74,.6);border-radius:12px;z-index:2}',
      '#pcv .cmp .t{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;font-weight:400;color:#d4b26a}#pcv .cmp .t span{font-size:10px;font-weight:300;color:#8aa5cc}',
      '#pcv .cmp .r{display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:baseline;padding:5px 0;border-top:.5px solid #2f4f86;font-size:10.5px;color:#a9c1e3}#pcv .cmp .r b{font-size:13px;font-weight:500;color:#fff}',
      '#pcv .cmp .pf{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:6px 0 4px;border-top:.5px solid #2f4f86;font-size:10.5px;color:#a9c1e3}#pcv .cmp .pf div div{font-size:11px;line-height:1.4;color:#dfe9f6}',
      '#pcv .astuce{position:absolute;left:calc(var(--rail,0px) + 16px);top:14px;font-size:10.5px;color:#8aa5cc;pointer-events:none;z-index:2}',
      '#pcv .phx{margin-top:10px;padding:10px 12px;border-radius:12px;border:.5px solid #3b5f96;font-size:12px;line-height:1.5;color:#dfe9f6}',
      /* synthèse */
      '#pcv .syn{position:absolute;left:var(--rail,0px);right:0;top:0;bottom:var(--bas,0px);overflow:hidden}',
      '#pcv .syn .g1{position:absolute;left:44px;top:120px;width:250px}',
      '#pcv .syn .gros{font-family:Italiana,serif;font-size:54px;line-height:1;color:#f3dca6}',
      '#pcv .syn .liste{position:absolute;left:340px;top:72px;right:18px;bottom:14px;overflow-y:auto}',
      '#pcv .grp{border-bottom:.5px solid #2f4f86}',
      '#pcv .grp>button{width:100%;display:grid;grid-template-columns:14px minmax(0,1fr) auto;align-items:center;gap:10px;min-height:52px;padding:0 4px;background:none;border:none;color:#fff;text-align:left}',
      '#pcv .grp>button b{display:block;font-size:14px;font-weight:400}#pcv .grp>button small{display:block;font-size:11px;color:#a9c1e3}',
      '#pcv .grp ul{list-style:none;margin:0 0 8px;padding:0 4px 0 28px}',
      '#pcv .grp li{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;min-height:38px}',
      '#pcv .grp li button{background:none;border:none;text-align:left;color:#dfe9f6;padding:2px 0;min-height:36px}',
      '#pcv .grp li b{display:block;font-size:12px;font-weight:400}#pcv .grp li small{display:block;font-size:11px;color:#8aa5cc}#pcv .grp li .v{font-size:12px;font-weight:400;color:#cfdcef}',
      '#pcv .msg{position:absolute;left:50%;top:60px;transform:translateX(-50%);z-index:9;max-width:min(520px,90vw);padding:12px 16px;border-radius:14px;background:#12285a;border:.75px solid #d4b26a;color:#f3dca6;font-size:13px;line-height:1.5}',
      '#pcv .dlg{position:absolute;inset:0;z-index:10;background:rgba(5,14,36,.7);display:flex;align-items:center;justify-content:center}',
      '#pcv .dlg>div{width:min(440px,90vw);padding:20px;border-radius:18px;background:#12285a;border:.75px solid #d4b26a}',
      '#pcv .dlg h3{margin:0;font-family:Italiana,serif;font-weight:400;font-size:24px}#pcv .dlg p{font-size:13px;line-height:1.55;color:#dfe9f6}',
      /* téléphone en portrait : inviter à tourner */
      '#pcv .tourner{position:absolute;inset:0;z-index:50;background:#0b1f4a;display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:30px}',
      '@media (orientation:portrait) and (max-width:700px){#pcv:not(.portrait-ok) .tourner{display:flex}}',
      '#pcv .tourner svg{animation:pcvt 2.2s ease-in-out infinite}@keyframes pcvt{0%,30%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}',
      '@media (max-height:460px){#pcv .tete h1{font-size:24px}#pcv .tete .l2{display:none}#pcv .pan h2{font-size:22px}#pcv .pan .qq{font-size:11px;max-height:4.4em;overflow:hidden}#pcv .opt{min-height:44px;padding:6px 12px}#pcv .opt small{display:none}#pcv .cmp{display:none}#pcv .syn .g1{top:118px}#pcv .syn .gros{font-size:40px}#pcv .syn .tete .l1{display:none}}',
      '@media (max-width:900px){#pcv{--pan:340px}#pcv .syn .liste{left:300px}#pcv .syn .g1{left:26px;width:240px}}',
      '@media (prefers-reduced-motion:reduce){#pcv *{animation:none!important;transition:none!important}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ── icônes (mêmes traits que l'espace client) ──
  var IC = {
    av: '<svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17 C 7 17, 8 9, 12 9 S 16 4, 19 4"/><circle cx="19" cy="4" r="1.6"/></svg>',
    doc: '<svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5 H13 L17 6.5 V19.5 H6 Z"/><path d="M13 2.5 V6.5 H17 M9 11 H14 M9 14.5 H14"/></svg>',
    car: '<svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 L11 3.5 L19 10"/><path d="M5 9 V18.5 H17 V9"/><path d="M9.5 18.5 V13.5 H12.5 V18.5"/></svg>',
    fil: '<svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5 H18 V14.5 H10 L6 18 V14.5 H4 Z"/></svg>',
    chev: '<svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="#d4b26a" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3 L9 7 L5 11"/></svg>',
    prec: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3 L5 7 L9 11"/></svg>',
    suiv: '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3 L9 7 L5 11"/></svg>',
    tel: '<svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="#d4b26a" stroke-width="1.5" stroke-linecap="round"><rect x="20" y="8" width="24" height="44" rx="5"/><path d="M29 46 H35"/></svg>'
  };

  // ── ouverture ──
  function ouvrir(o) {
    if (!P) { alert('Le carnet ne s’est pas chargé. Rechargez la page.'); return; }
    styles();
    fermer(true);
    S = { o: o, fiche: null, st: P.etat({}), vue: 'acc', cat: null, essai: null, mode: 'out', ouverts: {}, sid: Math.random().toString(36).slice(2) + Date.now().toString(36), unsub: null, pret: false, msg: '' };
    root = document.createElement('div'); root.id = 'pcv'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Mon carnet de projet');
    document.body.appendChild(root);
    disposition(); window.addEventListener('resize', disposition);
    root.innerHTML = '<img class="wm" src="' + (o.filigrane || '') + '" alt="" aria-hidden="true"' + (o.filigrane ? '' : ' hidden') + '><div id="pcv-3d"><div class="chargement" id="pcv-ch">Préparation de votre maison…</div></div><div id="pcv-ui"></div>' +
      '<div class="tourner" role="note">' + IC.tel + '<div class="ital" style="font-size:26px">Tournez votre téléphone</div><div style="font-size:13px;color:#a9c1e3;max-width:280px">Votre maison s’affiche mieux en largeur.</div><button class="lien" id="pcv-portrait" style="font-size:12px">Continuer en hauteur</button></div>';
    $('pcv-portrait').onclick = function () { root.classList.add('portrait-ok'); };
    document.addEventListener('keydown', echap);
    Promise.resolve(o.lireFiche()).then(function (f) {
      S.fiche = f || { cats: {} }; if (!S.fiche.cats) S.fiche.cats = {};
      S.unsub = o.ecouterChoix(function (d) {
        if (d && d.sid === S.sid) return;
        S.st = P.etat(d || {}); P.appliquerFiche(S.fiche, S.st); S.pret = true; dessiner(); majMaquette();
      });
      demarrer3d();
    }).catch(function (e) { console.warn('Carnet :', e); ui('<div class="msg">Votre carnet n’est pas encore prêt. Phénix vous prévient dès qu’il s’ouvre.</div>' + navHtml()); brancherNav(); });
  }
  function echap(e) { if (e.key === 'Escape' && S && S.vue !== 'acc') { e.preventDefault(); S.vue = 'acc'; S.cat = null; S.essai = null; dessiner(); majMaquette(); } }
  function fermer(silence) {
    if (S && S.unsub) { try { S.unsub(); } catch (e) {} }
    try { if (eng) eng.setActive(false); } catch (e) {}
    window.removeEventListener('resize', disposition); document.removeEventListener('keydown', echap);
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null; eng = null; S = null;
    if (!silence) {}
  }
  function disposition() {
    if (!root) return;
    var w = window.innerWidth, h = window.innerHeight;
    var tel = Math.min(w, h) < 520;   // téléphone (en paysage : rail à gauche)
    root.classList.toggle('rail', tel); root.classList.toggle('barreb', !tel);
  }

  // ── maquette 3D ──
  function charger(src, ev) {
    return new Promise(function (ok) {
      if (document.querySelector('script[data-pcv="' + src + '"]')) { ok(); return; }
      var s = document.createElement('script'); s.type = 'module'; s.src = src; s.setAttribute('data-pcv', src);
      window.addEventListener(ev, function () { ok(); }, { once: true });
      document.head.appendChild(s);
      setTimeout(ok, 15000);
    });
  }
  function maquetteOn() { var m = S.fiche && S.fiche.maquette; return !!(m && m.on && (m.n || m.url)); }
  function demarrer3d() {
    var model = maquetteOn();
    var src = model ? 'phenix_maquette3d.js?v=20261122b' : 'phenix_maison3d.js?v=20261125';
    var ready = model ? function () { return window.PXModel; } : function () { return window.PXHouse && !window.PXHouse.isModel; };
    (ready() ? Promise.resolve() : charger(src, model ? 'px3dm-ready' : 'px3d-ready')).then(function () {
      if (!root) return;
      var E = model ? window.PXModel : window.PXHouse;
      if (!E) { echec3d(); return; }
      try {
        if (model) {
          var m = S.fiche.maquette || {};
          E.loader = function () {
            if (m.url) return fetch(m.url).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); });
            var jobs = []; for (var i = 0; i < m.n; i++) jobs.push(S.o.morceau(m.k ? m.k + '_' + i : i));
            return Promise.all(jobs).then(function (a) { var b = atob(a.join('')), u = new Uint8Array(b.length); for (var k = 0; k < b.length; k++) u[k] = b.charCodeAt(k); return u.buffer; });
          };
          E.cfg = m;
        }
        var host = $('pcv-3d'); var ch = $('pcv-ch'); if (ch) ch.parentNode.removeChild(ch);
        E.init(host, P.HZ, function (id) { ouvrirQuestion(id); });
        eng = E; majMaquette(); E.setActive(true); dessiner();
        setTimeout(function () { try { E.overview(); } catch (e) {} }, 600);
      } catch (e) { console.warn('3D :', e); echec3d(); }
    });
    window.addEventListener('px3d-fail', echec3d, { once: true });
  }
  function echec3d() {
    var h = $('pcv-3d'); if (!h) return;
    h.innerHTML = '<div class="chargement" style="pointer-events:auto;flex-direction:column;gap:6px;text-align:center;padding:0 20%"><b style="font-weight:400;color:#fff">La maquette 3D n’a pas pu s’afficher sur cet appareil.</b><span>Vous pouvez faire tous vos choix avec « Mes choix ».</span></div>';
    eng = null;
  }
  function majMaquette() {
    if (!eng || !S) return;
    try {
      var st = S.st;
      if (S.essai && S.cat) { st = JSON.parse(JSON.stringify(S.st)); var c = P.cat(S.cat); if (c.multi) { } else P.setSel(st, c, S.essai); st.conf[S.cat] = true; }
      eng.update(P.etats(S.fiche, S.st)); eng.setLook(P.look(S.fiche, st, S.cat));
    } catch (e) { console.warn(e); }
  }

  // ── rendu ──
  function ui(h) { var u = $('pcv-ui'); if (u) u.innerHTML = h; }
  function navHtml() {
    var b = function (id, lib, ic) { return '<button data-nav="' + id + '"' + (id === 'carnet' ? ' aria-current="page"' : '') + '>' + ic + lib + '</button>'; };
    return '<nav class="nav" aria-label="Mon espace">' + b('avancement', 'Avancement', IC.av) + b('documents', 'Documents', IC.doc) + b('carnet', 'Carnet', IC.car) + b('fil', 'Le fil', IC.fil) + '</nav>';
  }
  function marque() { return '<div class="marque"><img src="' + esc(S.o.logo || '') + '" alt="Logo Phénix-Architecture" onerror="this.style.display=\'none\'"><span><b>PHÉNIX</b><small>Maîtrise d’œuvre et conception</small></span></div>'; }
  function compte() { var q = P.aRepondre(S.fiche, S.st), n = q.filter(function (c) { return S.st.conf[c.id]; }).length; return { n: n, tot: q.length, reste: q.length - n }; }
  function progHtml() {
    var k = compte();
    return '<div class="prog"><div class="l"><span>' + k.n + ' choix sur ' + k.tot + '</span><span>' + (k.reste ? 'Plus que ' + k.reste + ' à faire' : 'Tous vos choix sont faits') + '</span></div><div class="barre"><i style="width:' + (k.tot ? Math.round(k.n / k.tot * 100) : 0) + '%"></i></div></div>';
  }
  function menuHtml() {
    return '<nav class="menu" aria-label="Mon carnet"><button data-v="choix"' + (S.vue !== 's' ? ' aria-current="page"' : '') + '>Mes choix</button><button data-v="s"' + (S.vue === 's' ? ' aria-current="page"' : '') + '>Synthèse</button></nav>';
  }
  function dessiner() {
    if (!root || !S) return;
    root.classList.toggle('q', S.vue === 'q'); root.classList.toggle('s', S.vue === 's');
    var valide = S.st.statut === 'valide';
    if (S.vue === 'q') { dessinerQuestion(); return; }
    if (S.vue === 's') { dessinerSynthese(); return; }
    var k = compte();
    ui('<div class="tete">' + marque() + '<h1>' + esc(S.o.nom || 'Ma maison') + '</h1>' +
      '<div class="l1">' + (valide ? 'Vos choix sont envoyés à Phénix' : esc(S.o.sousTitre || 'Plan définitif validé, à vous de choisir vos matières')) + '</div>' +
      '<div class="l2">Faites glisser la maison pour la tourner, touchez un point doré pour choisir</div></div>' +
      menuHtml() + progHtml() +
      (eng ? '<div class="vues" role="group" aria-label="Vue"><button data-mode="out" aria-pressed="' + (S.mode === 'out') + '">Extérieur</button><button data-mode="in" aria-pressed="' + (S.mode === 'in') + '">Sans le toit</button><button data-mode="all">Vue d’ensemble</button></div>' : '') +
      (S.msg ? '<div class="msg" role="status">' + esc(S.msg) + '</div>' : '') + navHtml());
    brancher();
  }
  function tagOption(c, o) {
    if (o.id === c.ref) return { t: 'Proposition Phénix', ref: true };
    var p = P.pctOption(S.st, c, o.id); return { t: p ? p : 'Sans écart', ref: !p };
  }
  function dessinerQuestion() {
    var c = P.cat(S.cat); if (!c) { S.vue = 'acc'; dessiner(); return; }
    var q = P.aRepondre(S.fiche, S.st), i = q.indexOf(c), k = compte();
    var phx = P.parPhenix(c) || P.impose(S.fiche, S.st, c);
    var cur = S.essai || P.sel(S.st, c);
    var opts = P.permis(S.fiche, S.st, c).map(function (id) { return P.opt(c, id); });
    var oc = P.opt(c, String(cur).split('+')[0]);
    var h = '<div class="astuce">' + (eng ? 'La maquette prend la couleur de l’option touchée' : '') + '</div>';
    // comparer
    var mets = (c.metrics || []).filter(function (m) { return oc.m && oc.m[m] != null; }).slice(0, 2);
    h += '<section class="cmp" aria-label="Comparer"><div class="t">Comparer<span>' + esc(oc.n) + '</span></div>' +
      mets.map(function (m) { var M = P.METRICS[m] || { l: m, u: '' }, v = oc.m[m]; return '<div class="r"><span>' + esc(M.l) + '</span><span><b>' + esc(typeof v === 'number' ? (Math.round(v * 10) / 10).toString().replace('.', ',') : v) + '</b> ' + esc(M.u) + (M.hi === 0 ? ', plus bas = mieux' : M.hi === 1 ? ', plus haut = mieux' : '') + '</span></div>'; }).join('') +
      '<div class="pf"><div>Points forts<div>' + (oc.pros || []).slice(0, 2).map(function (x) { return '+ ' + esc(x); }).join('<br>') + '</div></div><div>Points faibles<div>' + (oc.cons || []).slice(0, 2).map(function (x) { return '− ' + esc(x); }).join('<br>') + '</div></div></div></section>';
    // panneau
    h += '<section class="pan" aria-label="Question"><div class="haut">' + marque() + '<span style="display:flex;gap:12px"><button class="lien" data-v="acc">Maquette</button><button class="lien" data-v="s">Synthèse</button></span></div>' +
      '<div class="pos"><span>' + esc(c.g) + (i >= 0 ? ', question ' + (i + 1) + ' sur ' + q.length : '') + '</span><span>' + (k.reste ? 'Plus que ' + k.reste + ' à faire' : 'Tout est choisi') + '</span></div>' +
      '<div class="barre"><i style="width:' + (k.tot ? Math.round(k.n / k.tot * 100) : 0) + '%"></i></div>' +
      '<h2>' + esc(c.t) + '</h2><div class="qq">' + esc(c.q) + '</div>';
    if (phx) {
      h += '<div class="phx"><b style="font-weight:500;color:#f3dca6">Décidé par Phénix : ' + esc(P.libelle(S.st, c)) + '</b><br>' + esc(P.pourquoi(S.fiche, c)) + '</div><div class="opts"></div>';
    } else {
      h += '<div class="opts" role="group" aria-label="Options">' + opts.map(function (o) {
        var on = c.multi ? String(cur).split('+').indexOf(o.id) >= 0 : cur === o.id, tg = tagOption(c, o);
        return '<button class="opt" data-o="' + esc(o.id) + '" aria-pressed="' + on + '"><span class="rond" aria-hidden="true"></span><span style="flex:1"><b>' + esc(o.n) + '</b><small>' + esc(o.d) + '</small></span><span class="tag' + (tg.ref ? ' ref' : '') + '">' + esc(tg.t) + '</span></button>';
      }).join('');
      if (c.thick) h += '<label style="font-size:11px;color:#a9c1e3;margin-top:6px">Épaisseur d’isolant<select id="pcv-ep">' + P.epaisseurs(S.st).map(function (e) { return '<option' + (e === P.epaisseur(S.st) ? ' selected' : '') + ' value="' + e + '">' + e + ' mm</option>'; }).join('') + '</select></label>';
      if (c.id === 'portesint') h += '<label style="font-size:11px;color:#a9c1e3;margin-top:6px">Largeur des portes<select id="pcv-pw">' + [73, 83, 93].map(function (w) { return '<option' + (w === (S.st.thick.pw || 83) ? ' selected' : '') + ' value="' + w + '">' + w + ' cm' + (w === 93 ? ' (passage d’un fauteuil roulant)' : w === 83 ? ' (la plus courante)' : '') + '</option>'; }).join('') + '</select></label>';
      h += '</div>';
    }
    h += '<div class="bas"><button class="btn-ligne" data-prec>' + IC.prec + 'Précédente</button><button class="btn-or" data-suiv>' + (i === q.length - 1 ? 'Voir ma synthèse' : 'Question suivante') + IC.suiv + '</button></div></section>';
    ui(h + navHtml());
    brancher();
  }
  function dessinerSynthese() {
    var k = compte(), valide = S.st.statut === 'valide';
    var grp = P.GROUPES.map(function (g) {
      var cs = P.questions(S.fiche).filter(function (c) { return c.g === g; }); if (!cs.length) return '';
      var faits = cs.filter(function (c) { return S.st.conf[c.id] || P.parPhenix(c) || P.impose(S.fiche, S.st, c); }).length, open = !!S.ouverts[g];
      return '<li class="grp"><button aria-expanded="' + open + '" data-g="' + esc(g) + '"><span style="transform:rotate(' + (open ? 90 : 0) + 'deg);display:inline-block">' + IC.chev + '</span><span><b>' + esc(g) + '</b><small>' + faits + ' sur ' + cs.length + ' choisis</small></span><span></span></button>' +
        (open ? '<ul>' + cs.map(function (c) {
          var phx = P.parPhenix(c) || P.impose(S.fiche, S.st, c), p = phx ? '' : (S.st.conf[c.id] ? (P.pctChoix(S.st, c) || 'Sans écart') : 'À choisir');
          return '<li><button data-q="' + c.id + '"><b>' + esc(c.t) + '</b><small>' + (phx ? 'Décidé par Phénix : ' : S.st.conf[c.id] ? '' : 'Proposition : ') + esc(P.libelle(S.st, c)) + '</small></button><span class="v">' + esc(p) + '</span></li>';
        }).join('') + '</ul>' : '') + '</li>';
    }).join('');
    ui('<section class="syn" aria-label="Ma synthèse"><div class="tete" style="left:44px">' + marque() + '<h1>Ma synthèse</h1><div class="l1">' + esc(S.o.nom || '') + '</div></div>' + menuHtml() +
      '<div class="g1"><div class="gros">' + k.n + ' / ' + k.tot + '</div><div style="margin-top:6px;font-size:12px;color:#a9c1e3">choix faits</div><div class="barre" style="margin-top:12px"><i style="width:' + (k.tot ? Math.round(k.n / k.tot * 100) : 0) + '%"></i></div>' +
      '<div style="margin-top:6px;font-size:11px;color:#f3dca6">' + (k.reste ? 'Plus que ' + k.reste + ' à faire' : 'Tous vos choix sont faits') + '</div>' +
      '<div style="margin-top:18px;display:flex;flex-direction:column;gap:10px;align-items:flex-start">' +
      (k.reste ? '<button class="btn-ligne" data-cont style="border-color:#d4b26a;color:#f3dca6">Continuer mes choix</button>' : '') +
      (S.o.apercu ? '' : valide ? '<div style="font-size:12px;color:#f3dca6">✓ Choix envoyés à Phénix' + (S.st.validatedAt ? ' le ' + new Date(S.st.validatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '') + '</div>' : '<button class="btn-or" data-envoi>Envoyer mes choix à Phénix</button>') +
      '</div><p style="margin-top:14px;font-size:11px;line-height:1.5;color:#8aa5cc">Les pourcentages montrent l’effet de chaque choix par rapport à la proposition de Phénix. Le prix exact vient avec le chiffrage.</p></div>' +
      '<div class="liste"><ul style="list-style:none;margin:0;padding:0">' + grp + '</ul><div style="padding:12px 4px 4px;font-size:11px;color:#8aa5cc;line-height:1.5">Décidés par Phénix, inclus au projet : les fondations, d’après l’étude de sol, et les eaux usées, selon ce qu’impose votre commune.</div></div></section>' +
      (S.msg ? '<div class="msg" role="status">' + esc(S.msg) + '</div>' : '') + navHtml());
    brancher();
  }

  // ── actions ──
  function brancherNav() {
    root.querySelectorAll('[data-nav]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-nav'); if (v === 'carnet') { S.vue = 'acc'; S.cat = null; dessiner(); majMaquette(); return; } var o = S.o; fermer(); if (o.onNav) o.onNav(v); }; });
  }
  function brancher() {
    brancherNav();
    root.querySelectorAll('[data-v]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-v'); S.msg = ''; if (v === 'choix') { var q = P.aRepondre(S.fiche, S.st), n = q.filter(function (c) { return !S.st.conf[c.id]; })[0] || q[0]; if (S.vue === 'acc' && n) { ouvrirQuestion(n.id); return; } S.vue = 'acc'; } else S.vue = v; S.cat = null; S.essai = null; dessiner(); majMaquette(); if (eng && S.vue === 'acc') setTimeout(function () { try { eng.overview(); } catch (e) {} }, 380); }; });
    root.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { var m = b.getAttribute('data-mode'); if (!eng) return; if (m === 'all') { eng.overview(); return; } S.mode = m; eng.setMode(m); dessiner(); }; });
    root.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { var c = P.cat(S.cat), id = b.getAttribute('data-o'); if (c.multi) { var cur = String(S.essai || P.sel(S.st, c)).split('+'), k = cur.indexOf(id); if (k >= 0) { if (cur.length > 1) cur.splice(k, 1); } else cur.push(id); S.essai = cur.join('+'); } else S.essai = id; dessiner(); majMaquette(); }; });
    var ep = $('pcv-ep'); if (ep) ep.onchange = function () { S.st.thick.isol = Number(ep.value); enregistrer(); dessiner(); };
    var pw = $('pcv-pw'); if (pw) pw.onchange = function () { S.st.thick.pw = Number(pw.value); enregistrer(); dessiner(); majMaquette(); };
    var pr = root.querySelector('[data-prec]'); if (pr) pr.onclick = function () { acter(function () { var q = P.aRepondre(S.fiche, S.st), i = q.indexOf(P.cat(S.cat)); if (i > 0) ouvrirQuestion(q[i - 1].id); else { S.vue = 'acc'; S.cat = null; dessiner(); majMaquette(); } }); };
    var su = root.querySelector('[data-suiv]'); if (su) su.onclick = function () { acter(function () { var q = P.aRepondre(S.fiche, S.st), i = q.indexOf(P.cat(S.cat)); if (i >= 0 && i < q.length - 1) ouvrirQuestion(q[i + 1].id); else { S.vue = 's'; S.cat = null; dessiner(); } }); };
    root.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { var g = b.getAttribute('data-g'); S.ouverts[g] = !S.ouverts[g]; dessiner(); }; });
    root.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { ouvrirQuestion(b.getAttribute('data-q')); }; });
    var co = root.querySelector('[data-cont]'); if (co) co.onclick = function () { var q = P.aRepondre(S.fiche, S.st), n = q.filter(function (c) { return !S.st.conf[c.id]; })[0]; if (n) ouvrirQuestion(n.id); };
    var en = root.querySelector('[data-envoi]'); if (en) en.onclick = envoyer;
  }
  function ouvrirQuestion(id) {
    var c = P.cat(id); if (!c) return;
    S.vue = 'q'; S.cat = id; S.essai = null; S.msg = '';
    dessiner(); majMaquette();
    // pièces et intérieur : vue sans le toit d'ensemble (un zoom trop près ne montre qu'un bout de mur) ; extérieur : zoom sur l'élément
    var z = P.HZ.filter(function (x) { return x.id === id; })[0];
    if (eng) setTimeout(function () { try { if (z && z.m !== 'out') { eng.setMode('in'); S.mode = 'in'; eng.overview(); } else { if (S.mode !== 'out') { eng.setMode('out'); S.mode = 'out'; } eng.focus(id); } } catch (e) {} }, 380);
  }
  // le choix n'est acté qu'en changeant de question ; changer un choix déjà confirmé demande une confirmation
  function acter(suite) {
    var c = P.cat(S.cat); if (!c || P.parPhenix(c) || P.impose(S.fiche, S.st, c)) { suite(); return; }
    var avant = P.sel(S.st, c), apres = S.essai || avant, deja = !!S.st.conf[c.id];
    var faire = function () {
      P.setSel(S.st, c, apres); S.st.conf[c.id] = true;
      if (c.id === 'charpente') P.appliquerFiche(S.fiche, S.st);   // l'isolation du toit suit la charpente
      if (S.st.statut === 'valide' && deja && avant !== apres) S.st.statut = 'modifie';
      S.essai = null; enregistrer(); suite(); majMaquette();
    };
    if (deja && avant !== apres && S.st.statut === 'valide') {
      dialogue('Changer ce choix ?', 'Aucun souci, vous pouvez changer d’avis. Comme vos choix étaient déjà envoyés, Phénix verra ce changement et le validera avec vous.', 'Changer mon choix', faire);
      return;
    }
    faire();
  }
  function dialogue(titre, texte, ok, fn) {
    var d = document.createElement('div'); d.className = 'dlg'; d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-label', titre);
    d.innerHTML = '<div><h3>' + esc(titre) + '</h3><p>' + esc(texte) + '</p><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px"><button class="btn-ligne" data-non>Annuler</button><button class="btn-or" data-oui>' + esc(ok) + '</button></div></div>';
    root.appendChild(d);
    d.querySelector('[data-non]').onclick = function () { d.remove(); };
    d.querySelector('[data-oui]').onclick = function () { d.remove(); fn(); };
    d.querySelector('[data-oui]').focus();
  }
  var tEnr = null;
  function enregistrer() {
    if (S.o.apercu) return;   // l'aperçu de Phénix ne modifie rien
    clearTimeout(tEnr);
    tEnr = setTimeout(function () {
      var doc = P.versDoc(S.fiche, S.st, { sid: S.sid, who: S.o.qui || 'client', phase: 'conception' });
      Promise.resolve(S.o.ecrireChoix(doc)).catch(function (e) { console.warn(e); S.msg = 'Vos choix ne sont pas enregistrés en ligne pour le moment. Vérifiez votre connexion.'; dessiner(); });
    }, 500);
  }
  function envoyer() {
    var k = compte();
    var fin = function () {
      S.st.statut = 'valide'; S.st.validatedAt = new Date().toISOString(); enregistrer();
      try { if (S.o.notifier) S.o.notifier('Choix du carnet envoyés : ' + k.n + ' sur ' + k.tot + ' confirmés.'); } catch (e) {}
      S.msg = 'Merci ! Vos choix sont envoyés à Phénix. Vous pouvez encore changer d’avis, Phénix le verra.'; dessiner();
    };
    if (k.reste) dialogue('Envoyer maintenant ?', 'Il vous reste ' + k.reste + ' choix à faire. Pour ceux-là, Phénix gardera sa proposition. Vous pourrez les modifier ensuite.', 'Envoyer', fin);
    else fin();
  }

  global.PhenixCarnetVue = { ouvrir: ouvrir, fermer: function () { fermer(); } };
})(typeof window !== 'undefined' ? window : this);
