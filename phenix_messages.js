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

   ESPRIT PHÉNIX (ton de tous les messages) : 1) bienveillance, 2) aide à la construction, 3) accessibilité — toujours au service des autres.
   Concrètement : chaleureux, « je » (Maxime), merci d'abord, une raison positive à la demande, une main tendue (« appelez-moi, avec plaisir »), jamais de ton
   de reproche ni de menace ; pas de formule de politesse finale ni de signature (Maxime a la sienne dans Outlook, Aptos 12).

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
      sujet: 'Chantier {chantier} — attestation de décennale',
      mail:
        '{salutation},\n\n' +
        'Phénix-Architecture va encadrer les travaux pour le chantier {chantier}\n\n' +
        '{siValidite}' +
        'Pourriez-vous nous envoyer votre attestation de décennale en cours de validité par mail à ' + EXPEDITEUR.mail + ' ? ' +
        'Il nous faut ce document pour contractualiser le chantier.\n\n' +
        'Merci beaucoup\n\n' +
        'Phénix-Architecture \uD83D\uDC26\u200D\uD83D\uDD25',
      sms:
        '{salutation},\n\n' +
        'Phénix-Architecture va encadrer les travaux pour le chantier {chantier}\n\n' +
        'Pourriez-vous nous envoyer votre attestation de décennale en cours de validité par mail à ' + EXPEDITEUR.mail + ' ? ' +
        'Il nous faut ce document pour contractualiser le chantier.\n\n' +
        'Merci beaucoup\n\n' +
        'Phénix-Architecture \uD83D\uDC26\u200D\uD83D\uDD25'
    }
  };

  /* Correction d'une attestation reçue : un modèle, et une phrase par point à régler (clé = code de PhenixDecennale.controler).
     Variables des phrases : {dateFin} {dateDebut} {nomAtt} {lot}. Les codes sans phrase (info, territoire…) ne génèrent rien. */
  MODELES['decennale-correction'] = {
    libelle: 'Attestation de décennale à corriger ou mettre à jour',
    sujet: 'Chantier {chantier} — attestation de décennale',
    mail:
      '{salutation},\n\n' +
      'Merci pour l\u2019attestation de d\u00e9cennale que vous nous avez envoy\u00e9e pour le chantier {chantier}. ' +
      'Apr\u00e8s lecture, {siPoints}\n\n{points}\n\n' +
      'Pourriez-vous nous envoyer le document \u00e0 jour par mail \u00e0 ' + EXPEDITEUR.mail + ' ? ' +
      'Il nous le faut pour contractualiser le chantier.\n\n' +
      'Merci beaucoup\n\n' +
      'Phénix-Architecture \uD83D\uDC26\u200D\uD83D\uDD25'
  };
  MODELES['decennale-correction'].sms = MODELES['decennale-correction'].mail;
  var PHRASES_CORRECTION = {
    'pas-decennale': 'le document ne mentionne pas la garantie d\u00e9cennale (il semble s\u2019agir d\u2019une attestation de responsabilit\u00e9 civile) : auriez-vous l\u2019attestation de garantie d\u00e9cennale ?',
    'expiree': 'l\u2019attestation est arriv\u00e9e \u00e0 \u00e9ch\u00e9ance le {dateFin} : auriez-vous la version \u00e0 jour ?',
    'expire-avant-fin': 'l\u2019attestation est valable jusqu\u2019au {dateFin}, soit avant la fin pr\u00e9vue du chantier : auriez-vous la version renouvel\u00e9e ?',
    'pas-encore-valide': 'l\u2019attestation ne commence que le {dateDebut} : auriez-vous une attestation qui couvre la p\u00e9riode du chantier ?',
    'nom': 'le nom sur l\u2019attestation (\u00ab {nomAtt} \u00bb) ne correspond pas \u00e0 celui de votre devis : pouvez-vous nous confirmer la d\u00e9nomination exacte de votre entreprise ?',
    'siret': 'le SIRET de l\u2019attestation ne correspond pas \u00e0 celui de votre devis : pouvez-vous nous confirmer le bon num\u00e9ro ?',
    'police': 'le num\u00e9ro de police diff\u00e8re de celui de votre devis : pouvez-vous nous confirmer lequel est le bon ?',
    'activite': 'l\u2019activit\u00e9 des travaux pr\u00e9vus ({lot}) ne semble pas figurer parmi les activit\u00e9s garanties : pouvez-vous nous confirmer qu\u2019elle est bien couverte ?',
    'lecture': 'certaines informations sont difficiles \u00e0 lire (dates, activit\u00e9s ou signature) : pourriez-vous nous renvoyer une version compl\u00e8te et lisible ?'
  };
  var CODE_LECTURE = { 'dates-illisibles': 1, 'activites-absentes': 1, 'signature': 1 };
  /* Points à régler d'une liste d'incohérences : [{code, phrase}] (niveaux « bloquant » et « À vérifier » seulement). */
  function pointsCorrection(incs, vars) {
    vars = vars || {}; var vus = {}, out = [];
    (incs || []).forEach(function (x) {
      if (x.niveau === 'info' && x.code !== 'signature') return;
      var k = CODE_LECTURE[x.code] ? 'lecture' : x.code;
      if (!PHRASES_CORRECTION[k] || vus[k]) return; vus[k] = 1;
      out.push({ code: k, phrase: remplir(PHRASES_CORRECTION[k], {
        dateFin: dateFr(vars.dateFin), dateDebut: dateFr(vars.dateDebut), nomAtt: vars.nomAtt || '', lot: vars.lot || 'lot du chantier' }) });
    });
    return out;
  }
  function preparerCorrection(incs, vars) {
    vars = vars || {};
    var pts = pointsCorrection(incs, vars);
    if (!pts.length) return null;
    var liste = pts.map(function (p) { return '\u2013 ' + p.phrase.charAt(0).toUpperCase() + p.phrase.slice(1); }).join('\n');
    var intro = pts.length > 1 ? 'quelques points \u00e0 r\u00e9gler :' : 'un point \u00e0 r\u00e9gler :';
    var msg = preparer('decennale-correction', { contact: vars.contact, chantier: vars.chantier, siPoints: intro, points: liste });
    msg.points = pts; return msg;
  }

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

  /* Libellé lisible d'un chantier : « Raymond / Julien à Seuillet » (noms de famille des clients + commune).
     Repli : nom du chantier. */
  function _titre(t) { return String(t || '').toLowerCase().replace(/(^|[\s\-'’\/])([a-zà-ÿ])/g, function (_, a, b) { return a + b.toUpperCase(); }); }
  function libelleChantier(c) {
    c = c || {};
    var noms = String(c.client || '').split(/\s*\/\s*|\s+et\s+/i).map(function (p) {
      var m = p.trim().split(/\s+/).filter(function (w) { return !/^(m|mr|mme|mlle|monsieur|madame)\.?$/i.test(w); });
      return m.length ? _titre(m[m.length - 1]) : '';
    }).filter(Boolean);
    var base = noms.length ? noms.join(' / ') : _titre(c.nom || '');
    var cm = /\b\d{5}\s+([^,\n]+)/.exec(String(c.adresse || ''));
    var commune = cm ? _titre(cm[1].trim()) : '';
    return base + (commune ? ' à ' + commune : '');
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
        ? 'Celle que j\u2019ai est valable jusqu\u2019au ' + dateFr(vars.dateValidite) + ' : auriez-vous la version à jour ?\n\n'
        : '',
      siPoints: vars.siPoints || '',
      points: vars.points || '',
      signature: ''
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
    return 'sms:' + n + (iphone ? '?&body=' : '?body=') + encodeURIComponent(msg.sms.replace(/\n/g, '\r\n'));   // sauts de ligne conservés (RFC 5724 : %0D%0A)
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
    preparer: preparer, preparerCorrection: preparerCorrection, pointsCorrection: pointsCorrection, libelleChantier: libelleChantier, lienMail: lienMail, lienSms: lienSms,
    ouvrirMail: ouvrirMail, ouvrirSms: ouvrirSms, copier: copier, dateFr: dateFr
  };
})(window);
