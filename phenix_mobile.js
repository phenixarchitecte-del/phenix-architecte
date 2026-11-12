/* Phénix — aide à la vue téléphone : transforme les tableaux simples en fiches (CSS dans phenix_mobile.css).
   S'exécute dans chaque module (injecté par le Shell). Ne fait rien sur grand écran ni à l'impression. */
(function () {
  if (window.__phMobile) return; window.__phMobile = true;
  var mq = window.matchMedia('(max-width:700px)');
  var EXCLU = '.devis-page,.no-cartes,[data-no-cartes],.print-area,#apercu-pdf,.pdf-page';
  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function traiter(t) {
    if (t.__phOk) return; var lignes = t.tBodies && t.tBodies[0] ? t.tBodies[0].rows : null; if (!lignes || !lignes.length) return;
    if (t.closest(EXCLU)) { t.__phOk = 1; return; }
    var tete = t.tHead && t.tHead.rows[0] ? Array.prototype.map.call(t.tHead.rows[0].cells, txt) : null;
    var simple = true;
    for (var i = 0; i < lignes.length && simple; i++) for (var j = 0; j < lignes[i].cells.length; j++) { var c = lignes[i].cells[j]; if (c.colSpan > 1 || c.rowSpan > 1) { simple = false; break; } }
    if (t.tFoot) simple = simple && Array.prototype.every.call(t.tFoot.rows, function (r) { return Array.prototype.every.call(r.cells, function (c) { return c.colSpan <= 1; }); });
    if (!tete || !tete.length) simple = false;
    t.__phOk = 1;
    if (!simple) { t.classList.add('ph-defile'); return; }
    for (var k = 0; k < lignes.length; k++) for (var m = 0; m < lignes[k].cells.length; m++) lignes[k].cells[m].setAttribute('data-label', tete[m] || '');
    t.classList.add('ph-cartes');
  }
  function balayer(racine) { try { (racine || document).querySelectorAll('table').forEach(function (t) { t.__phOk = 0; traiter(t); }); } catch (e) {} }
  var timer = 0;
  function planifier() { clearTimeout(timer); timer = setTimeout(function () { if (mq.matches) balayer(); }, 250); }
  try { new MutationObserver(planifier).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  if (mq.addEventListener) mq.addEventListener('change', planifier);
  document.addEventListener('DOMContentLoaded', planifier); planifier();
})();
