// ════════════════════════════════════════════════════════════════════════════
//  phenix_notif_client.js — [Notifications client 26/11/2026, refait le 27/11/2026 sur les 52 statuts]
//  MIXTE PUSH / MAIL (choix de Maxime) :
//  • MAIL (collection « mail », envoyé par l'extension Firebase « Trigger Email » depuis contact@) :
//    les ÉTAPES CLÉS (changement de statut, sauf l'avancement courant du chantier), les jalons du chantier
//    (hors d'eau, hors d'air, cloisonnement), le carnet (ouvert, à revoir, validé, rouvert), la visite 3D
//    et les DOCUMENTS transmis.
//  • PUSH (collection « phenix_push_attente », regroupé toutes les 10 min par la fonction « pushClient ») :
//    le reste — avancement courant du chantier, lignes du fil, messages de Phénix.
//  Rien ne part tant que l'espace du client n'est pas ouvert (pas d'accès = pas de mail, pas de téléphone activé = pas de push).
//  Sans l'extension « Trigger Email » ni la fonction « pushClient », rien ne part : la suite prépare, Firebase envoie.
//  À charger en module après l'initialisation Firebase de la page :
//    <script type="module" src="phenix_notif_client.js?v=20261127"></script>
// ════════════════════════════════════════════════════════════════════════════
import { getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, query, where, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const URL_ESPACE = 'https://phenixarchitecte-del.github.io/phenix-architecte/phenix_client.html';
// Avancement courant du chantier (statuts S27 à S41) : simple notification push, sauf les jalons ci-dessous.
const STATUTS_PUSH = new Set(['S27', 'S28', 'S30', 'S32', 'S34', 'S35', 'S36', 'S37', 'S38', 'S39', 'S40', 'S41']);
// Jalons du chantier (S29 hors d'eau, S31 hors d'air, S33 cloisonnement) et tout autre statut : mail.

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const court = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const db = () => { const a = getApps()[0]; return a ? getFirestore(a) : null; };

async function destinataires(pid) {
  const d = db(); if (!d) return [];
  const s = await getDocs(query(collection(d, 'phenix_client_acces'), where('projetId', '==', String(pid))));
  const l = []; s.forEach(x => { const e = String((x.data() || {}).email || x.id || '').toLowerCase(); if (e.includes('@')) l.push(e); });
  return [...new Set(l)];
}
// Mail au ton Phénix : bienveillant, simple, vouvoiement, un seul bouton vers l'espace. Jamais de montant.
function corpsMail(lignes) {
  const text = 'Bonjour,\n\n' + lignes.map(l => '• ' + l.titre + (l.texte ? ' : ' + l.texte : '')).join('\n') +
    '\n\nTout est dans votre espace client : ' + URL_ESPACE + '\n\nSi vous avez la moindre question, répondez simplement à ce mail ou écrivez-nous depuis votre espace : nous sommes là pour vous aider.\n\nÀ très bientôt,\nPhénix-Architecture';
  const html = '<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:15px;color:#1b2d5b;line-height:1.55;max-width:560px"><p>Bonjour,</p>' +
    lignes.map(l => '<p style="margin:10px 0"><b>' + esc(l.titre) + '</b>' + (l.texte ? '<br>' + esc(l.texte) : '') + '</p>').join('') +
    '<p style="margin:22px 0"><a href="' + URL_ESPACE + '" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#0b1f4a;color:#f3dca6;text-decoration:none;font-weight:600">Ouvrir mon espace client</a></p>' +
    '<p>Si vous avez la moindre question, répondez simplement à ce mail ou écrivez-nous depuis votre espace : nous sommes là pour vous aider.</p><p>À très bientôt,<br>Phénix-Architecture</p></div>';
  return { text, html };
}
async function parMail(pid, lignes, type) {
  if (!lignes.length || !pid) return false;
  try {
    const to = await destinataires(pid); if (!to.length) return false;   // espace pas encore ouvert : aucun mail
    const sujet = lignes.length === 1 ? 'Votre projet : ' + court(lignes[0].titre, 70) : 'Votre projet : ' + lignes.length + ' nouveautés dans votre espace';
    const c = corpsMail(lignes);
    await addDoc(collection(db(), 'mail'), { to, message: { subject: sujet, text: c.text, html: c.html }, pid: String(pid), type: type || 'cle', t: new Date().toISOString() });
    return true;
  } catch (e) { console.warn('Mail client non préparé :', e && (e.code || e.message)); return false; }
}
async function parPush(pid, lignes, type) {
  if (!lignes.length || !pid) return false;
  try { await addDoc(collection(db(), 'phenix_push_attente'), { pid: String(pid), lignes: lignes.slice(0, 8), type: type || 'maj', t: new Date().toISOString(), envoye: false }); return true; }
  catch (e) { console.warn('Notification client non préparée :', e && (e.code || e.message)); return false; }
}
function router(pid, lignes, type) {
  const m = lignes.filter(l => l.canal === 'mail'), p = lignes.filter(l => l.canal !== 'mail');
  return Promise.all([parMail(pid, m, type), parPush(pid, p, type)]);
}

// Compare l'espace avant / après une écriture : chaque nouveauté reçoit son canal.
function nouveautes(avant, apres) {
  avant = avant || {}; apres = apres || {};
  const l = [], statutChange = !!((apres.code && apres.code !== avant.code) || (apres.titre && apres.titre !== avant.titre));
  if (statutChange) { const push = STATUTS_PUSH.has(String(apres.code || ''));   // [28/11] en push, titre court (« Pose de votre toiture ») ; en mail, « Votre dossier avance : … »
    l.push({ canal: push ? 'push' : 'mail', titre: (push ? '' : 'Votre dossier avance : ') + court(apres.titre || '', 90), texte: court(apres.petit || apres.texte || '', 220) }); }
  const cle = x => String(x && (x.id || x.url || x.titre) || '');
  const docsAvant = new Set((avant.documents || []).map(cle));
  const nouveauxDocs = (apres.documents || []).filter(x => !docsAvant.has(cle(x)));
  nouveauxDocs.forEach(x => l.push({ canal: 'mail', titre: 'Nouveau document : ' + court(x.titre || 'document', 90), texte: court(x.desc || '', 160) }));
  const filAvant = new Set((avant.fil || []).map(x => String(x.id || x.date + x.titre)));
  (apres.fil || []).filter(x => !filAvant.has(String(x.id || x.date + x.titre))).forEach(x => {
    if (statutChange && x.titre === apres.titre) return;                                                        // déjà dit par le changement de statut
    if (nouveauxDocs.length && /document/i.test(String(x.titre || '') + ' ' + String(x.texte || ''))) return;   // déjà dit par le document
    l.push({ canal: 'push', titre: court(x.titre || 'Nouvelle information', 90), texte: court(x.texte || '', 220) });
  });
  if (!(avant.carnetOuvert || avant.carnetUrl) && (apres.carnetOuvert || apres.carnetUrl)) l.push({ canal: 'mail', titre: 'Votre carnet de projet est ouvert', texte: 'Vous pouvez choisir vos matières, à votre rythme, directement sur votre maison en 3D.' });
  if (!avant.carnetValide && apres.carnetValide) l.push({ canal: 'mail', titre: 'Votre carnet est validé', texte: 'Merci pour vos choix ! Ils servent maintenant au chiffrage de votre maison.' });
  if (!avant.visiteUrl && apres.visiteUrl) l.push({ canal: 'mail', titre: 'Votre visite 3D est prête', texte: 'Promenez-vous dans votre future maison depuis votre espace.' });
  return l;
}

window.phenixNotifClient = {
  nouveautes,   // exposé pour les tests
  // espace modifié : étapes clés et documents par mail, le reste en push
  apresEcriture(pid, avant, apres) { return router(pid, nouveautes(avant, apres), 'espace'); },
  // message de Phénix dans la conversation : push
  message(pid, texte) { return parPush(pid, [{ titre: 'Phénix vous a écrit', texte: court(texte, 400) }], 'message'); },
  // carnet : étapes clés, par mail
  carnet(pid, statut) {
    const L = { a_revoir: { titre: 'Phénix vous propose de revoir quelques choix de votre carnet', texte: 'Prenez le temps d’y réfléchir : les explications sont dans votre carnet et dans votre fil.' },
      rouvert: { titre: 'Votre carnet est rouvert', texte: 'Vous pouvez de nouveau modifier vos choix. Phénix les validera ensuite avec vous.' } }[statut];
    return L ? parMail(pid, [L], 'carnet') : Promise.resolve(false);
  }
};
