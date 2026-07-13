// Advice Engine — moteur de conseils personnalisés Premium.
//
// Fonctionnement :
//  1. Le catalogue `ADVICE_CATALOG_FR` est un tableau de `AdviceCard` avec un
//     prédicat `appliesWhen(profile)`.
//  2. `matchAdvice(profile)` filtre les cards qui matchent, trie par priorité.
//  3. L'UI affiche les 3-5 premières + une rotation pour éviter la lassitude.
//
// Corpus source : docs/advice-corpus-fr-v1.md (deep-research 2026-07-13).
// Ajouter/modifier des cards ici, pas ailleurs. Tout est en français ;
// la traduction 7 langues se fera une fois le corpus stabilisé.

import type {
  AdviceCard,
  AdvicePredicate,
  UserProfile,
} from "../types/advice";

// ============================================================================
// Helpers de prédicat (combinables)
// ============================================================================

const always: AdvicePredicate = () => true;

const ageIn = (...brackets: NonNullable<UserProfile["age"]>[]): AdvicePredicate =>
  (p) => !!p.age && brackets.includes(p.age);

const familyIn = (
  ...statuses: NonNullable<UserProfile["family"]>[]
): AdvicePredicate =>
  (p) => !!p.family && statuses.includes(p.family);

const housingIn = (
  ...statuses: NonNullable<UserProfile["housing"]>[]
): AdvicePredicate =>
  (p) => !!p.housing && statuses.includes(p.housing);

const tmiAtLeast = (min: NonNullable<UserProfile["tmi"]>): AdvicePredicate =>
  (p) => {
    if (!p.tmi) return false;
    const order: NonNullable<UserProfile["tmi"]>[] = ["0", "11", "30", "41", "45"];
    return order.indexOf(p.tmi) >= order.indexOf(min);
  };

const hasKids: AdvicePredicate = (p) =>
  p.family === "couple_with_kids" || p.family === "single_parent";

const and =
  (...preds: AdvicePredicate[]): AdvicePredicate =>
  (p) =>
    preds.every((f) => f(p));

// ============================================================================
// Catalogue FR — 15 cards initiales (à étendre à 30-50)
// ============================================================================

const VERIFIED = "2026-07-13"; // date de vérification du corpus

export const ADVICE_CATALOG_FR: AdviceCard[] = [
  // ==========================================================================
  // Épargne de précaution
  // ==========================================================================
  {
    id: "emergency-fund-locataire",
    category: "emergency",
    title: "Constitue 3 à 6 mois de dépenses sur ton Livret A",
    body:
      "En locataire, tu es exposé à des imprévus non couverts (déménagement d'urgence, caution, perte d'emploi). Vise 3 mois si tu es célibataire sans enfants, 6 mois si tu as des enfants ou revenu variable.",
    action: {
      label: "Ouvrir ou approvisionner ton Livret A",
      link: "https://www.economie.gouv.fr/particuliers/livret-a",
    },
    appliesWhen: housingIn("renter"),
    priority: 95,
    figures: [
      { label: "Livret A plafond", value: "22 950 €" },
      { label: "Taux 2026", value: "1,5%" },
    ],
    sources: [
      "https://www.economie.gouv.fr/actualites/epargne-reglementee-de-nouveaux-taux-pour-le-livret-et-le-lep-au-1er-fevrier-2026",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "lep-menages-modestes",
    category: "emergency",
    title: "Vérifie ton éligibilité au LEP à 2,5%",
    body:
      "Le Livret d'Épargne Populaire rapporte 2,5% en 2026 (contre 1,5% Livret A) mais est réservé aux ménages modestes (test de revenu fiscal de référence). Un couple avec 2 LEP peut placer 20 000 € à ce taux.",
    action: {
      label: "Vérifier l'éligibilité LEP",
      link: "https://www.economie.gouv.fr/particuliers/livret-epargne-populaire-lep",
    },
    appliesWhen: (p) => p.income === "low" || p.income === "medium",
    priority: 90,
    figures: [
      { label: "Taux LEP 2026", value: "2,5%" },
      { label: "Plafond", value: "10 000 €" },
    ],
    sources: [
      "https://www.economie.gouv.fr/actualites/epargne-reglementee-de-nouveaux-taux-pour-le-livret-et-le-lep-au-1er-fevrier-2026",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "ldds-cascade-livret-a",
    category: "emergency",
    title: "Après le Livret A rempli, ouvre un LDDS",
    body:
      "Livret A plafonné à 22 950 € ? Bascule le surplus sur un LDDS (12 000 € additionnels au même taux 1,5%). Ces deux livrets sont défiscalisés et disponibles à tout moment.",
    action: {
      label: "Ouvrir un LDDS dans ta banque",
      link: "https://www.service-public.fr",
    },
    appliesWhen: always,
    priority: 70,
    figures: [
      { label: "LDDS plafond", value: "12 000 €" },
      { label: "Cumul A+LDDS", value: "34 950 €" },
    ],
    sources: ["https://www.service-public.gouv.fr"],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // Investissement long terme (PEA / Assurance-vie)
  // ==========================================================================
  {
    id: "pea-jeune-actif",
    category: "long_term",
    title: "Ouvre un PEA dès maintenant, même vide",
    body:
      "L'ancienneté du PEA se compte depuis la date d'ouverture. Ouvrir un PEA à 25 ans avec 100 € te fait démarrer le compteur des 5 ans avant l'exonération d'IR. Tu pourras l'alimenter plus tard.",
    action: {
      label: "Ouvrir un PEA (banque ou courtier)",
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2385",
    },
    appliesWhen: ageIn("18-25", "26-35"),
    priority: 85,
    figures: [
      { label: "Plafond PEA", value: "150 000 €" },
      { label: "Fiscalité après 5 ans", value: "0% IR + 18,6% PS" },
    ],
    sources: [
      "https://www.service-public.gouv.fr/particuliers/vosdroits/F2385",
      "https://www.impots.gouv.fr/particulier/questions/jai-un-plan-depargne-en-actions-pea-les-retraits-sont-ils-imposables",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "av-vs-pea-nouvelle-parite",
    category: "long_term",
    title: "En 2026, arbitrage nouveau : AV vs PEA",
    body:
      "Depuis la LFSS 2026, les prélèvements sociaux sur PEA sont passés de 17,2% à 18,6% (nouvelle contribution CFA). L'assurance-vie reste à 17,2%. Sur du long terme, ce +1,4pt peut peser — considère les deux enveloppes.",
    action: {
      label: "Comparer PEA vs Assurance-vie",
    },
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 75,
    figures: [
      { label: "PS PEA", value: "18,6%" },
      { label: "PS AV", value: "17,2%" },
      { label: "Différence", value: "+1,4 pt" },
    ],
    sources: [
      "https://www.legifrance.gouv.fr (loi n° 2026-103 du 19 février 2026)",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "couple-pea-double",
    category: "long_term",
    title: "En couple, doublez votre capacité PEA",
    body:
      "Un couple marié ou pacsé peut détenir 2 PEA (1 chacun), soit 300 000 € de capacité totale. Chaque PEA garde sa propre ancienneté et fiscalité indépendante.",
    action: {
      label: "Ouvrir un 2e PEA au nom du conjoint",
    },
    appliesWhen: familyIn("couple_no_kids", "couple_with_kids"),
    priority: 60,
    figures: [
      { label: "Plafond couple", value: "300 000 €" },
      { label: "Cumul avec PEA-PME", value: "225 000 € / personne" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F2385"],
    lastVerified: VERIFIED,
  },
  {
    id: "av-abattement-fiscal",
    category: "long_term",
    title: "Assurance-vie : profite de l'abattement annuel",
    body:
      "Après 8 ans, tu peux retirer jusqu'à 4 600 € de gains par an sans payer d'IR (9 200 € en couple), grâce à l'abattement légal. Utile pour compléter tes revenus sans surcoût fiscal.",
    action: {
      label: "Programmer des rachats partiels annuels",
    },
    appliesWhen: and(
      ageIn("36-50", "51-65", "66+"),
      // À l'usage on ajoutera : hasAV && avAgeYears >= 8
    ),
    priority: 65,
    figures: [
      { label: "Abattement seul", value: "4 600 €" },
      { label: "Abattement couple", value: "9 200 €" },
      { label: "IR au-delà (< 150k€ primes)", value: "7,5%" },
    ],
    sources: ["https://www.france-epargne.fr/outils/fiscalite/fiscalite-placement"],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // Préparation retraite (PER)
  // ==========================================================================
  {
    id: "per-tmi-41",
    category: "retirement",
    title: "TMI à 41% ? Le PER devient très intéressant",
    body:
      "À TMI 41%, chaque euro versé sur un PER te fait économiser 41 centimes d'IR. Un versement de 10 000 € = 4 100 € d'économie d'impôt immédiate. Combine avec un PEA pour la croissance long terme.",
    action: {
      label: "Ouvrir un PER individuel",
    },
    appliesWhen: tmiAtLeast("41"),
    priority: 90,
    figures: [
      { label: "Économie 10k€ à TMI 41%", value: "4 100 €" },
      { label: "TMI break-even PER", value: "≥ 30%" },
    ],
    sources: [
      "https://www.info-per.fr",
      "https://prosper-conseil.fr",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "per-warning-tmi-retraite",
    category: "retirement",
    title: "PER : attention à ta TMI de retraite",
    body:
      "Le PER n'est fiscalement avantageux QUE si ta TMI à la retraite sera INFÉRIEURE à ta TMI active. Si tu penses rester à TMI 30%+ à la retraite (immobilier locatif, dividendes), l'AV ou le PEA seront plus intéressants.",
    action: {
      label: "Estimer ta TMI de retraite avant d'ouvrir un PER",
    },
    appliesWhen: and(tmiAtLeast("30"), ageIn("36-50", "51-65")),
    priority: 85,
    figures: [{ label: "Condition PER attractif", value: "TMI retraite < TMI active" }],
    sources: ["https://www.ramify.fr/epargne/per-pea-assurance-vie"],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // Crédit immobilier
  // ==========================================================================
  {
    id: "hcsf-taux-endettement",
    category: "real_estate",
    title: "Ne dépasse pas 35% d'endettement",
    body:
      "Le HCSF plafonne le taux d'effort à 35% des revenus nets, assurance emprunteur incluse. Au-delà, banque et courtier refusent le dossier (sauf dérogation 20% des dossiers). Vise 30% pour te laisser une marge de sécurité.",
    action: {
      label: "Calculer ton taux d'effort",
    },
    appliesWhen: housingIn("renter"),
    priority: 88,
    figures: [
      { label: "Plafond HCSF", value: "35%" },
      { label: "Marge conseillée", value: "30% max" },
      { label: "Durée max", value: "25 ans (27 en VEFA)" },
    ],
    sources: [
      "https://www.economie.gouv.fr/hcsf/mesures/mesure-relative-loctroi-de-credits-immobiliers",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "acheter-jeune-grande-ville",
    category: "housing",
    title: "Grande ville, jeune : réévalue louer vs acheter",
    body:
      "Dans les métropoles chères (Paris, Lyon, Bordeaux), le point d'équilibre acheter vs louer se déplace à 7-10 ans de détention. Si tu envisages de bouger dans les 5 ans, louer reste souvent plus rentable (frais de notaire absorbés).",
    action: {
      label: "Comparer avec un simulateur INSEE",
    },
    appliesWhen: and(ageIn("18-25", "26-35"), (p) => p.zone === "big_city"),
    priority: 70,
    sources: ["https://www.insee.fr"],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // Optimisation fiscale
  // ==========================================================================
  {
    id: "garde-enfants-credit-impot",
    category: "kids",
    title: "Enfant < 6 ans : réclame ton crédit d'impôt garde",
    body:
      "Les frais de crèche, halte-garderie ou assistante maternelle ouvrent droit à un crédit d'impôt de 50%, plafonné à 3 500 € de dépenses par enfant/an — soit 1 750 € de crédit par enfant. En garde alternée, le plafond est partagé.",
    action: {
      label: "Déclarer les frais de garde à la ligne 7GA",
      link: "https://www.impots.gouv.fr/particulier/questions/je-fais-garder-mon-jeune-enfant-lexterieur-du-domicile-que-puis-je-deduire",
    },
    appliesWhen: (p) => p.hasChildrenUnder6 === true,
    priority: 92,
    figures: [
      { label: "Taux crédit", value: "50%" },
      { label: "Plafond dépenses/enfant/an", value: "3 500 €" },
      { label: "Crédit max/enfant", value: "1 750 €" },
    ],
    sources: [
      "https://www.impots.gouv.fr/particulier/questions/je-fais-garder-mon-jeune-enfant-lexterieur-du-domicile-que-puis-je-deduire",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "relance-logement-jeanbrun",
    category: "tax",
    title: "Investir dans le neuf : nouveau dispositif Jeanbrun",
    body:
      "Le Pinel est mort fin 2024. Depuis février 2026, le dispositif Relance Logement (Jeanbrun) amortit 3,5% à 5,5% par an du prix du bien neuf loué (base 80% du prix), sur 9 ans minimum. Plus intéressant pour TMI ≥ 30%.",
    action: {
      label: "Se renseigner sur le dispositif Jeanbrun",
      link: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053508155",
    },
    appliesWhen: and(tmiAtLeast("30"), ageIn("36-50", "51-65")),
    priority: 60,
    figures: [
      { label: "Amortissement neuf social", value: "3,5% → 5,5%" },
      { label: "Engagement min", value: "9 ans" },
    ],
    sources: [
      "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053508155",
    ],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // Transmission
  // ==========================================================================
  {
    id: "av-transmission-abattement",
    category: "kids",
    title: "AV avant 70 ans : 152 500 € par bénéficiaire",
    body:
      "Les versements sur assurance-vie avant tes 70 ans ouvrent droit à 152 500 € d'abattement par bénéficiaire lors de la transmission. Au-delà, taxation 20% jusqu'à 700 k€ puis 31,25%. Outil clé pour transmettre à ses enfants.",
    action: {
      label: "Vérifier les bénéficiaires de ton AV",
    },
    appliesWhen: and(ageIn("36-50", "51-65"), hasKids),
    priority: 80,
    figures: [
      { label: "Abattement/bénéficiaire", value: "152 500 €" },
      { label: "Taxation 152k€ → 700k€", value: "20%" },
      { label: "Au-delà 700k€", value: "31,25%" },
    ],
    sources: ["https://www.legifrance.gouv.fr (art. 990 I CGI)"],
    lastVerified: VERIFIED,
  },
  {
    id: "av-souscrire-avant-70-ans",
    category: "kids",
    title: "Souscris ton AV avant 70 ans si possible",
    body:
      "Les versements après 70 ans passent sous un régime moins favorable (abattement global de 30 500 € seulement, tous bénéficiaires confondus). Si tu approches 70 ans, envisage un versement significatif avant la date anniversaire.",
    action: {
      label: "Planifier un versement AV avant 70 ans",
    },
    appliesWhen: ageIn("51-65"),
    priority: 78,
    figures: [
      { label: "Avant 70 ans/bénéficiaire", value: "152 500 €" },
      { label: "Après 70 ans (tous bénéf.)", value: "30 500 €" },
    ],
    sources: ["https://www.legifrance.gouv.fr (art. 990 I & 757 B CGI)"],
    lastVerified: VERIFIED,
  },
];

// ============================================================================
// Moteur : match + tri
// ============================================================================

export function matchAdvice(
  profile: UserProfile,
  catalog: AdviceCard[] = ADVICE_CATALOG_FR,
): AdviceCard[] {
  return catalog
    .filter((card) => card.appliesWhen(profile))
    .sort((a, b) => b.priority - a.priority);
}

// Retourne les N conseils prioritaires. Utilise le seed (ex: userId + weekOfYear)
// pour faire tourner les conseils de même priorité au fil des semaines.
export function topAdvice(
  profile: UserProfile,
  count = 5,
  seed = 0,
  catalog: AdviceCard[] = ADVICE_CATALOG_FR,
): AdviceCard[] {
  const matched = matchAdvice(profile, catalog);
  // Regroupe par priorité et rotate à seed près pour éviter l'ordre statique
  const groups = new Map<number, AdviceCard[]>();
  for (const c of matched) {
    const g = groups.get(c.priority) ?? [];
    g.push(c);
    groups.set(c.priority, g);
  }
  const priorities = [...groups.keys()].sort((a, b) => b - a);
  const out: AdviceCard[] = [];
  for (const p of priorities) {
    const g = groups.get(p)!;
    const offset = ((seed % g.length) + g.length) % g.length;
    for (let i = 0; i < g.length && out.length < count; i++) {
      out.push(g[(offset + i) % g.length]);
    }
    if (out.length >= count) break;
  }
  return out;
}
