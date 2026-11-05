/* =====================================================================
   PHÉNIX MESSAGES — socle commun des messages automatiques (mail + SMS)
   Fichier partagé par les modules de la suite Phénix (sans Firebase, sans réseau).

   Principe : un MODÈLE (texte avec {variables}) + des VARIABLES (artisan, chantier…)
   → un message prêt à envoyer (sujet, corps du mail, SMS). Rien ne part tout seul :
   les liens mailto: / sms: ouvrent le brouillon sur l'appareil de Maxime, qui relit
   et envoie. Un jour, un service d'envoi pourra reprendre les mêmes modèles.

   Usage :
     const m = PhenixMsg.preparer('decennale', { contact:'M. Martin', chantier:'RAYMOND', lot:'Plomberie' });
     PhenixMsg.ouvrirMail('martin@exemple.fr', m);      // brouillon dans le logiciel de messagerie
     PhenixMsg.ouvrirSms('06 12 34 56 78', m);         // appli SMS du téléphone
     PhenixMsg.copier(m.sms);                          // PC : copier le SMS

   Ajouter un nouveau message (chantier, relance de devis, rendez-vous…) = ajouter un modèle
   dans MODELES, puis l'appeler par son identifiant. Voir le skill « phenix-messages ».
   ===================================================================== */
(function (global) {
  'use strict';

  var EXPEDITEUR = {
    nom: 'Maxime Suchet',
    fonction: 'Maître d’œuvre et contractant général',
    societe: 'Phénix-Architecture',
    tel: '04 73 73 00 59',
    mail: 'contact@phenixarchitecte.fr'
  };

  /* Modèles. Variables : {contact} {entreprise} {metier} {chantier} {lot} {dateValidite} + signature.
     Les blocs « si » ne s'affichent que si la variable est renseignée. */
  var MODELES = {
    decennale: {
      libelle: 'Demande d’attestation de décennale',
      sujet: 'Chantier {chantier} — attestation de décennale à nous transmettre',
      mail:
        '{salutation},\n\n' +
        'Dans le cadre du chantier {chantier}{siLot}, pour lequel vous avez établi un devis, ' +
        'nous avons besoin de votre attestation d’assurance décennale en cours de validité, ' +
        'qui mentionne les activités couvertes{siMetier}.\n\n' +
        '{siValidite}' +
        'Pourriez-vous nous la transmettre par retour de mail à ' + EXPEDITEUR.mail + ' dès que possible ?\n' +
        'Sans cette pièce, nous ne pouvons pas finaliser votre engagement sur le chantier.\n\n' +
        'Je reste disponible si vous avez la moindre question.\n\n' +
        '{signature}',
      sms:
        '{salutation}, ici Maxime Suchet (Phénix-Architecture). Pour le chantier {chantier}, ' +
        'pouvez-vous m’envoyer votre attestation de décennale en cours de validité par mail à ' +
        EXPEDITEUR.mail + ' ? Merci.'
    }
  };

  /* ── Outils de contact ─────────────────────────────────────────── */

  /* Téléphone français → « 06 12 34 56 78 » ; renvoie '' si le numéro n'est pas plausible. */
  function normTel(t) {
    var s = String(t == null ? '' : t).replace(/[^\d+]/g, '');
    if (s.indexOf('+33') === 0) s = '0' + s.slice(3);
    else if (s.indexOf('0033') === 0) s = '0' + s.slice(4);
    s = s.replace(/\D/g, '');
    if (s.length === 9 && /^[1-9]/.test(s)) s = '0' + s;
    if (!/^0[1-9]\d{8}$/.test(s)) return '';
    return s.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  }
  function estMobile(t) { var n = normTel(t).replace(/\s/g, ''); return /^0[67]/.test(n); }
  function normMail(e) {
    var s = String(e == null ? '' : e).trim().toLowerCase().replace(/^mailto:/, '');
    return /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(s) ? s : '';
  }
  /* Repêchage : cherche numéros et mails dans un texte libre (si l'IA n'en a pas rendu). */
  function extraireContacts(texte) {
    var t = String(texte || ''), tels = [], mails = [], m, re;
    re = /(?:\+33|0033|0)\s*[1-9](?:[\s.\-]*\d{2}){4}/g;
    while ((m = re.exec(t))) { var n = normTel(m[0]); if (n && tels.indexOf(n) < 0) tels.push(n); }
    re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    while ((m = re.exec(t))) { var e = normMail(m[0]); if (e && mails.indexOf(e) < 0) mails.push(e); }
    tels.sort(function (a, b) { return (estMobile(b) ? 1 : 0) - (estMobile(a) ? 1 : 0); });   // mobile d'abord
    return { tels: tels, mails: mails };
  }

  /* ── Fabrication du message ────────────────────────────────────── */

  function signature() {
    return 'Cordialement,\n' + EXPEDITEUR.nom + '\n' + EXPEDITEUR.fonction + ' — ' + EXPEDITEUR.societe + '\n' +
      EXPEDITEUR.tel + ' · ' + EXPEDITEUR.mail;
  }
  function dateFr(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  }
  function remplir(texte, v) {
    return String(texte).replace(/\{(\w+)\}/g, function (_, k) { return v[k] == null ? '' : v[k]; });
  }

  function preparer(idModele, vars) {
    var mod = MODELES[idModele];
    if (!mod) throw new Error('Modèle de message inconnu : ' + idModele);
    vars = vars || {};
    var contact = String(vars.contact || '').trim();
    var v = {
      salutation: contact ? 'Bonjour ' + contact : 'Bonjour',
      contact: contact,
      entreprise: vars.entreprise || '',
      chantier: vars.chantier || '',
      siLot: vars.lot ? ' (lot : ' + vars.lot + ')' : '',
      siMetier: vars.metier ? ' (' + vars.metier + ')' : '',
      siValidite: vars.dateValidite
        ? 'Celle dont nous disposons est valable jusqu\u2019au ' + dateFr(vars.dateValidite) + ' : merci de nous envoyer une version à jour.\n'
        : '',
      signature: signature()
    };
    return {
      modele: idModele,
      sujet: remplir(mod.sujet, v),
      corps: remplir(mod.mail, v),
      sms: remplir(mod.sms, v)
    };
  }

  /* ── Canaux (ouvrent un brouillon ; aucun envoi automatique) ───── */

  function lienMail(dest, msg) {
    return 'mailto:' + encodeURIComponent(normMail(dest)).replace('%40', '@') +
      '?subject=' + encodeURIComponent(msg.sujet) +
      '&body=' + encodeURIComponent(msg.corps.replace(/\n/g, '\r\n'));
  }
  function lienSms(tel, msg) {
    // Numéro au format international (+33…) : l'appli « Lien avec Windows » retrouve ainsi la conversation existante ou en crée une nouvelle.
    var n = normTel(tel).replace(/\s/g, '').replace(/^0/, '+33');
    var iphone = global.navigator && /iPhone|iPad/i.test(navigator.userAgent);
    return 'sms:' + n + (iphone ? '?&body=' : '?body=') + encodeURIComponent(msg.sms);
  }
  function _ouvrir(url) {
    var a = document.createElement('a');
    a.href = url; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); }, 500);
  }
  function ouvrirMail(dest, msg) {
    if (!normMail(dest)) return false;
    _ouvrir(lienMail(dest, msg)); return true;
  }
  function ouvrirSms(tel, msg) {
    if (!normTel(tel)) return false;
    _ouvrir(lienSms(tel, msg)); return true;
  }
  function copier(texte) {
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texte).then(function () { return true; }, function () { return _copierSecours(texte); });
    }
    return Promise.resolve(_copierSecours(texte));
  }
  function _copierSecours(texte) {
    try {
      var ta = document.createElement('textarea');
      ta.value = texte; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  }

  global.PhenixMsg = {
    expediteur: EXPEDITEUR,
    modeles: MODELES,
    normTel: normTel, normMail: normMail, estMobile: estMobile, extraireContacts: extraireContacts,
    preparer: preparer, lienMail: lienMail, lienSms: lienSms,
    ouvrirMail: ouvrirMail, ouvrirSms: ouvrirSms, copier: copier, dateFr: dateFr
  };
})(window);
