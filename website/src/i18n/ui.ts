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
  "nav.download": "Télécharger",

  // Hero
  "hero.eyebrow": "Version 1.6 disponible",
  "hero.title": "Sache ce qu'il te reste",
  "hero.title.accent": "vraiment",
  "hero.title.suffix": " chaque mois.",
  "hero.subtitle":
    "NETbudget calcule ton reste à vivre, applique la règle 50/30/20 et te donne des conseils sur-mesure. 100 % sur ton téléphone, sans compte, sans cloud, sans publicité.",
  "hero.cta.appstore": "Télécharger sur l'App Store",
  "hero.cta.learn": "Voir les fonctionnalités",
  "hero.note": "Gratuit. Sans publicité. Aucune donnée n'est envoyée.",

  // Stats strip
  "stats.languages": "langues",
  "stats.currencies": "devises",
  "stats.cities": "villes",
  "stats.countries": "pays",

  // Screens gallery
  "screens.eyebrow": "Aperçu de l'app",
  "screens.title": "Conçu pour aller à l'essentiel",
  "screens.subtitle": "Trois onglets, zéro friction. Tu calcules ton budget, tu convertis tes devises, tu règles tes préférences.",
  "screens.budget": "Budget",
  "screens.converter": "Convertisseur",
  "screens.settings": "Réglages",

  // Features
  "features.eyebrow": "Pensé pour ta vie",
  "features.title": "Tout ce qui compte sur un seul écran",
  "features.subtitle":
    "Saisis tes revenus, ton loyer, tes prêts et tes dépenses. NETbudget fait le reste.",

  "feature.income.title": "Plusieurs sources de revenus",
  "feature.income.text":
    "Salaire, freelance, locatif, dividendes… Chaque source a son propre statut et son propre taux de charges.",

  "feature.rule.title": "Règle 50 / 30 / 20",
  "feature.rule.text":
    "Tes dépenses sont réparties en Besoins, Loisirs et Épargne pour identifier immédiatement où agir.",

  "feature.advice.title": "23 conseils personnalisés",
  "feature.advice.text":
    "Plafond d'endettement 35 %, loyer ≤ 1/3 du net, fond d'urgence 3-6 mois, profil investisseur — basés sur ta situation réelle.",

  "feature.world.title": "Partout dans le monde",
  "feature.world.text":
    "558 villes dans 59 pays avec un indice du coût de la vie calé sur la moyenne nationale de chaque pays.",

  "feature.currency.title": "Convertisseur de devises",
  "feature.currency.text":
    "15 devises (€, $, £, ¥, franc CFA, BRL, INR…) avec taux en temps réel et historique de conversions.",

  "feature.languages.title": "8 langues complètes",
  "feature.languages.text":
    "Français, anglais, espagnol, portugais, allemand, italien, arabe et japonais — l'interface, les conseils et le PDF.",

  "feature.pdf.title": "Export PDF propre",
  "feature.pdf.text":
    "Un document clair avec totaux, répartition et conseils, dans la langue de ton choix.",

  "feature.privacy.title": "100 % local",
  "feature.privacy.text":
    "Aucune donnée ne quitte ton téléphone. Pas de compte. Pas de tracking. Pas de publicité.",

  "feature.donut.title": "Visualisation immédiate",
  "feature.donut.text":
    "Graphique donut de tes dépenses et projection sur 12 mois avec totaux annuels.",

  // What's new
  "whatsnew.eyebrow": "Version 1.6",
  "whatsnew.title": "La grande mise à jour internationale",
  "whatsnew.subtitle":
    "NETbudget passe d'un compagnon budgétaire français à un outil mondial — sans rien lâcher sur la vie privée.",
  "whatsnew.item1.title": "8 langues complètes",
  "whatsnew.item1.text": "Français, anglais, espagnol, portugais, allemand, italien, arabe et japonais.",
  "whatsnew.item2.title": "558 villes / 59 pays",
  "whatsnew.item2.text": "Sélecteur en deux étapes : pays puis ville triée par région.",
  "whatsnew.item3.title": "Convertisseur de devises",
  "whatsnew.item3.text": "15 devises avec taux en temps réel et historique.",
  "whatsnew.item4.title": "Sources publiques cliquables",
  "whatsnew.item4.text": "Numbeo, Eurostat, OECD, INSEE, Mercer, EIU, World Bank, BLS.",
  "whatsnew.item5.title": "Navigation par onglets",
  "whatsnew.item5.text": "Budget, Convertisseur et Réglages — un tap pour passer de l'un à l'autre.",
  "whatsnew.item6.title": "Conseils traduits",
  "whatsnew.item6.text": "23 cartes de conseil personnalisées, traduites dans les 8 langues.",

  // Reviews
  "reviews.eyebrow": "Ils utilisent NETbudget",
  "reviews.title": "Ce qu'en pensent les utilisateurs",
  "reviews.subtitle": "Avis publics récupérés directement depuis l'App Store, mis à jour à chaque build du site.",

  // Privacy
  "privacy.eyebrow": "Vie privée par défaut",
  "privacy.title": "Tes données restent sur ton téléphone",
  "privacy.text":
    "NETbudget fonctionne entièrement hors ligne. Il n'y a pas de compte à créer, pas de serveur qui stocke tes finances, pas de tracking. La seule connexion réseau est utilisée pour récupérer les taux de change (un appel toutes les 6 heures).",
  "privacy.point1": "Aucun compte requis",
  "privacy.point2": "Aucune donnée envoyée",
  "privacy.point3": "Aucune publicité, aucun tracker",
  "privacy.point4": "Code source consultable sur demande",

  // Final CTA
  "cta.title": "Prêt à reprendre la main sur ton argent ?",
  "cta.subtitle": "Télécharge NETbudget et compte ton reste à vivre en moins de 5 minutes.",
  "cta.button": "Télécharger sur l'App Store",

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
  "footer.tagline": "Calcul de reste à vivre, règle 50/30/20, conseils sur-mesure.",
  "footer.madeby": "Conçu et développé par",
  "footer.links": "Liens",
  "footer.follow": "Suivre",
  "footer.privacy": "Politique de confidentialité",
  "footer.terms": "Conditions d'utilisation",
  "footer.contact": "Contact",
  "footer.copyright": "© 2026 NETbudget. Tous droits réservés.",
  "footer.lang": "Langue",

  // Privacy page
  "page.privacy.title": "Politique de confidentialité",
  "page.privacy.intro":
    "NETbudget est conçu pour respecter ta vie privée. Cette page décrit comment l'application traite tes données.",
  "page.privacy.section1.title": "Quelles données sont collectées ?",
  "page.privacy.section1.body":
    "NETbudget ne collecte aucune donnée personnelle. Tes revenus, dépenses et configurations sont stockés uniquement sur ton appareil via le mécanisme de stockage local du système (AsyncStorage). Aucune information n'est transmise à un serveur sous notre contrôle.",
  "page.privacy.section2.title": "Connexions réseau",
  "page.privacy.section2.body":
    "Une seule connexion réseau est effectuée : la récupération des taux de change via le service public open.er-api.com, avec un cache local de 6 heures. Cette requête ne contient ni identifiant ni donnée personnelle. Tu peux utiliser l'application entièrement hors ligne en désactivant simplement l'onglet Convertisseur.",
  "page.privacy.section3.title": "Permissions",
  "page.privacy.section3.body":
    "L'application ne demande aucune permission système particulière. Aucun accès à tes contacts, à ta géolocalisation, à ton calendrier ou à tes photos n'est demandé.",
  "page.privacy.section4.title": "Suppression des données",
  "page.privacy.section4.body":
    "Tu peux supprimer toutes tes données à tout moment depuis l'onglet Réglages, bouton « Réinitialiser toutes les données ». La désinstallation de l'application supprime également toutes les données stockées localement.",
  "page.privacy.section5.title": "Contact",
  "page.privacy.section5.body":
    "Pour toute question concernant cette politique, contacte stephane.pizeuil@gmail.com.",
  "page.privacy.updated": "Dernière mise à jour",

  // Terms page
  "page.terms.title": "Conditions d'utilisation",
  "page.terms.intro":
    "En utilisant NETbudget, tu acceptes les conditions suivantes. Lis-les attentivement.",
  "page.terms.section1.title": "Objet de l'application",
  "page.terms.section1.body":
    "NETbudget est un outil d'estimation budgétaire personnel. Les calculs proposés (charges sociales, indice du coût de la vie, conseils 50/30/20) sont fournis à titre informatif et indicatif. Ils ne remplacent en aucun cas l'avis d'un professionnel (conseiller financier, expert-comptable, fiscaliste).",
  "page.terms.section2.title": "Limitation de responsabilité",
  "page.terms.section2.body":
    "L'éditeur ne saurait être tenu responsable des décisions financières prises sur la base des informations affichées. Les taux de charges par statut sont des estimations issues de sources publiques (service-public.fr, urssaf.fr) ; ton bulletin de paie réel peut différer.",
  "page.terms.section3.title": "Propriété intellectuelle",
  "page.terms.section3.body":
    "Le nom NETbudget, le logo, l'interface et le code source restent la propriété de l'éditeur. La règle 50/30/20 est issue des travaux d'Elizabeth Warren et Amelia Warren Tyagi, librement disponibles dans leurs ouvrages.",
  "page.terms.section4.title": "Évolution des conditions",
  "page.terms.section4.body":
    "Ces conditions peuvent être mises à jour. La date de dernière mise à jour est indiquée en bas de page. L'utilisation continue de l'application après mise à jour vaut acceptation.",
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
  "nav.download": "Download",

  // Hero
  "hero.eyebrow": "Version 1.6 out now",
  "hero.title": "Know what you",
  "hero.title.accent": "really",
  "hero.title.suffix": " have left each month.",
  "hero.subtitle":
    "NETbudget computes your disposable income, applies the 50/30/20 rule and gives tailored advice. 100% on your phone — no account, no cloud, no ads.",
  "hero.cta.appstore": "Download on the App Store",
  "hero.cta.learn": "See features",
  "hero.note": "Free. No ads. No data leaves your device.",

  // Stats strip
  "stats.languages": "languages",
  "stats.currencies": "currencies",
  "stats.cities": "cities",
  "stats.countries": "countries",

  // Screens gallery
  "screens.eyebrow": "App preview",
  "screens.title": "Designed to get to the point",
  "screens.subtitle": "Three tabs, zero friction. Compute your budget, convert currencies, tune your preferences.",
  "screens.budget": "Budget",
  "screens.converter": "Converter",
  "screens.settings": "Settings",

  // Features
  "features.eyebrow": "Built for real life",
  "features.title": "Everything that matters on a single screen",
  "features.subtitle":
    "Enter your income, rent, loans and expenses. NETbudget handles the rest.",

  "feature.income.title": "Multiple income sources",
  "feature.income.text":
    "Salary, freelance, rental, dividends… Each source has its own status and contribution rate.",

  "feature.rule.title": "50 / 30 / 20 rule",
  "feature.rule.text":
    "Your spending is split across Needs, Wants and Savings so you can immediately see where to act.",

  "feature.advice.title": "23 personalised tips",
  "feature.advice.text":
    "Debt ceiling 35%, rent ≤ 1/3 of net, 3-6 months emergency fund, investor profile — all based on your real numbers.",

  "feature.world.title": "Worldwide coverage",
  "feature.world.text":
    "558 cities across 59 countries, each with a cost-of-living index normalised to the country's national average.",

  "feature.currency.title": "Currency converter",
  "feature.currency.text":
    "15 currencies (USD, EUR, GBP, JPY, CFA franc, BRL, INR…) with live FX rates and conversion history.",

  "feature.languages.title": "8 fully translated languages",
  "feature.languages.text":
    "French, English, Spanish, Portuguese, German, Italian, Arabic and Japanese — UI, advice and PDF report.",

  "feature.pdf.title": "Clean PDF export",
  "feature.pdf.text":
    "A clear document with totals, breakdown and advice, exported in your chosen language.",

  "feature.privacy.title": "100% on-device",
  "feature.privacy.text":
    "No data leaves your phone. No account. No tracking. No ads.",

  "feature.donut.title": "Instant visualisation",
  "feature.donut.text":
    "A donut chart of your expenses and a 12-month projection with annual totals.",

  // What's new
  "whatsnew.eyebrow": "Version 1.6",
  "whatsnew.title": "The big international update",
  "whatsnew.subtitle":
    "NETbudget moves from a French budgeting companion to a worldwide tool — without compromising on privacy.",
  "whatsnew.item1.title": "8 fully translated languages",
  "whatsnew.item1.text": "French, English, Spanish, Portuguese, German, Italian, Arabic and Japanese.",
  "whatsnew.item2.title": "558 cities / 59 countries",
  "whatsnew.item2.text": "Two-step picker: pick your country, then your city grouped by region.",
  "whatsnew.item3.title": "Currency converter",
  "whatsnew.item3.text": "15 currencies with live exchange rates and history.",
  "whatsnew.item4.title": "Clickable public sources",
  "whatsnew.item4.text": "Numbeo, Eurostat, OECD, INSEE, Mercer, EIU, World Bank, BLS.",
  "whatsnew.item5.title": "Tab-based navigation",
  "whatsnew.item5.text": "Budget, Converter and Settings — one tap to switch.",
  "whatsnew.item6.title": "Translated advice",
  "whatsnew.item6.text": "23 personalised tip cards translated across all 8 languages.",

  // Reviews
  "reviews.eyebrow": "They use NETbudget",
  "reviews.title": "What users say",
  "reviews.subtitle": "Public reviews pulled directly from the App Store, refreshed at every site build.",

  // Privacy
  "privacy.eyebrow": "Privacy by default",
  "privacy.title": "Your data stays on your phone",
  "privacy.text":
    "NETbudget runs entirely offline. No account to create, no server storing your finances, no tracking. The only network call is for currency rates (one request every 6 hours).",
  "privacy.point1": "No account required",
  "privacy.point2": "No data sent anywhere",
  "privacy.point3": "No ads, no trackers",
  "privacy.point4": "Source code available on request",

  // Final CTA
  "cta.title": "Ready to take back control of your money?",
  "cta.subtitle": "Download NETbudget and count your disposable income in under 5 minutes.",
  "cta.button": "Download on the App Store",

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
  "footer.tagline": "Disposable income, 50/30/20 rule, tailored advice.",
  "footer.madeby": "Designed and built by",
  "footer.links": "Links",
  "footer.follow": "Follow",
  "footer.privacy": "Privacy policy",
  "footer.terms": "Terms of use",
  "footer.contact": "Contact",
  "footer.copyright": "© 2026 NETbudget. All rights reserved.",
  "footer.lang": "Language",

  // Privacy page
  "page.privacy.title": "Privacy policy",
  "page.privacy.intro":
    "NETbudget is designed to respect your privacy. This page describes how the app handles your data.",
  "page.privacy.section1.title": "What data is collected?",
  "page.privacy.section1.body":
    "NETbudget does not collect any personal data. Your income, expenses and settings are stored only on your device through the system's local storage (AsyncStorage). No information is transmitted to a server under our control.",
  "page.privacy.section2.title": "Network connections",
  "page.privacy.section2.body":
    "Only one network call is made: fetching currency rates via the public service open.er-api.com, with a 6-hour local cache. This request contains no identifier and no personal data. You can use the app fully offline by simply ignoring the Converter tab.",
  "page.privacy.section3.title": "Permissions",
  "page.privacy.section3.body":
    "The app does not request any specific system permission. No access to your contacts, location, calendar or photos is requested.",
  "page.privacy.section4.title": "Data deletion",
  "page.privacy.section4.body":
    "You can delete all your data at any time from the Settings tab, via the \"Reset all data\" button. Uninstalling the app also removes all locally stored data.",
  "page.privacy.section5.title": "Contact",
  "page.privacy.section5.body":
    "For any question regarding this policy, please contact stephane.pizeuil@gmail.com.",
  "page.privacy.updated": "Last updated",

  // Terms page
  "page.terms.title": "Terms of use",
  "page.terms.intro":
    "By using NETbudget, you agree to the following terms. Please read them carefully.",
  "page.terms.section1.title": "Purpose of the app",
  "page.terms.section1.body":
    "NETbudget is a personal budgeting estimation tool. The calculations provided (social charges, cost-of-living index, 50/30/20 advice) are informational and indicative. They do not replace the advice of a professional (financial advisor, accountant, tax expert).",
  "page.terms.section2.title": "Liability",
  "page.terms.section2.body":
    "The publisher cannot be held responsible for financial decisions made based on the information displayed. Contribution rates per status are estimates derived from public sources (service-public.fr, urssaf.fr); your actual payslip may differ.",
  "page.terms.section3.title": "Intellectual property",
  "page.terms.section3.body":
    "The NETbudget name, logo, interface and source code remain the property of the publisher. The 50/30/20 rule is derived from the work of Elizabeth Warren and Amelia Warren Tyagi, freely available in their books.",
  "page.terms.section4.title": "Changes to these terms",
  "page.terms.section4.body":
    "These terms may be updated. The last update date is shown at the bottom of the page. Continued use of the app after an update constitutes acceptance.",
  "page.terms.updated": "Last updated",

  // Back to home
  "back.home": "Back to home",
};

export const CATALOGS: Record<Locale, Catalog> = { fr, en };
