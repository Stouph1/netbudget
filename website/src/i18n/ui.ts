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
  "privacy.title": "Sans compte, tes données restent sur ton téléphone",
  "privacy.text":
    "NETbudget fonctionne entièrement hors ligne : aucun compte à créer, aucune de tes finances sur un serveur, aucun traceur. La seule connexion sert à récupérer les taux de change. Si tu prends un abonnement, la synchronisation devient possible — et tu choisis alors ce que tu enregistres.",
  "privacy.point1": "Aucun compte requis",
  "privacy.point2": "Rien n'est envoyé sans compte",
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
  // --- Accessibilité ---------------------------------------------------
  "a11y.skipToContent": "Aller au contenu",

  // --- Fil d'Ariane ----------------------------------------------------
  "breadcrumb.home": "Accueil",
  "breadcrumb.label": "Vous êtes ici",

  // --- Barre d'action mobile -------------------------------------------
  "sticky.title": "Sache ce qu'il te reste vraiment",
  "sticky.sub": "Gratuit, sans compte",
  "sticky.cta": "Télécharger",

  // --- Titres et descriptions de pages ---------------------------------
  "page.faq.title": "Questions fréquentes",
  "page.faq.desc": "Combien ça coûte, où vont tes données, dans quels pays ça marche : les réponses aux questions qu'on nous pose vraiment.",
  "page.privacy.desc": "Ce que NETbudget fait de tes données, précisément. Sans compte, rien ne quitte ton téléphone ; avec un compte, tu choisis ce que tu enregistres.",
  "page.terms.desc": "Les conditions d'utilisation de NETbudget : ce que l'application fait, ce qu'elle ne promet pas, et tes droits.",
  "page.thanks.title": "Merci",
  "page.thanks.desc": "Ton message est parti.",
  "page.thanks.h1": "Message reçu",
  "page.thanks.body": "Merci d'avoir écrit. C'est une personne qui lit, pas un robot — et ça change la qualité de la réponse.",
  "page.thanks.delay": "Réponse sous 48 heures en semaine.",
  "page.thanks.follow": "En attendant, les nouveautés sont publiées sur",

  // --- Page 404 --------------------------------------------------------
  "nf.title": "Cette page n'existe pas",
  "nf.desc": "Le lien est peut-être ancien, ou l'adresse comporte une faute. Rien n'est cassé de ton côté.",
  "nf.home": "Retour à l'accueil",
  "nf.faq": "Questions fréquentes",
  "nf.game.eyebrow": "Puisque tu es là",
  "nf.game.hint": "Garde le logo en l'air. Doigt, souris ou flèches du clavier.",
  "nf.game.score": "Score",
  "nf.game.start": "Un petit jeu, le temps de te remettre",
  "nf.game.play": "Jouer",
  "nf.game.again": "Rejouer",
  "nf.game.over": "Perdu",
  "nf.game.best": "Meilleur score :",
  "nf.game.a11y": "Jeu : garder le logo NETbudget en l'air avec une raquette.",
  "nf.game.footnote": "Le score reste sur ton appareil. Évidemment.",

  // --- FAQ -------------------------------------------------------------
  "faq.eyebrow": "Questions fréquentes",
  "faq.title": "Ce qu'on nous demande le plus",
  "faq.intro": "Des réponses courtes et franches, y compris quand la réponse ne nous arrange pas.",
  "faq.seeAll": "Voir toutes les questions",

  "faq.free.q": "C'est vraiment gratuit ?",
  "faq.free.a": "Oui. Le budget complet — revenus, dépenses, prêts, reste à vivre, règle 50/30/20, convertisseur — est gratuit et sans limite de temps. Un abonnement facultatif ajoute la synchronisation entre appareils, les budgets partagés et les conseils personnalisés. Aucune publicité, à aucun moment.",
  "faq.account.q": "Faut-il créer un compte ?",
  "faq.account.a": "Non, et c'est un choix de conception. Tu peux installer l'app et t'en servir sans jamais donner d'adresse e-mail. Le compte ne devient utile que si tu veux retrouver tes données sur un autre appareil ou partager un budget avec quelqu'un.",
  "faq.data.q": "Où sont stockées mes données financières ?",
  "faq.data.a": "Sans compte, uniquement dans la mémoire de ton téléphone : rien n'est envoyé. Avec un compte, ce que tu choisis d'enregistrer est synchronisé sur nos serveurs. La page de confidentialité détaille précisément quoi, et dit aussi ce qui n'est pas encore chiffré de bout en bout.",
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
  "faq.android.a": "L'application est développée pour les deux plateformes depuis le début. La version iOS est publiée en premier ; la version Android suit.",
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

  "page.privacy.section3.title": "État réel du chiffrement",
  "page.privacy.section3.body":
    "Il est actif par défaut, dès la création du compte, et ne se désactive pas. Une clé est créée sur ton téléphone et ne le quitte jamais : tes données partent chiffrées, nous ne pouvons pas les lire, et nous ne pouvons pas les remettre à qui nous les demanderait. Tu n'as rien à configurer. L'activation a lieu à la première connexion ; dans le cas rare où elle échoue faute de réseau, l'application réessaie au lancement suivant, et ce qui aurait été synchronisé entre-temps n'est pas encore protégé. Douze mots, consultables à tout moment depuis ton profil, permettent de retrouver cet accès sur un autre appareil ; nous ne les connaissons pas. En conséquence, changer de téléphone sans les avoir conservés rend les données synchronisées inaccessibles — ton budget reste intact sur l'appareil d'origine. C'est la contrepartie inévitable d'un chiffrement que nous ne pouvons pas contourner, et nous préférons l'écrire plutôt que de le laisser découvrir. Dans un espace partagé, l'espace possède sa propre clé, dont chaque membre garde une copie chiffrée avec la sienne. Les échanges avec nos serveurs sont chiffrés en transit, et ton jeton de session est conservé dans le trousseau sécurisé du système.",

  "page.privacy.section4.title": "Budgets partagés",
  "page.privacy.section4.body":
    "Si tu crées un espace partagé ou rejoins celui de quelqu'un, les membres de cet espace voient le budget, les objectifs et les événements qui y vivent, ainsi que ton pseudo et ta photo de profil. Ils ne voient jamais ton espace personnel. Une invitation est un code à usage unique valable quatorze jours ; aucune adresse e-mail n'est requise pour inviter quelqu'un. Quitter un espace cesse immédiatement ton accès à son contenu.",

  "page.privacy.section5.title": "Connexions réseau",
  "page.privacy.section5.body":
    "Sans compte, l'application contacte deux services, sans jamais transmettre d'identifiant : open.er-api.com pour les taux de change, avec un cache local, et itunes.apple.com pour savoir si une mise à jour est disponible. Avec un compte, elle communique avec Supabase, qui héberge la base de données, l'authentification et le stockage des photos. Si tu choisis Apple ou Google pour te connecter, ce fournisseur est sollicité au moment de la connexion. Si tu prends un abonnement, l'application interroge RevenueCat pour savoir ce que ton compte a le droit d'ouvrir. Les taux d'inflation affichés dans les conseils sont embarqués dans l'application, précisément pour n'avoir à interroger aucun institut de statistiques — ce qui reviendrait à lui indiquer où tu vis à chaque ouverture. Les nombreux liens vers les sites officiels cités dans les conseils ne sont ouverts que si tu les touches, et dans ton navigateur.",

  "page.privacy.section6.title": "Sous-traitants",
  "page.privacy.section6.body":
    "Supabase héberge les données de compte. Apple et Google interviennent si tu utilises leur méthode de connexion, et pour la vente et l'encaissement des abonnements. RevenueCat, qui gère les abonnements pour notre compte, reçoit un identifiant de compte et les informations d'achat transmises par la boutique — jamais tes données budgétaires, qu'il ne pourrait pas lire, et jamais tes coordonnées bancaires, que nous ne voyons pas davantage. open.er-api.com fournit les taux de change. Aucun autre tiers ne reçoit tes données : il n'y a ni publicité, ni mesure d'audience, ni traceur, ni revente. Nous ne vendons pas de données, et ce n'est pas notre modèle économique — l'application se finance par l'abonnement.",

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
  "page.terms.section1.body":
    "Un outil d'estimation budgétaire personnel. Il calcule ton reste à vivre, applique la règle 50/30/20 et rassemble des informations issues de sources publiques. Ce n'est ni une banque, ni un établissement de paiement, ni un conseiller en investissement : NETbudget ne détient pas d'argent, n'exécute aucune opération et ne gère aucun placement.",

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
    "L'application est utilisable gratuitement et sans limite de temps : budget, prêts, reste à vivre, règle 50/30/20 et convertisseur. Un abonnement facultatif ouvre la synchronisation entre appareils, les conseils personnalisés et les budgets d'événement. La formule Solo suit un événement à la fois et n'inclut pas le budget mariage, qui se prépare à plusieurs et appartient aux formules Duo et Famille. Les limites exactes de chaque formule sont indiquées dans l'application avant tout paiement.",

  "page.terms.section7.title": "Paiement, renouvellement, résiliation",
  "page.terms.section7.body":
    "Les abonnements sont vendus et encaissés par l'App Store d'Apple ou le Play Store de Google, jamais par nous — nous ne voyons donc aucune donnée bancaire. Ils se renouvellent automatiquement à échéance, sauf résiliation au moins vingt-quatre heures avant. La résiliation se fait depuis les réglages de ton téléphone, dans la gestion des abonnements : nous n'avons pas la main dessus, et c'est mieux ainsi — personne ne peut te retenir ni te faire passer par un service client. Elle prend effet à la fin de la période déjà payée, sans frais, et tes données restent accessibles en version gratuite.",

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
    "Le nom NETbudget, le logo, l'interface et le code source appartiennent à l'éditeur. Tes données, elles, t'appartiennent : nous ne revendiquons aucun droit dessus et ne les exploitons pas à d'autres fins que de faire fonctionner l'application. La règle 50/30/20 est issue des travaux d'Elizabeth Warren et Amelia Warren Tyagi, publiés dans leurs ouvrages.",

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
  "privacy.title": "Without an account, your data stays on your phone",
  "privacy.text":
    "NETbudget works entirely offline: no account to create, none of your finances on a server, no trackers. The only connection fetches exchange rates. If you subscribe, syncing becomes possible — and you decide what gets stored.",
  "privacy.point1": "No account required",
  "privacy.point2": "Nothing sent without an account",
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
  // --- Accessibility ----------------------------------------------------
  "a11y.skipToContent": "Skip to content",

  // --- Breadcrumb -------------------------------------------------------
  "breadcrumb.home": "Home",
  "breadcrumb.label": "You are here",

  // --- Mobile action bar ------------------------------------------------
  "sticky.title": "Know what you really have left",
  "sticky.sub": "Free, no account",
  "sticky.cta": "Download",

  // --- Page titles and descriptions -------------------------------------
  "page.faq.title": "Frequently asked questions",
  "page.faq.desc": "What it costs, where your data goes, which countries are covered: answers to the questions people actually ask.",
  "page.privacy.desc": "Exactly what NETbudget does with your data. Without an account nothing leaves your phone; with one, you choose what gets stored.",
  "page.terms.desc": "NETbudget's terms of use: what the app does, what it does not promise, and your rights.",
  "page.thanks.title": "Thank you",
  "page.thanks.desc": "Your message has been sent.",
  "page.thanks.h1": "Message received",
  "page.thanks.body": "Thanks for writing. A person reads these, not a bot — and it shows in the answer.",
  "page.thanks.delay": "Reply within 48 hours on weekdays.",
  "page.thanks.follow": "In the meantime, updates are posted on",

  // --- 404 page ---------------------------------------------------------
  "nf.title": "This page does not exist",
  "nf.desc": "The link may be old, or the address has a typo. Nothing is broken on your side.",
  "nf.home": "Back to home",
  "nf.faq": "Frequently asked questions",
  "nf.game.eyebrow": "Since you are here",
  "nf.game.hint": "Keep the logo in the air. Finger, mouse or arrow keys.",
  "nf.game.score": "Score",
  "nf.game.start": "A small game, while you are here",
  "nf.game.play": "Play",
  "nf.game.again": "Play again",
  "nf.game.over": "Missed",
  "nf.game.best": "Best score:",
  "nf.game.a11y": "Game: keep the NETbudget logo in the air with a paddle.",
  "nf.game.footnote": "The score stays on your device. Obviously.",

  // --- FAQ --------------------------------------------------------------
  "faq.eyebrow": "Frequently asked questions",
  "faq.title": "What people ask us most",
  "faq.intro": "Short, straight answers — including when the answer is not in our favour.",
  "faq.seeAll": "See all questions",

  "faq.free.q": "Is it really free?",
  "faq.free.a": "Yes. The full budget — income, expenses, loans, disposable income, the 50/30/20 rule, the converter — is free with no time limit. An optional subscription adds syncing across devices, shared budgets and tailored advice. No advertising, ever.",
  "faq.account.q": "Do I need an account?",
  "faq.account.a": "No, and that is a design choice. You can install the app and use it without ever giving an email address. An account only becomes useful if you want your data on another device or want to share a budget with someone.",
  "faq.data.q": "Where is my financial data stored?",
  "faq.data.a": "Without an account, only in your phone's storage: nothing is sent. With an account, whatever you choose to save is synchronised to our servers. The privacy page spells out exactly what, and also says what is not yet end-to-end encrypted.",
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
  "faq.android.a": "The app is built for both platforms from the start. The iOS version ships first; Android follows.",
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

  "page.privacy.section3.title": "Where encryption actually stands",
  "page.privacy.section3.body":
    "It is on by default, from the moment the account is created, and cannot be switched off. A key is created on your phone and never leaves it: your data goes out encrypted, we cannot read it, and we cannot hand it to anyone who asks. There is nothing for you to configure. It is turned on at your first sign-in; in the rare case where that fails for lack of network, the app tries again at the next launch, and anything synchronised in between is not yet protected. Twelve words, viewable at any time from your profile, let you recover that access on another device; we do not know them. As a result, changing phone without having kept them makes your synced data inaccessible — your budget stays intact on the original device. That is the unavoidable price of encryption we cannot bypass, and we would rather write it down than let you discover it. In a shared space, the space has its own key, and each member keeps a copy encrypted with theirs. Traffic to our servers is encrypted in transit, and your session token is kept in the operating system's secure keystore.",

  "page.privacy.section4.title": "Shared budgets",
  "page.privacy.section4.body":
    "If you create a shared space or join someone else's, the members of that space can see the budget, goals and events that live in it, along with your username and profile picture. They never see your personal space. An invitation is a single-use code valid for fourteen days; no email address is required to invite someone. Leaving a space ends your access to its contents immediately.",

  "page.privacy.section5.title": "Network connections",
  "page.privacy.section5.body":
    "Without an account, the app contacts two services and never sends an identifier: open.er-api.com for exchange rates, with a local cache, and itunes.apple.com to check whether an update is available. With an account, it talks to Supabase, which hosts the database, authentication and photo storage. If you sign in with Apple or Google, that provider is contacted at sign-in time. If you subscribe, the app asks RevenueCat what your account is entitled to open. The inflation rates shown in the advice are bundled into the app, precisely so that no statistics institute has to be queried — which would tell it where you live every time you open the app. The many links to official websites quoted in the advice are only opened if you tap them, and in your browser.",

  "page.privacy.section6.title": "Processors",
  "page.privacy.section6.body":
    "Supabase hosts account data. Apple and Google are involved if you use their sign-in method, and for selling and charging subscriptions. RevenueCat, which manages subscriptions on our behalf, receives an account identifier and the purchase information passed on by the store — never your budget data, which it could not read anyway, and never your payment details, which we do not see either. open.er-api.com supplies exchange rates. No other third party receives your data: there is no advertising, no analytics, no tracker, no resale. We do not sell data, and it is not our business model — the app is funded by subscriptions.",

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
  "page.terms.section1.body":
    "A personal budgeting estimation tool. It works out your disposable income, applies the 50/30/20 rule and gathers information from public sources. It is not a bank, a payment institution or an investment adviser: NETbudget holds no money, executes no transaction and manages no investment.",

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
    "The app is usable free of charge with no time limit: budget, loans, disposable income, the 50/30/20 rule and the converter. An optional subscription unlocks syncing across devices, tailored advice and event budgets. The Solo plan tracks one event at a time and does not include the wedding budget, which is planned together and belongs to the Duo and Family plans. Each plan's exact limits are shown in the app before any payment.",

  "page.terms.section7.title": "Payment, renewal, cancellation",
  "page.terms.section7.body":
    "Subscriptions are sold and charged by Apple's App Store or Google's Play Store, never by us — so we never see any payment details. They renew automatically at the end of each period unless cancelled at least twenty-four hours beforehand. Cancellation happens in your phone's settings, under subscription management: we have no control over it, and that is better — nobody can hold you back or route you through a retention agent. It takes effect at the end of the period you already paid for, at no cost, and your data stays accessible on the free tier.",

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
    "The NETbudget name, logo, interface and source code belong to the publisher. Your data belongs to you: we claim no rights over it and use it for nothing other than running the app. The 50/30/20 rule comes from the work of Elizabeth Warren and Amelia Warren Tyagi, published in their books.",

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
