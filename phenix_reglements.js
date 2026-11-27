/* ═══════════════════════════════════════════════════════════════════════════════
   phenix_reglements.js — règlements des clients, lus sur le relevé bancaire (27/11/2026)

   Idée : le relevé importé dans la Synthèse 3D (phenix_tresorerie/releve_*) dit ce que le client a
   réellement payé. Chaque encaissement client est rattaché à une facture (export MEG, sinon factures
   de Phénix Dossier), donc à un devis et à un dossier. On sait ainsi, dossier par dossier, ce qui est
   réglé et ce qui reste dû, sans rien ressaisir.

   Rapprochement d'un encaissement (du plus sûr au moins sûr) :
     1. lien posé par Maxime (phenix_tresorerie/reglages.liens[cle])            → sûr
     2. n° de facture lu dans le libellé (FAC00000031, F-2026-031…)              → sûr
     3. montant = reste dû d'une facture ouverte ET nom du client dans le libellé → sûr
     4. montant = reste dû d'une seule facture ouverte (sans nom reconnu)        → à confirmer
     5. nom d'un seul dossier dans le libellé : imputé à sa facture la plus ancienne encore ouverte,
        ou « règlement sans facture » du dossier                                  → à confirmer
     sinon : « à rattacher » (liste dans la Trésorerie de la Synthèse).
   Un « à confirmer » compte déjà comme réglé, mais il est signalé « ? à confirmer » avec deux boutons.

   Utilisé par : phenix_synthese.html (fiche du dossier, Trésorerie) et phenix_dossier.html (Facturation).
   Aucun accès réseau ici : les modules passent leurs données et la fonction d'écriture.
   ═══════════════════════════════════════════════════════════════════════════════ */
(function (G) {
  'use strict';
  var JOUR = 864e5;

  /* ── outils ── */
  function num(x) { var n = parseFloat(String(x == null ? '' : x).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : 0; }
  function arr(x) { return Math.round(num(x) * 100) / 100; }
  function sansAccent(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function norm(t) { return sansAccent(t).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); }
  var VIDES = /^(SARL|SAS|SASU|EURL|SCI|EI|SISA|AUTO|ENTREPRENEUR|ENTREPRISE|SOCIETE|ASSOCIATION|MONSIEUR|MADAME|MME|MR|MLLE|MELLE|LES|DES|DU|DE|LA|LE|ET|FAMILLE|VIR|VIREMENT|INST|SEPA|RECU|DE|CHEQUE|REMISE|PRLV|CB|FACTURE|FACT|REF|MAISON|PROJET|DOSSIER|RENOVATION|EXTENSION|CONSTRUCTION|PHENIX|ARCHITECTE|ARCHITECTURE)$/;
  function mots(t) { return norm(t).split(' ').filter(function (w) { return w.length >= 4 && !VIDES.test(w) && !/^\d+$/.test(w); }); }
  function cleLibelle(l) { return String(l || '').split(' | ')[0].toUpperCase().replace(/CARTE \d+|\d{3,}|\d\d\/\d\d(\/\d{2,4})?|[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40); }
  function chiffres(t) { return String(t || '').replace(/\D/g, '').replace(/^0+/, ''); }
  function euros(n) { var r = Math.round(num(n) * 100) / 100; return r.toLocaleString('fr-FR', { minimumFractionDigits: r % 1 ? 2 : 0, maximumFractionDigits: 2 }).replace(/[  ]/g, ' ') + ' €'; }
  function dateFr(d) { if (!d) return '—'; var x = new Date(d); return isNaN(x) ? String(d) : x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* Crédits qui ne sont pas des règlements clients (mêmes règles que la Trésorerie de la Synthèse). */
  var PAS_CLIENT = /REALISAT PRET|CTR CLT|VIR INST M MAXIME SUCHET|SUCHET MAXIME|MAXIME SUCHET|REMB(OURSEMENT|OURSE)? ?(COMPTE|CPT)|REMB COMPTE ASSOCIE|C\/C CONTRAT PRO GLOBAL|VIR DE PHENIX ARCHITECTE|VIR TVA|RISTOURNE|INTERETS|AVOIR CB|REMBT CB/;

  /* ── 1. Lecture des données brutes ── */
  function lireReleves(tresorerie) {
    var releves = [], meg = null, reglages = {};
    (tresorerie || []).forEach(function (d) {
      var id = String(d.id || d._id || '');
      if (id.indexOf('releve_') === 0 && Array.isArray(d.ops)) releves.push(Object.assign({}, d, { id: id }));
      else if (id === 'meg_factures' && Array.isArray(d.factures)) meg = d;
      else if (id === 'reglages') reglages = d || {};
    });
    releves.sort(function (a, b) { return String(a.fin).localeCompare(String(b.fin)); });
    return { releves: releves, meg: meg, reglages: reglages };
  }

  /* Encaissements clients du relevé (crédits ≥ 5 €, hors prêts, apports, virements internes, catégories choisies par Maxime). */
  function encaissements(releves, reglages) {
    var perso = (reglages && reglages.categories) || {}, out = [];
    releves.forEach(function (r) {
      (r.ops || []).forEach(function (o, i) {
        var m = arr(o.montant); if (m < 5) return;
        var L = String(o.libelle || '').toUpperCase();
        var cat = perso[cleLibelle(o.libelle)];
        if (cat && cat !== 'Encaissements clients') return;
        if (!cat && PAS_CLIENT.test(L)) return;
        out.push({ cle: (r.id || ('releve_' + r.banque + '_' + r.mois)) + '#' + i, date: String(o.date || '').slice(0, 10), libelle: String(o.libelle || ''), montant: m, banque: r.banque || '' });
      });
    });
    out.sort(function (a, b) { return a.date.localeCompare(b.date) || a.cle.localeCompare(b.cle); });
    return out;
  }

  /* Factures : export MEG (montants TTC) s'il existe, sinon factures de Phénix Dossier (HT + taux de TVA). */
  function lireFactures(meg, facturesDossier) {
    if (meg && meg.factures && meg.factures.length) {
      return meg.factures.filter(function (f) { return f && f.etat !== 'Annulée' && f.etat !== 'Brouillon' && /^FAC/i.test(String(f.numero || '')); })
        .map(function (f) { return { id: 'meg:' + f.numero, numero: String(f.numero), date: String(f.date || '').slice(0, 10), client: f.client || '', reference: f.reference || '', ttc: arr(f.ttc), ht: arr(f.ht), regleMeg: arr(f.regle), source: 'MEG', projetId: null, devis: (String(f.reference || '').match(/DEV0*\d+/i) || [''])[0] }; });
    }
    return (facturesDossier || []).filter(function (f) { return f && f.type !== 'devis' && f.statut !== 'annulee'; }).map(function (f) {
      var ht = arr(f.montantHt), tva = f.tva === 0 || f.tva === '0' ? 0 : (num(f.tva) || 20);
      return { id: 'dos:' + f.id, factureId: f.id, numero: String(f.numero || ''), date: String(f.dateEmission || f.datePaiement || '').slice(0, 10), client: f.client || '', reference: f.objet || '', ttc: arr(ht * (1 + tva / 100)), ht: ht, tva: tva, regleMeg: 0, source: 'Dossier', projetId: f.projetId != null ? String(f.projetId) : null, devis: String(f.devisNumero || f.devisRef || '') };
    });
  }

  /* Devis par dossier : Phénix Dossier (type devis) + devis en cours. */
  function lireDevis(facturesDossier, devisEnCours) {
    var out = [];
    (facturesDossier || []).forEach(function (f) { if (f && f.type === 'devis' && f.numero) out.push({ numero: String(f.numero), projetId: f.projetId != null ? String(f.projetId) : null, ht: arr(f.montantHt), ttc: arr(f.montantTtcDevis) || arr(num(f.montantHt) * (1 + (num(f.tva) || 20) / 100)), statut: f.statut || '', objet: f.objet || '', date: String(f.dateEmission || '').slice(0, 10) }); });
    (devisEnCours || []).forEach(function (d) { if (d && d.numero && d.projetId != null && !out.some(function (x) { return chiffres(x.numero) === chiffres(d.numero); })) out.push({ numero: String(d.numero), projetId: String(d.projetId), ht: arr(d.montantHt || d.ht), ttc: arr(d.montantTtc || d.ttc), statut: d.statut || 'en cours', objet: d.objet || '', date: String(d.date || d.dateEnvoi || '').slice(0, 10) }); });
    return out;
  }

  /* Dossier de chaque facture : n° de devis (« Réf. à DEV000000xx »), sinon nom du client (un seul dossier). */
  function rattacherFactures(factures, projets, devis) {
    var parDevis = {}; devis.forEach(function (d) { var k = chiffres(d.numero); if (k && d.projetId) parDevis[k] = d.projetId; });
    var motsP = projets.map(function (p) { return { id: String(p.id), mots: mots((p.nom || '') + ' ' + (p.client || '')) }; });
    factures.forEach(function (f) {
      if (f.projetId) return;
      var k = chiffres(f.devis); if (k && parDevis[k]) { f.projetId = parDevis[k]; return; }
      var m = mots(f.client); if (!m.length) return;
      var c = motsP.filter(function (p) { return m.some(function (w) { return p.mots.indexOf(w) >= 0; }); });
      if (c.length === 1) f.projetId = c[0].id;
    });
    return factures;
  }

  /* ── 2. Rapprochement ── */
  function analyser(entree) {
    entree = entree || {};
    var L = lireReleves(entree.tresorerie);
    var reglages = L.reglages, liens = (reglages && reglages.liens) || {};
    var projets = (entree.projets || []).filter(function (p) { return p && p.id != null; });
    var parId = {}; projets.forEach(function (p) { parId[String(p.id)] = p; });
    var devis = lireDevis(entree.factures, entree.devisEnCours);
    var factures = rattacherFactures(lireFactures(L.meg, entree.factures), projets, devis);
    var encs = encaissements(L.releves, reglages);
    var auj = entree.auj ? new Date(entree.auj) : new Date();
    var motsP = projets.map(function (p) { return { id: String(p.id), mots: mots((p.nom || '') + ' ' + (p.client || '')) }; });

    factures.forEach(function (f) { f.regle = 0; f.reglements = []; });
    var reste = function (f) { return arr(f.ttc - f.regle); };
    var ouvertes = function () { return factures.filter(function (f) { return reste(f) > 0.009; }); };
    var proche = function (a, b) { return Math.abs(a - b) <= 0.01; };
    var nomDans = function (f, lib) { var M = norm(lib), m = mots(f.client || (parId[f.projetId] || {}).client || (parId[f.projetId] || {}).nom); return m.some(function (w) { return M.indexOf(w) >= 0; }); };
    var imputer = function (e, f, par, sur) {
      var part = Math.min(e.reste, reste(f)); if (part <= 0) return;
      f.regle = arr(f.regle + part); e.reste = arr(e.reste - part);
      f.reglements.push({ cle: e.cle, date: e.date, libelle: e.libelle, montant: part, par: par, sur: sur });
      e.affect.push({ facture: f.numero, factureId: f.id, montant: part });
      if (!e.projetId) e.projetId = f.projetId; e.par = e.par || par; e.sur = e.sur !== false && sur;
    };

    encs.forEach(function (e) {
      e.reste = e.montant; e.affect = []; e.projetId = null; e.par = ''; e.sur = true;
      var lien = liens[e.cle];
      if (lien && lien.ignorer) { e.ignore = true; e.reste = 0; return; }
      if (lien && lien.refuse) return;   /* rapprochement automatique refusé : reste « à rattacher » */
      if (lien && (lien.facture || lien.projetId)) {
        var fl = lien.facture ? factures.filter(function (f) { return f.id === lien.facture || f.numero === lien.facture; })[0] : null;
        if (fl) imputer(e, fl, 'choisi', true);
        else {
          e.projetId = String(lien.projetId); e.par = 'choisi';
          ouvertes().filter(function (f) { return f.projetId === e.projetId; }).sort(function (a, b) { return a.date.localeCompare(b.date); }).forEach(function (f) { if (e.reste > 0) imputer(e, f, 'choisi', true); });
        }
        return;
      }
      var LIB = norm(e.libelle), libC = String(e.libelle || '').toUpperCase();
      // 2. n° de facture dans le libellé
      var parNum = factures.filter(function (f) { var d = chiffres(f.numero); if (d.length < 2) return false; return libC.indexOf(String(f.numero).toUpperCase()) >= 0 || new RegExp('(?:FAC|FACT|FACTURE|F)\\s*[-N°O.:]*\\s*0*' + d + '(?!\\d)').test(LIB.replace(/ /g, ' ')); });
      if (parNum.length) { parNum.forEach(function (f) { if (e.reste > 0) imputer(e, f, 'numéro de facture', true); }); return; }
      // 3. montant = reste dû d'une facture ouverte + nom
      var memeMontant = ouvertes().filter(function (f) { return proche(reste(f), e.montant) || (f.regle === 0 && proche(f.ttc, e.montant)); });
      var avecNom = memeMontant.filter(function (f) { return nomDans(f, e.libelle); });
      if (avecNom.length) { imputer(e, avecNom.sort(function (a, b) { return a.date.localeCompare(b.date); })[0], 'montant et nom', true); return; }
      // 4. montant = une seule facture ouverte
      if (memeMontant.length === 1) { imputer(e, memeMontant[0], 'montant', false); return; }
      // 5. nom d'un seul dossier
      var cand = motsP.filter(function (p) { return p.mots.some(function (w) { return LIB.indexOf(w) >= 0; }); });
      if (cand.length === 1) {
        e.projetId = cand[0].id; e.par = 'nom'; e.sur = false;
        ouvertes().filter(function (f) { return f.projetId === e.projetId && f.date <= (e.date || '9999'); }).sort(function (a, b) { return a.date.localeCompare(b.date); }).forEach(function (f) { if (e.reste > 0) imputer(e, f, 'nom', false); });
        e.sur = false;
        return;
      }
    });

    /* ── 3. Synthèse par dossier ── */
    var dossiers = {};
    var D = function (pid) { return dossiers[pid] || (dossiers[pid] = { projetId: pid, nom: (parId[pid] || {}).nom || (parId[pid] || {}).client || ('Dossier ' + pid), devis: [], factures: [], libres: [], facture: 0, regle: 0, reste: 0, retard: 0, aConfirmer: 0, dernier: '' }); };
    devis.forEach(function (d) { if (d.projetId && parId[d.projetId]) D(d.projetId).devis.push(d); });
    factures.forEach(function (f) {
      if (!f.projetId) return; var o = D(f.projetId);
      /* Réglé selon MEG mais pas vu sur les relevés (chèque, espèces, autre compte) : compté réglé, signalé « selon MEG ». */
      f.horsReleve = f.source === 'MEG' ? arr(Math.max(0, Math.min(f.regleMeg, f.ttc) - f.regle)) : 0;
      if (f.horsReleve > 0) f.regle = arr(f.regle + f.horsReleve);
      var r = reste(f), age = Math.floor((auj - new Date(f.date)) / JOUR);
      f.reste = r; f.age = isFinite(age) ? age : 0; f.statut = r <= 0.009 ? 'reglee' : f.regle > 0 ? 'partielle' : 'attente';
      f.aConfirmer = f.reglements.some(function (x) { return !x.sur; });
      o.factures.push(f); o.facture = arr(o.facture + f.ttc); o.regle = arr(o.regle + f.regle); o.reste = arr(o.reste + Math.max(0, r));
      if (r > 0.009 && f.age > 30) o.retard = arr(o.retard + r);
      f.reglements.forEach(function (x) { if (x.date > o.dernier) o.dernier = x.date; });
    });
    encs.forEach(function (e) {
      if (e.ignore) return;
      if (e.projetId && parId[e.projetId]) { var o = D(e.projetId); if (!e.sur) o.aConfirmer++; if (e.reste > 0.009) { o.libres.push(e); o.regle = arr(o.regle + e.reste); if (e.date > o.dernier) o.dernier = e.date; } }
    });
    Object.keys(dossiers).forEach(function (k) {
      var o = dossiers[k];
      o.factures.sort(function (a, b) { return a.date.localeCompare(b.date); });
      o.devis.sort(function (a, b) { return a.date.localeCompare(b.date); });
      o.devisHt = o.devis.filter(function (d) { return d.statut === 'accepte' || d.statut === 'signe'; }).reduce(function (s, d) { return s + d.ht; }, 0);
    });
    var aRattacher = encs.filter(function (e) { return !e.ignore && !e.projetId && e.reste > 0.009; });
    return {
      dossiers: dossiers, encaissements: encs, aRattacher: aRattacher, factures: factures,
      facturesSansDossier: factures.filter(function (f) { return !f.projetId; }),
      source: L.meg && L.meg.factures && L.meg.factures.length ? 'MEG' : 'Dossier',
      releveAu: L.releves.length ? L.releves[L.releves.length - 1].fin : null, nbReleves: L.releves.length,
      projets: projets,
    };
  }

  /* ── 4. Affichage (HTML autonome, styles en ligne : sert dans la Synthèse sombre et dans Dossier) ── */
  var THEMES = {
    sombre: { txt: '#e2e8f0', fort: '#ffffff', doux: '#94a3b8', filet: 'rgba(255,255,255,.12)', fond: 'rgba(255,255,255,.03)', ok: '#86efac', att: '#fde68a', alerte: '#fca5a5', btn: 'rgba(255,255,255,.08)', champ: 'rgba(0,0,0,.3)' },
    clair: { txt: 'var(--text,#1f2937)', fort: 'var(--text,#111827)', doux: 'var(--text3,#6b7280)', filet: 'var(--border,#e5e7eb)', fond: 'var(--bg2,rgba(0,0,0,.02))', ok: 'var(--green,#15803d)', att: 'var(--amber,#b45309)', alerte: 'var(--red,#b91c1c)', btn: 'var(--bg,#f3f4f6)', champ: 'var(--bg,#fff)' },
  };
  function statutHtml(f, T) {
    if (f.statut === 'reglee') return '<span style="color:' + T.ok + ';font-weight:600">✓ Réglée' + (f.aConfirmer ? ' · ? à confirmer' : '') + '</span>';
    if (f.statut === 'partielle') return '<span style="color:' + T.att + ';font-weight:600">◐ Réglée en partie · reste ' + euros(f.reste) + (f.aConfirmer ? ' · ? à confirmer' : '') + '</span>';
    return '<span style="color:' + (f.age > 30 ? T.alerte : T.att) + ';font-weight:600">' + (f.age > 30 ? '⚠ En retard' : '○ En attente') + ' · ' + f.age + ' j</span>';
  }
  function boutonsConfirmer(x, T) {
    return ' <button type="button" data-pxr="confirmer" data-cle="' + esc(x.cle) + '" data-facture="' + esc(x.factureId || '') + '" data-projet="' + esc(x.projetId || '') + '" style="margin-left:4px;padding:1px 7px;border-radius:6px;border:1px solid ' + T.filet + ';background:' + T.btn + ';color:' + T.fort + ';font-size:11px;cursor:pointer">✓ C\'est bien ça</button>' +
      '<button type="button" data-pxr="refuser" data-cle="' + esc(x.cle) + '" style="margin-left:4px;padding:1px 7px;border-radius:6px;border:1px solid ' + T.filet + ';background:transparent;color:' + T.doux + ';font-size:11px;cursor:pointer">✕ Non</button>';
  }

  /* Bloc d'un dossier : devis → factures → règlements lus sur le relevé. */
  function htmlDossier(res, projetId, opt) {
    opt = opt || {}; var T = THEMES[opt.theme || 'sombre'];
    var o = res && res.dossiers[String(projetId)];
    if (!res || !res.nbReleves) return opt.vide ? '<p style="font-size:11px;color:' + T.doux + '">Aucun relevé bancaire importé : importez-le dans la Synthèse 3D (Phénix › Trésorerie) pour voir les règlements.</p>' : '';
    if (!o) return opt.vide ? '<p style="font-size:11px;color:' + T.doux + '">Aucune facture ni aucun règlement reconnu pour ce dossier sur les relevés jusqu\'au ' + dateFr(res.releveAu) + '.</p>' : '';
    var h = '<div data-pxr-bloc style="margin-top:12px;border:1px solid ' + T.filet + ';background:' + T.fond + ';border-radius:10px;padding:10px 12px;font-size:12px;color:' + T.txt + ';line-height:1.45">';
    h += '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline"><b style="color:' + T.fort + '">€ Règlements du client</b>' +
      '<span>facturé ' + euros(o.facture) + '</span><span>réglé ' + euros(o.regle) + '</span>' +
      (o.reste > 0.009 ? '<span style="color:' + (o.retard > 0 ? T.alerte : T.att) + ';font-weight:600">' + (o.retard > 0 ? '⚠ dont en retard ' + euros(o.retard) + ' · ' : '') + 'reste dû ' + euros(o.reste) + '</span>' : (o.facture > 0 ? '<span style="color:' + T.ok + ';font-weight:600">✓ tout est réglé</span>' : '')) +
      '<span style="margin-left:auto;font-size:10px;color:' + T.doux + '">relevé au ' + dateFr(res.releveAu) + '</span></div>';
    // factures groupées par devis
    var groupes = [], vus = {};
    o.devis.forEach(function (d) { var k = chiffres(d.numero); vus[k] = 1; groupes.push({ devis: d, factures: o.factures.filter(function (f) { return chiffres(f.devis) === k; }) }); });
    var sans = o.factures.filter(function (f) { return !vus[chiffres(f.devis)]; });
    if (sans.length) groupes.push({ devis: null, factures: sans });
    groupes.forEach(function (g) {
      h += '<div style="margin-top:8px;border-top:1px solid ' + T.filet + ';padding-top:6px">';
      if (g.devis) {
        var fac = g.factures.reduce(function (s, f) { return s + f.ttc; }, 0);
        h += '<div style="display:flex;gap:8px;flex-wrap:wrap;color:' + T.fort + '"><span>Devis <span style="font-family:monospace">' + esc(g.devis.numero) + '</span>' + (g.devis.objet ? ' · ' + esc(g.devis.objet) : '') + '</span><span style="margin-left:auto">' + (g.devis.ht ? euros(g.devis.ht) + ' HT' : '') + (g.devis.statut ? ' · ' + esc(g.devis.statut === 'accepte' ? 'signé' : g.devis.statut === 'en_attente' ? 'en attente' : g.devis.statut) : '') + '</span></div>';
        if (g.devis.ttc > 0) h += '<div style="font-size:11px;color:' + T.doux + '">facturé ' + Math.round(fac / g.devis.ttc * 100) + ' % du devis TTC</div>';
      } else if (o.devis.length) h += '<div style="color:' + T.fort + '">Factures sans devis repéré</div>';
      if (!g.factures.length) h += '<div style="font-size:11px;color:' + T.doux + '">Pas encore de facture sur ce devis.</div>';
      g.factures.forEach(function (f) {
        h += '<div style="margin-top:4px"><div style="display:flex;gap:8px;flex-wrap:wrap"><span style="font-family:monospace">' + esc(f.numero || '—') + '</span><span>' + dateFr(f.date) + '</span><span>' + euros(f.ttc) + ' TTC</span><span style="margin-left:auto">' + statutHtml(f, T) + '</span></div>';
        f.reglements.forEach(function (x) {
          h += '<div style="font-size:11px;color:' + T.doux + ';padding-left:14px">↳ ' + dateFr(x.date) + ' · ' + euros(x.montant) + ' · « ' + esc(String(x.libelle).split(' | ')[0].slice(0, 60)) + ' »' + (x.sur ? '' : ' <span style="color:' + T.att + '">? reconnu par ' + esc(x.par) + '</span>' + (opt.ecrire ? boutonsConfirmer({ cle: x.cle, factureId: f.id, projetId: f.projetId }, T) : '')) + '</div>';
        });
        if (f.horsReleve > 0) h += '<div style="font-size:11px;color:' + T.doux + ';padding-left:14px">↳ ' + euros(f.horsReleve) + ' réglés selon MEG, pas vus sur les relevés importés (chèque, espèces, autre compte ?)</div>';
        h += '</div>';
      });
      h += '</div>';
    });
    if (o.libres.length) {
      h += '<div style="margin-top:8px;border-top:1px solid ' + T.filet + ';padding-top:6px"><div style="color:' + T.fort + '">Règlements sans facture correspondante</div>';
      o.libres.forEach(function (e) { h += '<div style="font-size:11px;color:' + T.doux + '">' + dateFr(e.date) + ' · ' + euros(e.reste) + ' · « ' + esc(String(e.libelle).split(' | ')[0].slice(0, 60)) + ' »' + (e.sur ? '' : ' <span style="color:' + T.att + '">? reconnu par ' + esc(e.par) + '</span>' + (opt.ecrire ? boutonsConfirmer({ cle: e.cle, projetId: e.projetId }, T) : '')) + '</div>'; });
      h += '<div style="font-size:11px;color:' + T.doux + '">Acompte versé avant la facture, ou facture pas encore dans ' + (res.source === 'MEG' ? 'l\'export MEG' : 'Phénix') + '.</div></div>';
    }
    return h + '</div>';
  }

  /* Liste des encaissements non reconnus, avec le choix du dossier (Trésorerie de la Synthèse). */
  function htmlARattacher(res, opt) {
    opt = opt || {}; var T = THEMES[opt.theme || 'sombre'];
    if (!res || !res.nbReleves) return '';
    var l = res.aRattacher, conf = res.encaissements.filter(function (e) { return !e.ignore && e.projetId && !e.sur; });
    var nb = res.encaissements.filter(function (e) { return !e.ignore; }).length;
    var h = '<div data-pxr-bloc style="margin-top:12px;border:1px solid ' + T.filet + ';border-radius:10px;padding:10px 12px;font-size:12px;color:' + T.txt + '">';
    h += '<b style="color:' + T.fort + '">€ Règlements clients lus sur les relevés</b><div style="font-size:11px;color:' + T.doux + '">' + nb + ' encaissement' + (nb > 1 ? 's' : '') + ' client' + (nb > 1 ? 's' : '') + ' · ' + (nb - l.length - conf.length) + ' rattaché' + (nb - l.length - conf.length > 1 ? 's' : '') + ' avec certitude · ' + conf.length + ' à confirmer · ' + l.length + ' à rattacher. Factures : ' + (res.source === 'MEG' ? 'export MEG' : 'Phénix Dossier') + '.</div>';
    var opts = '<option value="">Rattacher à…</option>' + res.projets.slice().sort(function (a, b) { return String(a.nom || a.client || '').localeCompare(String(b.nom || b.client || ''), 'fr'); }).map(function (p) {
      var fs = res.factures.filter(function (f) { return f.projetId === String(p.id) && f.reste > 0.009; });
      return '<option value="p:' + esc(p.id) + '">' + esc(p.nom || p.client || p.id) + '</option>' + fs.map(function (f) { return '<option value="f:' + esc(f.id) + '">   ↳ ' + esc(f.numero) + ' · reste ' + esc(euros(f.reste)) + '</option>'; }).join('');
    }).join('') + '<option value="x:">Ce n\'est pas un règlement client</option>';
    if (conf.length && opt.ecrire) {
      h += '<div style="margin-top:8px"><div style="color:' + T.fort + '">? À confirmer · ' + conf.length + '</div>';
      conf.slice(0, 40).forEach(function (e) {
        var p = res.dossiers[e.projetId] || {};
        h += '<div style="margin-top:4px;padding:6px 8px;border-radius:8px;background:' + T.fond + '"><div style="display:flex;gap:8px;font-size:11px"><span>' + dateFr(e.date) + '</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(String(e.libelle).split(' | ')[0]) + '</span><span style="margin-left:auto;font-family:monospace">' + euros(e.montant) + '</span></div>' +
          '<div style="font-size:11px;color:' + T.doux + '">→ ' + esc(p.nom || e.projetId) + (e.affect.length ? ' · ' + e.affect.map(function (a) { return esc(a.facture); }).join(', ') : '') + ' (reconnu par ' + esc(e.par) + ')' + boutonsConfirmer({ cle: e.cle, factureId: e.affect.length === 1 ? e.affect[0].factureId : '', projetId: e.projetId }, T) + '</div></div>';
      });
      if (conf.length > 1) h += '<button type="button" data-pxr="tout-confirmer" style="margin-top:6px;padding:4px 10px;border-radius:8px;border:1px solid ' + T.filet + ';background:' + T.btn + ';color:' + T.fort + ';font-size:12px;cursor:pointer">✓ Tout confirmer (' + conf.length + ')</button>';
      h += '</div>';
    }
    h += '<div style="margin-top:8px;color:' + T.fort + '">À rattacher · ' + l.length + '</div>';
    if (!l.length) h += '<div style="font-size:11px;color:' + T.doux + '">✓ Chaque encaissement client est rattaché à un dossier.</div>';
    l.slice(0, 40).forEach(function (e) {
      h += '<div style="margin-top:4px;padding:6px 8px;border-radius:8px;background:' + T.fond + '"><div style="display:flex;gap:8px;font-size:11px"><span>' + dateFr(e.date) + '</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(String(e.libelle).split(' | ')[0]) + '</span><span style="margin-left:auto;font-family:monospace">' + euros(e.montant) + '</span></div>' +
        (opt.ecrire ? '<select data-pxr="associer" data-cle="' + esc(e.cle) + '" aria-label="Dossier de ce règlement" style="margin-top:4px;width:100%;border-radius:6px;border:1px solid ' + T.filet + ';background:' + T.champ + ';color:' + T.fort + ';font-size:12px;padding:3px">' + opts + '</select>' : '') + '</div>';
    });
    if (opt.ecrire) h += '<div style="margin-top:6px;font-size:10px;color:' + T.doux + '">' + esc(opt.note || 'Votre choix est retenu : il s\'applique aussi à la Facturation de Phénix Dossier.') + '</div>';
    return h + '</div>';
  }

  /* Gestion des clics (délégation) : ecrire(lienParCle) enregistre { liens: { cle: valeur } } dans phenix_tresorerie/reglages. */
  function brancher(racine, getRes, ecrire) {
    if (!racine || racine.__pxr) return; racine.__pxr = true;
    var poser = function (o) { try { var p = ecrire({ liens: o }); if (p && p.catch) p.catch(function (e) { alert('Enregistrement impossible : ' + (e && e.message || e)); }); } catch (e) { alert('Enregistrement impossible : ' + (e && e.message || e)); } };
    var lienDe = function (b) { var f = b.getAttribute('data-facture'), p = b.getAttribute('data-projet'); var v = { par: 'Maxime', le: new Date().toISOString() }; if (f) v.facture = f; if (p) v.projetId = p; return v; };
    racine.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-pxr]'); if (!b || b.tagName === 'SELECT') return;
      var a = b.getAttribute('data-pxr'), o = {};
      if (a === 'confirmer') { o[b.getAttribute('data-cle')] = lienDe(b); poser(o); }
      else if (a === 'refuser') { o[b.getAttribute('data-cle')] = { refuse: true, par: 'Maxime', le: new Date().toISOString() }; poser(o); }
      else if (a === 'tout-confirmer') { var res = getRes(); (res ? res.encaissements : []).forEach(function (e) { if (!e.ignore && e.projetId && !e.sur) { var v = { projetId: e.projetId, par: 'Maxime', le: new Date().toISOString() }; if (e.affect.length === 1) v.facture = e.affect[0].factureId; o[e.cle] = v; } }); poser(o); }
    });
    racine.addEventListener('change', function (ev) {
      var s = ev.target; if (!s || s.getAttribute('data-pxr') !== 'associer' || !s.value) return;
      var v = s.value, o = {}, k = s.getAttribute('data-cle'), base = { par: 'Maxime', le: new Date().toISOString() };
      if (v.indexOf('x:') === 0) o[k] = Object.assign(base, { ignorer: true });
      else if (v.indexOf('f:') === 0) { var fid = v.slice(2), res = getRes(), f = res && res.factures.filter(function (x) { return x.id === fid; })[0]; o[k] = Object.assign(base, { facture: fid, projetId: f ? f.projetId : null }); }
      else o[k] = Object.assign(base, { projetId: v.slice(2) });
      poser(o);
    });
  }

  /* Copie des documents de trésorerie où chaque facture MEG porte le réglé lu sur le relevé (jamais moins que ce que dit MEG) :
     les missions « Encaisser », le reste dû et les impayés de la Synthèse suivent ainsi la banque. */
  function corrigerMeg(tresorerie, res) {
    if (!res || res.source !== 'MEG') return tresorerie;
    var parNum = {}; res.factures.forEach(function (f) { parNum[f.numero] = f; });
    return (tresorerie || []).map(function (d) {
      if (String(d.id || '') !== 'meg_factures' || !Array.isArray(d.factures)) return d;
      return Object.assign({}, d, { factures: d.factures.map(function (f) {
        var r = parNum[String(f.numero)]; if (!r) return f;
        var regle = arr(Math.max(num(f.regle), Math.min(r.regle, num(f.ttc))));
        if (regle <= num(f.regle) + 0.009) return f;
        var reste = arr(Math.max(0, num(f.ttc) - regle));
        return Object.assign({}, f, { regle: regle, reste: reste, etat: reste <= 0.009 ? 'Payée' : 'Payée partiellement', regleReleve: true });
      }) });
    });
  }

  G.PhenixReglements = { analyser: analyser, corrigerMeg: corrigerMeg, htmlDossier: htmlDossier, htmlARattacher: htmlARattacher, brancher: brancher, euros: euros, cleLibelle: cleLibelle, version: '2026-11-27' };
})(typeof window !== 'undefined' ? window : globalThis);
