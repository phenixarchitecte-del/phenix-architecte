/* =====================================================================
   PHÉNIX DÉCENNALE — lecture IA d'une attestation d'assurance décennale
   et contrôle de cohérence avec la fiche de l'artisan, son devis et le chantier.
   Fichier partagé (sans Firebase). Utilise le proxy IA de la suite Phénix.

   Usage :
     const att  = await PhenixDecennale.lire(base64Pdf);                // extraction IA
     const incs = PhenixDecennale.controler(att, { artisan, lots, finChantier });
     // incs = [{ niveau:'bloquant'|'attention'|'info', code, texte }]

   Niveaux (jamais portés par la couleur seule : toujours le mot « Bloquant » / « À vérifier » / « Info »).
   ===================================================================== */
(function (global) {
  'use strict';

  var PROXY_URL = 'https://phenix-proxy.phenixarchitecte.workers.dev';

  var PROMPT =
    'Tu es un assistant spécialisé dans les assurances du bâtiment français. ' +
    'Analyse l’attestation d’assurance fournie et retourne UNIQUEMENT un JSON valide, sans markdown ni texte autour :\n' +
    '{"nature":"decennale|rc_pro|autre","garantieDecennale":true,"entreprise":"raison sociale de l’assuré","siret":"14 chiffres",' +
    '"adresse":"","assureur":"nom de la compagnie","police":"numéro de police/contrat","dateDebut":"AAAA-MM-JJ","dateFin":"AAAA-MM-JJ",' +
    '"annee":2026,"activites":["activité garantie 1","activité 2"],"territoire":"France","signature":true,"commentaire":""}\n' +
    'RÈGLES : "nature" = decennale si le document atteste d’une garantie responsabilité décennale (articles 1792 et suivants du Code civil / L.241-1), ' +
    'rc_pro s’il ne s’agit que d’une responsabilité civile, autre sinon. "garantieDecennale" = true seulement si la décennale est expressément mentionnée. ' +
    '"entreprise" et "siret" = ceux de l’ASSURÉ (l’artisan), pas de l’assureur ni du courtier. ' +
    '"dateDebut"/"dateFin" = période de validité de l’attestation (pas la date d’émission du document) ; si seule une année est donnée, mettre le 01-01 et le 31-12 de cette année. ' +
    '"activites" = chaque activité professionnelle garantie, recopiée telle qu’écrite. "signature" = true si l’attestation porte une signature ou un cachet. ' +
    '"commentaire" = toute anomalie visible (document illisible, mentions barrées, exclusions notables, activité limitée). ' +
    'Champ non trouvé = chaîne vide (ou tableau vide, ou null pour "annee"). N’invente jamais une valeur.';

  /* ── Lecture du flux du proxy (JSON simple ou flux SSE) ── */
  function texteDeReponse(brut) {
    try {
      var d = JSON.parse(brut);
      if (d.error) throw new Error(d.error.message || 'Erreur proxy');
      return (d.content || []).map(function (b) { return b.text || ''; }).join('');
    } catch (e) {
      if (e && e.message && brut.indexOf('data:') < 0) throw e;
    }
    var texte = '';
    brut.split('\n').forEach(function (l) {
      l = l.trim(); if (l.indexOf('data:') !== 0) return;
      var j = l.slice(5).trim(); if (!j || j === '[DONE]') return;
      try {
        var evt = JSON.parse(j);
        if (evt.type === 'content_block_delta' && evt.delta && typeof evt.delta.text === 'string') texte += evt.delta.text;
      } catch (e2) {}
    });
    if (!texte) throw new Error('Réponse du proxy illisible');
    return texte;
  }

  async function lire(base64Pdf) {
    var res = await fetch(PROXY_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 1500,
        metadata: { user_id: 'decennale-lecture' },
        system: PROMPT,
        messages: [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf } },
          { type: 'text', text: 'Extrais les informations de cette attestation au format JSON demandé.' }
        ] }]
      })
    });
    var brut = await res.text();
    if (!res.ok) throw new Error('Proxy HTTP ' + res.status);
    var texte = texteDeReponse(brut).replace(/```json|```/g, '').trim();
    var i = texte.indexOf('{'), j = texte.lastIndexOf('}');
    var att = JSON.parse(texte.slice(i, j + 1));
    return normaliser(att);
  }

  function normaliser(a) {
    a = a || {};
    var iso = function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? d : ''; };
    return {
      nature: ['decennale', 'rc_pro', 'autre'].indexOf(a.nature) >= 0 ? a.nature : 'autre',
      garantieDecennale: a.garantieDecennale === true,
      entreprise: String(a.entreprise || '').trim(),
      siret: String(a.siret || '').replace(/\D/g, ''),
      adresse: String(a.adresse || '').trim(),
      assureur: String(a.assureur || '').trim(),
      police: String(a.police || '').trim(),
      dateDebut: iso(a.dateDebut), dateFin: iso(a.dateFin),
      annee: parseInt(a.annee, 10) || null,
      activites: Array.isArray(a.activites) ? a.activites.map(function (x) { return String(x).trim(); }).filter(Boolean) : [],
      territoire: String(a.territoire || '').trim(),
      signature: a.signature !== false,
      commentaire: String(a.commentaire || '').trim()
    };
  }

  /* ── Contrôles de cohérence ─────────────────────────────────────── */

  function nn(s) {   // nom d'entreprise comparable
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\b(sarl|eurl|sas|sasu|sa|ei|entreprise|ets|ste|societe|sci|auto|entrepreneur)\b/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
  function siretValide(s) {   // clé de Luhn (les SIRET de La Poste font exception, ignoré ici)
    s = String(s || '').replace(/\D/g, ''); if (s.length !== 14) return false;
    var somme = 0;
    for (var i = 0; i < 14; i++) { var n = parseInt(s[i], 10); if (i % 2 === 0) { n *= 2; if (n > 9) n -= 9; } somme += n; }
    return somme % 10 === 0;
  }

  /* corps de métier → racines de mots attendus dans les activités garanties */
  var METIERS = [
    { re: /electri/, mots: ['electri'] },
    { re: /plomb|sanitaire/, mots: ['plomb', 'sanitaire', 'chauffage', 'thermique'] },
    { re: /chauffage|vmc|climat|pac|pompe/, mots: ['chauffage', 'thermique', 'climat', 'ventilation', 'plomb', 'genie climatique', 'vmc'] },
    { re: /macon|gros.?oeuvre|fondation|beton|terrassement|vrd/, mots: ['macon', 'gros', 'beton', 'fondation', 'terrassement', 'vrd', 'travaux publics', 'genie civil', 'batiment'] },
    { re: /charpent/, mots: ['charpent', 'ossature', 'bois', 'couverture'] },
    { re: /couvr|toit|zinguer/, mots: ['couvert', 'toiture', 'zinguer', 'charpent', 'etancheite'] },
    { re: /menuis/, mots: ['menuis', 'bois', 'fermeture', 'vitrerie', 'serrurerie'] },
    { re: /cloison|doublage|platr|isolation/, mots: ['platr', 'cloison', 'isolation', 'plaque', 'doublage'] },
    { re: /peintur|finition|revetement|sol|carrel|faience/, mots: ['peintur', 'revetement', 'sol', 'carrel', 'finition', 'platr', 'decoration'] },
    { re: /facade|enduit|ravalement/, mots: ['facade', 'enduit', 'ravalement', 'macon', 'peintur'] }
  ];
  function mnorm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function controler(att, ctx) {
    ctx = ctx || {};
    var art = ctx.artisan || {}, inc = [], today = ctx.today || new Date().toISOString().slice(0, 10);
    function add(niveau, code, texte) { inc.push({ niveau: niveau, code: code, texte: texte }); }
    var fr = function (iso) { return global.PhenixMsg ? global.PhenixMsg.dateFr(iso) : iso; };

    if (att.nature !== 'decennale' || !att.garantieDecennale) {
      add('bloquant', 'pas-decennale', att.nature === 'rc_pro'
        ? 'Ce document est une attestation de responsabilité civile, pas une décennale.'
        : 'La garantie décennale n’est pas expressément mentionnée sur ce document.');
    }
    if (!att.dateFin) {
      add('attention', 'dates-illisibles', 'La date de fin de validité n’a pas pu être lue : à vérifier sur l’attestation.');
    } else if (att.dateFin < today) {
      add('bloquant', 'expiree', 'Attestation expirée depuis le ' + fr(att.dateFin) + '.');
    } else if (ctx.finChantier && att.dateFin < ctx.finChantier) {
      add('attention', 'expire-avant-fin', 'Valable jusqu’au ' + fr(att.dateFin) + ', soit avant la fin prévue du chantier (' + fr(ctx.finChantier) + ') : renouvellement à prévoir.');
    }
    if (att.dateDebut && att.dateDebut > today) {
      add('attention', 'pas-encore-valide', 'L’attestation ne commence que le ' + fr(att.dateDebut) + '.');
    }
    if (art.entreprise && att.entreprise && nn(art.entreprise) !== nn(att.entreprise) &&
        nn(art.entreprise).indexOf(nn(att.entreprise)) < 0 && nn(att.entreprise).indexOf(nn(art.entreprise)) < 0) {
      add('bloquant', 'nom', 'Le nom sur l’attestation (« ' + att.entreprise + ' ») ne correspond pas à l’entreprise du devis (« ' + art.entreprise + ' »).');
    }
    var sirFiche = String(art.siret || '').replace(/\D/g, '');
    if (att.siret) {
      if (!siretValide(att.siret)) add('attention', 'siret-invalide', 'Le SIRET lu sur l’attestation (' + att.siret + ') n’est pas un numéro valide : à vérifier.');
      if (sirFiche && sirFiche !== att.siret && sirFiche.slice(0, 9) !== att.siret.slice(0, 9)) {
        add('bloquant', 'siret', 'Le SIRET de l’attestation (' + att.siret + ') diffère de celui du devis (' + sirFiche + ').');
      }
    } else if (sirFiche) {
      add('info', 'siret-absent', 'Aucun SIRET lisible sur l’attestation.');
    }
    if (art.assurance && att.police) {
      var p1 = String(art.assurance).replace(/\W/g, '').toLowerCase(), p2 = att.police.replace(/\W/g, '').toLowerCase();
      if (p1 && p2 && p1 !== p2 && p1.indexOf(p2) < 0 && p2.indexOf(p1) < 0) {
        add('attention', 'police', 'N° de police différent de celui du devis (devis : ' + art.assurance + ' · attestation : ' + att.police + ').');
      }
    }
    // activités garanties vs lots confiés à l'artisan
    var lots = ctx.lots || [], acts = mnorm(att.activites.join(' '));
    if (!att.activites.length) {
      add('attention', 'activites-absentes', 'Aucune activité garantie n’a pu être lue sur l’attestation.');
    } else {
      lots.forEach(function (lot) {
        var cle = mnorm((lot.nom || '') + ' ' + (art.metier || ''));
        var regle = METIERS.filter(function (m) { return m.re.test(cle); });
        if (!regle.length) return;
        var couvert = regle.some(function (m) { return m.mots.some(function (w) { return acts.indexOf(w) >= 0; }); });
        if (!couvert) add('attention', 'activite', 'Le lot « ' + lot.nom + ' » ne semble pas couvert par les activités garanties (' + att.activites.slice(0, 4).join(' ; ') + ').');
      });
    }
    if (att.territoire && !/france|metropol|monde|europe|ue\b/.test(mnorm(att.territoire))) {
      add('attention', 'territoire', 'Territoire garanti : « ' + att.territoire + ' ». Vérifier que le chantier est couvert.');
    }
    if (att.signature === false) add('info', 'signature', 'Aucune signature ni cachet repéré sur l’attestation.');
    if (att.commentaire) add('info', 'remarque', 'Remarque de lecture : ' + att.commentaire);
    return inc;
  }

  var LIBELLE = { bloquant: 'Bloquant', attention: 'À vérifier', info: 'Info' };
  var SYMBOLE = { bloquant: '✖', attention: '⚠', info: 'ℹ' };

  function resume(incs) {
    var b = incs.filter(function (i) { return i.niveau === 'bloquant'; }).length;
    var a = incs.filter(function (i) { return i.niveau === 'attention'; }).length;
    return { bloquants: b, attention: a, conforme: b === 0 && a === 0 };
  }

  global.PhenixDecennale = {
    lire: lire, normaliser: normaliser, controler: controler, resume: resume,
    libelle: LIBELLE, symbole: SYMBOLE, siretValide: siretValide
  };
})(window);
