// Advice Engine — moteur de conseils personnalisés Premium.
//
// Fonctionnement :
//  1. Le catalogue `ADVICE_CATALOG_FR` est un tableau de `AdviceCard` avec un
//     prédicat `appliesWhen(profile)`.
//  2. `matchAdvice(profile)` filtre les cards qui matchent, trie par priorité.
//  3. `groupByAdviceGroup(cards)` regroupe par thème visible pour l'UI.
//  4. L'UI affiche les cards regroupées par catégorie (Budget/Invest/Fiscalité…).
//
// Corpus source : docs/advice-corpus-fr-v1.md (deep-research 2026-07-13).

import type {
  AdviceCard,
  AdviceCategory,
  AdviceGroup,
  AdvicePredicate,
  ChildAgeBracket,
  UserProfile,
} from "../types/advice";
import { ADVICE_GROUPS, hasAnyKids, hasChildrenIn } from "../types/advice";

// ============================================================================
// Helpers de prédicat
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

const savingsCapacityLow: AdvicePredicate = (p) =>
  p.monthlySavingsCapacity === "under_100" ||
  p.monthlySavingsCapacity === "100_300";

const kids = (...brackets: ChildAgeBracket[]) => hasChildrenIn(brackets);

const and =
  (...preds: AdvicePredicate[]): AdvicePredicate =>
  (p) =>
    preds.every((f) => f(p));

// ============================================================================
// Répartition budgétaire personnalisée (adaptée du 50/30/20 selon profil).
// Heuristique v1 — à raffiner via deep-research en v1.1.
// ============================================================================

export function computeBudgetSplit(p: UserProfile): {
  besoins: number;
  envies: number;
  epargne: number;
} {
  let besoins = 50;
  let envies = 30;
  let epargne = 20;

  const isYoungAdult = p.age === "18-25" || p.age === "26-35";
  const isSenior = p.age === "66+";
  const isRenter = p.housing === "renter";
  const isOwner = p.housing === "owner";
  const isAccessor = p.housing === "accessor";
  const hasChildren =
    p.family === "couple_with_kids" || p.family === "single_parent";
  const isSingleParent = p.family === "single_parent";
  const isHighTMI = p.tmi === "41" || p.tmi === "45";
  const savingsHigh =
    p.monthlySavingsCapacity === "800_2000" ||
    p.monthlySavingsCapacity === "2000_plus";
  const savingsLow =
    p.monthlySavingsCapacity === "under_100" ||
    p.monthlySavingsCapacity === "100_300";

  // Jeune locataire : loyer > moyenne, mais compensé par flexibilité
  if (isYoungAdult && isRenter) {
    besoins += 5;
  }

  // Parent solo : revenu unique, budget serré
  if (isSingleParent) {
    besoins += 15;
    envies -= 15;
  } else if (hasChildren) {
    // Couple avec enfants : + charges enfants, prioriser épargne (études)
    besoins += 5;
    envies -= 10;
    epargne += 5;
  }

  // Accédant : mensualité crédit prend une part importante
  if (isAccessor) {
    besoins += 10;
    envies -= 10;
  } else if (isOwner && isSenior) {
    // Sénior propriétaire crédit remboursé : liberté sur envies/épargne
    besoins -= 15;
    envies += 5;
    epargne += 10;
  }

  // Haute TMI = capacité d'épargne + défiscalisation
  if (isHighTMI || savingsHigh) {
    envies -= 5;
    epargne += 5;
  }

  // Capacité épargne faible : ne pas surcharger l'épargne théorique
  if (savingsLow) {
    envies += 5;
    epargne -= 5;
  }

  // Clamp aux bornes raisonnables
  besoins = Math.max(30, Math.min(80, besoins));
  envies = Math.max(5, Math.min(50, envies));
  epargne = Math.max(5, Math.min(50, epargne));

  // Normalize à 100
  const total = besoins + envies + epargne;
  besoins = Math.round((besoins / total) * 100);
  envies = Math.round((envies / total) * 100);
  epargne = 100 - besoins - envies;

  return { besoins, envies, epargne };
}

// ============================================================================
// Archétypes de mix budgétaires — noms sympa pour rendre le repère mémorable.
// ============================================================================

export type BudgetMixProfile = {
  name: string;        // ex: "Le Bâtisseur"
  tagline: string;     // 1 ligne courte
  description: string; // 2-3 phrases pour expliquer simplement
};

export function getBudgetMixProfile(p: UserProfile): BudgetMixProfile {
  const isSingleParent = p.family === "single_parent";
  const hasChildren = p.family === "couple_with_kids" || isSingleParent;
  const isAccessor = p.housing === "accessor";
  const isOwnerSenior = p.housing === "owner" && p.age === "66+";
  const isHighTMI = p.tmi === "41" || p.tmi === "45";
  const isYoungRenter =
    (p.age === "18-25" || p.age === "26-35") && p.housing === "renter";
  const savingsLow =
    p.monthlySavingsCapacity === "under_100" ||
    p.monthlySavingsCapacity === "100_300";
  const isUnder18 = p.age === "under_18";

  // Cas spécial ado (avant tout)
  if (isUnder18) {
    return {
      name: "L'Apprenti",
      tagline: "Apprendre les bases",
      description:
        "À ton âge, l'objectif n'est pas d'optimiser — c'est de comprendre comment ton argent fonctionne. Épargne systématique + petit budget hebdo suffisent largement pour poser les bases.",
    };
  }

  // Ordre de priorité : du plus spécifique au plus générique
  if (isSingleParent) {
    return {
      name: "Le Capitaine Solo",
      tagline: "Tenir la barre à un seul",
      description:
        "Tu jongles avec un revenu unique + les charges enfants. Budget serré mais épargne à protéger absolument pour la sécurité et l'avenir des enfants.",
    };
  }

  if (hasChildren) {
    return {
      name: "Le Bâtisseur",
      tagline: "Construire pour la famille",
      description:
        "Charges familiales élevées + horizon long. Tu réduis les envies pour prioriser l'épargne (études, imprévus). Approche pragmatique : chaque euro compte.",
    };
  }

  if (isOwnerSenior) {
    return {
      name: "Le Sérénité",
      tagline: "Récolter ce qui a été construit",
      description:
        "Crédit remboursé, charges légères. Plus de marge sur les plaisirs (voyages, projets) tout en gardant une bonne épargne pour la retraite et la transmission.",
    };
  }

  if (isAccessor) {
    return {
      name: "Le Grimpeur",
      tagline: "Monter vers ton toit",
      description:
        "La mensualité de crédit prend une part importante — c'est un effort temporaire pour construire ton patrimoine. Compresse les envies, garde l'épargne stable.",
    };
  }

  if (isHighTMI) {
    return {
      name: "Le Stratège",
      tagline: "Optimiser fiscalement",
      description:
        "Ta TMI te permet de défiscaliser : PER (économie d'impôt immédiate), PEA + AV (croissance long terme). Chaque euro épargné vaut plus qu'un euro brut.",
    };
  }

  if (isYoungRenter && savingsLow) {
    return {
      name: "Le Débutant",
      tagline: "Poser les fondations",
      description:
        "Ton loyer prend une part importante et tu débutes ta vie active. Priorité 1 : constituer 1 mois de dépenses sur Livret A. Priorité 2 : ouvrir PEA vide (l'ancienneté commence à courir).",
    };
  }

  if (isYoungRenter) {
    return {
      name: "Le Sprinteur",
      tagline: "Capitaliser sur ta jeunesse",
      description:
        "Tu as l'horizon long en atout majeur. Ouvre PEA + AV même vides pour prendre date, puis épargne agressivement dès que ta capacité le permet. Les intérêts composés font le reste.",
    };
  }

  return {
    name: "L'Équilibré",
    tagline: "La règle classique",
    description:
      "Ta situation suit le repère 50/30/20 largement utilisé en finance perso. Un bon point de départ pour la plupart des profils — solide, adaptable.",
  };
}

// Explique POURQUOI le mix est ce qu'il est, pour la modal d'info.
// Renvoie 3 lignes explicatives (une par catégorie) + un reminder.
export function explainBudgetSplit(p: UserProfile): {
  split: { besoins: number; envies: number; epargne: number };
  isPersonalized: boolean;
  mix: BudgetMixProfile;
  besoinsReason: string;
  enviesReason: string;
  epargneReason: string;
  reminder: string;
} {
  const split = computeBudgetSplit(p);
  const isPersonalized = !!(p.age && p.family);

  const isRenter = p.housing === "renter";
  const isAccessor = p.housing === "accessor";
  const isOwnerSenior = p.housing === "owner" && p.age === "66+";
  const hasChildren =
    p.family === "couple_with_kids" || p.family === "single_parent";
  const isSingleParent = p.family === "single_parent";

  // Besoins
  let besoinsReason = "logement, factures, courses — le socle incompressible.";
  if (isAccessor)
    besoinsReason = "mensualité de crédit + charges — la part fixe pèse plus.";
  else if (isSingleParent)
    besoinsReason = "revenu unique et charges enfants — le socle est serré.";
  else if (hasChildren)
    besoinsReason =
      "charges familiales (école, alimentation, vêtements) tirent le poste vers le haut.";
  else if (isRenter)
    besoinsReason = "loyer + charges — souvent le plus gros poste en location.";
  else if (isOwnerSenior)
    besoinsReason =
      "crédit remboursé + charges légères — plus de marge que la moyenne.";

  // Envies
  let enviesReason = "loisirs, sorties, resto, achats plaisir — le carburant du quotidien.";
  if (isSingleParent)
    enviesReason =
      "à limiter pour maintenir l'épargne sans se priver totalement.";
  else if (hasChildren)
    enviesReason =
      "à modérer — priorité aux imprévus enfants (école, activités, santé).";
  else if (isOwnerSenior)
    enviesReason =
      "marge élargie maintenant que le crédit est remboursé — profite-en (voyages, projets).";

  // Épargne
  let epargneReason = "épargne de précaution + investissements long terme.";
  if (split.epargne >= 25)
    epargneReason =
      "priorité forte — anticipe études enfants, retraite ou projet immo.";
  else if (split.epargne <= 15)
    epargneReason =
      "à protéger malgré le budget serré — même 5% construit un matelas sur 12 mois.";
  else if (p.tmi === "41" || p.tmi === "45")
    epargneReason =
      "capacité et défiscalisation à exploiter (PEA + PER + AV combinés).";

  const reminder = isPersonalized
    ? "C'est un repère basé sur ton profil, pas une règle absolue. Adapte selon ta réalité mensuelle."
    : "Complète ton profil dans Réglages → Conseils personnalisés pour recevoir une répartition adaptée à ta situation.";

  return {
    split,
    isPersonalized,
    mix: getBudgetMixProfile(p),
    besoinsReason,
    enviesReason,
    epargneReason,
    reminder,
  };
}

// ============================================================================
// Catalogue FR
// ============================================================================

const VERIFIED = "2026-07-13";

export const ADVICE_CATALOG_FR: AdviceCard[] = [
  // ==========================================================================
  // BUDGET & ÉPARGNE
  // ==========================================================================
  {
    id: "priority-emergency-fund",
    category: "emergency",
    title: "Priorité 1 : constituer 1 mois de dépenses",
    body:
      "Si ton épargne de précaution < 1 mois de dépenses, mets en pause tout le reste (PEA, PER, projets). Concentre-toi sur constituer un matelas sur Livret A. C'est le socle qui te protège des imprévus.",
    action: {
      label: "Alimenter le Livret A",
      link: "https://www.economie.gouv.fr/particuliers/livret-a",
    },
    appliesWhen: savingsCapacityLow,
    priority: 100,
    figures: [
      { label: "Objectif", value: "1 mois min." },
      { label: "Cible finale", value: "3-6 mois" },
    ],
    sources: [
      "https://www.economie.gouv.fr/particuliers/livret-a",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "budget-split-personalized",
    category: "emergency",
    title: "Ta répartition budgétaire idéale",
    body: (p) => {
      const s = computeBudgetSplit(p);
      const parts: string[] = [];
      if (s.besoins >= 60) parts.push("logement + charges pèsent lourd");
      if (s.epargne >= 25) parts.push("marge d'épargne significative");
      if (s.epargne <= 15) parts.push("épargne à protéger malgré tout");
      const context = parts.length ? ` (${parts.join(", ")})` : "";
      return `Adaptée à ton profil${context}. La règle 50/30/20 classique ne convient pas à tout le monde — voici les ratios recommandés pour toi. Ajuste sur 1-3 mois puis vérifie.`;
    },
    action: { label: "Comparer avec ta réalité dans le tab Budget" },
    appliesWhen: always,
    priority: 80,
    figures: (p) => {
      const s = computeBudgetSplit(p);
      return [
        { label: "Besoins", value: `${s.besoins}%` },
        { label: "Envies", value: `${s.envies}%` },
        { label: "Épargne", value: `${s.epargne}%` },
      ];
    },
    sources: [
      "Heuristique dérivée de Banque de France, INSEE, littérature finance perso 2026",
      "https://www.banque-france.fr",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "emergency-fund-locataire",
    category: "emergency",
    title: "Constitue 3 à 6 mois de dépenses",
    body:
      "En locataire, tu es exposé aux imprévus non couverts (déménagement, caution, perte d'emploi). Vise 3 mois si célibataire, 6 mois avec enfants ou revenu variable. À placer sur Livret A + LDDS.",
    action: {
      label: "Ouvrir/alimenter Livret A",
      link: "https://www.economie.gouv.fr/particuliers/livret-a",
    },
    appliesWhen: housingIn("renter"),
    priority: 90,
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
      "Le Livret d'Épargne Populaire rapporte 2,5% en 2026 (contre 1,5% Livret A) mais est réservé aux ménages modestes (test sur revenu fiscal). Un couple avec 2 LEP peut placer 20 000 € à ce taux.",
    action: {
      label: "Vérifier l'éligibilité LEP",
      link: "https://www.economie.gouv.fr/particuliers/livret-epargne-populaire-lep",
    },
    appliesWhen: (p) => p.income === "low" || p.income === "medium",
    priority: 85,
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
    title: "Livret A rempli ? Bascule sur LDDS",
    body:
      "Livret A plafonné à 22 950 € ? Le surplus va sur LDDS (12 000 € additionnels, même taux 1,5%, même défiscalisation). Ensemble : 34 950 € disponibles à tout moment.",
    action: { label: "Ouvrir un LDDS dans ta banque" },
    appliesWhen: always,
    priority: 65,
    figures: [
      { label: "LDDS plafond", value: "12 000 €" },
      { label: "Cumul A+LDDS", value: "34 950 €" },
    ],
    sources: ["https://www.service-public.gouv.fr"],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // INVESTISSEMENTS (long term + retirement)
  // ==========================================================================
  {
    id: "pea-jeune-actif",
    category: "long_term",
    title: "Ouvre un PEA dès maintenant, même vide",
    body:
      "L'ancienneté du PEA compte depuis la date d'ouverture. À 25 ans avec 100 €, tu déclenches le compteur des 5 ans avant exonération d'IR. Tu alimenteras quand tu pourras.",
    action: {
      label: "Ouvrir un PEA (banque ou courtier)",
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2385",
    },
    appliesWhen: ageIn("18-25", "26-35"),
    priority: 88,
    figures: [
      { label: "Plafond PEA", value: "150 000 €" },
      { label: "Après 5 ans", value: "0% IR + 18,6% PS" },
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
    title: "En 2026, AV bat PEA sur les prélèvements sociaux",
    body:
      "Depuis la LFSS 2026, le PEA est à 18,6% de PS (nouvelle contribution CFA +1,4 pt). L'assurance-vie reste à 17,2%. Sur du long terme, ce delta pèse — considère l'AV comme complément.",
    action: { label: "Comparer PEA vs Assurance-vie" },
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 75,
    figures: [
      { label: "PS PEA", value: "18,6%" },
      { label: "PS AV", value: "17,2%" },
      { label: "Écart", value: "+1,4 pt" },
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
    action: { label: "Ouvrir un 2e PEA au nom du conjoint" },
    appliesWhen: familyIn("couple_no_kids", "couple_with_kids"),
    priority: 68,
    figures: [
      { label: "Plafond couple", value: "300 000 €" },
      { label: "+ PEA-PME/pers", value: "75 000 €" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F2385"],
    lastVerified: VERIFIED,
  },
  {
    id: "av-abattement-fiscal",
    category: "long_term",
    title: "AV après 8 ans : profite de l'abattement annuel",
    body:
      "Après 8 ans, retire jusqu'à 4 600 € de gains par an sans payer d'IR (9 200 € en couple). Utile pour compléter tes revenus sans surcoût fiscal.",
    action: { label: "Programmer des rachats partiels annuels" },
    appliesWhen: ageIn("36-50", "51-65", "66+"),
    priority: 66,
    figures: [
      { label: "Abattement seul", value: "4 600 €" },
      { label: "Couple", value: "9 200 €" },
      { label: "IR au-delà", value: "7,5%" },
    ],
    sources: [
      "https://www.france-epargne.fr/outils/fiscalite/fiscalite-placement",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "per-tmi-41",
    category: "retirement",
    title: "TMI à 41% ? Le PER devient très intéressant",
    body:
      "À TMI 41%, chaque euro versé sur un PER te fait économiser 41 centimes d'IR. Verse 10 000 € = 4 100 € d'économie immédiate. Combine avec un PEA pour la croissance.",
    action: { label: "Ouvrir un PER individuel" },
    appliesWhen: tmiAtLeast("41"),
    priority: 90,
    figures: [
      { label: "10k€ à TMI 41%", value: "4 100 € éco." },
      { label: "TMI break-even", value: "≥ 30%" },
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
      "Le PER n'est fiscalement avantageux QUE si ta TMI à la retraite sera INFÉRIEURE à ta TMI active. Si tu vises TMI 30%+ à la retraite (dividendes, foncier), l'AV et le PEA sont plus intéressants.",
    action: { label: "Estimer ta TMI de retraite" },
    appliesWhen: and(tmiAtLeast("30"), ageIn("36-50", "51-65")),
    priority: 82,
    figures: [{ label: "Condition PER attractif", value: "TMI retraite < active" }],
    sources: ["https://www.ramify.fr/epargne/per-pea-assurance-vie"],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // IMMOBILIER
  // ==========================================================================
  {
    id: "hcsf-taux-endettement",
    category: "real_estate",
    title: "Ne dépasse pas 35% d'endettement",
    body:
      "Le HCSF plafonne le taux d'effort à 35% des revenus nets, assurance emprunteur incluse. Au-delà, la banque refuse (sauf dérogation 20% des dossiers). Vise 30% pour ta marge.",
    action: { label: "Calculer ton taux d'effort" },
    appliesWhen: housingIn("renter"),
    priority: 85,
    figures: [
      { label: "Plafond HCSF", value: "35%" },
      { label: "Marge conseillée", value: "30% max" },
      { label: "Durée max", value: "25 ans (27 VEFA)" },
    ],
    sources: [
      "https://www.economie.gouv.fr/hcsf/mesures/mesure-relative-loctroi-de-credits-immobiliers",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "apport-optimal-30pct",
    category: "real_estate",
    title: "Vise 30% d'apport pour un meilleur taux",
    body:
      "En 2026, les banques accordent les meilleurs taux immo aux dossiers avec 30%+ d'apport (résidence principale). En dessous de 10%, taux plus élevé et parfois refus. L'apport inclut ton épargne + frais de notaire (~7% ancien / 3% neuf).",
    action: { label: "Comparer 3 courtiers immobiliers" },
    appliesWhen: and(housingIn("renter"), ageIn("26-35", "36-50")),
    priority: 72,
    figures: [
      { label: "Apport idéal", value: "≥ 30%" },
      { label: "Frais notaire ancien", value: "~7%" },
      { label: "Frais notaire neuf", value: "~3%" },
    ],
    sources: ["https://www.service-public.gouv.fr"],
    lastVerified: VERIFIED,
  },
  {
    id: "acheter-jeune-grande-ville",
    category: "housing",
    title: "Grande ville, jeune : réévalue louer vs acheter",
    body:
      "Dans les métropoles chères (Paris, Lyon, Bordeaux), le point d'équilibre acheter vs louer se déplace à 7-10 ans de détention. Si tu bouges dans les 5 ans, louer reste souvent plus rentable (frais de notaire absorbés).",
    action: { label: "Simuler avec l'INSEE" },
    appliesWhen: and(ageIn("18-25", "26-35"), (p) => p.zone === "big_city"),
    priority: 68,
    sources: ["https://www.insee.fr"],
    lastVerified: VERIFIED,
  },
  {
    id: "relance-logement-jeanbrun",
    category: "tax",
    title: "Investir dans le neuf : dispositif Jeanbrun 2026",
    body:
      "Le Pinel est mort fin 2024. Depuis février 2026, le dispositif Relance Logement (Jeanbrun) amortit 3,5% à 5,5% par an du prix du bien neuf loué (base 80% du prix), sur 9 ans minimum. Plus intéressant pour TMI ≥ 30%.",
    action: {
      label: "Se renseigner sur Jeanbrun",
      link: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053508155",
    },
    appliesWhen: and(tmiAtLeast("30"), ageIn("36-50", "51-65")),
    priority: 65,
    figures: [
      { label: "Amortissement", value: "3,5% → 5,5%" },
      { label: "Engagement", value: "9 ans min." },
    ],
    sources: [
      "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053508155",
    ],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // ENFANTS (par âge)
  // ==========================================================================
  {
    id: "garde-enfants-credit-impot",
    category: "kids",
    title: "Enfant < 6 ans : réclame le crédit d'impôt garde",
    body:
      "Les frais de crèche, halte-garderie ou assistante maternelle ouvrent droit à un crédit d'impôt de 50%, plafonné à 3 500 € de dépenses par enfant/an — soit 1 750 € de crédit par enfant.",
    action: {
      label: "Déclarer à la ligne 7GA",
      link: "https://www.impots.gouv.fr/particulier/questions/je-fais-garder-mon-jeune-enfant-lexterieur-du-domicile-que-puis-je-deduire",
    },
    appliesWhen: kids("0-6"),
    priority: 92,
    figures: [
      { label: "Taux crédit", value: "50%" },
      { label: "Plafond/enfant/an", value: "3 500 €" },
      { label: "Crédit max/enfant", value: "1 750 €" },
    ],
    sources: [
      "https://www.impots.gouv.fr/particulier/questions/je-fais-garder-mon-jeune-enfant-lexterieur-du-domicile-que-puis-je-deduire",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "livret-jeune-ado",
    category: "kids",
    title: "Livret Jeune : ouvre-le pour ton ado",
    body:
      "Le Livret Jeune est réservé aux 12-25 ans. Rémunéré au minimum au taux du Livret A + prime (souvent 2-3% en 2026), défiscalisé, plafond 1 600 €. Complète le Livret A ouvert au nom de l'enfant.",
    action: {
      label: "Ouvrir un Livret Jeune",
      link: "https://www.service-public.fr/particuliers/vosdroits/F2367",
    },
    appliesWhen: kids("12-15", "16-18"),
    priority: 78,
    figures: [
      { label: "Âge", value: "12 - 25 ans" },
      { label: "Plafond", value: "1 600 €" },
      { label: "Taux mini", value: "1,5%" },
    ],
    sources: ["https://www.service-public.fr/particuliers/vosdroits/F2367"],
    lastVerified: VERIFIED,
  },
  {
    id: "pel-enfant-etudes",
    category: "kids",
    title: "PEL enfant pour préparer les études",
    body:
      "Ouvrir un PEL au nom de l'enfant à 8-12 ans permet d'obtenir à 18 ans un prêt épargne logement à taux garanti (2,25% en 2026). Verse au minimum 45 €/mois pendant 4 ans.",
    action: { label: "Ouvrir un PEL au nom de l'enfant" },
    appliesWhen: kids("7-11", "12-15"),
    priority: 62,
    figures: [
      { label: "Taux PEL 2026", value: "2,25%" },
      { label: "Versement min/mois", value: "45 €" },
      { label: "Durée min", value: "4 ans" },
    ],
    sources: [
      "https://www.service-public.fr/particuliers/vosdroits/F2650",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "budget-etudes-sup",
    category: "kids",
    title: "Anticipe 15 000 € à 60 000 € pour les études sup",
    body:
      "Coût moyen 2026 : 3 000 €/an en public province, 8 000 €/an en école publique grande ville (avec loyer), jusqu'à 15 000 €/an en école privée. Sur 4-5 ans, prévois 15 à 60 k€ pour un enfant.",
    action: { label: "Créer un objectif dans S1" },
    appliesWhen: kids("12-15", "16-18"),
    priority: 74,
    figures: [
      { label: "Public province", value: "~3 k€/an" },
      { label: "École privée", value: "~15 k€/an" },
      { label: "Total 4-5 ans", value: "15-60 k€" },
    ],
    sources: ["https://www.enseignementsup-recherche.gouv.fr"],
    lastVerified: VERIFIED,
  },
  {
    id: "autonomie-ado-carte",
    category: "kids",
    title: "Premier compte + carte à 16 ans",
    body:
      "Un ado peut avoir un compte bancaire dès 12 ans (autorisation parentale) et une carte de retrait à 16 ans. Bon moment pour apprendre à gérer un budget mensuel avant les études sup.",
    action: { label: "Ouvrir un compte jeune" },
    appliesWhen: kids("16-18"),
    priority: 58,
    sources: ["https://www.service-public.fr"],
    lastVerified: VERIFIED,
  },
  {
    id: "cto-enfant-early",
    category: "kids",
    title: "CTO enfant : commence dès la naissance",
    body:
      "Un Compte Titres Ordinaire au nom du mineur permet d'investir en ETF, actions ou obligations sans plafond. Avec un horizon de 18+ ans, même 50 €/mois deviennent ~22 000 € à 7% moyen. Le mineur peut être à 0% IR sur les gains s'il est non-imposable (souvent le cas).",
    action: {
      label: "Ouvrir un CTO au nom de l'enfant",
      link: "https://www.service-public.fr/particuliers/vosdroits/F32164",
    },
    appliesWhen: kids("0-6", "7-11"),
    priority: 82,
    figures: [
      { label: "Horizon", value: "18+ ans" },
      { label: "Plafond", value: "Aucun" },
      { label: "Gains 50€/mois × 18 ans @ 7%", value: "~22 000 €" },
      { label: "Fiscalité gains", value: "PFU 30% (0% IR si non-imposable)" },
    ],
    sources: [
      "https://www.service-public.fr/particuliers/vosdroits/F32164",
      "https://www.amf-france.org",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "av-enfant-transmission",
    category: "kids",
    title: "AV enfant : alternative pour la transmission",
    body:
      "Ouvrir une assurance-vie au nom du mineur (ou avec l'enfant bénéficiaire) permet de combiner croissance long terme + fiscalité transmission avantageuse. Attention : moins souple qu'un CTO tant que l'enfant est mineur (accord parents obligatoire pour rachats). Complémentaire au CTO plutôt que remplacement.",
    action: { label: "Comparer AV enfant vs CTO enfant" },
    appliesWhen: kids("0-6", "7-11", "12-15"),
    priority: 70,
    figures: [
      { label: "Horizon fiscal optimal", value: "8 ans" },
      { label: "Abattement 8 ans", value: "4 600 €/an" },
      { label: "Fiscalité gains post-8 ans", value: "7,5% IR + 17,2% PS" },
    ],
    sources: [
      "https://www.service-public.fr/particuliers/vosdroits/F15274",
    ],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // UNDER 18 (user teen)
  // ==========================================================================
  {
    id: "under18-livret-jeune",
    category: "emergency",
    title: "Ton Livret Jeune : réservé aux 12-25 ans",
    body:
      "Rémunéré au minimum au taux du Livret A + prime (2-3% en 2026 selon banque). Plafond 1 600 €. Retrait à partir de 16 ans autorisé sans accord parental. C'est ton premier outil d'épargne.",
    action: {
      label: "Ouvrir un Livret Jeune",
      link: "https://www.service-public.fr/particuliers/vosdroits/F2367",
    },
    appliesWhen: ageIn("under_18"),
    priority: 90,
    figures: [
      { label: "Âge", value: "12 - 25 ans" },
      { label: "Plafond", value: "1 600 €" },
      { label: "Taux minimum", value: "1,5%" },
    ],
    sources: ["https://www.service-public.fr/particuliers/vosdroits/F2367"],
    lastVerified: VERIFIED,
  },
  {
    id: "under18-budget-basics",
    category: "emergency",
    title: "Ton premier budget hebdomadaire",
    body:
      "Commence par lister sur une semaine : ton argent de poche + ce que tu dépenses (goûters, transport, sorties). Ce simple exercice fait comprendre 80% des mécaniques d'un budget d'adulte.",
    action: { label: "Créer un budget dans le tab Budget de l'app" },
    appliesWhen: ageIn("under_18"),
    priority: 85,
    sources: ["https://www.education.gouv.fr"],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // TRANSMISSION
  // ==========================================================================
  {
    id: "donation-100k-par-enfant",
    category: "inheritance",
    title: "Donation : 100 000 € par enfant tous les 15 ans",
    body:
      "Chaque parent peut donner jusqu'à 100 000 € à chaque enfant sans droits de succession, renouvelable tous les 15 ans. Couplé avec le don familial (31 865 € tous les 15 ans si donateur < 80 ans), c'est un outil puissant.",
    action: {
      label: "Consulter le simulateur donation",
      link: "https://www.impots.gouv.fr/particulier/donation",
    },
    appliesWhen: and(hasAnyKids, ageIn("36-50", "51-65", "66+")),
    priority: 82,
    figures: [
      { label: "Abattement/enfant/parent", value: "100 000 €" },
      { label: "Don familial (< 80 ans)", value: "31 865 €" },
      { label: "Renouvelable", value: "15 ans" },
    ],
    sources: [
      "https://www.impots.gouv.fr/particulier/donation",
      "https://www.legifiscal.fr/actualites-fiscales/4308-plf-2026-abattement-2026-droits-donation-conjoints-enfants-petits-enfants.html",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "av-transmission-abattement",
    category: "inheritance",
    title: "AV avant 70 ans : 152 500 € par bénéficiaire",
    body:
      "Les versements sur assurance-vie avant tes 70 ans ouvrent droit à 152 500 € d'abattement par bénéficiaire lors de la transmission. Au-delà, taxation 20% jusqu'à 700 k€ puis 31,25%. Outil clé pour transmettre.",
    action: { label: "Vérifier les bénéficiaires de ton AV" },
    appliesWhen: and(ageIn("36-50", "51-65"), hasAnyKids),
    priority: 80,
    figures: [
      { label: "Abattement/bénéficiaire", value: "152 500 €" },
      { label: "Taxation 152k → 700k", value: "20%" },
      { label: "Au-delà 700k", value: "31,25%" },
    ],
    sources: ["https://www.legifrance.gouv.fr (art. 990 I CGI)"],
    lastVerified: VERIFIED,
  },
  {
    id: "av-souscrire-avant-70-ans",
    category: "inheritance",
    title: "Souscris ton AV avant 70 ans",
    body:
      "Les versements après 70 ans passent sous un régime moins favorable (abattement global de 30 500 € pour tous les bénéficiaires confondus). Si tu approches 70 ans, envisage un versement significatif avant la date anniversaire.",
    action: { label: "Planifier un versement AV avant 70 ans" },
    appliesWhen: ageIn("51-65"),
    priority: 76,
    figures: [
      { label: "Avant 70 ans/bénéf.", value: "152 500 €" },
      { label: "Après 70 ans (total)", value: "30 500 €" },
    ],
    sources: ["https://www.legifrance.gouv.fr (art. 990 I & 757 B CGI)"],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // PRÉVOYANCE
  // ==========================================================================
  {
    id: "prevoyance-deces-parents",
    category: "insurance",
    title: "Assurance décès : indispensable avec enfants",
    body:
      "Le décès d'un parent d'enfants mineurs est le sinistre le plus dévastateur financièrement. Une assurance décès temporaire souscrite entre 30 et 40 ans coûte 15 à 30 €/mois pour un capital de 100 à 300 k€.",
    action: { label: "Comparer 3 devis prévoyance" },
    appliesWhen: and(
      familyIn("couple_with_kids", "single_parent"),
      ageIn("26-35", "36-50"),
    ),
    priority: 78,
    figures: [
      { label: "Coût mensuel", value: "15-30 €" },
      { label: "Capital typique", value: "100-300 k€" },
      { label: "Durée typique", value: "20-25 ans" },
    ],
    sources: ["https://www.acpr.banque-france.fr"],
    lastVerified: VERIFIED,
  },
  {
    id: "prevoyance-invalidite",
    category: "insurance",
    title: "Prévoyance invalidité : socle vital",
    body:
      "Les salariés du privé sont couverts par la Sécu + prévoyance employeur (souvent 60-80% du salaire). Les indépendants/freelances sont beaucoup moins couverts — une prévoyance individuelle protège 60-100% du revenu en cas d'invalidité.",
    action: { label: "Vérifier ta couverture actuelle" },
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 62,
    sources: ["https://www.ameli.fr", "https://www.acpr.banque-france.fr"],
    lastVerified: VERIFIED,
  },
  {
    id: "prevoyance-dependance-senior",
    category: "insurance",
    title: "Dépendance : penser à 55-60 ans, pas plus tard",
    body:
      "Le risque de dépendance concerne 1 personne sur 3 après 75 ans. Une assurance dépendance souscrite à 55-60 ans coûte 30-60 €/mois pour une rente à vie de 500-1 500 €/mois. Après 65 ans, les tarifs explosent.",
    action: { label: "Comparer 3 offres dépendance" },
    appliesWhen: ageIn("51-65"),
    priority: 55,
    figures: [
      { label: "Souscription", value: "55-60 ans" },
      { label: "Cotisation", value: "30-60 €/mois" },
      { label: "Rente typique", value: "500-1 500 €/mois" },
    ],
    sources: ["https://www.pour-les-personnes-agees.gouv.fr"],
    lastVerified: VERIFIED,
  },
];

// ============================================================================
// Moteur : match + tri + grouping
// ============================================================================

export function matchAdvice(
  profile: UserProfile,
  catalog: AdviceCard[] = ADVICE_CATALOG_FR,
): AdviceCard[] {
  return catalog
    .filter((card) => card.appliesWhen(profile))
    .sort((a, b) => b.priority - a.priority);
}

export function topAdvice(
  profile: UserProfile,
  count = 5,
  seed = 0,
  catalog: AdviceCard[] = ADVICE_CATALOG_FR,
): AdviceCard[] {
  const matched = matchAdvice(profile, catalog);
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

// Regroupe les cards par thème UI (Budget / Invest / Fiscalité / etc.).
export function groupByAdviceGroup(cards: AdviceCard[]): {
  group: AdviceGroup;
  cards: AdviceCard[];
}[] {
  const out: { group: AdviceGroup; cards: AdviceCard[] }[] = [];
  for (const group of ADVICE_GROUPS) {
    const matched = cards.filter((c) => group.categories.includes(c.category));
    if (matched.length > 0) {
      out.push({ group, cards: matched });
    }
  }
  return out;
}

// Renvoie TOUS les conseils matchés (sans limite), groupés par thème.
export function allAdviceGrouped(
  profile: UserProfile,
  catalog: AdviceCard[] = ADVICE_CATALOG_FR,
): { group: AdviceGroup; cards: AdviceCard[] }[] {
  return groupByAdviceGroup(matchAdvice(profile, catalog));
}

// Utilitaire : accès aux categories par card (pour retro-compat imports).
export type { AdviceCategory };
