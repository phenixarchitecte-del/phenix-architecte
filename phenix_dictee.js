/* =====================================================================
   PHÉNIX DICTÉE — moteur de dictée commun à toute la suite Phénix (écrit une seule fois)
   ---------------------------------------------------------------------
   HISTORIQUE
   27/11/2026 — Création. Règle de Maxime : on doit pouvoir réfléchir, faire des pauses, reprendre ;
     RIEN n'est validé ni envoyé tant qu'on n'a pas ré-appuyé soi-même sur le micro.
     • Le navigateur coupe l'écoute après un silence : on relance aussitôt, sans perdre un mot.
     • Ordinateur / Surface (Edge, Chrome) : écoute continue. Android : écoute phrase par phrase enchaînée
       (en continu, Chrome Android répète la phrase entière en boucle) + suppression des doublons.
     • Ponctuation dictée : « virgule », « point », « point à la ligne », « à la ligne », « point d'interrogation »,
       « point d'exclamation », « deux points », « point-virgule », « ouvrez / fermez les guillemets ».
     • Majuscule en début de phrase. Hésitations retirées (« euh », « heu », « hum », « bah »…) et mots bégayés (« le le le », « de de »).
   Utilisation :
     var d = PhenixDictee.ecouter({ base:'texte déjà là', onTexte:function(affiche, definitif){…}, onFin:function(texte){…}, onEtat:function(etat, msg){…} });
     d.stop();          // fin voulue : onFin(texte complet) est appelé
     d.stop(true);      // annuler : onFin n'est pas appelé
   États : 'ecoute', 'pause' (relance discrète après un silence), 'fin', 'erreur' (msg en clair ; 3e argument 'horsligne' quand il n'y a pas de réseau).
   Hors ligne : PhenixDictee.horsLigne() / installerHorsLigne() (dictée sur l'appareil si le navigateur la propose), memo() (enregistrement audio), transcrire(audio).
   ===================================================================== */
(function (g) {
  'use strict';
  var SR = g.SpeechRecognition || g.webkitSpeechRecognition;
  var ANDROID = /Android/i.test(navigator.userAgent || '');
  var actif = null;   /* une seule dictée à la fois dans la page */
  /* [Hors ligne] dictée sur l'appareil (sans réseau) quand le navigateur la propose : SpeechRecognition.available / install / processLocally */
  /* PRUDENCE : SpeechRecognition.available() fait planter certains navigateurs (constaté sur Chromium sans service local) :
     on ne l'appelle QUE sur demande (bouton « Préparer la dictée hors ligne », avec du réseau), et on retient le résultat sur l'appareil. */
  var LS = 'phenix.dicteeLocale';
  function lsGet() { try { return localStorage.getItem(LS) || ''; } catch (x) { return ''; } }
  function lsSet(v) { try { localStorage.setItem(LS, v); } catch (x) {} }
  var LOCAL = { etat: lsGet() || 'inconnu' };   /* 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'inconnu' */
  var OPT = { langs: ['fr-FR'], processLocally: true, quality: 'dictation' };
  function horsLigne() {
    if (!SR || typeof SR.available !== 'function') { LOCAL.etat = 'unavailable'; return Promise.resolve(LOCAL.etat); }
    return Promise.resolve().then(function () { return SR.available(OPT); }).catch(function () { return SR.available({ langs: ['fr-FR'], processLocally: true }); })
      .then(function (r) { LOCAL.etat = r || 'unavailable'; lsSet(LOCAL.etat === 'available' || LOCAL.etat === 'unavailable' ? LOCAL.etat : ''); return LOCAL.etat; }).catch(function () { LOCAL.etat = 'unavailable'; lsSet('unavailable'); return LOCAL.etat; });
  }
  function installerHorsLigne() {
    if (!SR || typeof SR.install !== 'function') return Promise.resolve(false);
    LOCAL.etat = 'downloading';
    return Promise.resolve().then(function () { return SR.install(OPT); }).catch(function () { return SR.install({ langs: ['fr-FR'], processLocally: true }); })
      .then(function (ok) { return horsLigne().then(function () { return !!ok || LOCAL.etat === 'available'; }); }).catch(function () { return horsLigne().then(function () { return false; }); });
  }
  function localOk() { return LOCAL.etat === 'available'; }
  function enLigne() { return navigator.onLine !== false; }

  function n(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9àâäéèêëîïôöùûüç]+/g, ' ').trim(); }
  /* hésitations et répétitions retirées : « euh », « heu », « hum », « bah »… et « le le le », « de de » */
  var BEGUE = 'le|la|les|l|un|une|des|de|du|d|et|à|a|au|aux|en|je|j|il|elle|on|ce|c|qui|que|qu|sur|dans|pour|par|avec|mais|donc|alors|si';
  function nettoyer(t) {
    var s = ' ' + String(t || '') + ' ';
    s = s.replace(/[\s,]*(?<!\p{L})(?:e+u+h+|h?e+u+|heu+m*|hu+m+|hm+|mm+h*|bah|beh|ben|bon\s+ben)(?!\p{L})[\s,.…]*/giu, ' ');
    s = s.replace(new RegExp("(?<!\\p{L})(" + BEGUE + ")(?:['’]|(?!\\p{L}))(?:[\\s,]+\\1(?:['’]|(?!\\p{L})))+", 'giu'), function (m, w) { return w + (/['’]$/.test(m) ? "'" : ''); });
    return s.replace(/\s{2,}/g, ' ').trim();
  }
  /* ponctuation dite à voix haute → signes */
  function ponctuer(t) {
    var s = ' ' + nettoyer(t) + ' ';
    s = s.replace(/\s+point\s+(?:à|a)\s+la\s+ligne\b/gi, '.\n')
      .replace(/\s+(?:à|a)\s+la\s+ligne\b/gi, '\n').replace(/\s+nouvelle\s+ligne\b/gi, '\n')
      .replace(/\s+point\s+d['’ ]\s*interrogation\b/gi, ' ?').replace(/\s+point\s+d['’ ]\s*exclamation\b/gi, ' !')
      .replace(/\s+point[\s-]virgule\b/gi, ' ;').replace(/\s+deux\s+points\b/gi, ' :')
      .replace(/\s+virgule\b/gi, ',')
      .replace(/\s+ouvre[sz]?\s+(?:les\s+)?guillemets\b/gi, ' «').replace(/\s+ferme[sz]?\s+(?:les\s+)?guillemets\b/gi, ' »')
      .replace(/\s+point\s*$/i, '.').replace(/\s+point\s+(?=[A-ZÀ-Ý])/g, '. ');
    return s.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/[ \t]{2,}/g, ' ').trim()
      .replace(/([.?!…]\s+|\n)([a-zà-ÿ])/g, function (m, x, y) { return x + y.toUpperCase(); });   /* majuscule après . ? ! et à la ligne */
  }
  /* assemble deux morceaux : espace, majuscule après . ? ! ou retour à la ligne */
  function coller(a, b) {
    b = String(b || '').trim(); if (!b) return a || '';
    a = String(a || '');
    var fin = a.replace(/\s+$/, ''), debut = !fin || /[.?!…]\s*$|\n\s*$/.test(a);
    if (debut) b = b.charAt(0).toUpperCase() + b.slice(1);
    if (!fin) return b;
    if (/^[,.;:?!»)]/.test(b) || /\n$/.test(a)) return fin + (/\n$/.test(a) ? '\n' : '') + b;
    return fin + ' ' + b;
  }
  /* résultats d'une session sans doublons (Chrome Android renvoie souvent la phrase entière à chaque résultat) */
  function lire(results) {
    var fins = [], prov = '';
    for (var i = 0; i < results.length; i++) {
      var t = String(results[i][0].transcript || '').trim(); if (!t) continue;
      if (results[i].isFinal) {
        var last = fins.length ? fins[fins.length - 1] : '';
        if (last && n(t).indexOf(n(last)) === 0) fins[fins.length - 1] = t;          /* version plus longue de la même phrase */
        else if (last && n(last).indexOf(n(t)) === 0) continue;                       /* morceau déjà dit */
        else fins.push(t);
      } else prov = prov ? prov + ' ' + t : t;
    }
    var def = fins.join(' ');
    if (prov && def && n(prov).indexOf(n(def)) === 0) prov = prov.slice(def.length).trim();
    return { def: def, prov: prov };
  }

  function ecouter(o) {
    o = o || {};
    if (actif) actif.stop();
    var etat = { base: o.base || '', acquis: '', session: '', voulu: false, annule: false, sr: null, relances: 0, t0: Date.now(), fini: false, dernier: '' };
    var api = { stop: stop, actif: function () { return !etat.fini; } };
    var dire = function (e, m, code) { if (o.onEtat) try { o.onEtat(e, m || '', code || ''); } catch (x) {} };
    var texte = function (prov) { var t = coller(etat.base, etat.acquis); t = coller(t, ponctuer(etat.session)); return prov ? coller(t, prov) : t; };
    var montrer = function (prov) { if (o.onTexte) try { o.onTexte(texte(prov), texte('')); } catch (x) {} };
    if (!SR) { etat.fini = true; dire('erreur', 'Dictée indisponible dans ce navigateur : utilisez le micro du clavier (Windows + H sur la Surface).'); return api; }
    if (!enLigne() && !localOk()) { etat.fini = true; dire('erreur', 'Pas de réseau : la dictée de ce navigateur a besoin d\'Internet.', 'horsligne'); return api; }
    actif = api;

    function terminer() {
      if (etat.fini) return; etat.fini = true; if (actif === api) actif = null;
      etat.acquis = coller(etat.acquis, ponctuer(etat.session)); etat.session = '';
      dire('fin');
      if (!etat.annule && o.onFin) try { o.onFin(coller(etat.base, etat.acquis)); } catch (x) {}
    }
    function lancer() {
      if (etat.fini) return;
      var sr = new SR(); etat.sr = sr;
      sr.lang = o.lang || 'fr-FR'; sr.interimResults = true; sr.maxAlternatives = 1;
      sr.continuous = !ANDROID;
      if (localOk() && (!enLigne() || etat.local)) { try { sr.processLocally = true; } catch (x) {} }   /* sans réseau : reconnaissance sur l'appareil */
      sr.onstart = function () { dire('ecoute'); };
      sr.onresult = function (e) {
        var r = lire(e.results);
        /* Android : une session = une phrase ; on ignore une phrase identique à la précédente (répétition du navigateur) */
        if (ANDROID && r.def && n(r.def) === n(etat.dernier)) r.def = '';
        etat.session = r.def; montrer(r.prov);
      };
      sr.onerror = function (e) {
        var c = e && e.error;
        if (c === 'no-speech' || c === 'aborted') return;                 /* simple silence : on relance à la fin */
        if (c === 'not-allowed' || c === 'service-not-allowed') { etat.voulu = true; dire('erreur', 'Micro refusé : autorisez-le dans le navigateur (icône à gauche de l\'adresse).'); }
        else if (c === 'network' && localOk() && !etat.local) { etat.local = true; }   /* le réseau tombe : on bascule sur l'appareil à la relance */
        else if (c === 'network') { etat.voulu = true; dire('erreur', 'Pas de réseau : la dictée de ce navigateur a besoin d\'Internet.', 'horsligne'); }
        else if (c === 'audio-capture') { etat.voulu = true; dire('erreur', 'Aucun micro trouvé.'); }
      };
      sr.onend = function () {
        if (etat.session) { if (ANDROID) etat.dernier = etat.session; etat.acquis = coller(etat.acquis, ponctuer(etat.session)); etat.session = ''; montrer(''); }
        if (etat.voulu) { terminer(); return; }
        /* coupure du navigateur pendant une pause : on reprend aussitôt, sans rien valider */
        dire('pause');
        etat.relances++;
        setTimeout(function () { try { lancer(); } catch (x) { setTimeout(function () { try { lancer(); } catch (y) { etat.voulu = true; terminer(); dire('erreur', 'Le micro s\'est arrêté : touchez-le à nouveau pour reprendre.'); } }, 600); } }, ANDROID ? 120 : 60);
      };
      sr.start();
    }
    function stop(annuler) {
      if (etat.fini) return; etat.voulu = true; etat.annule = !!annuler;
      var sr = etat.sr; try { if (sr) sr.stop(); } catch (x) {}
      setTimeout(function () { if (!etat.fini) { try { if (sr) sr.abort(); } catch (x) {} terminer(); } }, 1500);   /* filet si le navigateur ne rend pas la main */
    }
    try { lancer(); } catch (x) { etat.fini = true; actif = null; dire('erreur', 'Micro indisponible : ' + (x && x.message || x)); }
    return api;
  }

  /* Remplaçant de SpeechRecognition pour le code existant (même interface : start, stop, abort, onstart, onresult, onerror, onend).
     Différence voulue : le résultat « final » n'arrive QUE quand on appelle stop() (2e appui sur le micro), jamais à la première pause. */
  function Reconnaissance() { this.lang = 'fr-FR'; this.continuous = false; this.interimResults = true; this.maxAlternatives = 1; this._d = null; }
  Reconnaissance.prototype.start = function () {
    var self = this, res = function (t, fin) { var r = [{ transcript: t, confidence: 1 }]; r.isFinal = fin; var l = [r]; return { results: l, resultIndex: 0 }; };
    var fini = false, fin = function () { if (fini) return; fini = true; if (self.onend) self.onend({}); };
    this._d = ecouter({ lang: this.lang,
      onEtat: function (e, m) { if (e === 'ecoute' && self.onstart && !self._go) { self._go = 1; self.onstart({}); } if (e === 'erreur') { if (self.onerror) self.onerror({ error: m }); fin(); } },
      onTexte: function (a) { if (self.onresult && self.interimResults !== false) self.onresult(res(a, false)); },
      onFin: function (t) { if (t && self.onresult) self.onresult(res(t, true)); fin(); } });
    this._fin = fin;
  };
  Reconnaissance.prototype.stop = function () { if (this._d) this._d.stop(); };
  Reconnaissance.prototype.abort = function () { if (this._d) this._d.stop(true); if (this._fin) this._fin(); };

  /* [Hors ligne] mémo vocal : enregistrement audio sans réseau (MediaRecorder), retranscrit plus tard */
  function memo() {
    var rec = null, morceaux = [], flux = null, t0 = Date.now();
    var p = navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? navigator.mediaDevices.getUserMedia({ audio: true }) : Promise.reject(new Error('micro indisponible'));
    var pret = p.then(function (s) { flux = s; var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'], ty = types.filter(function (x) { return g.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(x); })[0];
      rec = new MediaRecorder(s, ty ? { mimeType: ty, audioBitsPerSecond: 24000 } : undefined); rec.ondataavailable = function (e) { if (e.data && e.data.size) morceaux.push(e.data); }; rec.start(1000); });
    return { pret: pret, stop: function () { return pret.then(function () { return new Promise(function (ok) { rec.onstop = function () { flux.getTracks().forEach(function (t) { t.stop(); }); var b = new Blob(morceaux, { type: rec.mimeType || 'audio/webm' }), fr = new FileReader(); fr.onload = function () { ok({ dataUrl: fr.result, duree: Math.round((Date.now() - t0) / 1000) }); }; fr.readAsDataURL(b); }; rec.stop(); }); }); },
      annuler: function () { try { rec && rec.stop(); } catch (x) {} if (flux) flux.getTracks().forEach(function (t) { t.stop(); }); } };
  }
  /* retranscription d'un mémo (avec réseau) : l'audio est donné à la reconnaissance comme une piste micro ; à défaut, on le joue et on écoute */
  function transcrire(dataUrl, onTexte) {
    return new Promise(function (ok, ko) {
      if (!SR) return ko(new Error('Dictée indisponible dans ce navigateur.'));
      var au = new Audio(dataUrl), ac = new (g.AudioContext || g.webkitAudioContext)(), src = ac.createMediaElementSource(au), dest = ac.createMediaStreamDestination();
      src.connect(dest);
      var sr = new SR(), texte = '', fini = false; sr.lang = 'fr-FR'; sr.continuous = true; sr.interimResults = true;
      var finir = function () { if (fini) return; fini = true; try { ac.close(); } catch (x) {} ok(ponctuer(texte)); };
      sr.onresult = function (e) { var r = lire(e.results); texte = r.def; if (onTexte) onTexte(ponctuer(r.def + (r.prov ? ' ' + r.prov : ''))); };
      sr.onerror = function (e) { if (e && (e.error === 'no-speech' || e.error === 'aborted')) return; if (!fini) { fini = true; try { ac.close(); } catch (x) {} ko(new Error(e && e.error === 'network' ? 'Pas de réseau.' : 'Retranscription impossible (' + (e && e.error) + ').')); } };
      sr.onend = finir;
      au.onended = function () { setTimeout(function () { try { sr.stop(); } catch (x) { finir(); } }, 1200); };
      try { sr.start(dest.stream.getAudioTracks()[0]); } catch (x) { return ko(new Error('Ce navigateur ne sait pas retranscrire un enregistrement : écoutez le mémo et tapez ou dictez le texte.')); }
      au.play().catch(function () {});
    });
  }

  g.PhenixDictee = { peutHorsLigne: !!(SR && typeof SR.install === 'function'), horsLigne: horsLigne, installerHorsLigne: installerHorsLigne, local: function () { return LOCAL.etat; }, memo: memo, transcrire: transcrire, nettoyer: nettoyer, dispo: !!SR, Reconnaissance: SR ? Reconnaissance : null, android: ANDROID, ecouter: ecouter, ponctuer: ponctuer, coller: coller, arreter: function () { if (actif) actif.stop(); } };
})(window);
