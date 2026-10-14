// Catalogues de traduction pour le site marketing.
// Volontairement limités au FR et EN pour le lancement.

export type Locale = "fr" | "en";

export const DEFAULT_LOCALE: Locale = "fr";

export const LOCALES: { code: Locale; label: string; flag: string; rtl?: boolean }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

type Catalog = Record<string, string>;

const fr: Catalog = {
  // Nav
  "nav.features": "Fonctionnalités",
  "nav.whatsnew": "Nouveautés",
  "nav.reviews": "Avis",
  "nav.privacy": "Confidentialité",
  "nav.privacyPromise": "Vie privée",
  "nav.faq": "FAQ",
  "nav.legal": "Légal",
  "a11y.skip": "Aller au contenu",
  "consent.label": "Mesure d'audience",
  "consent.text": "Ce site ne pose aucun cookie. Une mesure d'audience anonyme, sans cookie ni identifiant, nous dit seulement quelles pages sont lues. Tu peux la refuser.",
  "consent.more": "En savoir plus",
  "consent.ok": "D'accord",
  "consent.refuse": "Refuser la mesure",
  "footer.consent": "Mesure d'audience : revoir mon choix",
  "hero.video.pause": "Mettre l\'animation en pause",
  "hero.video.play": "Lancer l\'animation",
  "nav.label": "Navigation principale",
  "nav.download": "Télécharger",

  // Hero
  "hero.eyebrow": "NETbudget 2.0 arrive",
  "hero.title": "Sache ce qu'il te reste",
  "hero.title.accent": "vraiment",
  "hero.title.suffix": " chaque mois.",
  "hero.subtitle": "Un budget qui se lit d'un coup d'œil, des repères tirés des statistiques officielles, 282 conseils sourcés, des projets, et des espaces partagés en couple ou en famille. Sans connexion bancaire, sans publicité : ton budget reste sur ton téléphone, et ce qui se synchronise est chiffré avant de partir.",
  "hero.cta.appstore": "Télécharger sur l'App Store",
  "hero.cta.googleplay": "Disponible sur Google Play",
  "hero.cta.learn": "Voir les fonctionnalités",
  "hero.note": "Budget, prêts et convertisseur gratuits, sans compte. Sans publicité. Aucune connexion bancaire.",

  // Links hub (destination unique : App Store + Google Play + compte à rebours)
  "links.eyebrow": "Tous les liens ici",
  "links.title": "Télécharge NETbudget",
  "links.subtitle": "Disponible sur iPhone et Android. Gratuit pour commencer, sans publicité. Un compte seulement pour synchroniser, partager et profiter du Coach.",

  // Le 15 octobre : compte à rebours et indice, sans dire quoi.
  "teaser.eyebrow": "2.0 · 15 novembre",
  "teaser.title": "NETbudget 2.0 arrive.",
  "teaser.subtitle": "Budget partagé en couple ou en famille, Coach avec 282 conseils sourcés, repères officiels, projets guidés. Le 15 novembre sur l'App Store et Google Play.",
  "teaser.video.title": "Le teaser de NETbudget 2.0",
  "teaser.sound.on": "Activer le son",
  "teaser.sound.off": "Couper le son",

  // Spot video (autoplay hero)
  "spot.eyebrow": "Le spot · 22 sec",
  "spot.title": "Vois ce qui change.",
  "spot.subtitle": "22 secondes pour comprendre.",
  "spot.unmute": "Activer le son",
  "spot.mute": "Couper le son",
  "spot.play": "Lecture",
  "spot.pause": "Pause",

  // Stats strip
  "stats.languages": "langues",
  "stats.currencies": "devises",
  "stats.countries": "pays",

  // Screens gallery
  "screens.eyebrow": "La 2.0 en images",
  "screens.title": "Un budget qui se comprend sans mode d'emploi",
  "screens.subtitle": "Captures prises dans l'application, version 2.0. Aucune maquette.",
  "screens.budget": "Reste à vivre",
  "screens.converter": "Convertisseur",

  // Features
  "stats.advice": "conseils sourcés",
  "screens.expenses": "Dépenses",
  "screens.benchmark": "Repères",
  "screens.year": "L'année entière",
  "screens.notifications": "Notifications",
  "highlights.eyebrow": "Nouveautés 2.0",
  "highlights.title": "Ce qui change, concrètement",
  "highlights.subtitle": "Sept choses que tu verras dès la première ouverture.",
  "highlights.1.title": "Un budget qui se lit d'un coup d'œil",
  "highlights.1.text": "Chaque poste a son pictogramme, trouvé depuis son nom dans les huit langues : basketball, Navigo, mutuelle. Une dépense qui ne dure que l'hiver ou l'été se saisit pour ses mois, et le tableau de l'année en tient compte.",
  "highlights.2.title": "Des repères officiels, pas des opinions",
  "highlights.2.text": "Ta part logement, courses ou sorties, face à la moyenne des ménages de ton pays : Eurostat en Europe, BLS aux États-Unis, ONS au Royaume-Uni, Statistique Canada, ABS en Australie. L'année de la donnée et la source sont toujours affichées.",
  "highlights.3.title": "Des notifications qui valent le dérangement",
  "highlights.3.text": "Le point du mois, le conseil de la semaine, un jalon de projet qui approche, un droit que tu n'as pas réclamé. Tu fixes le plafond hebdomadaire ; la plupart des semaines, il en part moins.",
  "highlights.4.title": "Un Coach qui cite ses sources",
  "highlights.4.text": "282 conseils, triés par ton âge, ton foyer, ton logement et ton pays. Chacun cite sa page officielle et sa date de vérification. Un seul arrive chaque lundi comme conseil de la semaine.",
  "highlights.5.title": "Un espace par projet",
  "highlights.5.text": "Un voyage, un mariage, une naissance : trois questions, et le budget est posé avec ses postes, son rétro-planning et ses rappels. Tu mets de côté mois après mois, l'app te dit où tu en es.",
  "highlights.alt.notifications": "Écran verrouillé d'un iPhone avec deux notifications NETbudget : un jalon de projet et le point du mois",
  "highlights.alt.duo": "Deux téléphones côte à côte montrant le même espace partagé, avec le reste à vivre commun et les espaces privés masqués",
  "highlights.alt.family": "Six membres d'une famille reliés au budget du foyer, avec trois espaces : maison, vacances, enfants",
  "feature.projects.title": "Un espace par projet",
  "feature.projects.text": "Mariage, voyage, naissance, fête : un budget guidé, un rétro-planning et un rappel à chaque jalon.",
  "feature.spaces.title": "En couple ou en famille",
  "feature.spaces.text": "Des espaces partagés par invitation, un budget commun, et un espace privé pour chacun.",
  "whatsnew.item7.title": "Impôt prélevé à la source",
  "whatsnew.item7.text": "Le net calculé est celui qui arrive sur ton compte, dans 32 pays, avec le barème officiel en un tap.",
  "whatsnew.item8.title": "Chiffrement de bout en bout",
  "whatsnew.item8.text": "Avec un compte, tes données partent chiffrées. Une phrase de douze mots les rend sur un nouveau téléphone.",
  "screens.coach": "Coach",
  "screens.project": "Projet",
  "screens.goals": "Objectifs",
  "highlights.6.title": "Un budget à deux, sans tout montrer",
  "highlights.6.text": "Un code d'invitation, et le budget commun se voit des deux côtés. Chacun garde son espace privé. Ce qui part sur nos serveurs est chiffré sur le téléphone avant d'y arriver.",
  "highlights.7.title": "Une famille, trois espaces, un foyer",
  "highlights.7.text": "Jusqu'à six personnes, des espaces par usage, les anniversaires et les projets du foyer, chacun avec son budget guidé, son rétro-planning et ses rappels.",
  "nav.v2": "2.0",
  "nav.plans": "Formules",
  "page.v2.title": "NETbudget 2.0 : toutes les nouveautés",
  "page.v2.desc": "Budget épuré, repères officiels, Coach sourcé, projets, espaces partagés, notifications utiles : tout ce qui arrive avec la version 2.0, en images.",
  "v2.eyebrow": "Version 2.0",
  "v2.title": "La plus grande mise à jour depuis le lancement",
  "v2.subtitle": "Tout ce qui change, en images et en huit points. Captures prises dans l'application, aucune maquette.",
  "v2.nav.images": "En images",
  "v2.nav.list": "En huit points",
  "v2.nav.plans": "Formules",
  "v2.nav.download": "Télécharger",
  "world.eyebrow": "Partout dans le monde",
  "world.title": "Un budget qui parle ta langue, dans ton pays",
  "world.subtitle": "Huit langues, quinze devises, et des repères de coût de la vie pour chaque ville de l'app. Fais tourner le globe : chaque point est un pays couvert.",
  "world.cities": "villes",
  "world.hint": "Touche un point pour voir le pays et ses villes.",
  "world.citiesIn": "{n} villes dans l'app",
  "world.alt": "Globe interactif montrant les pays couverts par NETbudget",
  "plans.eyebrow": "Formules",
  "plans.title": "Gratuit pour commencer, une formule quand ton budget grandit",
  "plans.subtitle": "Le budget complet reste gratuit, sans compte. Les formules ajoutent le Coach, les projets, les espaces partagés et la synchronisation chiffrée.",
  "plans.feature": "Ce que tu as",
  "plans.unlimited": "Illimité",
  "plans.yes": "Inclus",
  "plans.no": "Non inclus",
  "plans.tier.free": "Gratuit",
  "plans.tier.free.for": "Sans compte",
  "plans.tier.solo": "Solo",
  "plans.tier.solo.for": "Une personne",
  "plans.tier.duo": "Duo",
  "plans.tier.duo.for": "En couple",
  "plans.tier.family": "Famille",
  "plans.tier.family.for": "Jusqu'à 6 personnes",
  "plans.row.budget": "Budget, prêts, convertisseur, reste à vivre",
  "plans.row.incomes": "Sources de revenus",
  "plans.row.goals": "Objectifs d'épargne",
  "plans.row.loan": "Échéancier de prêt",
  "plans.loan.year": "Année en cours",
  "plans.loan.full": "Complet",
  "plans.row.coach": "Coach : 282 conseils sourcés",
  "plans.row.weekly": "Conseil de la semaine",
  "plans.row.events": "Projets et événements",
  "plans.row.wedding": "Budget mariage",
  "plans.row.spaces": "Espaces partagés",
  "plans.spaces.duo": "1 espace · 2 personnes",
  "plans.spaces.family": "3 espaces · 6 personnes",
  "plans.row.birthdays": "Anniversaires du foyer",
  "plans.row.sync": "Synchronisation chiffrée de bout en bout",
  "plans.note": "Les prix sont affichés dans l'App Store et Google Play, dans ta devise, avec sept jours d'essai gratuit. La personne que tu invites dans un espace ne paie rien. Résiliation à tout moment depuis les réglages de ton téléphone.",
  "plans.cta": "Télécharger l'app",
  "screens.spaces": "Espaces partagés",
  "screens.household": "Ton foyer",
  "world.game.score": "Score",
  "world.game.left": "{n} budgets à défendre",
  "world.game.over": "GAME OVER",
  "world.game.overBody": "Les soucoupes ont pris tous les budgets et la Terre n'y a pas survécu. Il ne reste qu'une chose à faire : laisser un avis sur l'app.",
  "world.game.reviewApple": "Noter sur l'App Store",
  "world.game.reviewGoogle": "Noter sur Google Play",
  "world.game.again": "Rejouer",
  "world.game.quit": "Quitter",
  "world.game.start": "Invasion ! Ton doigt est le viseur : tape sur les soucoupes avant qu'elles ne prennent les points NETbudget.",
  "consent.short": "Mesure d'audience anonyme, sans cookie. ",
  "features.eyebrow": "Pensé pour ta vie",
  "features.title": "Tout ce qui compte, et rien de plus",
  "features.subtitle": "Saisis tes revenus et tes dépenses. NETbudget calcule, compare et conseille.",

  "feature.income.title": "Plusieurs sources de revenus",
  "feature.income.text": "Salaire, freelance, locatif, dividendes, chacun avec son taux de charges. Et l'impôt prélevé à la source dans les 32 pays où l'employeur le retient, avec le barème officiel en un tap.",

  "feature.rule.title": "Un repère 50 / 30 / 20 qui s'adapte",
  "feature.rule.text": "La répartition besoins, loisirs, épargne part de 50/30/20, puis s'ajuste de bout en bout à ton profil : âge, foyer, logement, ville. Le Coach te donne ta propre répartition cible, avec ses pourcentages.",

  "feature.advice.title": "282 conseils sourcés",
  "feature.advice.text": "Chaque conseil cite sa source officielle et dépend de ton pays, de ton âge, de ta famille et de ton logement. Taux d'épargne réglementée et inflation sont relus depuis les séries officielles.",

  "feature.world.title": "Partout dans le monde",
  "feature.world.text": "499 villes dans 59 pays, avec l'écart de coût de la vie de ta ville face à la moyenne de ton pays.",

  "feature.currency.title": "Convertisseur de devises",
  "feature.currency.text": "15 devises avec des taux à jour et l'historique de tes conversions.",


  "feature.pdf.title": "Export PDF propre",
  "feature.pdf.text": "Revenus, dépenses par poste et par période, tableau de l'année et conseils, dans la langue de ton choix.",

  "feature.privacy.title": "Chiffré, sans connexion bancaire",
  "feature.privacy.text": "Aucune connexion à ta banque, jamais. Le budget vit sur ton téléphone ; ce qui se synchronise est chiffré avant de partir, avec une clé que toi seul possèdes.",


  // What's new
  "whatsnew.eyebrow": "Version 2.0",
  "whatsnew.title": "La plus grande mise à jour depuis le lancement",
  "whatsnew.subtitle": "Tout ce qui arrive avec la 2.0, en huit points.",
  "whatsnew.item1.title": "Un budget épuré",
  "whatsnew.item1.text": "Une ligne par famille au départ, des pictogrammes, des dépenses par période. L'essentiel d'abord.",
  "whatsnew.item2.title": "Repères face aux moyennes nationales",
  "whatsnew.item2.text": "Sources officielles : Eurostat, BLS, ONS, Statistique Canada, ABS. Trois repères en gratuit, tous avec une formule.",
  "whatsnew.item3.title": "Conseil de la semaine",
  "whatsnew.item3.text": "Un seul conseil chaque lundi, choisi pour ta situation, avec sa source.",
  "whatsnew.item4.title": "Espaces partagés",
  "whatsnew.item4.text": "Couple, famille, colocation, association : un budget commun par invitation, un espace privé pour chacun.",
  "whatsnew.item5.title": "Projets et événements",
  "whatsnew.item5.text": "Mariage, voyage, naissance : budget guidé, rétro-planning, rappels aux jalons.",
  "whatsnew.item6.title": "Notifications utiles",
  "whatsnew.item6.text": "Point du mois, droits non réclamés, jalons, prêts remboursés. Avec un plafond hebdomadaire que tu choisis.",

  // Reviews
  "reviews.eyebrow": "Ils utilisent NETbudget",
  "reviews.title": "Ce qu'en pensent les utilisateurs",
  "reviews.subtitle": "Avis publics récupérés directement depuis l'App Store et Google Play, mis à jour à chaque build du site.",

  // Privacy
  "privacy.eyebrow": "Vie privée par défaut",
  "privacy.title": "Tes données t'appartiennent, avec ou sans compte",
  "privacy.text": "Sans compte, tout reste sur ton téléphone : la seule connexion sert aux taux de change. Avec un compte, ce qui se synchronise est chiffré sur ton téléphone avant de partir, avec une clé que nous n'avons pas. Jamais de connexion bancaire, jamais de publicité, jamais de traceur.",
  "privacy.point1": "Sans compte : rien ne part de ton téléphone",
  "privacy.point2": "Avec un compte : chiffré de bout en bout",
  "privacy.point3": "Aucune connexion bancaire, aucune publicité",
  "privacy.point4": "Code source consultable sur demande",

  // Final CTA
  "cta.title": "Prêt à reprendre la main sur ton argent ?",
  "cta.subtitle": "Télécharge NETbudget et compte ton reste à vivre en moins de 5 minutes.",
  "cta.button": "Télécharger sur l'App Store",
  "cta.button.android": "Télécharger sur Google Play",

  // Scripture
  "scripture.verse":
    "« Garde-toi de dire en ton cœur : ma force et la puissance de ma main m'ont acquis ces richesses. Souviens-toi de l'Éternel, ton Dieu, car c'est lui qui te donnera de la force pour les acquérir, afin de confirmer, comme il le fait aujourd'hui, son alliance qu'il a jurée à tes pères. »",
  "scripture.ref": "Deutéronome 8 : 17-18",

  // Maker
  "maker.eyebrow": "Derrière l'application",
  "maker.name": "Stéphane Pizeuil",
  "maker.role": "Créateur indépendant · Ingénieur logiciel",
  "maker.bio":
    "J'ai conçu, codé et lancé NETbudget en solo. L'objectif : un outil de budget personnel simple, honnête, qui respecte ta vie privée et fonctionne partout dans le monde. Pas de modèle économique caché — pas de pub, pas de vente de données, pas d'abonnement.",
  "maker.stat1": "Solo maker",
  "maker.stat2": "Sur l'App Store",
  "maker.stat3": "100 % indépendant",
  "maker.linkedin": "Voir mon LinkedIn",
  "maker.email": "M'écrire",

  // Footer
  "footer.tagline": "Reste à vivre, repère 50/30/20 adapté à ton profil, conseils sourcés.",
  "footer.madeby": "Conçu et développé par",
  "footer.links": "Liens",
  "footer.follow": "Suivre",
  "footer.hint": "15.10 — tu comprendras.",
  "footer.privacy": "Politique de confidentialité",
  "footer.terms": "Conditions d'utilisation",
  "footer.thanks": "Merci",
  "footer.contact": "Contact",
  "footer.copyright": "© 2026 NETbudget. Tous droits réservés.",
  "footer.lang": "Langue",
  "footer.appstore": "App Store",
  "footer.googleplay": "Google Play",

  // Privacy page
  // --- Accessibilité ---------------------------------------------------
  "a11y.skipToContent": "Aller au contenu",

  // --- Fil d'Ariane ----------------------------------------------------
  "breadcrumb.home": "Accueil",
  "breadcrumb.label": "Vous êtes ici",

  // --- Barre d'action mobile -------------------------------------------
  "sticky.title": "Sache ce qu'il te reste vraiment",
  "sticky.sub": "Gratuit, sans publicité",
  "sticky.cta": "Télécharger",

  // --- Titres et descriptions de pages ---------------------------------
  "page.faq.title": "Questions fréquentes",
  "page.faq.desc": "Combien ça coûte, où vont tes données, dans quels pays ça marche : les réponses aux questions qu'on nous pose vraiment.",
  "page.privacy.desc": "Ce que NETbudget fait de tes données, précisément. Sans compte, rien ne quitte ton téléphone ; avec un compte, tu choisis ce que tu enregistres.",
  "page.terms.desc": "Les conditions d'utilisation de NETbudget : ce que l'application fait, ce qu'elle ne promet pas, et tes droits.",

  // --- Page 404 --------------------------------------------------------
  // Page « Merci » : une lettre, pas un accusé de réception.
  "page.thanks.title": "Merci",
  "page.thanks.desc": "À celles et ceux qui installent, notent, écrivent et testent NETbudget : ce que vous avez changé, et pourquoi ça compte.",
  "thanks.eyebrow": "Une lettre, pas une page",
  "thanks.title": "Merci. Vraiment,",
  "thanks.title.accent": "à chacun·e.",
  "thanks.lead": "NETbudget est fait par une seule personne, le soir et le week-end. Ce qui le fait tenir, ce n'est pas un budget marketing. C'est vous.",
  // Avant tout : Dieu, puis les personnes qui portent Stéphane spirituellement.
  // Les noms et les titres sont ceux qu'il a donnés, tels quels.
  "thanks.first.eyebrow": "Avant tout",
  "thanks.first.title": "À Dieu, en premier.",
  "thanks.first.body": "C'est Lui qui m'aide chaque jour, dans ce projet comme dans tout le reste. Rien de ce qui est ici n'existerait sans Lui. Ce merci-là passe avant tous les autres, et il est sincère.",
  "thanks.first.people": "Et à celles et ceux qui me portent, m'enseignent et prient pour moi :",
  "thanks.first.p1.name": "Pasteur Samuel Eboumbou",
  "thanks.first.p1.role": "berger de l'église des Jeunes Prodiges",
  "thanks.first.p2.name": "L'apôtre Yvan Castanou",
  "thanks.first.p2.role": "",
  "thanks.first.p3.name": "L'apôtre Yves",
  "thanks.first.p3.role": "",
  "thanks.first.p4.name": "Docteure Mode",
  "thanks.first.p4.role": "",
  "thanks.first.p5.name": "Pasteure Habi",
  "thanks.first.p5.role": "",
  "thanks.first.close": "Pour votre enseignement, vos prières et votre présence. Merci, du fond du cœur.",

  "thanks.letter.p1": "Quand j'ai publié la première version, je pensais que personne ne l'installerait. Une app de budget de plus, faite par un inconnu, sans compte, sans connexion bancaire, sans publicité. Rien pour attirer l'œil.",
  "thanks.letter.p2": "Puis des gens l'ont installée. Certains ont laissé une note. D'autres ont écrit, parfois pour dire merci, souvent pour signaler ce qui n'allait pas, et c'est ce second cas qui a le plus de valeur. Un retour honnête sur un bouton caché ou un calcul faux vaut plus que dix compliments.",
  "thanks.letter.p3": "Je réponds à chaque message moi-même. Je lis chaque avis. Je n'ai pas toujours le temps de tout corriger vite, mais rien n'est ignoré : chaque retour finit dans une liste, et cette liste dicte ce que je construis ensuite.",
  "thanks.letter.p4": "Vous ne me devez rien. Vous avez déjà donné le plus rare : du temps, et de la confiance. Merci de l'avoir accordée à une petite app qui vous promettait de garder vos chiffres pour vous.",
  "thanks.letter.sign": "Stéphane",
  "thanks.who.title": "À qui ce merci s'adresse",
  "thanks.who.installed.title": "À celles et ceux qui ont installé l'application",
  "thanks.who.installed.body": "Installer une app inconnue, saisir ses revenus dedans, c'est un acte de confiance. Vous l'avez fait sans compte à créer, sans garantie, sans marque derrière.",
  "thanks.who.rated.title": "À celles et ceux qui ont laissé une note",
  "thanks.who.rated.title.count": "Aux {n} personnes qui ont noté l'application sur l'App Store",
  "thanks.who.rated.body": "Une note prend trente secondes et pèse plus que n'importe quelle publicité. Chacune d'elles aide quelqu'un d'autre à se décider.",
  "thanks.who.wrote.title": "À celles et ceux qui ont écrit",
  "thanks.who.wrote.body": "Pour signaler un bug, proposer une idée, demander une fonctionnalité ou simplement dire que ça les a aidés. Chaque message reçoit une réponse d'une personne, pas d'un robot.",
  "thanks.who.tested.title": "Aux testeuses et testeurs de la session fermée",
  "thanks.who.tested.body": "Vous essayez des versions qui ne sont pas finies, sur vos téléphones, avec vos vrais budgets. Vous trouvez ce que je ne vois plus. C'est le travail le plus ingrat, et le plus utile.",
  "thanks.who.close.title": "Aux proches qui supportent un projet du soir",
  "thanks.who.close.body": "Les heures passées sur l'application sont des heures prises ailleurs. Ce projet leur doit sa patience.",
  "thanks.who.source": "Nombre lu sur l'App Store au moment de la mise à jour du site. Aucun chiffre n'est écrit à la main.",
  "thanks.changed.title": "Ce que vos retours ont changé",
  "thanks.changed.lead": "Trois exemples récents, parmi d'autres. Chacun est parti d'un message ou d'un test, et chacun a fini dans le code.",
  "thanks.changed.from": "Le retour",
  "thanks.changed.to": "Ce que ça a donné",
  "thanks.changed.android.from": "« Sur Android, le bouton Enregistrer est caché sous la barre de navigation. »",
  "thanks.changed.android.to": "Toutes les fenêtres de saisie tiennent compte de la barre système et du clavier, sur chaque version d'Android. Corrigé dans la prochaine version.",
  "thanks.changed.percent.from": "« Le pourcentage de réduction affiché ne correspond pas au vrai calcul. »",
  "thanks.changed.percent.to": "Le pourcentage est désormais calculé à partir des prix réels, arrondi vers le bas, jamais gonflé. Corrigé dans la prochaine version.",
  "thanks.changed.tour.from": "« Le tutoriel se bloque, le bouton Suivant ne répond plus. »",
  "thanks.changed.tour.to": "Le tutoriel a été réécrit pour fonctionner à l'identique sur iPhone et Android. Corrigé dans la prochaine version.",
  "thanks.next.title": "Si tu veux aider encore",
  "thanks.next.lead": "Aucune obligation. Mais si tu as trente secondes, voici les trois gestes qui comptent le plus pour une app indépendante.",
  "thanks.next.rate": "Noter sur l'App Store",
  "thanks.next.ratePlay": "Noter sur Google Play",
  "thanks.next.write": "M'écrire",
  "thanks.next.note": "Et si l'application ne te convient pas, dis-le-moi aussi. C'est comme ça qu'elle s'améliore.",

  // Page de retour des e-mails (confirmation d'adresse, mot de passe, lien magique)
  "confirm.title": "Retour dans l'application",
  "confirm.desc": "Ton lien a été vérifié. Il ne reste qu'à rouvrir NETbudget.",
  "confirm.signup.eyebrow": "Adresse confirmée",
  "confirm.signup.title": "C'est bon, bienvenue !",
  "confirm.signup.body": "Ton adresse est vérifiée et ton compte est prêt. Rouvre NETbudget pour continuer là où tu t'étais arrêté·e.",
  "confirm.recovery.eyebrow": "Mot de passe",
  "confirm.recovery.title": "Choisis ton nouveau mot de passe",
  "confirm.recovery.body": "Le lien est valide. Ouvre NETbudget : l'écran de nouveau mot de passe t'attend.",
  "confirm.magiclink.eyebrow": "Connexion",
  "confirm.magiclink.title": "Te voilà connecté·e",
  "confirm.magiclink.body": "Rouvre NETbudget pour retrouver ton budget.",
  "confirm.email_change.eyebrow": "Nouvelle adresse",
  "confirm.email_change.title": "Adresse mise à jour",
  "confirm.email_change.body": "Ton compte utilise désormais ta nouvelle adresse. Rouvre NETbudget.",
  "confirm.error.eyebrow": "Lien expiré",
  "confirm.error.title": "Ce lien ne fonctionne plus",
  "confirm.error.body": "Il a déjà servi, ou il a expiré. Retourne dans NETbudget et redemande un lien : ça prend dix secondes.",
  "confirm.open": "Ouvrir NETbudget",
  "confirm.fallback": "L'app ne s'ouvre pas ? Ouvre NETbudget sur ton téléphone et connecte-toi avec ton mot de passe.",
  "confirm.otherDevice": "Tu lis ce message sur un autre appareil que ton téléphone ? Aucun souci : ton adresse est confirmée, il te suffit de te connecter dans l'app.",
  "confirm.noApp": "Pas encore l'application ?",
  // Page d'invitation à un espace partagé (lien envoyé par message)
  "join.title": "Invitation à un espace partagé",
  "join.desc": "Quelqu'un t'invite à gérer un budget avec lui sur NETbudget.",
  "join.eyebrow": "Invitation",
  "join.h1": "On t'invite à rejoindre un espace 💚",
  "join.body": "Un budget partagé sur NETbudget : chacun voit les mêmes chiffres, chiffrés de bout en bout. Ouvre l'app pour accepter.",
  "join.open": "Ouvrir NETbudget et rejoindre",
  "join.code": "Ton code d'invitation",
  "join.copy": "Copier le code",
  "join.copied": "Copié",
  "join.noApp": "Pas encore l'application ?",
  "join.noApp.body": "Installe NETbudget, puis colle le code dans Espaces, « Rejoindre via un code ».",
  "join.expiry": "Le code est valable 14 jours et ne sert qu'une fois.",
  "join.missing.h1": "Ce lien est incomplet",
  "join.missing.body": "Il manque le code d'invitation. Demande à la personne de renvoyer l'invitation depuis l'app.",
  "nf.title": "Cette page n'existe pas",
  "nf.desc": "Le lien est peut-être ancien, ou l'adresse comporte une faute. Rien n'est cassé de ton côté.",
  "nf.home": "Retour à l'accueil",
  "nf.faq": "Questions fréquentes",
  "nf.game.eyebrow": "Puisque tu es là",
  "nf.game.title": "Reste à vivre",
  "nf.game.hint": "Attrape les rentrées d'argent, évite les dépenses. Doigt, souris ou flèches.",
  "nf.game.score": "Reste à vivre",
  "nf.game.best": "Record",
  "nf.game.start": "Trois vies. Chaque rentrée attrapée d'affilée augmente le multiplicateur. Une dépense attrapée coûte une vie.",
  "nf.game.play": "Jouer",
  "nf.game.again": "Rejouer",
  "nf.game.resume": "Reprendre",
  "nf.game.paused": "En pause",
  "nf.game.over": "Fin de mois",
  "nf.game.newBest": "Nouveau record",
  "nf.game.games": "parties",
  "nf.game.legend.income": "Rentrée : à attraper",
  "nf.game.legend.expense": "Dépense : à éviter",
  "nf.game.legend.bonus": "Prime : rare, rend une vie",
  "nf.game.rank.0": "Premier salaire",
  "nf.game.rank.1": "Fourmi",
  "nf.game.rank.2": "Économe",
  "nf.game.rank.3": "Stratège",
  "nf.game.rank.4": "Légende du reste à vivre",
  "nf.game.a11y": "Jeu : attraper les rentrées d'argent avec le porte-monnaie et éviter les dépenses.",
  "nf.game.footnote": "Le score reste sur ton appareil. Évidemment.",

  // --- FAQ -------------------------------------------------------------
  "faq.eyebrow": "Questions fréquentes",
  "faq.title": "Ce qu'on nous demande le plus",
  "faq.intro": "Des réponses courtes et franches, y compris quand la réponse ne nous arrange pas.",
  "faq.seeAll": "Voir toutes les questions",

  "faq.free.q": "C'est vraiment gratuit ?",
  "faq.free.a": "Oui. Le budget complet, revenus, dépenses, prêts, reste à vivre, repère 50/30/20 et convertisseur, est gratuit et sans limite de temps. Un abonnement facultatif ajoute la synchronisation entre appareils, le Coach et ses conseils adaptés à ton profil, les projets et les budgets partagés. Aucune publicité, à aucun moment.",
  "faq.account.q": "Faut-il créer un compte ?",
  "faq.account.a": "Non pour le budget, les prêts et le convertisseur : tu peux t'en servir sans jamais donner d'adresse e-mail. Le compte sert à retrouver tes données sur un autre appareil, à partager un budget en couple ou en famille, et à ouvrir les projets et le Coach de la 2.0. Avec un compte, tes données partent chiffrées de bout en bout.",
  "faq.data.q": "Où sont stockées mes données financières ?",
  "faq.data.a": "Sans compte, uniquement dans la mémoire de ton téléphone : rien n'est envoyé. Avec un compte, ce que tu choisis d'enregistrer est synchronisé, et chiffré de bout en bout par défaut : la clé reste sur ton téléphone, nous ne pouvons pas lire tes données. Douze mots, consultables depuis ton profil, permettent de retrouver cet accès sur un autre appareil.",
  "faq.offline.q": "Est-ce que ça marche sans internet ?",
  "faq.offline.a": "Entièrement, sauf deux choses : les taux de change du convertisseur, qui ont besoin d'être récupérés une fois puis restent en cache, et la synchronisation si tu as un compte. Le calcul de ton budget, lui, ne dépend d'aucun serveur.",
  "faq.countries.q": "Ça fonctionne dans mon pays ?",
  "faq.countries.a": "Le budget et le convertisseur fonctionnent partout, dans huit langues et avec les principales devises. Les conseils, eux, dépendent de la législation : la France est couverte en profondeur, la Belgique, la Suisse, le Luxembourg, le Canada, l'Espagne, le Portugal, l'Italie, l'Allemagne, le Royaume-Uni et plusieurs pays d'Afrique le sont partiellement.",
  "faq.bank.q": "Pourquoi ne pas connecter mon compte bancaire ?",
  "faq.bank.a": "Parce que ce serait contradictoire. Connecter une banque implique de faire transiter l'historique de tes transactions par un intermédiaire, et donc d'abandonner exactement ce qui fait l'intérêt de l'app. L'import d'un relevé au format CSV est prévu : même gain de temps, sans donner d'accès permanent.",
  "faq.shared.q": "Peut-on gérer un budget à deux ?",
  "faq.shared.a": "Oui, avec un espace partagé : chaque membre voit le budget commun, les objectifs et les événements, tout en gardant son espace personnel invisible aux autres. L'invitation se fait par un code à usage unique, sans avoir à donner l'adresse e-mail de l'autre personne.",
  "faq.advice.q": "D'où viennent les conseils ?",
  "faq.advice.a": "De sources officielles uniquement — administrations, textes de loi, organismes publics — et chaque conseil affiche ses références et sa date de vérification. Aucun chiffre n'est estimé au jugé. Quand une information n'est pas confirmable, elle est signalée comme telle plutôt que présentée comme sûre.",
  "faq.android.q": "Et sur Android ?",
  "faq.android.a": "L'application est disponible sur l'App Store et sur Google Play, avec les mêmes fonctions et les mêmes versions des deux côtés.",
  "faq.cancel.q": "Comment résilier l'abonnement ?",
  "faq.cancel.a": "Depuis les réglages de ton téléphone, dans la gestion des abonnements — nous n'avons pas la main dessus, et c'est mieux ainsi : personne ne peut te retenir. La résiliation prend effet à la fin de la période déjà payée, et tes données restent accessibles en version gratuite.",

  "page.privacy.title": "Politique de confidentialité",
  "page.privacy.intro":
    "Cette page décrit exactement ce que NETbudget fait de tes données. Elle distingue deux usages très différents : l'application sans compte, où rien ne quitte ton téléphone, et l'abonnement, où certaines données sont synchronisées pour te suivre d'un appareil à l'autre et pour partager un budget. Nous préférons être précis que rassurants.",

  "page.privacy.section1.title": "Sans compte : rien ne quitte ton téléphone",
  "page.privacy.section1.body":
    "Le budget, les revenus, les dépenses, les prêts, la devise, la langue et la ville choisie sont enregistrés dans le stockage local de ton appareil. Aucun compte n'est nécessaire, et dans cet usage aucune de ces informations n'est transmise à un serveur. Les notifications sont programmées par ton téléphone lui-même : aucun jeton de notification n'est créé, donc rien ne transite par un service d'envoi tiers.",

  "page.privacy.section2.title": "Avec un compte : ce qui est synchronisé",
  "page.privacy.section2.body":
    "Créer un compte est facultatif et sert à retrouver tes données sur plusieurs appareils, à partager un budget et à recevoir des conseils adaptés à ta situation. Sont alors enregistrés sur nos serveurs : ton adresse e-mail (ou l'identifiant fourni par Apple ou Google), ton pseudo, éventuellement tes prénom et nom, ta date de naissance, ton pays, ta région et ta ville, ta situation professionnelle, ta photo de profil si tu en ajoutes une, la date de ton acceptation de cette politique, ainsi que tes objectifs d'épargne, tes budgets d'événement, ton historique mensuel et le profil qui sert à personnaliser les conseils — âge, situation familiale, logement, tranche d'imposition, présence d'enfants ou d'animaux. Tu choisis ce que tu renseignes : les champs laissés vides ne sont pas déduits.",

  "page.privacy.section3.title": "Chiffrement de bout en bout",
  "page.privacy.section3.body":
    "Il est actif par défaut, dès la création du compte, et ne se désactive pas. Une clé est créée sur ton téléphone et ne le quitte jamais : tes données partent chiffrées, nous ne pouvons pas les lire, et nous ne pouvons pas les remettre à qui nous les demanderait. Tu n'as rien à configurer. L'activation a lieu à la première connexion ; dans le cas rare où elle échoue faute de réseau, l'application réessaie au lancement suivant, et ce qui aurait été synchronisé entre-temps n'est pas encore protégé. Douze mots, consultables à tout moment depuis ton profil, permettent de retrouver cet accès sur un autre appareil ; nous ne les connaissons pas. En conséquence, changer de téléphone sans les avoir conservés rend les données synchronisées inaccessibles — ton budget reste intact sur l'appareil d'origine. C'est la contrepartie inévitable d'un chiffrement que nous ne pouvons pas contourner, et nous préférons l'écrire plutôt que de le laisser découvrir. Dans un espace partagé, l'espace possède sa propre clé, dont chaque membre garde une copie chiffrée avec la sienne. Les échanges avec nos serveurs sont chiffrés en transit, et ton jeton de session est conservé dans le trousseau sécurisé du système.",

  "page.privacy.section4.title": "Budgets partagés",
  "page.privacy.section4.body":
    "Si tu crées un espace partagé ou rejoins celui de quelqu'un, les membres de cet espace voient le budget, les objectifs et les événements qui y vivent, ainsi que ton pseudo et ta photo de profil. Ils ne voient jamais ton espace personnel. Une invitation est un code à usage unique valable quatorze jours ; aucune adresse e-mail n'est requise pour inviter quelqu'un. Quitter un espace cesse immédiatement ton accès à son contenu.",

  "page.privacy.section5.title": "Connexions réseau",
  "page.privacy.section5.body":
    "Sans compte, l'application contacte trois services, sans jamais transmettre d'identifiant : open.er-api.com pour les taux de change, avec un cache local, itunes.apple.com pour savoir si une mise à jour est disponible, et notre propre serveur, au plus une fois par semaine, pour rafraîchir les taux d'inflation affichés dans les conseils. Cette dernière requête mérite une précision, parce que c'est celle qui pourrait trahir ta position : elle ne porte aucun paramètre et reçoit la table des dix-sept pays couverts, rigoureusement la même pour tout le monde. Nous ne demandons donc jamais « l'inflation de la France » à un institut de statistiques, ce qui reviendrait à lui indiquer où tu vis ; le tri se fait sur ton appareil. Sans réseau, l'application utilise la table embarquée à sa compilation. Avec un compte, elle communique avec Supabase, qui héberge la base de données, l'authentification et le stockage des photos. Si tu choisis Apple ou Google pour te connecter, ce fournisseur est sollicité au moment de la connexion. Si tu prends un abonnement, l'application interroge RevenueCat pour savoir ce que ton compte a le droit d'ouvrir. Les nombreux liens vers les sites officiels cités dans les conseils ne sont ouverts que si tu les touches, et dans ton navigateur.",

  "page.privacy.section6.title": "Sous-traitants",
  "page.privacy.section6.body":
    "Supabase héberge les données de compte. Apple et Google interviennent si tu utilises leur méthode de connexion, et pour la vente et l'encaissement des abonnements. RevenueCat, qui gère les abonnements pour notre compte, reçoit un identifiant de compte et les informations d'achat transmises par la boutique — jamais tes données budgétaires, qu'il ne pourrait pas lire, et jamais tes coordonnées bancaires, que nous ne voyons pas davantage. open.er-api.com fournit les taux de change. Aucun autre tiers ne reçoit tes données : dans l'application, il n'y a ni publicité, ni mesure d'audience, ni traceur, ni revente. Le site netbudget.app est hébergé par Vercel, qui en mesure la fréquentation de façon agrégée — pages vues, pays, type d'appareil — sans cookie ni identifiant permanent, et sans aucun lien avec un compte de l'application. Tu peux refuser cette mesure depuis l'encart qui s'affiche à la première visite, ou à tout moment depuis le pied de page ; le signal Global Privacy Control de ton navigateur est respecté. Nous ne vendons pas de données, et ce n'est pas notre modèle économique — l'application se finance par l'abonnement.",

  "page.privacy.section7.title": "Permissions demandées",
  "page.privacy.section7.body":
    "Les notifications, pour les rappels que tu choisis d'activer, et que tu peux désactiver catégorie par catégorie. L'accès aux images, uniquement au moment où tu ajoutes une photo de profil ; nous ne parcourons jamais ta galerie. Le retour vibrant. L'appareil photo, le microphone et la géolocalisation sont explicitement bloqués : l'application ne peut pas y accéder, même par erreur.",

  "page.privacy.section8.title": "Durée de conservation",
  "page.privacy.section8.body":
    "Les données locales restent sur ton appareil jusqu'à ce que tu les effaces ou désinstalles l'application. Les données de compte sont conservées tant que le compte existe. La suppression du compte les efface immédiatement et définitivement, sans période de rétention de notre côté. L'historique de budget est limité aux vingt-quatre derniers mois.",

  "page.privacy.section9.title": "Tes droits",
  "page.privacy.section9.body":
    "Le règlement général sur la protection des données te donne le droit d'accéder à tes données, de les corriger, de les effacer, de t'opposer à leur traitement et d'en obtenir une copie. La suppression est directement accessible depuis les réglages de l'application, bouton « Supprimer mon compte » : elle est immédiate et irréversible. Pour toute autre demande, écris-nous et nous répondrons sous trente jours. Tu peux aussi saisir la CNIL si notre réponse ne te satisfait pas.",

  "page.privacy.section10.title": "Mineurs",
  "page.privacy.section10.body":
    "L'application peut être utilisée sans compte à tout âge. La création d'un compte est réservée aux personnes de quinze ans ou plus, âge du consentement numérique en France. Nous ne cherchons pas à collecter de données concernant des enfants ; si un compte a été créé pour un mineur plus jeune, écris-nous et nous le supprimerons.",

  "page.privacy.section11.title": "Programme de test",
  "page.privacy.section11.body":
    "Une session de test fermée précède la mise en vente. Les personnes qui y participent sont invitées nominativement, approuvent un contrat d'essai depuis l'application, et nous transmettent à cette occasion le nom qu'elles y inscrivent, la date de leur accord et la formule qui leur est attribuée. Ces éléments servent uniquement à prouver que l'accord a été donné et à ouvrir le bon périmètre de test. Ils sont supprimés à la fin de la session, en même temps que les accès de test, et ne servent à aucune fin commerciale. Refuser le contrat retire le statut de testeur, sans autre conséquence.",

  "page.privacy.section12.title": "Modifications et contact",
  "page.privacy.section12.body":
    "Toute évolution de cette politique sera publiée ici, avec sa date. Un changement qui élargirait l'usage de tes données te sera signalé dans l'application avant d'entrer en vigueur. Pour toute question : contact@netbudget.app.",


  "page.privacy.updated": "Dernière mise à jour",

  // Terms page
  "page.terms.title": "Conditions d'utilisation",
  "page.terms.intro":
    "Ce texte décrit ce que NETbudget fait, ce qu'il ne promet pas, et ce à quoi tu t'engages en l'utilisant. Il est écrit pour être lu, pas pour se protéger derrière du jargon.",

  "page.terms.section1.title": "Ce qu'est NETbudget",
  "page.terms.section1.body": "Un outil d'estimation budgétaire personnel. Il calcule ton reste à vivre, applique un repère 50/30/20 adapté à ton profil et rassemble des informations issues de sources publiques. Ce n'est ni une banque, ni un établissement de paiement, ni un conseiller en investissement : NETbudget ne détient pas d'argent, n'exécute aucune opération et ne gère aucun placement.",

  "page.terms.section2.title": "Ce que valent les chiffres affichés",
  "page.terms.section2.body":
    "Des estimations, jamais des engagements. Les taux de charges, les indices de coût de la vie, les prix de billets d'avion ou les barèmes d'aides proviennent de sources publiques citées dans l'application, avec leur date de vérification. Une législation change, un barème est revalorisé, un devis réel diffère d'une estimation. Ton bulletin de paie, ton avis d'imposition et les décisions de ton administration font foi, pas l'application.",

  "page.terms.section3.title": "Ce que tu ne dois pas en attendre",
  "page.terms.section3.body":
    "Un conseil professionnel. Les informations affichées ne remplacent ni un conseiller financier, ni un expert-comptable, ni un notaire, ni un travailleur social. Les décisions que tu prends après avoir lu l'application restent les tiennes, et l'éditeur ne peut en être tenu responsable. Pour un engagement important — crédit immobilier, placement, succession — fais vérifier par un professionnel.",

  "page.terms.section4.title": "Ton compte",
  "page.terms.section4.body":
    "Le compte est facultatif : l'application fonctionne sans. Si tu en crées un, tu es responsable de la confidentialité de ton mot de passe et des activités menées depuis ton compte. Il est réservé aux personnes de quinze ans ou plus. Nous pouvons suspendre un compte utilisé pour nuire à autrui, contourner la facturation ou attaquer le service — jamais pour un usage normal, même intensif.",

  "page.terms.section5.title": "Chiffrement et douze mots",
  "page.terms.section5.body":
    "Les données que tu synchronises sont chiffrées de bout en bout par défaut, sans réglage à activer : une clé est créée sur ton téléphone et n'en sort jamais. Douze mots, consultables à tout moment depuis ton profil, permettent de retrouver cet accès sur un autre appareil. Nous ne les connaissons pas et ne pouvons pas les régénérer. La conséquence doit être comprise, et elle est le prix de la garantie : si tu changes d'appareil sans avoir conservé ces douze mots, personne ne peut déchiffrer tes données synchronisées, nous y compris, et elles deviennent définitivement illisibles. Ton budget reste alors intact sur l'appareil d'origine. Il n'existe aucune procédure de récupération, aucun recours par le support, aucune copie de secours de notre côté. L'éditeur ne peut être tenu responsable d'une perte de données résultant de douze mots égarés.",

  "page.terms.section6.title": "Abonnement et paliers",
  "page.terms.section6.body":
    "L'application est utilisable gratuitement et sans limite de temps : budget, prêts, reste à vivre, repère 50/30/20 et convertisseur. Un abonnement facultatif ouvre la synchronisation entre appareils, les conseils personnalisés et les budgets d'événement. La formule Solo suit jusqu'à six événements en parallèle et n'inclut pas le budget mariage, qui se prépare à plusieurs et appartient aux formules Duo et Famille. Les limites exactes de chaque formule sont indiquées dans l'application avant tout paiement.",

  "page.terms.section7.title": "Paiement, renouvellement, résiliation",
  "page.terms.section7.body":
    "Les abonnements sont vendus et encaissés par l'App Store d'Apple ou le Play Store de Google, jamais par nous — nous ne voyons donc aucune donnée bancaire. Lorsqu'une période d'essai gratuite est proposée, elle se transforme en abonnement payant à son terme si elle n'a pas été résiliée avant : la boutique t'en informe, et la date figure dans la gestion de tes abonnements. Les abonnements se renouvellent ensuite automatiquement à chaque échéance, sauf résiliation au moins vingt-quatre heures avant. La résiliation se fait depuis les réglages de ton téléphone, dans la gestion des abonnements : nous n'avons pas la main dessus, et c'est mieux ainsi. L'application peut afficher un écran te demandant la raison de ton départ et te proposant une réponse — une formule moins chère, une aide. Cet écran est facultatif de bout en bout : le lien vers la boutique y est visible dès son ouverture, aucune réponse n'est exigée, et rien ne peut retarder ta résiliation. Elle prend effet à la fin de la période déjà payée, sans frais, et tes données restent accessibles en version gratuite.",

  "page.terms.section8.title": "Remboursement et droit de rétractation",
  "page.terms.section8.body":
    "Les abonnements sont vendus et encaissés par l'App Store d'Apple ou le Play Store de Google, jamais par nous — nous ne voyons donc aucune donnée bancaire. Lorsqu'une période d'essai gratuite est proposée, elle se transforme en abonnement payant à son terme si elle n'a pas été résiliée avant : la boutique t'en informe, et la date figure dans la gestion de tes abonnements. Les abonnements se renouvellent ensuite automatiquement à chaque échéance, sauf résiliation au moins vingt-quatre heures avant. La résiliation se fait depuis les réglages de ton téléphone, dans la gestion des abonnements : nous n'avons pas la main dessus, et c'est mieux ainsi. L'application peut afficher un écran te demandant la raison de ton départ et te proposant une réponse — une formule moins chère, une aide. Cet écran est facultatif de bout en bout : le lien vers la boutique y est visible dès son ouverture, aucune réponse n'est exigée, et rien ne peut retarder ta résiliation. Elle prend effet à la fin de la période déjà payée, sans frais, et tes données restent accessibles en version gratuite.",

  "page.terms.section9.title": "Codes promotionnels",
  "page.terms.section9.body":
    "Un code de réduction s'applique à la période indiquée au moment de son utilisation, puis l'abonnement se poursuit au tarif normal. Un code n'est ni cumulable avec un autre, ni échangeable contre de l'argent, ni transférable. Un code obtenu ou utilisé de manière frauduleuse peut être annulé.",

  "page.terms.section10.title": "Budgets partagés",
  "page.terms.section10.body":
    "Dans un espace partagé, tu rends volontairement visibles aux autres membres le budget, les objectifs et les événements de cet espace, ainsi que ton pseudo et ta photo de profil. N'y place que ce que tu acceptes de partager. Le propriétaire d'un espace peut le supprimer, ce qui en efface le contenu pour tous ses membres. Ton espace personnel n'est jamais visible par qui que ce soit.",

  "page.terms.section11.title": "Disponibilité du service",
  "page.terms.section11.body":
    "L'application fonctionne hors ligne pour l'essentiel, ce qui la rend peu sensible aux pannes. La synchronisation, elle, dépend de serveurs et peut être interrompue pour maintenance ou incident. Aucune garantie de disponibilité continue n'est donnée. Des fonctionnalités peuvent évoluer ou disparaître ; si l'une d'elles justifiait ton abonnement, tu peux résilier comme indiqué plus haut.",

  "page.terms.section12.title": "Propriété intellectuelle",
  "page.terms.section12.body":
    "Le nom NETbudget, le logo, l'interface et le code source appartiennent à l'éditeur. Tes données, elles, t'appartiennent : nous ne revendiquons aucun droit dessus et ne les exploitons pas à d'autres fins que de faire fonctionner l'application. Le repère 50/30/20 est issu des travaux d'Elizabeth Warren et Amelia Warren Tyagi, publiés dans leurs ouvrages.",

  "page.terms.section13.title": "Droit applicable et litiges",
  "page.terms.section13.body":
    "Ces conditions sont soumises au droit français. En cas de désaccord, écris-nous d'abord : la plupart des problèmes se règlent en quelques messages. Si aucune solution n'est trouvée, tu peux saisir un médiateur de la consommation ou les tribunaux compétents. Rien ici ne restreint les droits que la loi de ton pays de résidence te garantit en tant que consommateur.",

  "page.terms.section14.title": "Évolution des conditions",
  "page.terms.section14.body":
    "Ce texte peut être modifié ; la date de dernière mise à jour figure en bas de page. Un changement significatif — notamment sur la facturation — sera signalé dans l'application avant son entrée en vigueur. Poursuivre l'utilisation après cette date vaut acceptation. Une question : contact@netbudget.app.",


  "page.terms.updated": "Dernière mise à jour",

  // Back to home
  "back.home": "Retour à l'accueil",
};

const en: Catalog = {
  // Nav
  "nav.features": "Features",
  "nav.whatsnew": "What's new",
  "nav.reviews": "Reviews",
  "nav.privacy": "Privacy",
  "nav.privacyPromise": "Privacy",
  "nav.faq": "FAQ",
  "nav.legal": "Legal",
  "a11y.skip": "Skip to content",
  "consent.label": "Audience measurement",
  "consent.text": "This site sets no cookies. An anonymous audience measurement, with no cookie or identifier, only tells us which pages are read. You can refuse it.",
  "consent.more": "Learn more",
  "consent.ok": "OK",
  "consent.refuse": "Refuse measurement",
  "footer.consent": "Audience measurement: review my choice",
  "hero.video.pause": "Pause the animation",
  "hero.video.play": "Play the animation",
  "nav.label": "Main navigation",
  "nav.download": "Download",

  // Hero
  "hero.eyebrow": "NETbudget 2.0 is coming",
  "hero.title": "Know what you",
  "hero.title.accent": "really",
  "hero.title.suffix": " have left each month.",
  "hero.subtitle": "A budget you read at a glance, benchmarks drawn from official statistics, 282 sourced tips, projects, and shared spaces for couples and families. No bank connection, no ads: your budget stays on your phone, and whatever syncs is encrypted before it leaves.",
  "hero.cta.appstore": "Download on the App Store",
  "hero.cta.googleplay": "Get it on Google Play",
  "hero.cta.learn": "See features",
  "hero.note": "Budget, loans and converter are free, no account needed. No ads. No bank connection.",

  // Links hub (single destination: App Store + Google Play + countdown)
  "links.eyebrow": "All links here",
  "links.title": "Download NETbudget",
  "links.subtitle": "Available on iPhone and Android. Free to start, no ads. An account only to sync, share and use the Coach.",

  // The 2.0 teaser video, in place of the October 15 countdown.
  "teaser.eyebrow": "2.0 · November 15",
  "teaser.title": "NETbudget 2.0 is coming.",
  "teaser.subtitle": "Shared budgets for couples and families, a Coach with 282 sourced tips, official benchmarks, guided projects. November 15 on the App Store and Google Play.",
  "teaser.video.title": "The NETbudget 2.0 teaser",
  "teaser.sound.on": "Turn sound on",
  "teaser.sound.off": "Turn sound off",

  // Spot video (autoplay hero)
  "spot.eyebrow": "The spot · 22 sec",
  "spot.title": "See what changes.",
  "spot.subtitle": "22 seconds to get it.",
  "spot.unmute": "Unmute",
  "spot.mute": "Mute",
  "spot.play": "Play",
  "spot.pause": "Pause",

  // Stats strip
  "stats.languages": "languages",
  "stats.currencies": "currencies",
  "stats.countries": "countries",

  // Screens gallery
  "screens.eyebrow": "2.0 in pictures",
  "screens.title": "A budget you understand without a manual",
  "screens.subtitle": "Screenshots taken in the app, version 2.0. No mockups.",
  "screens.budget": "Money left",
  "screens.converter": "Converter",

  // Features
  "stats.advice": "sourced tips",
  "screens.expenses": "Expenses",
  "screens.benchmark": "Benchmarks",
  "screens.year": "The whole year",
  "screens.notifications": "Notifications",
  "highlights.eyebrow": "New in 2.0",
  "highlights.title": "What changes, concretely",
  "highlights.subtitle": "Seven things you will see the first time you open it.",
  "highlights.1.title": "A budget you read at a glance",
  "highlights.1.text": "Every line gets its own pictogram, found from its name in eight languages: basketball, transit pass, health plan. An expense that only lasts the winter or the summer is entered for its months, and the yearly table follows.",
  "highlights.2.title": "Official benchmarks, not opinions",
  "highlights.2.text": "Your housing, grocery or dining share, against the average household in your country: Eurostat in Europe, BLS in the United States, ONS in the United Kingdom, Statistics Canada, ABS in Australia. The year and the source are always shown.",
  "highlights.3.title": "Notifications worth the interruption",
  "highlights.3.text": "The monthly check-in, the tip of the week, a project milestone coming up, a benefit you have not claimed. You set the weekly cap; most weeks, fewer go out.",
  "highlights.4.title": "A Coach that cites its sources",
  "highlights.4.text": "282 tips, filtered by your age, household, housing and country. Each one cites its official page and its verification date. One of them lands every Monday as the tip of the week.",
  "highlights.5.title": "One space per project",
  "highlights.5.text": "A trip, a wedding, a baby: three questions, and the budget is set with its lines, its timeline and its reminders. You put money aside month after month, and the app tells you where you stand.",
  "highlights.alt.notifications": "iPhone lock screen with two NETbudget notifications: a project milestone and the monthly check-in",
  "highlights.alt.duo": "Two phones side by side showing the same shared space, with the common money left and private spaces hidden",
  "highlights.alt.family": "Six family members linked to the household budget, with three spaces: home, holidays, kids",
  "feature.projects.title": "One space per project",
  "feature.projects.text": "Wedding, trip, baby, party: a guided budget, a timeline and a reminder at every milestone.",
  "feature.spaces.title": "As a couple or a family",
  "feature.spaces.text": "Shared spaces by invitation, one common budget, and a private space for each person.",
  "whatsnew.item7.title": "Tax withheld at source",
  "whatsnew.item7.text": "The net we compute is what lands in your account, in 32 countries, with the official tables one tap away.",
  "whatsnew.item8.title": "End-to-end encryption",
  "whatsnew.item8.text": "With an account, your data leaves encrypted. A twelve-word phrase brings it back on a new phone.",
  "screens.coach": "Coach",
  "screens.project": "Project",
  "screens.goals": "Goals",
  "highlights.6.title": "A budget for two, without showing everything",
  "highlights.6.text": "One invitation code, and the shared budget shows on both sides. Each of you keeps a private space. Whatever reaches our servers is encrypted on the phone before it gets there.",
  "highlights.7.title": "One family, three spaces, one household",
  "highlights.7.text": "Up to six people, spaces by purpose, the household's birthdays and projects, each with a guided budget, a timeline and reminders.",
  "nav.v2": "2.0",
  "nav.plans": "Plans",
  "page.v2.title": "NETbudget 2.0: everything new",
  "page.v2.desc": "A lighter budget, official benchmarks, a sourced Coach, projects, shared spaces, useful notifications: everything that ships with version 2.0, in pictures.",
  "v2.eyebrow": "Version 2.0",
  "v2.title": "The biggest update since launch",
  "v2.subtitle": "Everything that changes, in pictures and in eight points. Screenshots taken in the app, no mockups.",
  "v2.nav.images": "In pictures",
  "v2.nav.list": "In eight points",
  "v2.nav.plans": "Plans",
  "v2.nav.download": "Download",
  "world.eyebrow": "Anywhere in the world",
  "world.title": "A budget that speaks your language, in your country",
  "world.subtitle": "Eight languages, fifteen currencies, and cost-of-living benchmarks for every city in the app. Spin the globe: each dot is a covered country.",
  "world.cities": "cities",
  "world.hint": "Touch a dot to see the country and its cities.",
  "world.citiesIn": "{n} cities in the app",
  "world.alt": "Interactive globe showing the countries covered by NETbudget",
  "plans.eyebrow": "Plans",
  "plans.title": "Free to start, a plan when your budget grows",
  "plans.subtitle": "The full budget stays free, no account needed. Plans add the Coach, projects, shared spaces and encrypted sync.",
  "plans.feature": "What you get",
  "plans.unlimited": "Unlimited",
  "plans.yes": "Included",
  "plans.no": "Not included",
  "plans.tier.free": "Free",
  "plans.tier.free.for": "No account",
  "plans.tier.solo": "Solo",
  "plans.tier.solo.for": "One person",
  "plans.tier.duo": "Duo",
  "plans.tier.duo.for": "As a couple",
  "plans.tier.family": "Family",
  "plans.tier.family.for": "Up to 6 people",
  "plans.row.budget": "Budget, loans, converter, money left",
  "plans.row.incomes": "Income sources",
  "plans.row.goals": "Savings goals",
  "plans.row.loan": "Loan schedule",
  "plans.loan.year": "Current year",
  "plans.loan.full": "Full",
  "plans.row.coach": "Coach: 282 sourced tips",
  "plans.row.weekly": "Tip of the week",
  "plans.row.events": "Projects and events",
  "plans.row.wedding": "Wedding budget",
  "plans.row.spaces": "Shared spaces",
  "plans.spaces.duo": "1 space · 2 people",
  "plans.spaces.family": "3 spaces · 6 people",
  "plans.row.birthdays": "Household birthdays",
  "plans.row.sync": "End-to-end encrypted sync",
  "plans.note": "Prices are shown in the App Store and Google Play, in your currency, with a seven-day free trial. The person you invite into a space pays nothing. Cancel any time from your phone's settings.",
  "plans.cta": "Download the app",
  "screens.spaces": "Shared spaces",
  "screens.household": "Your household",
  "world.game.score": "Score",
  "world.game.left": "{n} budgets to defend",
  "world.game.over": "GAME OVER",
  "world.game.overBody": "The saucers took every budget and the Earth did not make it. Only one thing left to do: leave a review of the app.",
  "world.game.reviewApple": "Rate on the App Store",
  "world.game.reviewGoogle": "Rate on Google Play",
  "world.game.again": "Play again",
  "world.game.quit": "Quit",
  "world.game.start": "Invasion! Your finger is the crosshair: tap the saucers before they take the NETbudget dots.",
  "consent.short": "Anonymous audience measurement, no cookies. ",
  "features.eyebrow": "Built for real life",
  "features.title": "Everything that matters, nothing more",
  "features.subtitle": "Enter your income and expenses. NETbudget computes, compares and advises.",

  "feature.income.title": "Several income sources",
  "feature.income.text": "Salary, freelance, rental, dividends, each with its own deduction rate. Plus income tax withheld at source in the 32 countries where employers withhold it, with the official tables one tap away.",

  "feature.rule.title": "A 50 / 30 / 20 benchmark that adapts",
  "feature.rule.text": "The needs, wants, savings split starts at 50/30/20, then adjusts end to end to your profile: age, household, housing, city. The Coach gives you your own target split, with its percentages.",

  "feature.advice.title": "282 sourced tips",
  "feature.advice.text": "Every tip cites its official source and depends on your country, age, family and housing. Regulated savings rates and inflation are re-read from official series.",

  "feature.world.title": "Anywhere in the world",
  "feature.world.text": "499 cities in 59 countries, with your city's cost-of-living gap against your country's average.",

  "feature.currency.title": "Currency converter",
  "feature.currency.text": "15 currencies with up-to-date rates and your conversion history.",


  "feature.pdf.title": "Clean PDF export",
  "feature.pdf.text": "Income, expenses by line and by period, the yearly table and tips, in the language of your choice.",

  "feature.privacy.title": "Encrypted, no bank connection",
  "feature.privacy.text": "No connection to your bank, ever. The budget lives on your phone; whatever syncs is encrypted before it leaves, with a key only you hold.",


  // What's new
  "whatsnew.eyebrow": "Version 2.0",
  "whatsnew.title": "The biggest update since launch",
  "whatsnew.subtitle": "Everything that ships with 2.0, in eight points.",
  "whatsnew.item1.title": "A lighter budget",
  "whatsnew.item1.text": "One line per family to start, pictograms, expenses by period. The essentials first.",
  "whatsnew.item2.title": "Benchmarks against national averages",
  "whatsnew.item2.text": "Official sources: Eurostat, BLS, ONS, Statistics Canada, ABS. Three benchmarks for free, all of them with a plan.",
  "whatsnew.item3.title": "Tip of the week",
  "whatsnew.item3.text": "One tip every Monday, chosen for your situation, with its source.",
  "whatsnew.item4.title": "Shared spaces",
  "whatsnew.item4.text": "Couple, family, flatmates, association: a common budget by invitation, a private space for each.",
  "whatsnew.item5.title": "Projects and events",
  "whatsnew.item5.text": "Wedding, trip, baby: guided budget, timeline, milestone reminders.",
  "whatsnew.item6.title": "Useful notifications",
  "whatsnew.item6.text": "Monthly check-in, unclaimed benefits, milestones, loans paid off. With a weekly cap you choose.",

  // Reviews
  "reviews.eyebrow": "They use NETbudget",
  "reviews.title": "What users say",
  "reviews.subtitle": "Public reviews pulled directly from the App Store and Google Play, refreshed at every site build.",

  // Privacy
  "privacy.eyebrow": "Privacy by default",
  "privacy.title": "Your data is yours, with or without an account",
  "privacy.text": "Without an account, everything stays on your phone: the only connection fetches exchange rates. With an account, whatever syncs is encrypted on your phone before it leaves, with a key we do not have. Never a bank connection, never ads, never trackers.",
  "privacy.point1": "Without an account: nothing leaves your phone",
  "privacy.point2": "With an account: end-to-end encrypted",
  "privacy.point3": "No bank connection, no ads",
  "privacy.point4": "Source code available on request",

  // Final CTA
  "cta.title": "Ready to take back control of your money?",
  "cta.subtitle": "Download NETbudget and count your disposable income in under 5 minutes.",
  "cta.button": "Download on the App Store",
  "cta.button.android": "Download on Google Play",

  // Scripture
  "scripture.verse":
    "\"You may say to yourself, 'My power and the strength of my hands have produced this wealth for me.' But remember the LORD your God, for it is he who gives you the ability to produce wealth, and so confirms his covenant, which he swore to your ancestors, as it is today.\"",
  "scripture.ref": "Deuteronomy 8 : 17-18",

  // Maker
  "maker.eyebrow": "Behind the app",
  "maker.name": "Stéphane Pizeuil",
  "maker.role": "Indie maker · Software engineer",
  "maker.bio":
    "I designed, built and launched NETbudget on my own. The goal: a simple, honest personal-budgeting tool that respects your privacy and works anywhere in the world. No hidden business model — no ads, no data selling, no subscription.",
  "maker.stat1": "Solo maker",
  "maker.stat2": "On the App Store",
  "maker.stat3": "100% independent",
  "maker.linkedin": "View my LinkedIn",
  "maker.email": "Email me",

  // Footer
  "footer.tagline": "Money left, a 50/30/20 benchmark adapted to you, sourced tips.",
  "footer.madeby": "Designed and built by",
  "footer.links": "Links",
  "footer.follow": "Follow",
  "footer.hint": "15.10 — you'll see.",
  "footer.privacy": "Privacy policy",
  "footer.terms": "Terms of use",
  "footer.thanks": "Thank you",
  "footer.contact": "Contact",
  "footer.copyright": "© 2026 NETbudget. All rights reserved.",
  "footer.lang": "Language",
  "footer.appstore": "App Store",
  "footer.googleplay": "Google Play",

  // Privacy page
  // --- Accessibility ----------------------------------------------------
  "a11y.skipToContent": "Skip to content",

  // --- Breadcrumb -------------------------------------------------------
  "breadcrumb.home": "Home",
  "breadcrumb.label": "You are here",

  // --- Mobile action bar ------------------------------------------------
  "sticky.title": "Know what you really have left",
  "sticky.sub": "Free, no ads",
  "sticky.cta": "Download",

  // --- Page titles and descriptions -------------------------------------
  "page.faq.title": "Frequently asked questions",
  "page.faq.desc": "What it costs, where your data goes, which countries are covered: answers to the questions people actually ask.",
  "page.privacy.desc": "Exactly what NETbudget does with your data. Without an account nothing leaves your phone; with one, you choose what gets stored.",
  "page.terms.desc": "NETbudget's terms of use: what the app does, what it does not promise, and your rights.",

  // --- 404 page ---------------------------------------------------------
  // "Thank you" page: a letter, not a receipt.
  "page.thanks.title": "Thank you",
  "page.thanks.desc": "To the people who install, rate, write about and test NETbudget: what you changed, and why it matters.",
  "thanks.eyebrow": "A letter, not a page",
  "thanks.title": "Thank you. Truly,",
  "thanks.title.accent": "each of you.",
  "thanks.lead": "NETbudget is built by one person, in the evenings and at weekends. What keeps it going is not a marketing budget. It's you.",
  // Before anything else: God, then the people who carry Stéphane spiritually.
  // Names and titles are the ones he gave, as is.
  "thanks.first.eyebrow": "Before anything else",
  "thanks.first.title": "To God, first.",
  "thanks.first.body": "He is the one who helps me every day, in this project as in everything else. Nothing here would exist without Him. This thank-you comes before all the others, and it is sincere.",
  "thanks.first.people": "And to those who carry me, teach me and pray for me:",
  "thanks.first.p1.name": "Pastor Samuel Eboumbou",
  "thanks.first.p1.role": "shepherd of the Jeunes Prodiges church",
  "thanks.first.p2.name": "Apostle Yvan Castanou",
  "thanks.first.p2.role": "",
  "thanks.first.p3.name": "Apostle Yves",
  "thanks.first.p3.role": "",
  "thanks.first.p4.name": "Dr Mode",
  "thanks.first.p4.role": "",
  "thanks.first.p5.name": "Pastor Habi",
  "thanks.first.p5.role": "",
  "thanks.first.close": "For your teaching, your prayers and your presence. Thank you, from the bottom of my heart.",

  "thanks.letter.p1": "When I published the first version, I assumed nobody would install it. One more budgeting app, by an unknown, with no account, no bank connection, no ads. Nothing to catch the eye.",
  "thanks.letter.p2": "Then people installed it. Some left a rating. Others wrote, sometimes to say thanks, more often to point out what was wrong, and that second kind is the most valuable. One honest report about a hidden button or a wrong calculation is worth more than ten compliments.",
  "thanks.letter.p3": "I answer every message myself. I read every review. I don't always have time to fix everything quickly, but nothing is ignored: every piece of feedback ends up on a list, and that list decides what I build next.",
  "thanks.letter.p4": "You owe me nothing. You have already given the rarest thing: time, and trust. Thank you for placing it in a small app that promised to keep your numbers to yourself.",
  "thanks.letter.sign": "Stéphane",
  "thanks.who.title": "Who this thank-you is for",
  "thanks.who.installed.title": "Those who installed the app",
  "thanks.who.installed.body": "Installing an unknown app and typing your income into it is an act of trust. You did it with no account to create, no guarantee, no brand behind it.",
  "thanks.who.rated.title": "Those who left a rating",
  "thanks.who.rated.title.count": "The {n} people who rated the app on the App Store",
  "thanks.who.rated.body": "A rating takes thirty seconds and weighs more than any advert. Each one helps someone else decide.",
  "thanks.who.wrote.title": "Those who wrote",
  "thanks.who.wrote.body": "To report a bug, suggest an idea, ask for a feature, or simply say it helped. Every message gets a reply from a person, not a bot.",
  "thanks.who.tested.title": "The testers of the closed session",
  "thanks.who.tested.body": "You try unfinished versions, on your own phones, with your real budgets. You find what I can no longer see. It is the most thankless work, and the most useful.",
  "thanks.who.close.title": "The people close to me who put up with an evening project",
  "thanks.who.close.body": "Hours spent on the app are hours taken from somewhere else. This project owes them its patience.",
  "thanks.who.source": "Count read from the App Store when the site was last updated. No figure is typed by hand.",
  "thanks.changed.title": "What your feedback changed",
  "thanks.changed.lead": "Three recent examples, among others. Each started with a message or a test, and each ended up in the code.",
  "thanks.changed.from": "The feedback",
  "thanks.changed.to": "What came of it",
  "thanks.changed.android.from": "“On Android, the Save button is hidden under the navigation bar.”",
  "thanks.changed.android.to": "Every input sheet now accounts for the system bar and the keyboard, on every Android version. Fixed in the next release.",
  "thanks.changed.percent.from": "“The discount percentage shown doesn't match the real maths.”",
  "thanks.changed.percent.to": "The percentage is now computed from the actual prices, rounded down, never inflated. Fixed in the next release.",
  "thanks.changed.tour.from": "“The tutorial gets stuck, the Next button stops responding.”",
  "thanks.changed.tour.to": "The tutorial was rewritten to behave identically on iPhone and Android. Fixed in the next release.",
  "thanks.next.title": "If you want to help further",
  "thanks.next.lead": "No obligation. But if you have thirty seconds, these are the three gestures that matter most to an independent app.",
  "thanks.next.rate": "Rate on the App Store",
  "thanks.next.ratePlay": "Rate on Google Play",
  "thanks.next.write": "Write to me",
  "thanks.next.note": "And if the app isn't right for you, tell me that too. That's how it gets better.",

  // Return page for e-mail links (address confirmation, password, magic link)
  "confirm.title": "Back to the app",
  "confirm.desc": "Your link has been verified. All that's left is to reopen NETbudget.",
  "confirm.signup.eyebrow": "Address confirmed",
  "confirm.signup.title": "All good, welcome!",
  "confirm.signup.body": "Your address is verified and your account is ready. Reopen NETbudget to pick up where you left off.",
  "confirm.recovery.eyebrow": "Password",
  "confirm.recovery.title": "Choose your new password",
  "confirm.recovery.body": "The link is valid. Open NETbudget: the new-password screen is waiting for you.",
  "confirm.magiclink.eyebrow": "Sign-in",
  "confirm.magiclink.title": "You're signed in",
  "confirm.magiclink.body": "Reopen NETbudget to get back to your budget.",
  "confirm.email_change.eyebrow": "New address",
  "confirm.email_change.title": "Address updated",
  "confirm.email_change.body": "Your account now uses your new address. Reopen NETbudget.",
  "confirm.error.eyebrow": "Link expired",
  "confirm.error.title": "This link no longer works",
  "confirm.error.body": "It has already been used, or it has expired. Go back to NETbudget and request a new link: it takes ten seconds.",
  "confirm.open": "Open NETbudget",
  "confirm.fallback": "The app doesn't open? Open NETbudget on your phone and sign in with your password.",
  "confirm.otherDevice": "Reading this on a device other than your phone? No problem: your address is confirmed, just sign in inside the app.",
  "confirm.noApp": "Don't have the app yet?",
  // Shared-space invitation page (link sent by message)
  "join.title": "Invitation to a shared space",
  "join.desc": "Someone is inviting you to manage a budget together on NETbudget.",
  "join.eyebrow": "Invitation",
  "join.h1": "You're invited to join a space 💚",
  "join.body": "A shared budget on NETbudget: everyone sees the same numbers, end-to-end encrypted. Open the app to accept.",
  "join.open": "Open NETbudget and join",
  "join.code": "Your invitation code",
  "join.copy": "Copy the code",
  "join.copied": "Copied",
  "join.noApp": "Don't have the app yet?",
  "join.noApp.body": "Install NETbudget, then paste the code under Spaces, “Join with a code”.",
  "join.expiry": "The code is valid for 14 days and works once.",
  "join.missing.h1": "This link is incomplete",
  "join.missing.body": "The invitation code is missing. Ask the person to resend the invitation from the app.",
  "nf.title": "This page does not exist",
  "nf.desc": "The link may be old, or the address has a typo. Nothing is broken on your side.",
  "nf.home": "Back to home",
  "nf.faq": "Frequently asked questions",
  "nf.game.eyebrow": "Since you are here",
  "nf.game.title": "Left to live on",
  "nf.game.hint": "Catch the income, dodge the expenses. Finger, mouse or arrow keys.",
  "nf.game.score": "Left to live on",
  "nf.game.best": "Best",
  "nf.game.start": "Three lives. Every income caught in a row raises the multiplier. Catching an expense costs a life.",
  "nf.game.play": "Play",
  "nf.game.again": "Play again",
  "nf.game.resume": "Resume",
  "nf.game.paused": "Paused",
  "nf.game.over": "End of month",
  "nf.game.newBest": "New best",
  "nf.game.games": "games",
  "nf.game.legend.income": "Income: catch it",
  "nf.game.legend.expense": "Expense: avoid it",
  "nf.game.legend.bonus": "Bonus: rare, gives a life back",
  "nf.game.rank.0": "First paycheck",
  "nf.game.rank.1": "Ant",
  "nf.game.rank.2": "Saver",
  "nf.game.rank.3": "Strategist",
  "nf.game.rank.4": "Legend of the leftover",
  "nf.game.a11y": "Game: catch the income with the wallet and avoid the expenses.",
  "nf.game.footnote": "The score stays on your device. Obviously.",

  // --- FAQ --------------------------------------------------------------
  "faq.eyebrow": "Frequently asked questions",
  "faq.title": "What people ask us most",
  "faq.intro": "Short, straight answers — including when the answer is not in our favour.",
  "faq.seeAll": "See all questions",

  "faq.free.q": "Is it really free?",
  "faq.free.a": "Yes. The full budget, income, expenses, loans, money left, the 50/30/20 benchmark and the converter, is free with no time limit. An optional subscription adds syncing across devices, the Coach with tips adapted to your profile, projects and shared budgets. No advertising, ever.",
  "faq.account.q": "Do I need an account?",
  "faq.account.a": "Not for the budget, loans and converter: you can use them without ever giving an email address. An account is for finding your data on another device, sharing a budget as a couple or a family, and opening the projects and the Coach of 2.0. With an account, your data leaves end-to-end encrypted.",
  "faq.data.q": "Where is my financial data stored?",
  "faq.data.a": "Without an account, only in your phone's storage: nothing is sent. With an account, whatever you choose to save is synchronised, and end-to-end encrypted by default: the key stays on your phone, so we cannot read your data. Twelve words, viewable from your profile, let you recover that access on another device.",
  "faq.offline.q": "Does it work without internet?",
  "faq.offline.a": "Entirely, apart from two things: the converter's exchange rates, which need fetching once and are then cached, and syncing if you have an account. Your budget calculation itself depends on no server.",
  "faq.countries.q": "Does it work in my country?",
  "faq.countries.a": "The budget and converter work everywhere, in eight languages and with the major currencies. The advice depends on local law: France is covered in depth, while Belgium, Switzerland, Luxembourg, Canada, Spain, Portugal, Italy, Germany, the United Kingdom and several African countries are covered in part.",
  "faq.bank.q": "Why not connect my bank account?",
  "faq.bank.a": "Because it would be self-defeating. Connecting a bank means routing your transaction history through an intermediary, giving up the very thing that makes the app worth using. Importing a statement as a CSV file is planned: the same time saved, without granting permanent access.",
  "faq.shared.q": "Can two people manage one budget?",
  "faq.shared.a": "Yes, through a shared space: each member sees the shared budget, goals and events, while their personal space stays invisible to the others. Invitations use a single-use code, so you never have to hand over someone else's email address.",
  "faq.advice.q": "Where does the advice come from?",
  "faq.advice.a": "From official sources only — government bodies, legislation, public agencies — and every piece of advice shows its references and the date it was checked. No figure is guessed. When something cannot be confirmed, it is flagged as such rather than presented as certain.",
  "faq.android.q": "What about Android?",
  "faq.android.a": "The app is available on the App Store and on Google Play, with the same features and the same versions on both sides.",
  "faq.cancel.q": "How do I cancel the subscription?",
  "faq.cancel.a": "From your phone's settings, under subscription management — we have no control over it, and that is better: nobody can hold you back. Cancelling takes effect at the end of the period you already paid for, and your data stays accessible on the free tier.",

  "page.privacy.title": "Privacy policy",
  "page.privacy.intro":
    "This page describes exactly what NETbudget does with your data. It separates two very different situations: the app without an account, where nothing leaves your phone, and the subscription, where some data is synchronised so it follows you across devices and can be shared. We would rather be precise than reassuring.",

  "page.privacy.section1.title": "Without an account: nothing leaves your phone",
  "page.privacy.section1.body":
    "Your budget, income, expenses, loans, currency, language and chosen city are stored on your device. No account is needed, and in this mode none of it is sent to a server. Notifications are scheduled by your phone itself: no notification token is created, so nothing passes through a third-party delivery service.",

  "page.privacy.section2.title": "With an account: what gets synchronised",
  "page.privacy.section2.body":
    "Creating an account is optional. It lets you find your data on several devices, share a budget, and receive advice matched to your situation. We then store on our servers: your email address (or the identifier provided by Apple or Google), your username, optionally your first and last name, your date of birth, your country, region and city, your occupation, your profile picture if you add one, the date you accepted this policy, along with your savings goals, event budgets, monthly history, and the profile used to tailor advice — age, family situation, housing, tax band, children or pets. You choose what you fill in: blank fields are not inferred.",

  "page.privacy.section3.title": "End-to-end encryption",
  "page.privacy.section3.body":
    "It is on by default, from the moment the account is created, and cannot be switched off. A key is created on your phone and never leaves it: your data goes out encrypted, we cannot read it, and we cannot hand it to anyone who asks. There is nothing for you to configure. It is turned on at your first sign-in; in the rare case where that fails for lack of network, the app tries again at the next launch, and anything synchronised in between is not yet protected. Twelve words, viewable at any time from your profile, let you recover that access on another device; we do not know them. As a result, changing phone without having kept them makes your synced data inaccessible — your budget stays intact on the original device. That is the unavoidable price of encryption we cannot bypass, and we would rather write it down than let you discover it. In a shared space, the space has its own key, and each member keeps a copy encrypted with theirs. Traffic to our servers is encrypted in transit, and your session token is kept in the operating system's secure keystore.",

  "page.privacy.section4.title": "Shared budgets",
  "page.privacy.section4.body":
    "If you create a shared space or join someone else's, the members of that space can see the budget, goals and events that live in it, along with your username and profile picture. They never see your personal space. An invitation is a single-use code valid for fourteen days; no email address is required to invite someone. Leaving a space ends your access to its contents immediately.",

  "page.privacy.section5.title": "Network connections",
  "page.privacy.section5.body":
    "Without an account, the app contacts three services and never sends an identifier: open.er-api.com for exchange rates, with a local cache, itunes.apple.com to check whether an update is available, and our own server, at most once a week, to refresh the inflation rates shown in the advice. That last request deserves a note, because it is the one that could give away where you are: it carries no parameter and receives the table for all seventeen countries covered, exactly the same for everyone. We therefore never ask a statistics institute for «the inflation rate in France», which would tell it where you live; the sorting happens on your device. With no network, the app falls back on the table bundled at build time. With an account, it talks to Supabase, which hosts the database, authentication and photo storage. If you sign in with Apple or Google, that provider is contacted at sign-in time. If you subscribe, the app asks RevenueCat what your account is entitled to open. The many links to official websites quoted in the advice are only opened if you tap them, and in your browser.",

  "page.privacy.section6.title": "Processors",
  "page.privacy.section6.body":
    "Supabase hosts account data. Apple and Google are involved if you use their sign-in method, and for selling and charging subscriptions. RevenueCat, which manages subscriptions on our behalf, receives an account identifier and the purchase information passed on by the store — never your budget data, which it could not read anyway, and never your payment details, which we do not see either. open.er-api.com supplies exchange rates. No other third party receives your data: inside the app there is no advertising, no analytics, no tracker, no resale. The netbudget.app website is hosted by Vercel, which measures its traffic in aggregate — page views, country, device type — without cookies or persistent identifiers, and with no link to any app account. You can refuse this measurement from the notice shown on your first visit, or at any time from the footer; your browser's Global Privacy Control signal is honoured. We do not sell data, and it is not our business model — the app is funded by subscriptions.",

  "page.privacy.section7.title": "Permissions requested",
  "page.privacy.section7.body":
    "Notifications, for the reminders you choose to switch on, which you can disable category by category. Access to images, only at the moment you add a profile picture; we never browse your gallery. Vibration. Camera, microphone and location are explicitly blocked: the app cannot reach them, not even by mistake.",

  "page.privacy.section8.title": "How long data is kept",
  "page.privacy.section8.body":
    "Local data stays on your device until you erase it or uninstall the app. Account data is kept for as long as the account exists. Deleting your account erases it immediately and permanently, with no retention period on our side. Budget history is limited to the last twenty-four months.",

  "page.privacy.section9.title": "Your rights",
  "page.privacy.section9.body":
    "The General Data Protection Regulation gives you the right to access your data, correct it, erase it, object to its processing and obtain a copy. Deletion is available directly in the app's settings, under « Delete my account »: it is immediate and irreversible. For anything else, write to us and we will reply within thirty days. You may also complain to your national data protection authority if our answer does not satisfy you.",

  "page.privacy.section10.title": "Minors",
  "page.privacy.section10.body":
    "The app can be used without an account at any age. Creating an account is restricted to people aged fifteen or over, the age of digital consent in France. We do not seek to collect data about children; if an account was created for a younger minor, write to us and we will delete it.",

  "page.privacy.section11.title": "Testing programme",
  "page.privacy.section11.body":
    "A closed testing session precedes general sale. Participants are invited by name, approve a testing agreement from within the app, and in doing so send us the name they enter, the date of their agreement and the plan assigned to them. These records exist only to prove that consent was given and to open the right testing scope. They are deleted at the end of the session, together with the test access itself, and serve no commercial purpose. Declining the agreement removes tester status, with no further consequence.",

  "page.privacy.section12.title": "Changes and contact",
  "page.privacy.section12.body":
    "Any change to this policy will be published here with its date. A change that would broaden how your data is used will be flagged in the app before it takes effect. Any questions: contact@netbudget.app.",


  "page.privacy.updated": "Last updated",

  // Terms page
  "page.terms.title": "Terms of use",
  "page.terms.intro":
    "This text sets out what NETbudget does, what it does not promise, and what you agree to by using it. It is written to be read, not to hide behind jargon.",

  "page.terms.section1.title": "What NETbudget is",
  "page.terms.section1.body": "A personal budgeting estimation tool. It works out your money left, applies a 50/30/20 benchmark adapted to your profile and gathers information from public sources. It is not a bank, a payment institution or an investment adviser: NETbudget holds no money, executes no transaction and manages no investment.",

  "page.terms.section2.title": "What the figures are worth",
  "page.terms.section2.body":
    "Estimates, never commitments. Contribution rates, cost-of-living indices, flight prices and benefit amounts come from public sources cited in the app, with the date they were checked. Legislation changes, thresholds are revised, a real quote differs from an estimate. Your payslip, your tax assessment and your authorities' decisions are what count — not the app.",

  "page.terms.section3.title": "What you should not expect from it",
  "page.terms.section3.body":
    "Professional advice. The information shown replaces neither a financial adviser, nor an accountant, nor a solicitor, nor a social worker. The decisions you make after reading the app remain yours, and the publisher cannot be held responsible for them. For anything significant — a mortgage, an investment, an inheritance — have it checked by a professional.",

  "page.terms.section4.title": "Your account",
  "page.terms.section4.body":
    "An account is optional: the app works without one. If you create one, you are responsible for keeping your password confidential and for activity carried out from your account. It is restricted to people aged fifteen or over. We may suspend an account used to harm others, circumvent billing or attack the service — never for normal use, however heavy.",

  "page.terms.section5.title": "Encryption and twelve words",
  "page.terms.section5.body":
    "The data you synchronise is end-to-end encrypted by default, with no setting to switch on: a key is created on your phone and never leaves it. Twelve words, viewable at any time from your profile, let you recover that access on another device. We do not know them and cannot regenerate them. The consequence must be understood, and it is the price of the guarantee: if you change device without having kept those twelve words, nobody can decrypt your synchronised data, ourselves included, and it becomes permanently unreadable. Your budget then stays intact on the original device. There is no recovery procedure, no route through support, no backup copy on our side. The publisher cannot be held liable for data lost as a result of twelve mislaid words.",

  "page.terms.section6.title": "Subscription and plans",
  "page.terms.section6.body":
    "The app is usable free of charge with no time limit: budget, loans, money left, the 50/30/20 benchmark and the converter. An optional subscription unlocks syncing across devices, tailored advice and event budgets. The Solo plan tracks up to six events at once and does not include the wedding budget, which is planned together and belongs to the Duo and Family plans. Each plan's exact limits are shown in the app before any payment.",

  "page.terms.section7.title": "Payment, renewal, cancellation",
  "page.terms.section7.body":
    "Subscriptions are sold and charged by Apple's App Store or Google's Play Store, never by us — so we never see any payment details. Where a free trial is offered, it turns into a paid subscription at the end unless cancelled beforehand: the store tells you so, and the date appears in your subscription management. Subscriptions then renew automatically at each period end unless cancelled at least twenty-four hours in advance. Cancellation happens in your phone's settings, under subscription management: we have no control over it, and that is better. The app may show one screen asking why you are leaving and offering an answer — a cheaper plan, some help. That screen is optional from start to finish: the link to the store is visible the moment it opens, no answer is required, and nothing can delay your cancellation. It takes effect at the end of the period you already paid for, at no cost, and your data stays accessible on the free tier.",

  "page.terms.section8.title": "Refunds and right of withdrawal",
  "page.terms.section8.body":
    "Subscriptions are sold and charged by Apple's App Store or Google's Play Store, never by us — so we never see any payment details. Where a free trial is offered, it turns into a paid subscription at the end unless cancelled beforehand: the store tells you so, and the date appears in your subscription management. Subscriptions then renew automatically at each period end unless cancelled at least twenty-four hours in advance. Cancellation happens in your phone's settings, under subscription management: we have no control over it, and that is better. The app may show one screen asking why you are leaving and offering an answer — a cheaper plan, some help. That screen is optional from start to finish: the link to the store is visible the moment it opens, no answer is required, and nothing can delay your cancellation. It takes effect at the end of the period you already paid for, at no cost, and your data stays accessible on the free tier.",

  "page.terms.section9.title": "Promotional codes",
  "page.terms.section9.body":
    "A discount code applies to the period stated when it is used, after which the subscription continues at the standard price. A code cannot be combined with another, exchanged for money, or transferred. A code obtained or used fraudulently may be cancelled.",

  "page.terms.section10.title": "Shared budgets",
  "page.terms.section10.body":
    "In a shared space, you deliberately make that space's budget, goals and events visible to its other members, along with your username and profile picture. Only put there what you are willing to share. A space's owner can delete it, which erases its contents for every member. Your personal space is never visible to anyone.",

  "page.terms.section11.title": "Service availability",
  "page.terms.section11.body":
    "The app works offline for the most part, which makes it largely immune to outages. Syncing, however, depends on servers and may be interrupted for maintenance or incidents. No guarantee of continuous availability is given. Features may change or be withdrawn; if one of them was the reason for your subscription, you can cancel as described above.",

  "page.terms.section12.title": "Intellectual property",
  "page.terms.section12.body":
    "The NETbudget name, logo, interface and source code belong to the publisher. Your data belongs to you: we claim no rights over it and use it for nothing other than running the app. The 50/30/20 benchmark comes from the work of Elizabeth Warren and Amelia Warren Tyagi, published in their books.",

  "page.terms.section13.title": "Governing law and disputes",
  "page.terms.section13.body":
    "These terms are governed by French law. If something goes wrong, write to us first: most problems are settled in a few messages. If no solution is found, you may refer the matter to a consumer mediator or to the competent courts. Nothing here restricts the rights that the law of your country of residence guarantees you as a consumer.",

  "page.terms.section14.title": "Changes to these terms",
  "page.terms.section14.body":
    "This text may be amended; the date it was last updated appears at the bottom of the page. A significant change — particularly to billing — will be flagged in the app before it takes effect. Continuing to use the app after that date constitutes acceptance. Any questions: contact@netbudget.app.",


  "page.terms.updated": "Last updated",

  // Back to home
  "back.home": "Back to home",
};

export const CATALOGS: Record<Locale, Catalog> = { fr, en };
