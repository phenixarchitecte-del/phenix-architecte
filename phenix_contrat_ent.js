/* =====================================================================
   PHÉNIX CONTRAT ENTREPRISE — acte d'engagement PAR ENTREPRISE (un seul contrat, plusieurs lots)
   Fichier partagé (sans Firebase, sans accès au DOM). Dépend de phenix_pdf.js (charte) et jsPDF.

   Deux modes, choisis par chantier :
     'cg'  : Phénix-Architecture est contractant général → contrat de SOUS-TRAITANCE avec l'entreprise
             (le maître d'ouvrage accepte le sous-traitant et agrée ses conditions de paiement — loi n° 75-1334 du 31/12/1975).
     'moe' : Phénix-Architecture est maître d'œuvre → contrat DIRECT entre le maître d'ouvrage et l'entreprise
             (Phénix vise le contrat et assure la direction et la coordination des travaux).

   Usage :
     const ctrl = PhenixContratEnt.controler(donnees);          // [{niveau:'bloquant'|'attention', texte}]
     const px   = PhenixContratEnt.generer(donnees, { brouillon:true|false });
     px.enregistrer(PhenixContratEnt.nomFichier(donnees));

   ⚠ Les clauses reprennent les règles courantes du droit français de la construction, mais ce modèle
   doit être relu par un juriste (ou l'assureur) avant tout usage à grande échelle.
   ===================================================================== */
(function (global) {
  'use strict';

  var SOCIETE = {
    nom: 'Phénix-Architecture EURL', siret: '987 989 316 00011',
    adresse: '6 lieu-dit l’Étreille, 63780 Saint-Georges-de-Mons',
    representant: 'Maxime Suchet', qualite: 'gérant',
    tel: '04 73 73 00 59', mail: 'contact@phenixarchitecte.fr'
  };

  /* ── Nombres et montants en toutes lettres ───────────────────────── */
  var UN = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
  var DIZ = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

  function moinsDeCent(n, final) {   // 0 à 99
    if (n < 17) return UN[n];
    if (n < 20) return 'dix-' + UN[n - 10];
    if (n < 70) {
      var d = Math.floor(n / 10), u = n % 10;
      if (u === 0) return DIZ[d];
      return DIZ[d] + (u === 1 ? ' et un' : '-' + UN[u]);
    }
    if (n < 80) {   // 70-79 : soixante-dix…
      var r = n - 60;
      return 'soixante' + (r === 11 ? ' et onze' : '-' + moinsDeCent(r));
    }
    if (n === 80) return 'quatre-vingts';   // (devient « quatre-vingt » devant un nom, géré par l'appelant)
    return 'quatre-vingt-' + moinsDeCent(n - 80);
  }
  function moinsDeMille(n, final) {   // 0 à 999 ; final = le groupe termine le nombre (accord de « vingts », « cents »)
    var c = Math.floor(n / 100), r = n % 100, t = '';
    if (c > 0) {
      t = (c === 1 ? 'cent' : UN[c] + ' cent');
      if (r === 0 && c > 1 && final) t += 's';
      if (r > 0) t += ' ';
    }
    if (r > 0) {
      var m = moinsDeCent(r);
      if (r === 80 && !final) m = 'quatre-vingt';
      t += m;
    }
    return t;
  }
  function enLettres(n) {
    n = Math.floor(Math.abs(n));
    if (n === 0) return 'zéro';
    var out = [];
    var md = Math.floor(n / 1e9), mi = Math.floor((n % 1e9) / 1e6), th = Math.floor((n % 1e6) / 1e3), re = n % 1e3;
    if (md) out.push(moinsDeMille(md, false) + ' milliard' + (md > 1 ? 's' : ''));
    if (mi) out.push(moinsDeMille(mi, false) + ' million' + (mi > 1 ? 's' : ''));
    if (th) out.push(th === 1 ? 'mille' : moinsDeMille(th, false) + ' mille');
    if (re) out.push(moinsDeMille(re, true));
    return out.join(' ');
  }
  function montantEnLettres(x) {
    x = Math.round((parseFloat(x) || 0) * 100) / 100;
    var e = Math.floor(x), c = Math.round((x - e) * 100), t = enLettres(e) + ((e >= 1e6 && e % 1e6 === 0) ? ' d’euros' : ' euro' + (e > 1 ? 's' : ''));
    if (c > 0) t += ' et ' + enLettres(c) + ' centime' + (c > 1 ? 's' : '');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function eur(x) {
    var v = (Math.round((parseFloat(x) || 0) * 100) / 100).toFixed(2).split('.');
    return v[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + v[1] + ' €';
  }

  /* ── Période d'intervention (semaine ISO) ─────────────────────────── */
  function lundiSemaine(an, sem) {
    var j4 = new Date(Date.UTC(an, 0, 4)), dow = (j4.getUTCDay() + 6) % 7, m = new Date(j4);
    m.setUTCDate(j4.getUTCDate() - dow + (sem - 1) * 7); return m;
  }
  function fr(d) { return d.toLocaleDateString('fr-FR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }); }
  function periodeLot(l) {
    var sem = parseInt(l.semaine, 10), an = parseInt(l.annee, 10), dur = parseFloat(l.duree);
    if (!(sem >= 1 && sem <= 53) || !(an >= 2000)) return null;
    var debut = lundiSemaine(an, sem), fin = new Date(debut);
    fin.setUTCDate(debut.getUTCDate() + Math.max(0, Math.ceil((dur || 1) - 1)) * 7 + 4);
    return { debut: fr(debut), fin: fr(fin), sem: sem, an: an, dur: dur || 1, isoDebut: debut.toISOString().slice(0, 10), isoFin: fin.toISOString().slice(0, 10) };
  }

  function siretValide(s) {
    s = String(s || '').replace(/\D/g, ''); if (s.length !== 14) return false;
    var somme = 0;
    for (var i = 0; i < 14; i++) { var n = parseInt(s[i], 10); if (i % 2 === 0) { n *= 2; if (n > 9) n -= 9; } somme += n; }
    return somme % 10 === 0;
  }
  function siretAffiche(s) { s = String(s || '').replace(/\D/g, ''); return s.length === 14 ? s.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, '$1 $2 $3 $4') : String(s || ''); }

  /* ── Totaux ───────────────────────────────────────────────────────── */
  function totaux(lots) {
    var ht = 0, ttc = 0, parTaux = {};
    lots.forEach(function (l) {
      var h = parseFloat(l.prixHt) || 0, t = parseFloat(l.tva);
      if (isNaN(t)) t = 20;
      var tv = Math.round(h * t) / 100;
      l._tva = t; l._tvaMontant = tv; l._ttc = Math.round((h + tv) * 100) / 100;
      ht += h; ttc += l._ttc; parTaux[t] = (parTaux[t] || 0) + tv;
    });
    var tva = ttc - ht;
    return { ht: Math.round(ht * 100) / 100, tva: Math.round(tva * 100) / 100, ttc: Math.round(ttc * 100) / 100, parTaux: parTaux };
  }

  function numero(d) {
    var an = (d.dateEdition || new Date().toISOString()).slice(0, 4);
    var code = String((d.chantier && d.chantier.nom) || 'CH').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || 'CH';
    return 'AE-' + an + '-' + code + '-' + String(d.rang || 1).padStart(2, '0');
  }
  function nomFichier(d) {
    var e = String((d.entreprise && d.entreprise.nom) || 'entreprise').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return 'Acte-engagement-' + e + '-' + numero(d) + '.pdf';
  }

  /* ── Contrôle de complétude : ce qui rend le contrat inexploitable ou fragile ── */
  function controler(d) {
    var inc = [], ent = d.entreprise || {}, ch = d.chantier || {}, cond = d.conditions || {}, lots = d.lots || [];
    function add(niveau, texte) { inc.push({ niveau: niveau, texte: texte }); }
    if (!ent.nom) add('bloquant', 'Dénomination de l’entreprise manquante.');
    if (!ent.forme) add('attention', 'Forme juridique de l’entreprise non précisée (SARL, EURL, SAS, entreprise individuelle…).');
    if (!ent.adresse) add('bloquant', 'Adresse du siège de l’entreprise manquante.');
    if (!ent.siret) add('bloquant', 'SIRET de l’entreprise manquant.');
    else if (!siretValide(ent.siret)) add('attention', 'SIRET de l’entreprise invalide (' + ent.siret + ') : à vérifier.');
    if (!ent.representant || !ent.qualite) add('bloquant', 'Représentant de l’entreprise (nom et qualité : gérant, président…) manquant : le signataire doit avoir le pouvoir d’engager l’entreprise.');
    if (!ent.email && !ent.tel) add('attention', 'Ni mail ni téléphone pour l’entreprise.');
    if (!ch.client) add('bloquant', 'Maître d’ouvrage (client) non renseigné sur le chantier.');
    if (!ch.adresse) add('bloquant', 'Adresse du chantier non renseignée.');
    if (!lots.length) add('bloquant', 'Aucun lot rattaché à ce contrat.');
    lots.forEach(function (l) {
      var nom = (l.num ? l.num + ' ' : '') + (l.nom || 'lot');
      if (!(parseFloat(l.prixHt) > 0)) add('bloquant', 'Prix engagé manquant pour ' + nom + '.');
      if (!periodeLot(l)) add('bloquant', 'Semaine de début manquante pour ' + nom + '.');
    });
    var pc = parseFloat(cond.retenuePct);
    if (pc > 5) add('bloquant', 'La retenue de garantie ne peut pas dépasser 5 % du marché (loi n° 71-584 du 16 juillet 1971).');
    var dl = parseInt(cond.delaiPaiement, 10);
    if (dl > 60) add('bloquant', 'Le délai de paiement ne peut pas dépasser 60 jours à compter de la date de la facture (article L.441-10 du Code de commerce).');
    if (d.mode === 'cg' && !cond.garantiePaiement) add('attention', 'Sous-traitance : garantie de paiement du sous-traitant non précisée (délégation de paiement ou caution — article 14 de la loi du 31/12/1975).');
    if (d.mode === 'moe' && cond.horsEtablissement === undefined) add('attention', 'Précisez si le contrat est signé hors établissement (domicile du client) : un droit de rétractation de 14 jours peut s’appliquer au maître d’ouvrage consommateur.');
    var a = d.assurance || {};
    if (!a.recue) add('attention', 'Attestation de décennale non reçue : elle doit être remise avant le démarrage des travaux.');
    else if (a.bloquants) add('bloquant', 'L’attestation de décennale reçue présente une incohérence bloquante (' + a.bloquants + ').');
    return inc;
  }

  /* ── Génération du PDF ────────────────────────────────────────────── */
  function generer(d, opts) {
    opts = opts || {};
    var PX = global.PhenixPDF, mode = d.mode === 'moe' ? 'moe' : 'cg';
    var ent = d.entreprise || {}, ch = d.chantier || {}, cond = d.conditions || {}, lots = (d.lots || []).slice();
    var tot = totaux(lots), ref = numero(d), assurance = d.assurance || {};
    var date = (d.dateEdition ? new Date(d.dateEdition) : new Date()).toLocaleDateString('fr-FR');
    var px = PX.create({
      titre: 'Acte d’engagement',
      sousTitre: (mode === 'cg' ? 'Contrat de sous-traitance' : 'Marché de travaux') + ' · ' + (ent.nom || 'Entreprise') + ' · Chantier ' + (ch.nom || '') + ' · Édité le ' + date,
      reference: ref, paraphes: true, brouillon: opts.brouillon ? 'PROJET — À COMPLÉTER, NON SIGNABLE' : ''
    });
    var multi = lots.length > 1, lotsTxt = lots.length + ' lot' + (multi ? 's' : '');
    var phenix = '**Phénix-Architecture**', entN = '**' + (ent.nom || '…') + '**';

    // En-tête chiffres clés
    px.cles([
      { etiquette: 'Montant HT', valeur: eur(tot.ht), detail: lotsTxt },
      { etiquette: 'Montant TTC', valeur: eur(tot.ttc), detail: 'TVA facturée : ' + eur(tot.tva) },
      { etiquette: 'Intervention', valeur: periodeGlobale(lots), detail: 'selon planning de l’article 6' }
    ]);

    px.texte('Le présent acte d’engagement a une valeur contractuelle. Il fixe le cadre dans lequel les travaux ci-dessous sont réalisés et protège toutes les parties. Il doit être lu en entier avant signature : en cas d’incompréhension ou d’objection, l’Entreprise s’adresse à l’émetteur du document avant de signer. Les parties l’exécutent de bonne foi (article 1104 du Code civil) dans un esprit de communication et de bienveillance : en cas de difficulté, elles recherchent d’abord une solution amiable avant toute sanction ou poursuite (article 12).');

    // 1 Parties
    px.article('Article 1 — Parties');
    var cPhenix = {
      titre: mode === 'cg' ? 'Entrepreneur principal — contractant général' : 'Maître d’œuvre',
      lignes: ['**' + SOCIETE.nom + '**', 'SIRET ' + SOCIETE.siret, SOCIETE.adresse, 'Représentée par ' + SOCIETE.representant + ', ' + SOCIETE.qualite, SOCIETE.tel + ' · ' + SOCIETE.mail]
    };
    var cEnt = {
      titre: mode === 'cg' ? 'L’Entreprise — sous-traitant' : 'L’Entreprise',
      lignes: ['**' + (ent.nom || '…') + '**' + (ent.forme ? ' (' + ent.forme + ')' : ''), 'SIRET ' + (siretAffiche(ent.siret) || '…'),
        ent.adresse || 'Adresse du siège : …', 'Représentée par ' + (ent.representant || '…') + ', ' + (ent.qualite || '…'),
        [ent.tel, ent.email].filter(Boolean).join(' · ') || 'Contact : …']
    };
    var cMo = {
      titre: 'Maître d’ouvrage',
      lignes: ['**' + (ch.client || '…') + '**', ch.clientAdresse ? ch.clientAdresse : 'Adresse du chantier :', ch.adresse || '…']
    };
    if (mode === 'cg') px.cadres([cPhenix, cEnt]); else px.cadres([cMo, cEnt]);
    if (mode === 'cg') px.cadres([cMo, { titre: 'Chantier', lignes: ['**' + (ch.nom || '…') + '**', ch.adresse || '…', ch.type ? ch.type : ''] }]);
    else px.cadres([cPhenix, { titre: 'Chantier', lignes: ['**' + (ch.nom || '…') + '**', ch.adresse || '…', ch.type ? ch.type : ''] }]);
    if (mode === 'cg') {
      px.texte('Phénix-Architecture agit en qualité de **contractant général** : elle est titulaire du marché de travaux conclu avec le Maître d’ouvrage et confie à l’Entreprise, par le présent contrat de **sous-traitance**, l’exécution des lots désignés à l’article 2. Les articles 3 (acceptation du sous-traitant et agrément de ses conditions de paiement) et 14 (garantie de paiement) de la loi n° 75-1334 du 31 décembre 1975 s’appliquent.');
    } else {
      px.texte('Phénix-Architecture agit en qualité de **maître d’œuvre** : elle n’est pas partie à l’obligation de paiement. Le présent contrat lie directement le Maître d’ouvrage et l’Entreprise ; Phénix-Architecture le vise, dirige et coordonne les travaux, vérifie les situations et propose la réception.');
    }

    // 2 Objet
    px.article('Article 2 — Objet et lots confiés');
    px.texte('L’Entreprise s’engage à exécuter, conformément aux règles de l’art, aux documents techniques remis et à la réglementation en vigueur, les travaux du chantier « ' + (ch.nom || '…') + ' » correspondant ' + (multi ? 'aux **' + lots.length + ' lots** suivants, qui forment **un seul et même contrat**' : 'au lot suivant') + ' :', { suite: 24 });
    px.tableau({
      colonnes: [{ titre: 'Lot', x: 17 }, { titre: 'Désignation', x: 38, w: 120 }, { titre: 'Montant HT', x: 193, align: 'right', gras: true }],
      lignes: lots.map(function (l) { return [l.num || '', l.nom || '', eur(l.prixHt)]; }),
      total: ['TOTAL', '', eur(tot.ht)]
    });
    px.cases([
      { texte: 'À l’ensemble des lots ci-dessus, offre de base', coche: true },
      { texte: 'Avec les variantes ou prestations supplémentaires suivantes : ' + (cond.variantes ? '**' + cond.variantes + '**' : 'néant'), coche: !!cond.variantes }
    ]);

    // 3 Pièces
    px.article('Article 3 — Pièces contractuelles');
    px.texte('Après avoir pris connaissance des pièces ci-dessous, l’Entreprise déclare les accepter sans réserve. En cas de contradiction, elles prévalent dans cet ordre :', { suite: 14 });
    var pieces = ['**1. Le présent acte d’engagement** et ses annexes ;', '**2. Le CCTP** (cahier des clauses techniques particulières), général et par lot' + (cond.dateCctp ? ', remis le ' + cond.dateCctp : '') + ' ;',
      '**3. Les plans et pièces du dossier de consultation** (DCE)' + (cond.datePlans ? ', remis le ' + cond.datePlans : '') + ' ;', '**4. L’offre (devis) de l’Entreprise**, dans la limite de ce qui n’est pas contraire aux pièces qui précèdent.'];
    if (cond.piecesAutres) pieces.push('**5. Autres pièces :** ' + cond.piecesAutres);
    px.puces(pieces);
    if (cond.remarques) px.texte('**Remarques de l’Entreprise :** ' + cond.remarques);

    // 4 Prix
    px.article('Article 4 — Prix');
    px.texte('Le prix est **ferme, forfaitaire et non révisable** pour les prestations décrites aux pièces contractuelles et pendant la durée d’exécution prévue à l’article 6. Il comprend toutes les fournitures, la main-d’œuvre, les moyens, les transports, les installations de chantier, les assurances, la gestion et l’évacuation de ses déchets. Il est détaillé par lot en **annexe A**.');
    px.tableau({
      colonnes: [{ titre: 'Lot', x: 17 }, { titre: 'Désignation', x: 38, w: 50 }, { titre: 'Montant HT', x: 112, align: 'right' }, { titre: 'TVA', x: 128, align: 'right' }, { titre: 'Montant TVA', x: 156, align: 'right' }, { titre: 'Montant TTC', x: 193, align: 'right', gras: true }],
      lignes: lots.map(function (l) { return [l.num || '', l.nom || '', eur(l.prixHt), l._tva + ' %', eur(l._tvaMontant), eur(l._ttc)]; }),
      total: ['TOTAL', '', eur(tot.ht), '', eur(tot.tva), eur(tot.ttc)]
    });
    px.texte('**Montant total hors taxes : ' + eur(tot.ht) + '**, soit en lettres : ' + montantEnLettres(tot.ht) + '.');
    px.texte('**Montant total toutes taxes comprises : ' + eur(tot.ttc) + '**, soit en lettres : ' + montantEnLettres(tot.ttc) + '.');
    px.texte('La TVA est facturée par l’Entreprise au taux indiqué pour chaque lot, qu’elle certifie correspondre à la nature des travaux ; elle est seule responsable de l’application du taux exact (et des attestations correspondantes, notamment pour un taux réduit). Tout complément de prix suppose un avenant écrit (article 9).');

    // 5 Paiement
    px.article('Article 5 — Conditions de paiement');
    var ac = parseFloat(cond.acomptePct) || 0, delai = parseInt(cond.delaiPaiement, 10) || 30, ret = parseFloat(cond.retenuePct) || 0;
    var facturerA = mode === 'cg' ? 'Phénix-Architecture' : 'le Maître d’ouvrage, avec copie à Phénix-Architecture';
    var pay = [];
    pay.push(ac > 0
      ? '**Acompte :** un acompte de **' + ac + ' %** du montant HT, soit **' + eur(tot.ht * ac / 100) + ' HT**, est versé à l’Entreprise sur présentation d’une facture d’acompte, avant le démarrage de son intervention.'
      : '**Acompte :** aucun acompte n’est dû à la signature.');
    pay.push('**Situations :** l’Entreprise adresse à ' + facturerA + ' une facture par situation, à l’avancement réel des travaux, ' + (mode === 'cg' ? 'visée par Phénix-Architecture' : 'visée par le maître d’œuvre') + ' avant paiement. Chaque facture reprend la référence **' + ref + '**, le lot concerné, le cumul des travaux réalisés et les sommes déjà réglées.');
    pay.push('**Délai de règlement :** **' + delai + ' jours** à compter de la date d’émission de la facture ' + (delai >= 60 ? '' : '(60 jours maximum) ') + 'sous réserve de sa conformité.');
    pay.push('**Retard :** tout retard de paiement entraîne, de plein droit et sans mise en demeure, des pénalités au taux de **trois fois le taux d’intérêt légal**, ainsi qu’une **indemnité forfaitaire de recouvrement de 40 €** (articles L.441-10 et D.441-5 du Code de commerce).');
    pay.push(ret > 0 ? '**Retenue de garantie :** ' + ret + ' % du montant du marché, libérée un an après la réception, ou remplacée par une caution (loi n° 71-584 du 16 juillet 1971).' : '**Retenue de garantie :** néant.');
    pay.push('**Règlement :** par virement sur le compte dont le RIB est joint par l’Entreprise (annexe B). Aucun IBAN n’est saisi dans le présent document.');
    px.puces(pay);
    if (mode === 'cg') {
      px.texte('**Garantie de paiement du sous-traitant** (article 14 de la loi du 31 décembre 1975) :', { suite: 14 });
      px.cases([
        { texte: 'Délégation de paiement : le Maître d’ouvrage s’engage à payer directement l’Entreprise à concurrence du prix des travaux sous-traités', coche: cond.garantiePaiement === 'delegation' },
        { texte: 'Caution personnelle et solidaire d’un établissement agréé' + (cond.cautionRef ? ' (réf. ' + cond.cautionRef + ')' : ''), coche: cond.garantiePaiement === 'caution' }
      ]);
    }

    // 6 Délais
    px.article('Article 6 — Délais et planification d’intervention');
    px.texte('L’Entreprise s’engage à intervenir sur les périodes ci-dessous, établies d’un commun accord avec Phénix-Architecture, qui coordonne l’ordonnancement des corps d’état. Les dates sont des **engagements** : toute modification se fait par écrit (article 9).', { suite: 24 });
    px.tableau({
      colonnes: [{ titre: 'Lot', x: 17 }, { titre: 'Désignation', x: 38, w: 62 }, { titre: 'Début (lundi)', x: 126, align: 'right' }, { titre: 'Durée', x: 148, align: 'right' }, { titre: 'Fin (vendredi)', x: 193, align: 'right', gras: true }],
      lignes: lots.map(function (l) {
        var p = periodeLot(l);
        return [l.num || '', l.nom || '', p ? p.debut + ' (S' + p.sem + ')' : '—', p ? p.dur + ' sem.' : '—', p ? p.fin : '—'];
      })
    });
    var pen = parseFloat(cond.penaliteJour) || 0;
    px.texte(pen > 0
      ? 'En cas de retard d’exécution imputable à l’Entreprise, et après mise en demeure restée sans effet pendant 3 jours ouvrés, une pénalité forfaitaire de **' + eur(pen) + ' par jour calendaire** de retard est due, sans préjudice de la réparation du dommage prouvé causé aux autres intervenants.'
      : 'Tout retard imputable à l’Entreprise ouvre droit à la réparation du préjudice prouvé qu’il cause à Phénix-Architecture et aux autres intervenants. Les causes légitimes de report (intempéries constatées, retard d’un autre corps d’état, décision du Maître d’ouvrage) sont notifiées par écrit et donnent lieu à un nouveau planning.');

    // 7 Obligations
    px.article('Article 7 — Obligations de l’Entreprise');
    px.texte('**Assurances.** Avant le démarrage de son intervention, l’Entreprise remet une attestation d’**assurance responsabilité civile professionnelle** et une attestation d’**assurance décennale** en cours de validité, mentionnant expressément les activités correspondant aux lots du présent contrat. Elle maintient ces garanties jusqu’à l’expiration des garanties légales.' +
      (assurance.recue ? ' **Attestation reçue :** ' + [assurance.assureur, assurance.police ? 'police ' + assurance.police : '', assurance.validite ? 'valable jusqu’au ' + assurance.validite : ''].filter(Boolean).join(' · ') + '.' : ' À la date d’édition, l’attestation de décennale n’a **pas encore été remise**.'));
    px.texte('**Vigilance et travail dissimulé** (articles L.8222-1 et D.8222-5 du Code du travail). Quel que soit le montant du contrat, l’Entreprise remet avant le démarrage, puis tous les six mois jusqu’à la fin du contrat : l’attestation de vigilance de l’URSSAF (déclarations sociales et paiement des cotisations) de moins de six mois ; un justificatif d’immatriculation (extrait Kbis de moins de trois mois, ou carte d’identification / répertoire des métiers) ; et, le cas échéant, la liste nominative des salariés étrangers soumis à autorisation de travail. Tout recours au travail dissimulé est interdit et entraîne la résiliation du contrat aux torts de l’Entreprise.');
    px.puces([
      'Respecter les règles de l’art, les DTU et normes applicables, les prescriptions du CCTP et les consignes du ' + (mode === 'cg' ? 'contractant général' : 'maître d’œuvre') + '.',
      'Respecter les règles d’hygiène et de sécurité (plan de prévention, PPSPS ou documents équivalents, port des équipements de protection), protéger les existants et les ouvrages des autres corps d’état.',
      'Assurer la coordination avec les autres corps d’état, tenir son chantier propre, évacuer ses déchets et laisser son emplacement propre à la fin de son intervention.',
      'Alerter sans délai, par écrit, de toute difficulté, de tout défaut des supports ou ouvrages précédents et de toute non-conformité qu’elle constate.'
    ]);

    // 8 Sous-traitance
    px.article('Article 8 — Sous-traitance et cotraitance par l’Entreprise');
    px.texte('L’Entreprise exécute les travaux avec son propre personnel. Elle ne peut sous-traiter tout ou partie du contrat qu’avec l’**accord écrit préalable** de Phénix-Architecture' + (mode === 'cg' ? ' et après acceptation du sous-traitant et agrément de ses conditions de paiement par le Maître d’ouvrage (article 3 de la loi du 31 décembre 1975)' : '') + '. Elle reste seule responsable de ses sous-traitants et de ses co-traitants vis-à-vis des autres parties. Aucun groupement d’entreprises n’est prévu au présent contrat' + (cond.groupement ? ' sauf : ' + cond.groupement : '') + '.');

    // 9 Modifications
    px.article('Article 9 — Surprises de chantier, modifications et avenants');
    px.texte('Une **surprise de chantier** est une difficulté non visible ou non décelable avant le démarrage (état réel d’un support ou de la structure existante, éléments cachés, réseaux non repérés, sol différent de l’étude). Dès qu’elle en constate une, l’Entreprise : (1) suspend la partie de travaux concernée, (2) en informe sans délai Phénix-Architecture par écrit, photographies à l’appui, (3) remet un chiffrage détaillé de la prestation supplémentaire et de son incidence sur les délais.');
    px.texte('**Aucune prestation supplémentaire ne peut être exécutée ni facturée sans avenant écrit**, signé avant son exécution, précisant la nature des travaux, leur prix et leur effet sur le délai' + (mode === 'cg' ? ' et, si le prix du marché principal en est affecté, accepté par le Maître d’ouvrage' : '') + '. À défaut, les travaux réalisés restent à la charge de l’Entreprise.');

    // 10 Réception
    px.article('Article 10 — Réception et garanties');
    px.texte('Les travaux font l’objet d’une réception contradictoire constatée par procès-verbal, avec ou sans réserves (article 1792-6 du Code civil), après leur achèvement et la demande de l’Entreprise. Les réserves sont levées dans le délai fixé au procès-verbal. À compter de la réception, l’Entreprise est tenue des garanties légales : **parfait achèvement** (1 an), **bon fonctionnement** des éléments d’équipement dissociables (2 ans) et **décennale** (10 ans), dans les conditions des articles 1792 et suivants du Code civil.');

    // 11 Résiliation
    px.article('Article 11 — Résiliation');
    px.texte('En cas de manquement grave de l’Entreprise à ses obligations (abandon ou retard de chantier, défaut d’assurance, travail dissimulé, malfaçons non reprises, non-respect des règles de sécurité), ' + (mode === 'cg' ? 'Phénix-Architecture' : 'le Maître d’ouvrage ou Phénix-Architecture pour son compte') + ' la met en demeure, par lettre recommandée avec accusé de réception, d’y remédier. Si la mise en demeure reste sans effet pendant **8 jours**, le contrat peut être résilié de plein droit par simple notification écrite. Les travaux conformes déjà exécutés sont réglés après constat contradictoire ; les surcoûts de remplacement et les préjudices prouvés sont à la charge de l’Entreprise.');

    // 12 Amiable / litiges
    px.article('Article 12 — Résolution amiable et litiges');
    px.texte('En cas de difficulté (désaccord sur le prix, les quantités ou la nature des travaux, retard, imprévu, réserve sur la qualité), la partie concernée en informe l’autre **par écrit**. La **résolution amiable est un préalable obligatoire à toute action contentieuse** : les parties se rencontrent ou échangent (sur site, par téléphone ou en visioconférence) dans un délai de huit jours à compter de cet écrit pour rechercher un accord.');
    px.texte('À défaut d’accord, la partie la plus diligente peut saisir la juridiction territorialement compétente. Cette règle ne fait pas obstacle aux mesures urgentes ou conservatoires. Le présent contrat est soumis au droit français.');

    // 13 Final
    px.article('Article 13 — Conditions particulières et dispositions finales');
    if (cond.obs) px.texte('**Conditions particulières :** ' + cond.obs);
    px.texte('Le présent acte, avec ses annexes, exprime l’intégralité de l’accord des parties et remplace tout échange antérieur. Si une clause était déclarée nulle, les autres resteraient applicables. Toute modification se fait par écrit signé des parties. Les notifications sont valablement faites aux adresses et coordonnées de l’article 1. Fait en autant d’exemplaires originaux que de parties, chacune reconnaissant avoir reçu le sien.' + (mode === 'moe' && cond.horsEtablissement ? ' **Contrat conclu hors établissement :** le Maître d’ouvrage consommateur dispose d’un délai de 14 jours pour se rétracter (formulaire en annexe C) ; il ne peut demander un démarrage avant ce délai que par demande expresse écrite.' : ''));

    // Signatures
    px.article('Signatures', 64);
    var sigs = [
      { titre: 'L’Entreprise', qualite: (ent.nom || '') + (ent.representant ? ' — ' + ent.representant + ', ' + (ent.qualite || '') : '') + '. Le signataire a le pouvoir d’engager l’Entreprise.' },
      { titre: mode === 'cg' ? 'Phénix-Architecture — contractant général' : 'Phénix-Architecture — maître d’œuvre (visa)', qualite: SOCIETE.representant + ', ' + SOCIETE.qualite }
    ];
    if (mode === 'moe') sigs.unshift({ titre: 'Le Maître d’ouvrage', qualite: ch.client || '' });
    px.signatures(sigs);
    if (mode === 'cg') {
      px.texte('**Acceptation du sous-traitant et agrément des conditions de paiement** (article 3 de la loi n° 75-1334 du 31 décembre 1975) :', { apres: 3, suite: 50 });
      px.signatures([{ titre: 'Le Maître d’ouvrage', qualite: (ch.client || '') + ' — accepte l’Entreprise comme sous-traitant et agrée ses conditions de paiement' }]);
    }

    // Annexes
    px.saut();
    px.article('Annexe A — Décomposition du prix par lot');
    var avecPostes = d.annexePostes !== false;
    lots.forEach(function (l) {
      px.texte('**' + (l.num ? l.num + ' — ' : '') + (l.nom || '') + '** — ' + eur(l.prixHt) + ' HT', { apres: 2 });
      if (avecPostes && l.postes && l.postes.length) {
        px.tableau({
          colonnes: [{ titre: 'Désignation', x: 17, w: 98 }, { titre: 'Quantité', x: 140, align: 'right' }, { titre: 'PU HT', x: 167, align: 'right' }, { titre: 'Total HT', x: 193, align: 'right', gras: true }],
          lignes: l.postes.map(function (p) { return [p.n, (p.q || 0) + ' ' + (p.u || ''), eur(p.pu), eur((p.q || 0) * (p.pu || 0))]; })
        });
      }
    });
    px.article('Annexe B — Pièces à joindre par l’Entreprise');
    px.cases([
      { texte: 'Attestation d’assurance responsabilité civile professionnelle en cours de validité', coche: !!assurance.rcRecue },
      { texte: 'Attestation d’assurance décennale en cours de validité, mentionnant les activités des lots' + (assurance.recue ? ' — **reçue**' : ''), coche: !!assurance.recue },
      { texte: 'Attestation de vigilance URSSAF de moins de six mois', coche: !!(d.pieces && d.pieces.urssaf) },
      { texte: 'Extrait Kbis de moins de trois mois (ou carte d’identification / répertoire des métiers)', coche: !!(d.pieces && d.pieces.kbis) },
      { texte: 'Relevé d’identité bancaire (RIB) de l’Entreprise', coche: !!(d.pieces && d.pieces.rib) },
      { texte: 'Liste nominative des salariés étrangers soumis à autorisation de travail (le cas échéant)', coche: !!(d.pieces && d.pieces.etrangers) }
    ]);
    if (mode === 'moe' && cond.horsEtablissement) {
      px.article('Annexe C — Formulaire de rétractation');
      px.texte('(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat, dans un délai de 14 jours à compter de sa conclusion.)');
      px.texte('À l’attention de ' + (ent.nom || '…') + ', ' + (ent.adresse || '…') + (ent.email ? ', ' + ent.email : '') + ' : Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services suivante : travaux du chantier « ' + (ch.nom || '…') + ' » (réf. ' + ref + '). Commandé le : ……………………  Nom du consommateur : ……………………  Adresse : ……………………  Signature (uniquement en cas de notification sur papier) : ……………………  Date : ……………………');
    }
    return px;
  }

  function periodeGlobale(lots) {
    var ps = lots.map(periodeLot).filter(Boolean);
    if (!ps.length) return 'À planifier';
    var d = ps.map(function (p) { return p.isoDebut; }).sort()[0], f = ps.map(function (p) { return p.isoFin; }).sort().slice(-1)[0];
    var f1 = function (iso) { return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(2, 4); };
    return f1(d) + ' au ' + f1(f);
  }

  global.PhenixContratEnt = {
    societe: SOCIETE, enLettres: enLettres, montantEnLettres: montantEnLettres, eur: eur,
    periodeLot: periodeLot, totaux: totaux, numero: numero, nomFichier: nomFichier,
    controler: controler, generer: generer, siretValide: siretValide, siretAffiche: siretAffiche
  };
})(window);
