// [Notifications push 26/11/2026] Service worker des notifications de l'espace client Phénix.
// Doit rester à la racine du site (même dossier que phenix_client.html).
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyCjNKNvS6p3nqE6-_Gw9I397ZtXm2FG1ew", authDomain: "phenix-architecte-9151b.firebaseapp.com",
  projectId: "phenix-architecte-9151b", storageBucket: "phenix-architecte-9151b.firebasestorage.app",
  messagingSenderId: "811231684720", appId: "1:811231684720:web:413fa324ae43c07607acb5"
});
const messaging = firebase.messaging();
messaging.onBackgroundMessage(p => {
  const n = (p && p.notification) || {}, d = (p && p.data) || {};
  // [28/11/2026] logo Phénix dans la notification (icon) et silhouette du phénix dans la barre d'état (badge)
  self.registration.showNotification(n.title || 'Phénix-Architecture', { body: n.body || '', icon: 'phenix_notif_icon.png', badge: 'phenix_notif_badge.png', data: { url: d.url || 'phenix_client.html' }, tag: d.tag || 'phenix' });
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || 'phenix_client.html';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => { for (const c of l) { if (c.url.includes('phenix_client.html')) return c.focus(); } return clients.openWindow(url); }));
});
