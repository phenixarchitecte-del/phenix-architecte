/* =====================================================================
   PHÉNIX — CARNET DE PROJET, QUESTIONS PARTAGÉES (phenix_carnet_questions.js)
   Les questions du carnet écrites UNE seule fois : catégories, options, avantages et
   inconvénients, règles (choix imposés par la fiche, choix faits par Phénix, charpente ↔
   isolation du toit), plus-value en % par choix (jamais de prix au client), teintes de la
   maquette 3D. Lu par l'espace client (phenix_client.html › Mon carnet), par Phénix Dossier
   (réponses du client) et, plus tard, par Chiffrage.
   Données en ligne : phenix_portail/{id du projet}/etat/fiche (réglages Phénix) et
   phenix_portail/{id du projet}/etat/choix (choix du client) — mêmes champs qu'avant.

   HISTORIQUE
   25/11/2026 — Création : questions sorties de phenix_carnet.html (25 catégories, prix de
     référence de la maison type) + porte de garage (3/4/5/6 m) et terrasse (bois, carrelage
     collé, dalles sur plots), prix indicatifs À AJUSTER. « Fondations et plancher bas » et
     « Eaux usées » sont décidés par Phénix (étude de sol, règle de la commune).
   ===================================================================== */
(function (global) {
  'use strict';
  var DATA = {
"version": "2026-11-25",
"groupes": [
"Structure et enveloppe",
"Ouvertures",
"Confort technique",
"Finitions",
"Extérieurs et réseaux"
],
"metrics": {
"R": {
"l": "Thermique",
"u": "m².K/W",
"hi": 1,
"d": 1
},
"ep": {
"l": "Épaisseur",
"u": "mm",
"hi": 0,
"d": 0
},
"db": {
"l": "Acoustique",
"u": "dB",
"hi": 1,
"d": 0
},
"co2": {
"l": "Carbone",
"u": "kg CO₂e/m²",
"hi": 0,
"d": 0
},
"vie": {
"l": "Durée de vie",
"u": "ans",
"hi": 1,
"d": 0
},
"delai": {
"l": "Délai de chantier",
"u": "jours",
"hi": 0,
"d": 0
},
"cout": {
"l": "Facture de chauffage",
"u": "€/an",
"hi": 0,
"d": 0
},
"uw": {
"l": "Coefficient Uw",
"u": "W/m².K",
"hi": 0,
"d": 1
},
"poids": {
"l": "Poids",
"u": "kg/m²",
"hi": 0,
"d": 0
},
"chauf": {
"l": "Besoin de chauffage",
"u": "% en plus",
"hi": 0,
"d": 0
},
"entret": {
"l": "Entretien",
"u": "€/an",
"hi": 0,
"d": 0
}
},
"cats": [
{
"id": "murs",
"g": "Structure et enveloppe",
"t": "Murs périphériques",
"q": "Quelle structure pour les murs extérieurs ? Elle fixe l’épaisseur, le confort d’été et la durée du chantier.",
"ref": "ossature",
"multi": false,
"thick": false,
"bind": "wall",
"tab": "murs",
"metrics": [
"R",
"ep",
"db",
"co2",
"vie",
"delai"
],
"opts": [
{
"id": "ossature",
"n": "Ossature bois",
"d": "Montants 45 × 145 mm, entraxe 60 cm, bardage mélèze",
"prix": 25346,
"m": {
"R": 5.245811451706188,
"ep": 263,
"db": 44,
"co2": 25,
"vie": 70,
"delai": 15
},
"pros": [
"Chantier sec et rapide",
"Bonne isolation pour peu d’épaisseur"
],
"cons": [
"Moins d’inertie thermique",
"Bardage bois à entretenir"
]
},
{
"id": "banche",
"n": "Béton banché",
"d": "Voile béton armé de 20 cm, doublage isolant collé, enduit extérieur",
"prix": 23710,
"m": {
"R": 4.541999999999999,
"ep": 368,
"db": 58,
"co2": 95,
"vie": 100,
"delai": 25
},
"pros": [
"Grande inertie thermique, bon confort d’été",
"Très bonne étanchéité à l’air"
],
"cons": [
"Chantier plus long et plus humide",
"Impossible de modifier une fois coulé"
]
},
{
"id": "parpaing",
"n": "Parpaing",
"d": "Blocs béton creux de 20 cm, chaînages, doublage isolant collé",
"prix": 19009,
"m": {
"R": 4.039222222222222,
"ep": 348,
"db": 52,
"co2": 70,
"vie": 90,
"delai": 22
},
"pros": [
"Solution la plus économique",
"Mise en œuvre très courante"
],
"cons": [
"Isolation à ajouter côté intérieur",
"Moins d’inertie qu’un voile béton"
]
},
{
"id": "brique",
"n": "Brique creuse",
"d": "Brique alvéolaire de 20 cm, doublage isolant, enduit extérieur",
"prix": 21871,
"m": {
"R": 4.483666666666666,
"ep": 348,
"db": 50,
"co2": 60,
"vie": 100,
"delai": 20
},
"pros": [
"Matériau sain et durable",
"Bon confort d’été"
],
"cons": [
"Plus chère que le parpaing",
"Saignées pour les réseaux limitées"
]
},
{
"id": "pierre",
"n": "Pierre apparente",
"d": "Mur de pierre massif ou parement de pierre de 10 cm sur parpaing, doublage isolant",
"prix": 29638,
"m": {
"R": 4.090888888888888,
"ep": 433,
"db": 52,
"co2": 80,
"vie": 100,
"delai": 35
},
"pros": [
"Aspect noble, très durable, grande inertie",
"Pas de ravalement à prévoir"
],
"cons": [
"Solution la plus chère",
"Chantier long, fondations renforcées"
]
}
]
},
{
"id": "plancher",
"g": "Structure et enveloppe",
"t": "Fondations et plancher bas",
"q": "Quel type de fondation pour la maison ? Dalle sur terre-plein ou plancher sur vide sanitaire : ce choix change la profondeur et le coût des fondations.",
"ref": "terre",
"multi": false,
"thick": false,
"bind": "",
"tab": "",
"metrics": [
"co2",
"vie",
"delai"
],
"opts": [
{
"id": "terre",
"n": "Dalle sur terre-plein",
"d": "Béton armé sur hérisson, solution du projet.",
"prix": 8832,
"m": {
"co2": 55,
"vie": 100,
"delai": 12
},
"pros": [
"Solution la plus économique",
"Pas de vide sanitaire à ventiler"
],
"cons": [
"Réseaux enterrés inaccessibles",
"Sensible aux remontées si le terrain est mal drainé"
]
},
{
"id": "hourdis",
"n": "Poutrelles-hourdis sur vide sanitaire",
"d": "Plancher préfabriqué, vide ventilé de 60 cm.",
"prix": 17077,
"m": {
"co2": 70,
"vie": 100,
"delai": 15
},
"pros": [
"Réseaux accessibles dans le vide sanitaire",
"Plancher rigide et durable"
],
"cons": [
"Surcoût notable",
"Chantier plus long, fondations plus hautes"
]
},
{
"id": "bois",
"n": "Plancher bois sur vide sanitaire",
"d": "Solives bois et panneaux, vide ventilé.",
"prix": 18412,
"m": {
"co2": 25,
"vie": 60,
"delai": 14
},
"pros": [
"Léger et bon bilan carbone",
"Réseaux accessibles dans le plancher"
],
"cons": [
"Sensible à l’humidité du vide sanitaire",
"Plancher chauffant plus complexe à concevoir"
]
}
],
"phenix": true,
"pourquoi": "Ce choix est fait par Phénix d’après l’étude de sol : la nature du terrain décide du type de fondation. Nous vous expliquons la solution retenue lors de la remise du chiffrage."
},
{
"id": "couverture",
"g": "Structure et enveloppe",
"t": "Couverture",
"q": "Quel revêtement de toiture ? Son poids est pris en compte dans le calcul des fermettes.",
"ref": "terre",
"multi": false,
"thick": false,
"bind": "roof",
"tab": "toit",
"metrics": [
"poids",
"vie",
"delai"
],
"opts": [
{
"id": "terre",
"n": "Tuile terre cuite à emboîtement",
"d": "Aspect traditionnel et teinte stable dans le temps.",
"prix": 12668,
"m": {
"poids": 42,
"vie": 100,
"delai": 12
},
"pros": [
"Durable, aspect traditionnel",
"Teinte stable, bon confort d’été"
],
"cons": [
"Poids élevé pour la charpente",
"Plus chère que la tuile béton"
]
},
{
"id": "plate",
"n": "Tuile plate terre cuite",
"d": "Petites tuiles rectangulaires à bout arrondi, posées en recouvrement serré.",
"prix": 18257,
"m": {
"poids": 72,
"vie": 100,
"delai": 20
},
"pros": [
"Aspect noble et très traditionnel",
"Très durable, bon comportement dans le temps"
],
"cons": [
"Poids élevé : charpente à renforcer",
"Pose longue, donc plus chère"
]
},
{
"id": "canal",
"n": "Tuile canal (romaine)",
"d": "Tuiles demi-rondes en alternance, typiques du Sud et de l’Auvergne ancienne.",
"prix": 15277,
"m": {
"poids": 38,
"vie": 80,
"delai": 14
},
"pros": [
"Style méridional, légère",
"Bonne ventilation naturelle sous les tuiles"
],
"cons": [
"Pente faible obligatoire (≈ 30 %)",
"Peu courante en Auvergne, tuiles à fixer contre le vent"
]
},
{
"id": "beton",
"n": "Tuile béton",
"d": "Même principe de pose, coloris plus limités.",
"prix": 9688,
"m": {
"poids": 46,
"vie": 50,
"delai": 10
},
"pros": [
"Économique",
"Large choix de coloris"
],
"cons": [
"Teinte qui vieillit",
"Plus lourde que la terre cuite"
]
},
{
"id": "ardoise",
"n": "Ardoise naturelle",
"d": "Finition haut de gamme, pose au clou ou au crochet.",
"prix": 23288,
"m": {
"poids": 28,
"vie": 100,
"delai": 18
},
"pros": [
"Finition haut de gamme",
"Légère et très durable"
],
"cons": [
"Prix élevé",
"Pose longue et spécialisée"
]
},
{
"id": "bac",
"n": "Bac acier prélaqué",
"d": "Toiture légère, pose rapide, aspect contemporain.",
"prix": 10805,
"m": {
"poids": 6,
"vie": 40,
"delai": 6
},
"pros": [
"Très légère, pose rapide",
"Prix de pose réduit"
],
"cons": [
"Bruit de la pluie",
"Aspect contemporain, moins traditionnel"
]
}
]
},
{
"id": "charpente",
"g": "Structure et enveloppe",
"t": "Charpente",
"q": "Fermettes industrielles ou charpente traditionnelle ? Les fermettes sont plus économiques et posées en une journée ; la charpente traditionnelle est taillée sur mesure et libère le volume des combles.",
"ref": "ferm",
"multi": false,
"thick": false,
"bind": "",
"tab": "toit",
"metrics": [
"delai",
"vie"
],
"opts": [
{
"id": "ferm",
"n": "Fermettes industrielles",
"d": "Treillis en W fabriqués en usine, posés en une journée de levage.",
"prix": 6325,
"m": {
"delai": 3,
"vie": 100
},
"pros": [
"Solution la plus économique",
"Pose très rapide, calcul par le fabricant"
],
"cons": [
"Combles encombrés par les diagonales : pas d’étage ni d’aménagement possible",
"Isolation obligatoirement sous le plafond (combles perdus)"
]
},
{
"id": "trad",
"n": "Charpente traditionnelle",
"d": "Fermes, pannes et chevrons en bois massif, taillés sur mesure.",
"prix": 14904,
"m": {
"delai": 10,
"vie": 100
},
"pros": [
"Permet de construire un étage ou d’aménager les combles",
"Isolation sous les rampants : volume sous toiture chauffé et utilisable",
"Aspect de charpente apparente possible"
],
"cons": [
"Nettement plus chère",
"Chantier plus long, main-d’œuvre qualifiée"
]
}
]
},
{
"id": "isoltoit",
"g": "Structure et enveloppe",
"t": "Isolation de la toiture",
"q": "Isoler sous le plafond (combles perdus) ou sous les rampants (combles aménageables) ?",
"ref": "comb",
"multi": false,
"thick": false,
"bind": "",
"tab": "",
"metrics": [],
"opts": [
{
"id": "comb",
"n": "Combles perdus, isolant sur le plafond",
"d": "Isolant soufflé sur le plafond. Obligatoire avec des fermettes.",
"prix": 0,
"m": {},
"pros": [
"Isolation la plus économique",
"Très bonne performance thermique"
],
"cons": [
"Combles non utilisables",
"Accès limité pour l’entretien"
]
},
{
"id": "ramp",
"n": "Sous rampants, combles aménageables",
"d": "Isolant posé le long des pentes de toit. Obligatoire avec une charpente traditionnelle (étage ou combles habitables).",
"prix": 6534,
"m": {},
"pros": [
"Volume sous toiture utilisable plus tard",
"Combles chauffés, plus de volume"
],
"cons": [
"Surcoût de charpente et de finition",
"Plus de surface à isoler"
]
}
]
},
{
"id": "isolant",
"g": "Structure et enveloppe",
"t": "Isolant de toiture et épaisseur",
"q": "Isolant soufflé (laine de verre, ouate, laine de bois) ou laine en rouleaux : quel isolant et quelle épaisseur ? Chaque centimètre de plus améliore la résistance thermique et ajoute au prix.",
"ref": "verre",
"multi": false,
"thick": true,
"bind": "",
"tab": "",
"metrics": [
"R",
"co2"
],
"opts": [
{
"id": "verre",
"n": "Laine de verre soufflée",
"d": "Standard du marché.",
"prix": 3208,
"m": {
"R": 9.75609756097561,
"co2": 9.2
},
"pros": [
"Prix le plus bas",
"Très bonne performance thermique"
],
"cons": [
"Confort d’été moyen",
"Poussière à la pose"
]
},
{
"id": "ouate",
"n": "Ouate de cellulose soufflée",
"d": "Isolant biosourcé, issu du papier recyclé.",
"prix": 3968,
"m": {
"R": 10,
"co2": 4.8
},
"pros": [
"Meilleur confort d’été",
"Faible empreinte carbone"
],
"cons": [
"Plus chère que la laine de verre",
"Peut se tasser avec le temps"
]
},
{
"id": "bois",
"n": "Laine de bois en vrac",
"d": "Isolant biosourcé en fibres de bois.",
"prix": 4776,
"m": {
"R": 9.523809523809524,
"co2": 6
},
"pros": [
"Très bon confort d’été",
"Matériau naturel et durable"
],
"cons": [
"Prix le plus élevé",
"Moins répandue, fournisseurs limités"
]
},
{
"id": "rouleau",
"n": "Laine minérale en rouleaux",
"d": "Laine de verre ou de roche en rouleaux, déroulée à la main (en plusieurs couches croisées sur le plafond, ou entre les chevrons sous rampants).",
"prix": 2922,
"m": {
"R": 10.526315789473685,
"co2": 9.6
},
"pros": [
"Pose sans machine, à la portée de tout artisan",
"Très économique et disponible partout"
],
"cons": [
"Joints possibles si la pose est peu soignée",
"Moins adaptée aux recoins et aux passages de gaines"
]
}
]
},
{
"id": "menuiseries",
"g": "Ouvertures",
"t": "Fenêtres et baie vitrée",
"q": "Aluminium, PVC ou bois ? Le matériau change le prix, l’entretien et la finesse des cadres.",
"ref": "alu",
"multi": false,
"thick": false,
"bind": "",
"tab": "menu",
"metrics": [
"uw",
"vie"
],
"opts": [
{
"id": "alu",
"n": "Aluminium à rupture de pont thermique",
"d": "Cadres fins, teinte gris anthracite.",
"prix": 7960,
"m": {
"uw": 1.3,
"vie": 40
},
"pros": [
"Cadres fins, plus de lumière",
"Aucun entretien"
],
"cons": [
"Plus chères que le PVC",
"Cadre froid sans rupture de pont thermique"
]
},
{
"id": "pvc",
"n": "PVC",
"d": "Cadres plus épais, blanc ou teinté.",
"prix": 6209,
"m": {
"uw": 1.2,
"vie": 30
},
"pros": [
"Meilleur prix",
"Très bonne isolation thermique"
],
"cons": [
"Cadres plus épais, moins de vitrage",
"Teintes et finitions limitées"
]
},
{
"id": "bois",
"n": "Bois",
"d": "Essence au choix, lasure ou peinture.",
"prix": 9552,
"m": {
"uw": 1.4,
"vie": 30
},
"pros": [
"Aspect chaleureux",
"Bon bilan carbone"
],
"cons": [
"Entretien régulier de la finition",
"Prix le plus élevé"
]
}
]
},
{
"id": "volets",
"g": "Ouvertures",
"t": "Volets",
"q": "Quel type de fermeture pour les fenêtres et la baie vitrée ?",
"ref": "elec",
"multi": false,
"thick": false,
"bind": "",
"tab": "menu",
"metrics": [],
"opts": [
{
"id": "elec",
"n": "Tout en volets roulants électriques",
"d": "Commande radio, coffre dans la tapée.",
"prix": 3560,
"m": {},
"pros": [
"Confort d’usage, programmation possible",
"Sécurité et occultation totale"
],
"cons": [
"Panne possible du moteur",
"Coffre à intégrer dans le mur"
]
},
{
"id": "man",
"n": "Volets roulants manuels",
"d": "Manivelle ou sangle.",
"prix": 2100,
"m": {},
"pros": [
"Moins chers et plus simples",
"Pas de moteur à remplacer"
],
"cons": [
"Moins pratiques au quotidien",
"Manœuvre difficile sur la grande baie"
]
},
{
"id": "mix",
"n": "Battants bois + volet roulant sur la baie",
"d": "Volets battants en bois sur toutes les fenêtres, volet roulant électrique sur la grande baie vitrée.",
"prix": 2600,
"m": {},
"pros": [
"Aspect traditionnel sur les fenêtres",
"Baie vitrée facile à fermer, motorisée"
],
"cons": [
"Entretien du bois à prévoir",
"Deux types de volets à gérer"
]
},
{
"id": "batt",
"n": "Tout en volets battants bois",
"d": "Deux vantaux de chaque côté de chaque ouverture, baie vitrée comprise, fermés à la main.",
"prix": 2840,
"m": {},
"pros": [
"Pas de moteur, rien à réparer",
"Aspect traditionnel, très robustes",
"Prix intermédiaire"
],
"cons": [
"Il faut ouvrir la fenêtre pour les fermer",
"Peinture ou lasure à refaire régulièrement"
]
},
{
"id": "none",
"n": "Sans volets",
"d": "Vitrage seul.",
"prix": 0,
"m": {},
"pros": [
"Aucun coût",
"Plus de lumière, façade plus nette"
],
"cons": [
"Pas d’occultation ni de protection solaire",
"Moins de sécurité"
]
}
]
},
{
"id": "porte",
"g": "Ouvertures",
"t": "Porte d’entrée",
"q": "Quelle porte d’entrée pour votre façade sud ?",
"ref": "alu",
"multi": false,
"thick": false,
"bind": "",
"tab": "menu",
"metrics": [
"uw",
"vie"
],
"opts": [
{
"id": "alu",
"n": "Porte aluminium",
"d": "Cadre et ouvrant isolés, serrure multipoints.",
"prix": 2150,
"m": {
"uw": 1.4,
"vie": 40
},
"pros": [
"Très durable, sans entretien",
"Large choix de teintes"
],
"cons": [
"Plus chère que l’acier",
"Surface froide au toucher"
]
},
{
"id": "vitree",
"n": "Porte aluminium design, vitrée",
"d": "Vantail aluminium anthracite avec grande fente vitrée verticale (verre feuilleté sablé : lumière sans vue directe), tirant inox pleine hauteur, serrure multipoints à capteur.",
"prix": 3450,
"m": {
"uw": 1.2,
"vie": 40
},
"pros": [
"Hall d’entrée lumineux, aspect contemporain",
"Verre feuilleté sécurisé, très durable",
"Sans entretien"
],
"cons": [
"Prix élevé",
"Vitrage sablé à nettoyer",
"Moins d’intimité qu’une porte pleine"
]
},
{
"id": "acier",
"n": "Porte acier isolée",
"d": "Panneau acier isolé, finition laquée.",
"prix": 1750,
"m": {
"uw": 1.3,
"vie": 35
},
"pros": [
"Très bon rapport qualité-prix",
"Excellente sécurité"
],
"cons": [
"Choix de décors plus limité",
"Peut se rayer ou se bosser"
]
},
{
"id": "boisp",
"n": "Porte bois massif",
"d": "Panneau bois, finition lasurée.",
"prix": 2650,
"m": {
"uw": 1.6,
"vie": 30
},
"pros": [
"Aspect chaleureux et haut de gamme",
"Réparable facilement"
],
"cons": [
"Entretien régulier",
"Prix le plus élevé"
]
}
]
},
{
"id": "portesint",
"g": "Ouvertures",
"t": "Portes intérieures",
"q": "Quel type de bloc-porte pour les huit portes intérieures, et quelle largeur de vantail (73, 83 ou 93 cm) ? La largeur 83 est la plus courante ; 93 facilite le passage d’un fauteuil roulant.",
"ref": "alv",
"multi": false,
"thick": false,
"bind": "",
"tab": "menu",
"metrics": [
"db",
"vie"
],
"opts": [
{
"id": "alv",
"n": "Alvéolaire à peindre",
"d": "Porte plane en panneau alvéolaire.",
"prix": 2560,
"m": {
"db": 25,
"vie": 20
},
"pros": [
"Choix de teinte libre à la peinture",
"Bon prix"
],
"cons": [
"Légère, bruit transmis",
"Peinture à prévoir"
]
},
{
"id": "post",
"n": "Post-formée blanche",
"d": "Porte prépeinte, prête à poser.",
"prix": 1920,
"m": {
"db": 25,
"vie": 15
},
"pros": [
"Moins chère, aucune peinture",
"Pose rapide"
],
"cons": [
"Teinte unique",
"Moins résistante aux chocs"
]
},
{
"id": "massif",
"n": "Bois massif, finition naturelle",
"d": "Panneau plein en bois, simplement vernis ou lasuré : on voit le bois, pas de peinture.",
"prix": 4160,
"m": {
"db": 30,
"vie": 40
},
"pros": [
"Aspect bois chaleureux, veinage visible",
"Solide, bonne isolation phonique"
],
"cons": [
"Prix le plus élevé",
"Poids important, huisseries renforcées"
]
}
]
},
{
"id": "chauffage",
"g": "Confort technique",
"t": "Chauffage",
"q": "Quel système de chauffage ? Comparez l’investissement et la facture annuelle.",
"ref": "pac",
"multi": false,
"thick": false,
"bind": "",
"tab": "chauf",
"metrics": [
"cout",
"vie"
],
"opts": [
{
"id": "pac",
"n": "Pompe à chaleur air-eau et plancher chauffant",
"d": "Chaleur douce diffusée par le sol.",
"prix": 16464,
"m": {
"cout": 340,
"vie": 17
},
"pros": [
"Facture la plus basse",
"Confort homogène par le sol"
],
"cons": [
"Investissement le plus élevé",
"Unité extérieure à placer"
]
},
{
"id": "air",
"n": "Pompe à chaleur air-air, splits",
"d": "Unités murales dans les pièces de vie et les chambres.",
"prix": 7400,
"m": {
"cout": 372,
"vie": 15
},
"pros": [
"Moins chère que la pompe à chaleur air-eau",
"Peut rafraîchir en été"
],
"cons": [
"Chaleur moins homogène",
"Unités visibles dans les pièces"
]
},
{
"id": "gran",
"n": "Poêle à granulés et radiateurs électriques",
"d": "Poêle dans le séjour, radiateurs dans les chambres.",
"prix": 7200,
"m": {
"cout": 400,
"vie": 20
},
"pros": [
"Combustible économique",
"Poêle décoratif"
],
"cons": [
"Stockage et approvisionnement des granulés",
"Nettoyage régulier et ramonage"
]
},
{
"id": "rad",
"n": "Radiateurs électriques simples",
"d": "Convecteurs ou panneaux rayonnants, un par pièce, thermostat intégré.",
"prix": 2900,
"m": {
"cout": 1500,
"vie": 15
},
"pros": [
"Investissement le plus bas",
"Pose très rapide, aucun entretien"
],
"cons": [
"Facture la plus élevée",
"Chaleur moins douce, moins homogène"
]
},
{
"id": "elec",
"n": "Radiateurs électriques à inertie",
"d": "Un radiateur par pièce, cœur en fonte ou céramique qui stocke la chaleur.",
"prix": 5600,
"m": {
"cout": 1050,
"vie": 25
},
"pros": [
"Consomment moins que les radiateurs simples",
"Chaleur douce et enveloppante, sans air brassé",
"Aucun entretien"
],
"cons": [
"Plus chers à l’achat que les radiateurs simples",
"Facture encore supérieure à une pompe à chaleur"
]
}
]
},
{
"id": "ventilation",
"g": "Confort technique",
"t": "Ventilation",
"q": "VMC double flux ou simple flux ? Le double flux récupère la chaleur de l’air extrait.",
"ref": "df",
"multi": false,
"thick": false,
"bind": "",
"tab": "chauf",
"metrics": [
"chauf",
"vie"
],
"opts": [
{
"id": "df",
"n": "VMC double flux",
"d": "Échangeur de chaleur, filtres sur l’air neuf.",
"prix": 7700,
"m": {
"chauf": 0,
"vie": 20
},
"pros": [
"Récupère la chaleur de l’air extrait",
"Air neuf filtré, confort acoustique"
],
"cons": [
"Plus chère à l’achat",
"Filtres à changer chaque année"
]
},
{
"id": "sf",
"n": "VMC simple flux hygroréglable",
"d": "Extraction dans les pièces humides par des gaines dans les combles, entrées d’air dans les menuiseries.",
"prix": 3200,
"m": {
"chauf": 12,
"vie": 25
},
"pros": [
"Prix bas, entretien simple",
"Installation rapide"
],
"cons": [
"Pertes de chaleur à l’extraction",
"Entrées d’air visibles sur les fenêtres"
]
}
]
},
{
"id": "solsvie",
"g": "Finitions",
"t": "Sol du séjour et de l’entrée",
"q": "Quel sol pour le séjour, l’entrée et le dégagement ? La cuisine a son propre sol, choisi à la question suivante.",
"ref": "carr120",
"multi": false,
"thick": false,
"bind": "",
"tab": "sols",
"metrics": [
"vie",
"delai"
],
"opts": [
{
"id": "carr120",
"n": "Carrelage grand format (60 × 120, 80 × 120, 120 × 120, etc.)",
"d": "Grès cérame rectifié, joints fins.",
"prix": 3069,
"m": {
"vie": 50,
"delai": 6
},
"pros": [
"Très résistant, facile à nettoyer",
"Très bon avec le plancher chauffant"
],
"cons": [
"Sol froid hors chauffage",
"Pose délicate, planéité exigeante"
]
},
{
"id": "carr60",
"n": "Carrelage 60 × 60",
"d": "Grès cérame, format courant.",
"prix": 2518,
"m": {
"vie": 50,
"delai": 5
},
"pros": [
"Moins cher que le grand format",
"Pose plus simple"
],
"cons": [
"Plus de joints visibles",
"Aspect moins épuré"
]
},
{
"id": "parquet",
"n": "Parquet contrecollé chêne",
"d": "Collé en plein sur chape.",
"prix": 3619,
"m": {
"vie": 30,
"delai": 3
},
"pros": [
"Chaleureux et confortable",
"Rénovable par ponçage"
],
"cons": [
"Sensible aux rayures et à l’eau",
"Plus cher que le carrelage"
]
},
{
"id": "strat",
"n": "Stratifié haute résistance",
"d": "Lames clipsées sur sous-couche.",
"prix": 1495,
"m": {
"vie": 15,
"delai": 2
},
"pros": [
"Prix le plus bas",
"Pose très rapide"
],
"cons": [
"Durée de vie plus courte",
"Rendement du plancher chauffant réduit"
]
},
{
"id": "lvt",
"n": "Sol vinyle clipsable",
"d": "Lames vinyle étanches.",
"prix": 1810,
"m": {
"vie": 20,
"delai": 2
},
"pros": [
"Étanche, silencieux à la marche",
"Pose rapide"
],
"cons": [
"Aspect moins noble",
"Sensible aux rayures"
]
}
]
},
{
"id": "solcuis",
"g": "Finitions",
"t": "Sol de la cuisine",
"q": "Quel sol pour la cuisine ? On choisit souvent un carrelage ici, même si le séjour est en parquet ou en stratifié : il résiste mieux à l’eau et aux taches.",
"ref": "carr120",
"multi": false,
"thick": false,
"bind": "",
"tab": "sols",
"metrics": [
"vie",
"delai"
],
"opts": [
{
"id": "carr120",
"n": "Carrelage grand format (60 × 120, 80 × 120, 120 × 120, etc.)",
"d": "Grès cérame rectifié, joints fins.",
"prix": 835,
"m": {
"vie": 50,
"delai": 6
},
"pros": [
"Très résistant à l’eau et aux taches",
"Continuité visuelle avec un séjour carrelé"
],
"cons": [
"Sol froid hors chauffage",
"Pose délicate, planéité exigeante"
]
},
{
"id": "carr60",
"n": "Carrelage 60 × 60",
"d": "Grès cérame, format courant.",
"prix": 685,
"m": {
"vie": 50,
"delai": 5
},
"pros": [
"Moins cher que le grand format",
"Pose plus simple"
],
"cons": [
"Plus de joints à entretenir",
"Aspect moins épuré"
]
},
{
"id": "lvt",
"n": "Sol vinyle clipsable",
"d": "Lames vinyle étanches.",
"prix": 492,
"m": {
"vie": 20,
"delai": 2
},
"pros": [
"Étanche, silencieux, chaud au pied",
"Pose rapide"
],
"cons": [
"Sensible aux rayures et aux chaleurs fortes",
"Aspect moins noble"
]
}
]
},
{
"id": "solsch",
"g": "Finitions",
"t": "Sol des chambres",
"q": "Quel sol pour la suite parentale et les chambres ?",
"ref": "parquet",
"multi": false,
"thick": false,
"bind": "",
"tab": "sols",
"metrics": [
"vie",
"delai"
],
"opts": [
{
"id": "parquet",
"n": "Parquet contrecollé chêne",
"d": "Collé en plein sur chape.",
"prix": 3577,
"m": {
"vie": 30,
"delai": 3
},
"pros": [
"Chaleureux et confortable",
"Rénovable par ponçage"
],
"cons": [
"Sensible aux rayures",
"Plus cher que le stratifié"
]
},
{
"id": "strat",
"n": "Stratifié haute résistance",
"d": "Lames clipsées sur sous-couche.",
"prix": 1477,
"m": {
"vie": 15,
"delai": 2
},
"pros": [
"Prix le plus bas",
"Pose rapide"
],
"cons": [
"Durée de vie plus courte",
"Aspect moins noble"
]
},
{
"id": "carrb",
"n": "Carrelage aspect bois 20 × 120",
"d": "Grès cérame imitation parquet.",
"prix": 2722,
"m": {
"vie": 50,
"delai": 5
},
"pros": [
"Très durable et facile à nettoyer",
"Compatible plancher chauffant"
],
"cons": [
"Moins chaleureux au pied",
"Pose plus longue"
]
}
]
},
{
"id": "finition",
"g": "Finitions",
"t": "Murs du séjour",
"q": "Peinture, papier peint (partout ou en mixte) ou lambris ? Ce choix concerne le séjour, l’entrée et le dégagement ; les pièces d’eau (cuisine, salle de bain, WC) restent peintes ou carrelées.",
"ref": "peint",
"multi": false,
"thick": false,
"bind": "",
"tab": "pein",
"metrics": [
"vie"
],
"opts": [
{
"id": "peint",
"n": "Peinture",
"d": "Deux couches acryliques mates.",
"prix": 864,
"m": {
"vie": 10
},
"pros": [
"Choix de couleur illimité",
"Retouches faciles"
],
"cons": [
"Beaucoup de main-d’œuvre : enduit, ponçage, deux couches",
"À refaire tous les 8 à 12 ans"
]
},
{
"id": "papier",
"n": "Papier peint sur toute la surface",
"d": "Intissé décoratif sur tous les murs du séjour, de l’entrée et du dégagement, référence à choisir par vous.",
"prix": 1590,
"m": {
"vie": 12
},
"pros": [
"Ambiance chaleureuse, motifs illimités",
"Cache les petits défauts du support"
],
"cons": [
"Plus cher que la peinture",
"Difficile à changer"
]
},
{
"id": "pmixte",
"n": "Mixte : peinture et papier peint",
"d": "Papier peint sur certains murs, peinture sur les autres, selon votre choix.",
"prix": 1227,
"m": {
"vie": 12
},
"pros": [
"Effet décoratif avec un budget maîtrisé",
"Libre de choisir les murs concernés"
],
"cons": [
"Raccords peinture / papier à soigner",
"Plus cher que la peinture seule"
]
},
{
"id": "lamb",
"n": "Lambris sur toute la hauteur",
"d": "Lambris bois peint ou lasuré, posé directement sur les montants.",
"prix": 636,
"m": {
"vie": 25
},
"pros": [
"Solution la moins chère : pose rapide, beaucoup moins de main-d’œuvre",
"Très durable et chaleureux",
"Cache les défauts du support"
],
"cons": [
"Pièce visuellement plus petite",
"Teintes et finitions plus limitées"
]
}
]
},
{
"id": "cuisine",
"g": "Finitions",
"t": "Gamme de cuisine",
"q": "Quelle gamme de cuisine équipée, électroménager inclus ?",
"ref": "conf",
"multi": false,
"thick": false,
"bind": "",
"tab": "cuis",
"metrics": [
"vie"
],
"opts": [
{
"id": "ess",
"n": "Essentielle",
"d": "Façades stratifiées, plan de travail stratifié, électroménager de base.",
"prix": 9800,
"m": {
"vie": 12
},
"pros": [
"Budget maîtrisé",
"Large choix de coloris"
],
"cons": [
"Plan de travail moins résistant",
"Électroménager d’entrée de gamme"
]
},
{
"id": "conf",
"n": "Confort",
"d": "Façades laquées mates, plan de travail quartz, électroménager encastrable.",
"prix": 14000,
"m": {
"vie": 18
},
"pros": [
"Très bon équilibre prix et durabilité",
"Plan de travail quartz résistant"
],
"cons": [
"Investissement moyen",
"Électroménager de gamme moyenne"
]
},
{
"id": "prem",
"n": "Premium",
"d": "Façades laquées, quartz épais, électroménager haut de gamme.",
"prix": 21500,
"m": {
"vie": 25
},
"pros": [
"Finitions et équipements haut de gamme",
"Très durable"
],
"cons": [
"Prix élevé",
"Délai de fabrication plus long"
]
}
]
},
{
"id": "assain",
"g": "Extérieurs et réseaux",
"t": "Eaux usées",
"q": "Ce n’est pas un choix libre : votre commune impose la solution. Si le tout-à-l’égout passe devant le terrain, on s’y raccorde. Sinon, c’est un assainissement individuel : une micro-station.",
"ref": "collectif",
"multi": false,
"thick": false,
"bind": "",
"tab": "vrd",
"metrics": [
"entret",
"vie",
"delai"
],
"opts": [
{
"id": "collectif",
"n": "Raccordement au tout-à-l’égout",
"d": "Obligatoire quand le réseau public passe devant votre terrain : un tuyau enterré rejoint le regard de la rue.",
"prix": 3800,
"m": {
"entret": 0,
"vie": 50,
"delai": 3
},
"pros": [
"Obligatoire si le réseau public existe devant le terrain",
"Aucun entretien"
],
"cons": []
},
{
"id": "micro",
"n": "Micro-station d’épuration",
"d": "Obligatoire sans réseau public (assainissement individuel) : petite station biologique enterrée.",
"prix": 9800,
"m": {
"entret": 250,
"vie": 25,
"delai": 6
},
"pros": [
"Obligatoire en l’absence de tout-à-l’égout",
"Rejet très propre"
],
"cons": [
"Contrat d’entretien et électricité à prévoir"
]
}
],
"phenix": true,
"pourquoi": "Ce n’est pas un choix libre : votre commune impose la solution selon le réseau présent devant votre terrain. Phénix la renseigne pour vous."
},
{
"id": "pluvial",
"g": "Extérieurs et réseaux",
"t": "Eaux de pluie",
"q": "Où partent les eaux de toiture et de l’allée ? Vous pouvez cumuler plusieurs solutions.",
"ref": "reseau",
"multi": true,
"thick": false,
"bind": "",
"tab": "vrd",
"metrics": [
"vie",
"delai",
"entret"
],
"opts": [
{
"id": "reseau",
"n": "Rejet au réseau pluvial",
"d": "Branchement sur le réseau d’eaux pluviales de la rue.",
"prix": 1900,
"m": {
"vie": 50,
"delai": 1,
"entret": 0
},
"pros": [
"Le moins cher",
"Aucun entretien"
],
"cons": [
"Souvent interdit ou limité par la commune",
"Peut être payant"
]
},
{
"id": "cuve",
"n": "Cuve enterrée de récupération",
"d": "Cuve de 5 000 L avec trop-plein vers le réseau ou la noue.",
"prix": 4900,
"m": {
"vie": 30,
"delai": 2,
"entret": 40
},
"pros": [
"Eau gratuite pour le jardin et les WC",
"Tamponne les fortes pluies"
],
"cons": [
"Plus cher à l’installation",
"Pompe et filtre à entretenir"
]
},
{
"id": "noue",
"n": "Noue paysagère",
"d": "Fossé végétalisé qui infiltre l’eau.",
"prix": 2300,
"m": {
"vie": 40,
"delai": 1,
"entret": 60
},
"pros": [
"Joli et écologique",
"Peu coûteux"
],
"cons": [
"Occupe de la surface",
"Entretien du végétal"
]
}
]
},
{
"id": "allee",
"g": "Extérieurs et réseaux",
"t": "Allée et stationnement",
"q": "Quel revêtement pour l’allée et les places de stationnement ?",
"ref": "enrobe",
"multi": false,
"thick": false,
"bind": "",
"tab": "ext",
"metrics": [
"vie",
"delai",
"co2"
],
"opts": [
{
"id": "gravier",
"n": "Gravier stabilisé en alvéoles",
"d": "Alvéoles plastique remplies de gravier.",
"prix": 1560,
"m": {
"vie": 15,
"delai": 1,
"co2": 6
},
"pros": [
"Prix le plus bas",
"Perméable à l’eau"
],
"cons": [
"Gravier qui se déplace",
"Déneigement difficile"
]
},
{
"id": "enrobe",
"n": "Enrobé noir",
"d": "Bitume à chaud compacté.",
"prix": 2730,
"m": {
"vie": 25,
"delai": 1,
"co2": 14
},
"pros": [
"Rapide et lisse",
"Déneigement facile"
],
"cons": [
"Chaud en été",
"Imperméable"
]
},
{
"id": "beton",
"n": "Béton balayé ou désactivé",
"d": "Dalle béton avec finition de surface.",
"prix": 3770,
"m": {
"vie": 40,
"delai": 3,
"co2": 24
},
"pros": [
"Très durable",
"Beaucoup de finitions"
],
"cons": [
"Séchage de quelques jours",
"Fissures possibles"
]
},
{
"id": "paves",
"n": "Pavés béton",
"d": "Pavés posés sur lit de sable.",
"prix": 4810,
"m": {
"vie": 40,
"delai": 3,
"co2": 22
},
"pros": [
"Esthétique, réparable",
"Perméable avec joints larges"
],
"cons": [
"Coût élevé",
"Mauvaises herbes dans les joints"
]
},
{
"id": "gazon",
"n": "Dalles alvéolées engazonnées",
"d": "Dalles béton ou plastique avec gazon.",
"prix": 3120,
"m": {
"vie": 25,
"delai": 2,
"co2": 12
},
"pros": [
"Aspect vert",
"Eau de pluie infiltrée"
],
"cons": [
"À tondre",
"Peu adapté à un passage intensif"
]
}
]
},
{
"id": "portail",
"g": "Extérieurs et réseaux",
"t": "Portail",
"q": "Quel portail pour l’entrée du terrain ?",
"ref": "coulissant",
"multi": false,
"thick": false,
"bind": "",
"tab": "ext",
"metrics": [
"vie",
"delai"
],
"opts": [
{
"id": "coulissant",
"n": "Alu coulissant motorisé",
"d": "Vantail qui glisse sur rail devant la clôture.",
"prix": 5450,
"m": {
"vie": 25,
"delai": 2
},
"pros": [
"Pas de place nécessaire pour l’ouverture",
"Confort au quotidien"
],
"cons": [
"Rail à garder propre",
"Prix élevé"
]
},
{
"id": "battant",
"n": "Alu battant motorisé",
"d": "Deux vantaux qui s’ouvrent vers l’intérieur.",
"prix": 4850,
"m": {
"vie": 25,
"delai": 2
},
"pros": [
"Esthétique",
"Moins cher que le coulissant"
],
"cons": [
"Place de dégagement nécessaire",
"Sensible au vent"
]
},
{
"id": "battantman",
"n": "Alu battant manuel",
"d": "Deux vantaux à ouvrir à la main.",
"prix": 2950,
"m": {
"vie": 25,
"delai": 1
},
"pros": [
"Économique",
"Peu de pannes"
],
"cons": [
"Sortir de la voiture à chaque fois",
"Motorisation possible plus tard"
]
},
{
"id": "acier",
"n": "Acier galvanisé coulissant motorisé",
"d": "Portail acier thermolaqué, plus robuste.",
"prix": 6250,
"m": {
"vie": 30,
"delai": 2
},
"pros": [
"Très solide",
"Large choix de teintes"
],
"cons": [
"Le plus cher",
"Plus lourd à motoriser"
]
},
{
"id": "bois",
"n": "Bois battant manuel",
"d": "Portail bois à peindre ou lasurer.",
"prix": 3550,
"m": {
"vie": 15,
"delai": 2
},
"pros": [
"Chaleureux",
"Prix moyen"
],
"cons": [
"Entretien régulier",
"Se déforme avec le temps"
]
}
]
},
{
"id": "cloture",
"g": "Extérieurs et réseaux",
"t": "Clôture",
"q": "Quelle clôture autour du terrain ? Le règlement de zone peut en fixer la hauteur et la teinte.",
"ref": "grillage",
"multi": false,
"thick": false,
"bind": "",
"tab": "ext",
"metrics": [
"vie",
"entret",
"delai"
],
"opts": [
{
"id": "grillage",
"n": "Grillage rigide soudé",
"d": "Panneaux sur soubassement béton.",
"prix": 4216,
"m": {
"vie": 25,
"entret": 0,
"delai": 3
},
"pros": [
"Bon rapport qualité-prix",
"Sans entretien"
],
"cons": [
"Aucune intimité",
"Aspect simple"
]
},
{
"id": "haie",
"n": "Grillage et haie vive",
"d": "Grillage souple masqué par une haie.",
"prix": 2604,
"m": {
"vie": 30,
"entret": 90,
"delai": 3
},
"pros": [
"Le moins cher",
"Intimité en quelques années"
],
"cons": [
"Taille de la haie",
"Pousse lente"
]
},
{
"id": "alu",
"n": "Panneaux alu occultants",
"d": "Lames aluminium pleines.",
"prix": 8556,
"m": {
"vie": 35,
"entret": 0,
"delai": 4
},
"pros": [
"Intimité totale",
"Durable"
],
"cons": [
"Prix élevé",
"Effet de mur"
]
},
{
"id": "bahut",
"n": "Mur bahut et grillage",
"d": "Mur bahut enduit d’environ 60 cm, avec une clôture grillagée posée dessus.",
"prix": 10230,
"m": {
"vie": 50,
"entret": 20,
"delai": 8
},
"pros": [
"Très durable",
"Belle finition"
],
"cons": [
"Le plus cher",
"Chantier plus long"
]
},
{
"id": "claustra",
"n": "Claustra composite",
"d": "Lames composite ajourées.",
"prix": 7316,
"m": {
"vie": 25,
"entret": 0,
"delai": 4
},
"pros": [
"Intimité douce",
"Peu d’entretien"
],
"cons": [
"Prix élevé",
"Prise au vent"
]
}
]
},
{
"id": "appareillage",
"g": "Confort technique",
"t": "Prises et interrupteurs",
"q": "Quelle gamme d’appareillage électrique pour toute la maison (environ 110 prises, interrupteurs et prises TV ou réseau) ?",
"ref": "std",
"multi": false,
"thick": false,
"bind": "",
"tab": "elec",
"metrics": [
"vie",
"delai"
],
"opts": [
{
"id": "std",
"n": "Gamme standard blanche",
"d": "Plaques blanches, mécanismes classiques.",
"prix": 2400,
"m": {
"vie": 25,
"delai": 0
},
"pros": [
"Prix le plus bas",
"Pièces de rechange partout"
],
"cons": [
"Design simple",
"Aucune commande à distance"
]
},
{
"id": "design",
"n": "Gamme design",
"d": "Plaques mates ou métal, mécanismes silencieux.",
"prix": 3900,
"m": {
"vie": 30,
"delai": 0
},
"pros": [
"Finition soignée",
"Large choix de teintes"
],
"cons": [
"Prix plus élevé",
"Plaques fragiles aux rayures"
]
},
{
"id": "connecte",
"n": "Gamme connectée et domotique",
"d": "Interrupteurs et prises pilotables, avec domotique : éclairage, volets et chauffage commandés depuis un téléphone ou à la voix, scénarios (départ, nuit, vacances).",
"prix": 7600,
"m": {
"vie": 20,
"delai": 1
},
"pros": [
"Domotique : éclairage, volets et chauffage centralisés",
"Scénarios programmables, économies de chauffage possibles"
],
"cons": [
"Prix élevé",
"Dépend d’un réseau et de mises à jour"
]
}
]
},
{
"id": "muchambres",
"g": "Finitions",
"t": "Murs des chambres",
"q": "Peinture, papier peint sur toute la surface ou mixte peinture et papier peint pour les trois chambres ?",
"ref": "blanc",
"multi": false,
"thick": false,
"bind": "",
"tab": "pein",
"metrics": [
"vie"
],
"opts": [
{
"id": "blanc",
"n": "Peinture blanche",
"d": "Deux couches acryliques mates, blanc.",
"prix": 2600,
"m": {
"vie": 10
},
"pros": [
"Prix le plus bas",
"Retouches faciles"
],
"cons": [
"Pièces plus neutres",
"À refaire tous les 8 à 12 ans"
]
},
{
"id": "couleur",
"n": "Peinture de couleur",
"d": "Deux couches de la teinte de votre choix : choix de couleur illimité.",
"prix": 3300,
"m": {
"vie": 10
},
"pros": [
"Chambres plus chaleureuses",
"Teinte différente possible par chambre"
],
"cons": [
"Sous-couche nécessaire",
"Retouches à la même teinte"
]
},
{
"id": "papier",
"n": "Papier peint sur toute la surface",
"d": "Intissé décoratif sur tous les murs de chaque chambre, référence à choisir par vous.",
"prix": 5600,
"m": {
"vie": 12
},
"pros": [
"Ambiance cohérente et enveloppante",
"Choix de motifs illimité"
],
"cons": [
"Plus cher à poser",
"Difficile à changer"
]
},
{
"id": "pmixte",
"n": "Mixte : peinture et papier peint",
"d": "Papier peint sur certains murs, peinture sur les autres, selon votre choix pour chaque chambre.",
"prix": 4200,
"m": {
"vie": 12
},
"pros": [
"Effet décoratif avec un budget maîtrisé",
"Libre de choisir les murs concernés"
],
"cons": [
"Raccords peinture / papier à soigner",
"Plus cher que la peinture seule"
]
}
]
},
{
"id": "sdb",
"g": "Finitions",
"t": "Salle de bain et WC",
"q": "Baignoire, douche avec receveur ou douche à l’italienne ? Dans tous les cas, vous choisirez vous-même la référence (modèle, dimensions, robinetterie) avec nous : le prix indiqué est une enveloppe.",
"ref": "douche",
"multi": false,
"thick": false,
"bind": "",
"tab": "plomb",
"metrics": [
"vie",
"delai"
],
"opts": [
{
"id": "bain",
"n": "Baignoire et faïence",
"d": "Baignoire encastrée, faïence sur la zone d’eau, WC suspendu. La référence de la baignoire reste à choisir par vous.",
"prix": 3800,
"m": {
"vie": 30,
"delai": 2
},
"pros": [
"Pratique avec de jeunes enfants",
"Coût maîtrisé"
],
"cons": [
"Enjambement pour entrer",
"Plus de place dans la pièce"
]
},
{
"id": "douche",
"n": "Douche avec receveur extra-plat",
"d": "Receveur extra-plat posé sur le sol, paroi fixe, carrelage jusqu’au plafond. La référence de la douche (receveur, paroi, robinetterie) reste à choisir par vous.",
"prix": 4600,
"m": {
"vie": 30,
"delai": 3
},
"pros": [
"Pose rapide, receveur remplaçable",
"Prix maîtrisé",
"Étanchéité simple à réaliser"
],
"cons": [
"Petit ressaut à enjamber",
"Joints et receveur à entretenir"
]
},
{
"id": "italienne",
"n": "Douche à l’italienne (sans receveur)",
"d": "Pas de receveur : la dalle est creusée et mise en pente vers un siphon de sol ou un caniveau, puis étanchée et carrelée de niveau avec le reste de la pièce. La référence (paroi, robinetterie, carrelage) reste à choisir par vous.",
"prix": 6200,
"m": {
"vie": 30,
"delai": 5
},
"pros": [
"Accessible, sans marche ni ressaut",
"Continuité du sol, aspect épuré",
"Très grande liberté de dimensions"
],
"cons": [
"Plus chère : travaux de dalle et étanchéité",
"Étanchéité sous carrelage à soigner absolument",
"Doit être prévue avant de couler la dalle, difficile à ajouter ensuite",
"Pas de bain possible"
]
}
]
},
{
"id": "garage",
"g": "Extérieurs et réseaux",
"t": "Porte de garage",
"q": "Quelle largeur pour la porte du garage ? 3 m suffit pour une voiture, 5 ou 6 m permettent d’en rentrer deux côte à côte.",
"ref": "l3",
"multi": false,
"thick": false,
"bind": "",
"tab": "ext",
"metrics": [
"vie"
],
"siGarage": true,
"opts": [
{
"id": "l3",
"n": "Largeur 3 m",
"d": "Porte sectionnelle isolée, motorisée, 3 × 2 m.",
"prix": 1900,
"m": {
"vie": 25
},
"pros": [
"Prix le plus doux",
"Suffit pour une voiture"
],
"cons": [
"Manœuvre plus serrée",
"Une seule voiture"
]
},
{
"id": "l4",
"n": "Largeur 4 m",
"d": "Porte sectionnelle isolée, motorisée, 4 × 2 m.",
"prix": 2600,
"m": {
"vie": 25
},
"pros": [
"Entrée confortable",
"Place pour une voiture et des vélos"
],
"cons": [
"Linteau plus large à prévoir"
]
},
{
"id": "l5",
"n": "Largeur 5 m",
"d": "Porte sectionnelle isolée, motorisée, 5 × 2 m.",
"prix": 3300,
"m": {
"vie": 25
},
"pros": [
"Deux petites voitures côte à côte"
],
"cons": [
"Linteau renforcé",
"Façade de garage plus présente"
]
},
{
"id": "l6",
"n": "Largeur 6 m",
"d": "Porte sectionnelle isolée, motorisée, 6 × 2 m.",
"prix": 4100,
"m": {
"vie": 25
},
"pros": [
"Deux voitures sans manœuvre"
],
"cons": [
"Prix le plus élevé",
"Linteau et structure renforcés"
]
}
]
},
{
"id": "terrasse",
"g": "Extérieurs et réseaux",
"t": "Terrasse",
"q": "Terrasse en bois, en carrelage collé sur dalle béton, ou en dalles posées sur plots ?",
"ref": "dalles",
"multi": false,
"thick": false,
"bind": "",
"tab": "ext",
"metrics": [
"vie"
],
"opts": [
{
"id": "bois",
"n": "Terrasse bois",
"d": "Lames bois sur lambourdes, environ 20 m².",
"prix": 2800,
"m": {
"vie": 20
},
"pros": [
"Chaleureuse, agréable pieds nus",
"Pose rapide"
],
"cons": [
"Entretien régulier (saturateur)",
"Grise avec le temps"
]
},
{
"id": "carrelage",
"n": "Carrelage collé",
"d": "Carrelage extérieur antidérapant collé sur dalle béton, environ 20 m².",
"prix": 2500,
"m": {
"vie": 40
},
"pros": [
"Très durable, facile à nettoyer",
"Continuité possible avec le séjour"
],
"cons": [
"Dalle béton à couler avant",
"Chaude en plein soleil"
]
},
{
"id": "dalles",
"n": "Dalles sur plots",
"d": "Dalles grès cérame 2 cm posées sur plots réglables, environ 20 m².",
"prix": 2200,
"m": {
"vie": 40
},
"pros": [
"Pose sans colle, dalles remplaçables",
"L’eau s’écoule entre les dalles"
],
"cons": [
"Petits joints ouverts",
"Plots à régler sur sol stable"
]
}
]
}
]
};
  var AREA = 118.8, RA = 186.339;   // surface habitable et surface de toiture de la maison type (m²)
  var LKH={
 wall:{ossature:0xc9a26b,banche:0xe3ddd0,parpaing:0xe3ddd0,brique:0xe3ddd0,pierre:0xffffff},
 roof:{terre:0xc0643e,beton:0x8e8a85,ardoise:0x3d4552,bac:0x6b7f93},
 frame:{alu:0x3b4350,pvc:0xf2f2f0,bois:0x9a6a3c},
 door:{vitree:0x2b3038,alu:0x3b4350,acier:0x5b6470,boisp:0x8a5a30},
 gate:{coulissant:0x3b4350,battant:0x3b4350,battantman:0x3b4350,acier:0x7a838f,bois:0x9a6a3c},
 allee:{gravier:0xbdb3a0,enrobe:0x2c3036,beton:0xb4b8bf,paves:0xa07d6a,gazon:0x5d8f4e},
 floorV:{carr120:0xd9dde3,carr60:0xcfd4db,parquet:0xc89a63,strat:0xbf9b72,lvt:0xaeb4bd},
 floorB:{parquet:0xc89a63,strat:0xbb9a74,carrb:0xb49a7e},
 floorK:{carr120:0xd9dde3,carr60:0xcfd4db,lvt:0xaeb4bd},
 doorI:{alv:0xeceff4,post:0xf5f5f2,massif:0xb07a45},
 wallIn:{peint:0xeef1f6,lamb:0xb99a6b,papier:0xd6c3a8,pmixte:0xe4dccd},
 kitchen:{ess:0xcfd6e2,conf:0x7e8fa8,prem:0x2f3b52},
 fence:{grillage:{c:0x6c7683,o:.4},haie:{c:0x6c7683,o:.35,h:1},alu:{c:0xaab4c2,o:1},bahut:{c:0x59616d,o:.55,b:1},claustra:{c:0x8a6a45,o:1}}
};
LKH.plate={std:0xf4f6fa,design:0x3c4656,connecte:0x5aa9e6};LKH.wallCh={blanc:0xf4f6fa,couleur:0xe2e2e2,papier:0xd6c3a8,pmixte:0xe4dccd};LKH.wallSdb={bain:0xdbe6ef,douche:0x9fb7c9,italienne:0x9fb7c9,duo:0xc9d3dc};
var LKZ={appareillage:'plate',muchambres:'wallCh',murs:'wall',couverture:'roof',menuiseries:'frame',porte:'door',portail:'gate',allee:'allee',solsvie:'floorV',solcuis:'floorK',solsch:'floorB',finition:'wallIn',portesint:'doorI',cuisine:'kitchen',cloture:'fence'};

var HZ=[
 {id:'couverture',t:'Toiture',m:'out'},{id:'murs',t:'Murs',m:'out'},{id:'menuiseries',t:'Fenêtres et baie vitrée',m:'out'},
 {id:'volets',t:'Volets',m:'out'},{id:'porte',t:'Porte d’entrée',m:'out'},{id:'plancher',t:'Plancher bas',m:'out'},
 {id:'chauffage',t:'Chauffage',m:'out'},{id:'pluvial',t:'Eaux de pluie',m:'out'},{id:'assain',t:'Eaux usées',m:'out'},
 {id:'allee',t:'Allée',m:'out'},{id:'portail',t:'Portail',m:'out'},{id:'cloture',t:'Clôture',m:'out'},
 {id:'isoltoit',t:'Isolation du toit',m:'in'},{id:'isolant',t:'Isolant et épaisseur',m:'in'},{id:'ventilation',t:'Ventilation',m:'in'},
 {id:'solsvie',t:'Sols du séjour',m:'in'},{id:'solcuis',t:'Sol de la cuisine',m:'in'},{id:'solsch',t:'Sols des chambres',m:'in'},{id:'finition',t:'Murs du séjour',m:'in'},
 {id:'cuisine',t:'Cuisine',m:'in'},{id:'portesint',t:'Portes intérieures',m:'in'},
 {id:'appareillage',t:'Prises et interrupteurs',m:'room'},{id:'muchambres',t:'Murs des chambres',m:'room'},{id:'sdb',t:'Salle de bain et WC',m:'room'}
];

var ISO={verre:{n:'Laine de verre soufflée',l:0.041,b:0.62,co:0.23},ouate:{n:'Ouate de cellulose soufflée',l:0.040,b:0.78,co:0.12},bois:{n:'Laine de bois en vrac',l:0.042,b:0.95,co:0.15},rouleau:{n:'Laine minérale en rouleaux',l:0.038,b:0.56,co:0.24}};
  HZ.push({ id: 'garage', t: 'Porte de garage', m: 'out' }, { id: 'terrasse', t: 'Terrasse', m: 'out' });

  var CATS = DATA.cats, BY = {};
  CATS.forEach(function (c) { BY[c.id] = c; });
  function cat(id) { return BY[id] || null; }
  function opt(c, id) { for (var i = 0; i < c.opts.length; i++) if (c.opts[i].id === id) return c.opts[i]; return c.opts[0]; }

  // ── état des choix (même forme que le document phenix_portail/{id}/etat/choix) ──
  function etat(doc) {
    doc = doc || {};
    return { opt: Object.assign({}, doc.opt || {}), conf: Object.assign({}, doc.conf || {}), note: Object.assign({}, doc.note || {}),
      thick: Object.assign({ isol: 400, pw: 83 }, doc.thick || {}), wall: doc.wall || '', roof: doc.roof || '',
      statut: doc.statut || 'brouillon', validatedAt: doc.validatedAt || null };
  }
  function sel(st, c) { return c.bind === 'wall' ? (st.wall || c.ref) : c.bind === 'roof' ? (st.roof || c.ref) : (st.opt[c.id] || c.ref); }
  function setSel(st, c, id) { if (c.bind === 'wall') st.wall = id; else if (c.bind === 'roof') st.roof = id; else st.opt[c.id] = id; }
  function estSel(st, c, id) { return c.multi ? String(sel(st, c)).split('+').indexOf(id) >= 0 : sel(st, c) === id; }
  function basculer(st, c, id) { var cur = String(sel(st, c)).split('+'), k = cur.indexOf(id); if (k >= 0) { if (cur.length > 1) cur.splice(k, 1); } else cur.push(id); setSel(st, c, cur.join('+')); }

  // ── réglages de la fiche (Phénix) ──
  function fcat(fiche, c) { return (fiche && fiche.cats && fiche.cats[c.id]) || { mode: 'libre', opts: [], why: '' }; }
  function permis(fiche, st, c) {
    var f = fcat(fiche, c), ids = c.opts.map(function (o) { return o.id; });
    var a = f.mode === 'libre' ? ids : (f.opts || []).filter(function (i) { return ids.indexOf(i) >= 0; });
    if (!a.length) a = ids;
    // charpente ↔ isolation du toit : fermettes = combles perdus, charpente traditionnelle = sous rampants
    if (c.id === 'isoltoit' && st) { var ch = sel(st, BY.charpente); a = a.filter(function (i) { return ch === 'trad' ? i === 'ramp' : i === 'comb'; }); if (!a.length) a = [ch === 'trad' ? 'ramp' : 'comb']; }
    return a;
  }
  function parPhenix(c) { return !!c.phenix; }
  function impose(fiche, st, c) { var f = fcat(fiche, c); return (f.mode === 'impose' && (f.opts || []).length > 0 && permis(fiche, st, c).length === 1) || (c.id === 'isoltoit'); }
  function pourquoi(fiche, c) { var f = fcat(fiche, c); return f.why || c.pourquoi || (c.id === 'isoltoit' ? 'Découle de votre charpente : fermettes = isolant sur le plafond (combles perdus), charpente traditionnelle = isolant sous les rampants.' : ''); }
  // questions posées au client (sans les choix faits par Phénix, sans le garage si la fiche dit « pas de garage »)
  function questions(fiche) { return CATS.filter(function (c) { if (c.siGarage && fiche && fiche.garage === false) return false; return true; }); }
  function aRepondre(fiche, st) { return questions(fiche).filter(function (c) { return !parPhenix(c) && !impose(fiche, st, c); }); }
  function appliquerFiche(fiche, st) {
    CATS.forEach(function (c) {
      var a = permis(fiche, st, c);
      if (impose(fiche, st, c) || (parPhenix(c) && fcat(fiche, c).opts && fcat(fiche, c).opts.length)) { setSel(st, c, a[0]); st.conf[c.id] = true; }
      else if (!String(sel(st, c)).split('+').every(function (i) { return a.indexOf(i) >= 0; })) { setSel(st, c, a[0]); st.conf[c.id] = false; }
    });
    return st;
  }

  // ── plus-value (en %, jamais en euros pour le client) ──
  var ISO_E = { comb: [300, 350, 400, 450, 500], ramp: [200, 240, 300] };
  function epaisseurs(st) { return ISO_E[sel(st, BY.isoltoit) === 'ramp' ? 'ramp' : 'comb']; }
  function epaisseur(st) { var l = epaisseurs(st), t = st.thick.isol; return l.indexOf(t) >= 0 ? t : (l === ISO_E.ramp ? 300 : 400); }
  function prix(st, c, id) {
    if (c.multi && String(id).indexOf('+') >= 0) return String(id).split('+').reduce(function (s, i) { return s + prix(st, c, i); }, 0);
    var o = opt(c, id);
    if (c.id === 'isolant' && ISO[o.id]) { var e = st ? epaisseur(st) : 400, surf = st && sel(st, BY.isoltoit) === 'ramp' ? RA : AREA; return (2.2 + ISO[o.id].b * e / 10) * surf; }
    if (c.id === 'portesint') { var w = (st && st.thick.pw) || 83; return o.prix * (1 + (w - 83) * 0.004); }
    return o.prix;
  }
  function base(c) { return prix(null, c, c.ref); }
  var BASE = CATS.reduce(function (s, c) { return s + base(c); }, 0);
  function ecart(st, c) { return prix(st, c, sel(st, c)) - base(c); }
  function pct(n, total) { var p = n / (total || BASE) * 100, r = Math.round(Math.abs(p) * 10) / 10; if (r === 0) return null; return (p > 0 ? '+ ' : '− ') + String(r).replace('.', ',') + ' %'; }
  function pctChoix(st, c) { return pct(ecart(st, c)); }
  function pctOption(st, c, id) { return pct(prix(st, c, id) - base(c)); }
  function pctTotal(st) { return pct(CATS.reduce(function (s, c) { return s + ecart(st, c); }, 0)); }
  function libelle(st, c) { var id = sel(st, c); var n = String(id).split('+').map(function (i) { return opt(c, i).n; }).join(' + '); return n + (c.thick ? ' · ' + epaisseur(st) + ' mm' : '') + (c.id === 'portesint' ? ' · ' + ((st.thick.pw) || 83) + ' cm' : ''); }
  function nbConfirmes(fiche, st) { return aRepondre(fiche, st).filter(function (c) { return st.conf[c.id]; }).length; }

  // ── maquette 3D : teintes et états des pastilles (pour PXModel ou la maison type) ──
  function vu(fiche, st, c, enCours) { return !!c && (st.conf[c.id] || impose(fiche, st, c) || parPhenix(c) || enCours === c.id); }
  function look(fiche, st, enCours) {
    var o = {};
    Object.keys(LKZ).forEach(function (id) { var c = BY[id]; if (!vu(fiche, st, c, enCours)) return; var v = LKH[LKZ[id]][sel(st, c)]; if (v != null) o[LKZ[id]] = v; });
    var g = function (id) { var c = BY[id]; return vu(fiche, st, c, enCours) ? sel(st, c) : null; };
    var v;
    if ((v = g('sdb'))) { o.sdb = v; if (LKH.wallSdb[v] != null) o.wallSdb = LKH.wallSdb[v]; }
    o.doorW = ((st.thick && st.thick.pw) || 83) / 100;
    if ((v = g('porte'))) o.doorVit = (v === 'vitree');
    if ((v = g('volets'))) o.shutters = (v === 'none' ? false : v === 'batt' ? 'batt' : v === 'mix' ? 'mix' : true);
    if ((v = g('murs'))) o.wallTex = ({ ossature: 'bardage', banche: 'enduitf', parpaing: 'enduitf', brique: 'enduitf', pierre: 'pierre' })[v] || null;
    if ((v = g('couverture'))) o.roofTex = v;
    if ((v = g('plancher'))) o.plancher = v;
    if ((v = g('charpente'))) o.charp = v;
    var fl = {}; [['solsvie', 'floorV'], ['solcuis', 'floorK'], ['solsch', 'floorB']].forEach(function (p) { var x = g(p[0]); if (x) fl[p[1]] = x; }); if (Object.keys(fl).length) o.floorTex = fl;
    if ((v = g('ventilation'))) o.vmc = v;
    if ((v = g('isoltoit'))) o.iso = v;
    if ((v = g('allee'))) o.alleeTex = v;
    if ((v = g('assain'))) o.assain = v;
    if ((v = g('pluvial'))) o.pluv = String(v).split('+');
    if ((v = g('chauffage'))) o.pac = (v === 'pac' || v === 'air');
    return o;
  }
  function etats(fiche, st) {
    var o = {};
    HZ.forEach(function (z) { var c = BY[z.id]; if (!c) return; var imp = impose(fiche, st, c) || parPhenix(c), done = !!st.conf[c.id];
      o[z.id] = { state: imp ? 'imposed' : done ? 'done' : 'todo', sub: (imp ? 'Décidé par Phénix : ' : done ? 'Votre choix : ' : 'Proposition : ') + libelle(st, c) }; });
    return o;
  }

  // ── document enregistré (sans aucun prix) ──
  function versDoc(fiche, st, extra) {
    var items = questions(fiche).map(function (c) { return { cat: c.id, titre: c.t, option: sel(st, c), libelle: libelle(st, c), confirme: !!st.conf[c.id], pct: pctChoix(st, c) || '', parPhenix: parPhenix(c) || impose(fiche, st, c) }; });
    return Object.assign({ opt: st.opt, conf: st.conf, note: st.note, thick: st.thick, wall: st.wall, roof: st.roof, statut: st.statut, validatedAt: st.validatedAt || null,
      items: items, ecartPct: (function () { var t = CATS.reduce(function (s, c) { return s + ecart(st, c); }, 0); return Math.round(t / BASE * 1000) / 10; })(), updatedAt: new Date().toISOString() }, extra || {});
  }

  global.PhenixCarnet = { DATA: DATA, CATS: CATS, GROUPES: DATA.groupes, METRICS: DATA.metrics, HZ: HZ, LKH: LKH, LKZ: LKZ, ISO: ISO,
    cat: cat, opt: opt, etat: etat, sel: sel, setSel: setSel, estSel: estSel, basculer: basculer,
    fcat: fcat, permis: permis, impose: impose, parPhenix: parPhenix, pourquoi: pourquoi, questions: questions, aRepondre: aRepondre, appliquerFiche: appliquerFiche,
    epaisseurs: epaisseurs, epaisseur: epaisseur, prix: prix, base: base, ecart: ecart, pctChoix: pctChoix, pctOption: pctOption, pctTotal: pctTotal,
    libelle: libelle, nbConfirmes: nbConfirmes, look: look, etats: etats, versDoc: versDoc };
})(typeof window !== 'undefined' ? window : this);
