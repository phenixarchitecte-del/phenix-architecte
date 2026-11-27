/* =====================================================================
   PHÉNIX — travail sans réseau (service worker), 27/11/2026
   But : sur chantier, sans réseau, la page déjà ouverte une fois peut se recharger (onglet fermé, tablette en veille).
   Règle : TOUJOURS le réseau d'abord (jamais de vieille version quand il y a du réseau) ; la copie gardée ne sert que hors ligne.
   Ne touche PAS aux données : Firestore, connexion Firebase, App Check passent sans intermédiaire (Firestore garde déjà ses données sur l'appareil).
   Fichiers gardés : ceux du site Phénix et les bibliothèques des CDN (Three.js, Firebase, jsPDF, PDF.js, polices) au fur et à mesure qu'ils sont chargés.
   ===================================================================== */
var CACHE = 'phenix-hors-ligne-v1';
var CDN = /^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com|www\.gstatic\.com\/firebasejs|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (n) { return n !== CACHE && n.indexOf('phenix-hors-ligne') === 0; }).map(function (n) { return caches.delete(n); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url), meme = u.origin === self.location.origin;
  if (!meme && !CDN.test(r.url)) return;            /* Firestore, connexion, reCAPTCHA… : jamais interceptés */
  e.respondWith(
    fetch(r).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var cp = res.clone(); caches.open(CACHE).then(function (c) { return c.put(r, cp); }).catch(function () {}); }
      return res;
    }).catch(function () {
      return caches.open(CACHE).then(function (c) {
        return c.match(r, { ignoreSearch: meme }).then(function (m) { return m || (meme ? c.match(u.pathname, { ignoreSearch: true }) : null); });
      }).then(function (m) { return m || Response.error(); });
    })
  );
});
