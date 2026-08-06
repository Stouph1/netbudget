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
  PetSpecies,
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

const or =
  (...preds: AdvicePredicate[]): AdvicePredicate =>
  (p) =>
    preds.some((f) => f(p));

// Région française déclarée (les aides locales varient fortement).
const regionIs =
  (...regions: string[]): AdvicePredicate =>
  (p) =>
    !!p.region && regions.includes(p.region);

// Matche si le scope actif est un workspace d'un de ces types.
// (workspaceKind est injecté par l'app depuis le scope actif — pas demandé
// dans l'onboarding.)
const inWorkspace =
  (...kinds: NonNullable<UserProfile["workspaceKind"]>[]): AdvicePredicate =>
  (p) =>
    !!p.workspaceKind && kinds.includes(p.workspaceKind);

// ============================================================================
// Mode de conseil selon le scope actif. Détermine les questions posées dans
// l'onboarding ET la dérivation du profil de matching.
// ============================================================================

export type AdviceMode = "perso" | "couple" | "family" | "coloc" | "association";

export function adviceModeFor(
  kind: UserProfile["workspaceKind"],
): AdviceMode {
  if (
    kind === "couple" ||
    kind === "family" ||
    kind === "coloc" ||
    kind === "association"
  ) {
    return kind;
  }
  // Compte perso + workspaces "other" → questionnaire individuel classique.
  return "perso";
}

// Profil passé au moteur : dérive la situation familiale depuis le type de
// workspace quand elle n'est pas demandée (couple → avec/sans enfants selon
// le bloc enfants), et neutralise les champs perso hérités d'un ancien
// remplissage pour les associations (aucune donnée personnelle ne doit
// influencer les conseils d'une asso).
export function deriveMatchingProfile(
  p: UserProfile,
  workspaceKind: UserProfile["workspaceKind"],
): UserProfile {
  const mode = adviceModeFor(workspaceKind);
  if (mode === "association") {
    return {
      monthlySavingsCapacity: p.monthlySavingsCapacity,
      workspaceKind: "association",
    };
  }
  const out: UserProfile = { ...p, workspaceKind: workspaceKind ?? null };
  if (mode === "couple") {
    out.family = p.children?.length ? "couple_with_kids" : "couple_no_kids";
  }
  return out;
}

// Animaux de compagnie
const hasAnyPet: AdvicePredicate = (p) => p.hasPets === true && !!p.pets?.length;
const hasPetSpecies =
  (...species: PetSpecies[]): AdvicePredicate =>
  (p) =>
    p.hasPets === true && !!p.pets?.some((pet) => species.includes(pet.species));

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
    countries: "all",
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
      "Réservé aux 12-25 ans résidant en France, plafond 1 600 €. Taux minimum aligné sur le Livret A (1,50% au 1er février 2026), souvent bonifié à 2-3% par les banques. Intérêts totalement exonérés d'IR et de prélèvements sociaux. Un seul par personne.",
    action: {
      label: "Ouvrir un Livret Jeune",
      link: "https://www.service-public.fr/particuliers/vosdroits/F2904",
    },
    appliesWhen: kids("12-15", "16-18"),
    priority: 78,
    figures: [
      { label: "Âge", value: "12 - 25 ans" },
      { label: "Plafond", value: "1 600 €" },
      { label: "Taux minimum", value: "1,50%" },
      { label: "Fiscalité", value: "Exonération totale" },
    ],
    sources: ["https://www.service-public.fr/particuliers/vosdroits/F2904"],
    lastVerified: VERIFIED,
  },
  {
    id: "pel-enfant-etudes",
    category: "kids",
    title: "PEL enfant : 2,00% garanti pour son futur logement",
    body:
      "Un PEL ouvert au nom de l'enfant (via représentant légal — mineur ne peut pas seul) rapporte 2,00% en 2026, et permet à 18+ un prêt épargne logement à taux fixe 3,20% garanti. Verse au minimum 45 €/mois pendant 4 ans. Un seul PEL par personne.",
    action: {
      label: "Ouvrir un PEL au nom de l'enfant",
      link: "https://www.service-public.fr/particuliers/vosdroits/F16140",
    },
    appliesWhen: kids("7-11", "12-15"),
    priority: 62,
    figures: [
      { label: "Taux rémunération 2026", value: "2,00%" },
      { label: "Taux prêt garanti", value: "3,20%" },
      { label: "Dépôt initial min", value: "225 €" },
      { label: "Versement min/an", value: "540 €" },
    ],
    sources: [
      "https://www.service-public.fr/particuliers/vosdroits/F16140",
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
  // BUDGET À PLUSIEURS (workspace couple / famille / coloc)
  // Corpus v3 — deep-research 2026-07-16, sources primaires gouv vérifiées 3-0.
  // ==========================================================================
  {
    id: "shared-compte-joint-solidarite",
    category: "shared",
    title: "Compte joint : chacun doit 100% du découvert",
    body:
      "Sur un compte joint, les cotitulaires sont solidairement responsables du solde débiteur : la banque peut réclamer la totalité de la dette à n'importe lequel, même s'il n'est pas à l'origine du paiement. Limite le compte joint aux dépenses communes.",
    action: {
      label: "Fixer un plafond d'alimentation mensuel du compte joint",
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10412",
    },
    appliesWhen: inWorkspace("couple", "family", "coloc"),
    priority: 88,
    figures: [
      { label: "Dette exigible par cotitulaire", value: "100%" },
      { label: "Qui a causé l'incident", value: "Sans effet" },
    ],
    sources: [
      "https://www.service-public.gouv.fr/particuliers/vosdroits/F10412",
      "https://www.economie.gouv.fr/particuliers/differences-compte-individuel-compte-joint-compte-indivis",
    ],
    lastVerified: "2026-07-16",
  },
  {
    id: "shared-dettes-menage-art220",
    category: "shared",
    title: "Dettes du ménage : solidarité automatique si mariés/pacsés",
    body:
      "L'article 220 du Code civil (515-4 pour le PACS) rend chaque époux/partenaire solidaire des dettes du ménage contractées par l'autre seul. Exceptions : dépenses manifestement excessives, achats à tempérament et emprunts non signés à deux. Les concubins n'ont aucun devoir légal l'un envers l'autre.",
    action: { label: "Signer à deux tout crédit ou achat à tempérament significatif" },
    appliesWhen: inWorkspace("couple", "family"),
    priority: 82,
    figures: [
      { label: "Base légale", value: "art. 220 & 515-4 C. civ." },
      { label: "Concubins", value: "0 solidarité légale" },
    ],
    sources: [
      "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000028748098",
      "https://www.notaires.fr/fr/article/mariage-pacs-et-concubinage-elements-de-comparaison",
    ],
    lastVerified: "2026-07-16",
  },
  {
    id: "shared-prorata-modele-legal",
    category: "shared",
    title: "Répartition au prorata : le modèle prévu par la loi",
    body:
      "Époux et partenaires de PACS contribuent aux charges du ménage proportionnellement à leurs facultés respectives (art. 214 et 515-4 C. civ.). Le prorata des revenus est l'ancrage légal — le 50/50 n'est qu'une convention. Exemple : revenus 3 000 € et 2 000 € → clé 60/40.",
    action: { label: "Calculer ta clé : ton revenu ÷ revenus cumulés du couple" },
    appliesWhen: inWorkspace("couple", "family"),
    priority: 80,
    figures: [
      { label: "Base légale", value: "art. 214 C. civ." },
      { label: "Exemple 3000/2000 €", value: "clé 60/40" },
    ],
    sources: [
      "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006439780",
      "https://www.notaires.fr/fr/article/mariage-pacs-et-concubinage-elements-de-comparaison",
    ],
    lastVerified: "2026-07-16",
  },
  {
    id: "shared-cheque-responsable-unique",
    category: "shared",
    title: "Chèque sans provision : désignez un responsable unique",
    body:
      "Un chèque rejeté sur un compte joint entraîne l'interdiction bancaire de CHAQUE cotitulaire sur TOUS ses comptes — sauf si un responsable unique a été désigné par écrit (art. L131-80 CMF) : l'interdiction ne frappe alors que lui. Modèle de lettre officiel R20791 sur service-public.",
    action: {
      label: "Désigner un responsable unique dès l'ouverture du compte",
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10412",
    },
    appliesWhen: inWorkspace("couple", "family", "coloc"),
    priority: 70,
    figures: [
      { label: "Interdiction max", value: "5 ans" },
      { label: "Sans désignation", value: "tous les comptes de chacun" },
    ],
    sources: [
      "https://www.service-public.gouv.fr/particuliers/vosdroits/F10412",
      "https://www.service-public.gouv.fr/particuliers/vosdroits/F2812",
    ],
    lastVerified: "2026-07-16",
  },
  {
    id: "shared-livret-a-individuel",
    category: "shared",
    title: "Pas de Livret A commun — mais 2 Livrets A = 45 900 €",
    body:
      "L'épargne réglementée (Livret A, LDDS, LEP, PEL, CEL, PEA) est strictement individuelle : jamais de compte joint possible. En couple, ouvrez chacun le vôtre pour doubler le plafond. Seuls les comptes courants, livrets bancaires, comptes-titres et comptes à terme peuvent être joints.",
    action: { label: "Ouvrir un Livret A par partenaire" },
    appliesWhen: inWorkspace("couple", "family"),
    priority: 74,
    figures: [
      { label: "Plafond couple (2 Livrets A)", value: "45 900 €" },
      { label: "Livret A par personne", value: "1 max" },
    ],
    sources: [
      "https://www.service-public.gouv.fr/particuliers/vosdroits/F2365",
      "https://www.banque-france.fr/fr/a-votre-service/particuliers/connaitre-pratiques-bancaires-assurance/epargne/livret-a",
    ],
    lastVerified: "2026-07-16",
  },
  {
    id: "shared-separation-compte-joint",
    category: "shared",
    title: "Séparation : le compte joint ne se ferme pas tout seul",
    body:
      "Divorce ou séparation ne clôturent PAS le compte joint — sans démarche, la solidarité sur le découvert continue. Un seul cotitulaire peut se désolidariser par lettre recommandée avec AR à la banque et aux autres cotitulaires (le compte devient indivis, à double signature).",
    action: {
      label: "Envoyer une dénonciation en recommandé dès la séparation",
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10412",
    },
    appliesWhen: inWorkspace("couple", "family"),
    priority: 60,
    figures: [
      { label: "Clôture automatique", value: "Aucune" },
      { label: "Désolidarisation", value: "1 lettre AR suffit" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F10412"],
    lastVerified: "2026-07-16",
  },
  {
    id: "shared-declaration-commune",
    category: "shared",
    title: "Mariage ou PACS = 1 déclaration, 2 parts",
    body:
      "Couples mariés/pacsés : déclaration commune unique et 2 parts de quotient conjugal. L'année de l'union uniquement, option irrévocable pour 2 déclarations séparées (indisponible si vous étiez déjà pacsés). Concubins : déclarations séparées, non solidaires de l'impôt sur le revenu.",
    action: {
      label: "Simuler les deux options l'année du mariage/PACS",
      link: "https://www.impots.gouv.fr/particulier/mariage-et-impots-en-commun",
    },
    appliesWhen: inWorkspace("couple", "family"),
    priority: 72,
    figures: [
      { label: "Parts fiscales", value: "2" },
      { label: "Option année union", value: "1 seule fois" },
    ],
    sources: [
      "https://www.impots.gouv.fr/particulier/mariage-et-impots-en-commun",
      "https://www.service-public.gouv.fr/particuliers/vosdroits/F2705",
    ],
    lastVerified: "2026-07-16",
  },
  {
    id: "shared-donation-concubin-60pct",
    category: "shared",
    title: "Donation au concubin : 60% de taxes",
    body:
      "Entre époux ou partenaires de PACS : abattement de 80 724 € puis barème progressif 5-45%. Entre concubins : taxation à 60% sans aucun abattement. Attention : l'abattement PACS est repris rétroactivement si le PACS est dissous l'année de la donation ou la suivante (sauf mariage ou décès).",
    action: { label: "Envisager le PACS avant toute donation significative" },
    appliesWhen: inWorkspace("couple"),
    priority: 64,
    figures: [
      { label: "Abattement mariés/pacsés", value: "80 724 €" },
      { label: "Concubins", value: "60% sans abattement" },
    ],
    sources: [
      "https://www.service-public.gouv.fr/particuliers/vosdroits/F14203",
      "https://www.notaires.fr/fr/article/mariage-pacs-et-concubinage-elements-de-comparaison",
    ],
    lastVerified: "2026-07-16",
  },
  {
    id: "shared-succession-concubin",
    category: "shared",
    title: "Succession : le concubin paie 60%, le conjoint 0%",
    body:
      "Le conjoint marié et le partenaire de PACS désigné par testament sont totalement exonérés de droits de succession. Le concubin est taxé à 60% après seulement 1 594 € d'abattement. PACS et concubin n'héritent QUE par testament — seul le mariage donne un droit successoral automatique.",
    action: { label: "Rédiger un testament si pacsé ou concubin + vérifier la clause bénéficiaire AV" },
    appliesWhen: inWorkspace("couple", "family"),
    priority: 68,
    figures: [
      { label: "Conjoint / PACS testamentaire", value: "0%" },
      { label: "Concubin", value: "60% après 1 594 €" },
    ],
    sources: [
      "https://www.notaires.fr/fr/article/mariage-pacs-et-concubinage-elements-de-comparaison",
    ],
    lastVerified: "2026-07-16",
  },
  {
    id: "shared-quotient-familial-1807",
    category: "shared",
    title: "Quotient familial : 1 807 € d'avantage max par demi-part",
    body:
      "Chaque enfant à charge apporte 0,5 part (1 part entière dès le 3e). L'avantage fiscal est plafonné à 1 807 € par demi-part pour l'imposition 2026 des revenus 2025 (904 € par quart de part en résidence alternée). Vérifie si le plafonnement s'applique avant de compter sur l'économie.",
    action: {
      label: "Vérifier ton plafonnement sur service-public.gouv.fr",
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2705",
    },
    appliesWhen: (p) =>
      p.workspaceKind === "family" || hasAnyKids(p),
    priority: 66,
    figures: [
      { label: "Plafond/demi-part 2026", value: "1 807 €" },
      { label: "Enfants 1-2", value: "0,5 part" },
      { label: "Dès le 3e enfant", value: "1 part" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F2705"],
    lastVerified: "2026-07-16",
  },
  {
    id: "shared-coloc-compte-indivis",
    category: "shared",
    title: "Coloc : lisez la clause de solidarité du compte indivis",
    body:
      "La loi ne prévoit PAS de solidarité entre cotitulaires d'un compte indivis (art. 1310 C. civ. : la solidarité ne se présume pas) — mais la majorité des banques l'insèrent par contrat dans la convention d'ouverture. La protection légale disparaît alors.",
    action: {
      label: "Lire la convention et négocier/refuser la clause avant signature",
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2812",
    },
    appliesWhen: inWorkspace("coloc"),
    priority: 84,
    figures: [
      { label: "Solidarité légale", value: "0 (art. 1310)" },
      { label: "Conventions bancaires", value: "majorité la stipulent" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F2812"],
    lastVerified: "2026-07-16",
  },

  // ==========================================================================
  // ASSOCIATION (loi 1901) — trésorerie, dons, subventions, assurance.
  // Cartes volontairement génériques : pas de seuils comptables ni plafonds
  // chiffrés non re-vérifiés. Seule exception : la réduction d'impôt dons
  // (art. 200 CGI), règle stable et sourcée impots.gouv.fr.
  // ==========================================================================
  {
    id: "asso-compte-bancaire-dedie",
    category: "association",
    title: "Un compte bancaire au nom de l'association, rien d'autre",
    body:
      "Une association loi 1901 déclarée peut ouvrir un compte à son nom. Ne faites JAMAIS transiter l'argent de l'asso par le compte perso d'un membre : c'est la source n°1 de conflits et de soupçons de gestion de fait. Prévoyez une double signature au-delà d'un certain montant, votée en AG.",
    action: {
      label: "Vérifier les démarches d'ouverture de compte",
      link: "https://www.service-public.fr/associations",
    },
    appliesWhen: inWorkspace("association"),
    priority: 92,
    sources: ["https://www.service-public.fr/associations"],
    lastVerified: "2026-07-24",
  },
  {
    id: "asso-budget-previsionnel",
    category: "association",
    title: "Votez un budget prévisionnel chaque année",
    body:
      "Un budget prévisionnel voté en assemblée générale, ventilé par projet ou action, est la base d'une gestion saine — et il est exigé dans quasiment tous les dossiers de subvention. Suivez les écarts réel/prévu chaque mois plutôt que de découvrir le trou en fin d'exercice.",
    action: { label: "Préparer le budget prévisionnel du prochain exercice" },
    appliesWhen: inWorkspace("association"),
    priority: 90,
    sources: ["https://www.associations.gouv.fr"],
    lastVerified: "2026-07-24",
  },
  {
    id: "asso-comptabilite-registre",
    category: "association",
    title: "Tenez une comptabilité simple mais irréprochable",
    body:
      "Au minimum : un registre chronologique des recettes et dépenses, chaque ligne justifiée (facture, reçu), présenté en AG. Les obligations comptables se renforcent selon la taille de l'association et ses financements publics — renseignez-vous dès que l'asso reçoit des subventions significatives.",
    action: {
      label: "Mettre en place le registre recettes/dépenses",
      link: "https://www.associations.gouv.fr",
    },
    appliesWhen: inWorkspace("association"),
    priority: 88,
    sources: ["https://www.associations.gouv.fr"],
    lastVerified: "2026-07-24",
  },
  {
    id: "asso-reserve-tresorerie",
    category: "association",
    title: "Constituez une réserve de trésorerie",
    body:
      "Une subvention qui arrive en retard, un événement annulé, et l'asso ne peut plus payer sa salle. Règle de bonne pratique : viser une réserve couvrant environ 3 mois de charges courantes, placée sur un livret associatif (les associations peuvent détenir un Livret A).",
    action: { label: "Calculer 3 mois de charges et ouvrir un livret dédié" },
    appliesWhen: inWorkspace("association"),
    priority: 86,
    figures: [{ label: "Réserve conseillée", value: "~3 mois de charges" }],
    sources: ["https://www.associations.gouv.fr"],
    lastVerified: "2026-07-24",
  },
  {
    id: "asso-dons-recu-fiscal",
    category: "association",
    title: "Dons : le reçu fiscal est votre meilleur levier de collecte",
    body:
      "Si l'association est d'intérêt général, un don ouvre droit pour le donateur à une réduction d'impôt de 66 % du montant (dans la limite de 20 % de son revenu imposable) — 75 % pour les organismes d'aide aux personnes en difficulté, dans un plafond spécifique. Émettre des reçus fiscaux conformes multiplie la générosité : dites-le sur vos supports de collecte.",
    action: {
      label: "Vérifier l'éligibilité et le modèle de reçu fiscal",
      link: "https://www.impots.gouv.fr/particulier/les-dons-aux-associations",
    },
    appliesWhen: inWorkspace("association"),
    priority: 84,
    figures: [
      { label: "Réduction donateur", value: "66 % du don" },
      { label: "Plafond", value: "20 % du revenu imposable" },
    ],
    sources: [
      "https://www.impots.gouv.fr/particulier/les-dons-aux-associations",
      "Art. 200 du Code général des impôts",
    ],
    lastVerified: "2026-07-24",
  },
  {
    id: "asso-subventions",
    category: "association",
    title: "Subventions : un dossier solide ouvre beaucoup de portes",
    body:
      "Commune, département, région, FDVA : la plupart des demandes passent aujourd'hui par la plateforme Le Compte Asso. Un dossier type demande : budget prévisionnel, rapport d'activité, RIB au nom de l'asso et numéro RNA. Anticipez — les campagnes ont des dates limites strictes, souvent en début d'année.",
    action: {
      label: "Créer le compte de l'asso sur Le Compte Asso",
      link: "https://lecompteasso.associations.gouv.fr",
    },
    appliesWhen: inWorkspace("association"),
    priority: 82,
    sources: ["https://lecompteasso.associations.gouv.fr"],
    lastVerified: "2026-07-24",
  },
  {
    id: "asso-assurance-rc",
    category: "association",
    title: "Assurance responsabilité civile : quasi indispensable",
    body:
      "L'assurance RC est légalement obligatoire pour certaines activités (accueil de mineurs, activités sportives, voyages…) et fortement recommandée pour toutes les autres : l'association est responsable des dommages causés par ses bénévoles et lors de ses événements. Comparez les contrats « multirisque association ».",
    action: {
      label: "Vérifier les obligations d'assurance de votre activité",
      link: "https://www.service-public.fr/associations",
    },
    appliesWhen: inWorkspace("association"),
    priority: 80,
    sources: ["https://www.service-public.fr/associations"],
    lastVerified: "2026-07-24",
  },
  {
    id: "asso-cotisations-suivi",
    category: "association",
    title: "Cotisations : cadrez le montant et le suivi des adhésions",
    body:
      "Le montant de la cotisation est fixé par les statuts ou voté en AG — formalisez-le. Tenez un registre des adhérents à jour (c'est aussi votre base légale pour voter en AG) et automatisez les relances de renouvellement : les cotisations non relancées sont la première recette perdue des petites assos.",
    action: { label: "Mettre à jour le registre des adhérents et les relances" },
    appliesWhen: inWorkspace("association"),
    priority: 78,
    sources: ["https://www.service-public.fr/associations"],
    lastVerified: "2026-07-24",
  },

  // ==========================================================================
  // TRANSMISSION (donations chiffrées 2026)
  // ==========================================================================
  {
    id: "donation-enfant-100k-couple",
    category: "inheritance",
    title: "En couple : 200 000 € par enfant en franchise",
    body:
      "Chaque parent peut donner jusqu'à 100 000 € par enfant sans droits de succession, renouvelable tous les 15 ans. Un couple peut donc transmettre 200 000 € par enfant en une ou plusieurs fois. Idéal pour aider à l'achat d'un logement ou financer les études sup.",
    action: {
      label: "Simulateur donation impots.gouv.fr",
      link: "https://www.impots.gouv.fr/particulier/questions/que-puis-je-donner-mes-enfants-petits-enfants-sans-avoir-payer-de-droits",
    },
    appliesWhen: and(
      hasAnyKids,
      familyIn("couple_no_kids", "couple_with_kids"),
      ageIn("36-50", "51-65", "66+"),
    ),
    priority: 78,
    figures: [
      { label: "Par parent / enfant", value: "100 000 €" },
      { label: "Couple / enfant", value: "200 000 €" },
      { label: "Renouvelable", value: "tous les 15 ans" },
    ],
    sources: [
      "https://www.impots.gouv.fr/particulier/questions/que-puis-je-donner-mes-enfants-petits-enfants-sans-avoir-payer-de-droits",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "donation-grand-parent-63k",
    category: "inheritance",
    title: "Grand-parent : 63 730 € par petit-enfant",
    body:
      "Un grand-parent peut cumuler deux dispositifs : 31 865 € (art. 790 B CGI) + 31 865 € de don familial de somme d'argent (art. 790 G) si le donateur a moins de 80 ans et le bénéficiaire est majeur ou émancipé. Renouvelable tous les 15 ans, par grand-parent et par petit-enfant.",
    action: {
      label: "Vérifier les conditions du don familial",
      link: "https://www.impots.gouv.fr/particulier/questions/jai-perdu-mon-fils-comment-aider-mes-petits-enfants",
    },
    appliesWhen: ageIn("51-65", "66+"),
    priority: 65,
    figures: [
      { label: "Abattement (790 B)", value: "31 865 €" },
      { label: "Don familial (790 G)", value: "31 865 €" },
      { label: "Cumul max", value: "63 730 €" },
      { label: "Conditions 790 G", value: "< 80 ans, majeur" },
    ],
    sources: [
      "https://www.impots.gouv.fr/particulier/questions/que-puis-je-donner-mes-enfants-petits-enfants-sans-avoir-payer-de-droits",
      "https://www.impots.gouv.fr/particulier/questions/jai-perdu-mon-fils-comment-aider-mes-petits-enfants",
    ],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // PER — chiffres exacts 2026 (les précédents étaient refutés)
  // ==========================================================================
  {
    id: "per-plafond-37680",
    category: "retirement",
    title: "PER 2026 : plafond de 37 680 € pour les actifs",
    body:
      "Le plafond de déduction PER 2026 est de 10% des revenus 2025 nets de cotisations sociales, dans la limite de 37 680 € (= 8 × PASS 2025 × 10%). Chaque euro versé jusqu'à ce plafond est déductible de ton revenu imposable.",
    action: {
      label: "Consulter le mécanisme sur service-public.gouv.fr",
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F34982",
    },
    appliesWhen: and(tmiAtLeast("30"), ageIn("26-35", "36-50", "51-65")),
    priority: 84,
    figures: [
      { label: "Formule", value: "10% revenus N-1" },
      { label: "Plafond max", value: "37 680 €" },
      { label: "Base", value: "8 × PASS 2025 (47 100 €)" },
    ],
    sources: [
      "https://www.service-public.gouv.fr/particuliers/vosdroits/F34982",
      "https://bofip.impots.gouv.fr/bofip/1124-PGP.html/identifiant=BOI-IR-BASE-20-50-20-20260217",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "per-non-actif-4710",
    category: "retirement",
    title: "PER non-actif : plancher garanti à 4 710 €",
    body:
      "Sans revenu pro ou à faibles revenus (retraité, étudiant, parent au foyer, chômeur), tu retiens toujours le PLUS ÉLEVÉ entre 10% des revenus N-1 et 4 710 € en 2026. Utile pour continuer à défiscaliser malgré une transition professionnelle.",
    action: {
      label: "Vérifier ton plafond épargne retraite",
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F34982",
    },
    appliesWhen: ageIn("51-65", "66+"),
    priority: 60,
    figures: [
      { label: "Plancher 2026", value: "4 710 €" },
      { label: "Base", value: "10% PASS 2025" },
      { label: "Applicable si", value: "aucun/faible revenu" },
    ],
    sources: [
      "https://www.service-public.gouv.fr/particuliers/vosdroits/F34982",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "per-report-5-ans",
    category: "retirement",
    title: "PER : le report des plafonds passe à 5 ans",
    body:
      "Nouveau depuis 2026 : les plafonds PER non utilisés se reportent désormais sur 5 ans (contre 3 ans avant). Si tu n'as pas maxé ton plafond 2026, tu as jusqu'en 2031 pour rattraper. Utile pour lisser tes versements sur des années à haut revenu.",
    action: {
      label: "Retrouver ton plafond dans ton avis d'imposition",
    },
    appliesWhen: and(tmiAtLeast("30"), ageIn("36-50", "51-65")),
    priority: 62,
    figures: [
      { label: "Report ancien (2024-2025)", value: "3 ans" },
      { label: "Report nouveau (dès 2026)", value: "5 ans" },
    ],
    sources: [
      "https://www.service-public.gouv.fr/particuliers/vosdroits/F34982",
    ],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // SCPI — Immobilier locatif pour préparation retraite
  // ==========================================================================
  {
    id: "scpi-retraite-diversif",
    category: "retirement",
    title: "SCPI : 4,92% de rendement moyen pour la retraite",
    body:
      "Les SCPI de rendement ont distribué 4,92% en moyenne en 2025 (chiffre ASPIM). Ticket d'entrée typique 200-1 000 €. Alternative au PER pour les TMI < 30% (moins d'intérêt fiscal du PER). Attention : la variation de prix des parts peut être négative (-3,45% en 2025) — c'est un placement long terme (10+ ans).",
    action: {
      label: "Comparer les catégories sur aspim.fr",
      link: "https://www.aspim.fr",
    },
    appliesWhen: ageIn("36-50", "51-65"),
    priority: 55,
    figures: [
      { label: "TD moyen 2025", value: "4,92%" },
      { label: "Ticket d'entrée", value: "200 - 1 000 €" },
      { label: "Horizon", value: "10+ ans" },
      { label: "Perf globale 2025", value: "+1,46%" },
    ],
    sources: [
      "https://www.aspim.fr/actualites/collecte-et-performance-des-fonds-immobiliers-grand-public-au-premier-trimestre-2026-et-principaux-indicateurs-des-scpi-en-2025/",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "scpi-choix-categorie",
    category: "long_term",
    title: "SCPI : logistique et diversifiées en tête en 2025",
    body:
      "Les catégories qui ont surperformé en 2025 : Logistique/industriel (+6,4% RGI), Diversifiées (+5,7%). Les catégories en repli : Bureaux (+2,4%), Santé/éducation (0,0%). Le marché SCPI se re-segmente — évite l'exposition unique aux bureaux.",
    action: {
      label: "Consulter le rapport ASPIM Q4 2025",
      link: "https://www.aspim.fr",
    },
    appliesWhen: ageIn("36-50", "51-65"),
    priority: 50,
    figures: [
      { label: "Logistique RGI", value: "+6,4%" },
      { label: "Diversifiées RGI", value: "+5,7%" },
      { label: "Bureaux RGI", value: "+2,4%" },
      { label: "Santé RGI", value: "0,0%" },
    ],
    sources: [
      "https://www.aspim.fr/actualites/collecte-et-performance-des-fonds-immobiliers-grand-public-au-premier-trimestre-2026-et-principaux-indicateurs-des-scpi-en-2025/",
    ],
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

  // ==========================================================================
  // ANIMAUX DE COMPAGNIE
  // Corpus v5 (2026-07-18) — seuls les chiffres vérifiés 3-0 sont utilisés.
  // Budget chien hors assurance + petites espèces : pas de données fiables,
  // donc conseil générique sans montant inventé.
  // ==========================================================================
  {
    id: "pets-assurance-chien",
    category: "pets",
    title: "Assurance santé chien : 12 à 44 €/mois",
    body:
      "Pour un chien de moins de 2 ans en 2026, compte 12,46 €/mois en formule économique, 27,33 € en médium et 44,15 € en premium (baromètre janvier 2026). Souscrire jeune coûte moins cher et évite les exclusions pour maladies préexistantes.",
    action: { label: "Comparer 3 formules d'assurance avant les 2 ans du chien" },
    appliesWhen: hasPetSpecies("dog"),
    priority: 70,
    figures: [
      { label: "Formule éco", value: "12,46 €/mois" },
      { label: "Médium", value: "27,33 €/mois" },
      { label: "Premium", value: "44,15 €/mois" },
    ],
    sources: [
      "https://www.lecomparateurassurance.com/assurance-animaux/actualites/barometre-assurance-animaux-janvier-2026",
      "https://www.moneyvox.fr/assurance/actualites/107615/combien-ca-coute-assurer-votre-chien-ou-votre-chat-en-2026",
    ],
    lastVerified: "2026-07-18",
  },
  {
    id: "pets-assurance-chat",
    category: "pets",
    title: "Assurance santé chat : 9 à 35 €/mois",
    body:
      "Pour un chat de moins de 2 ans en 2026, l'assurance santé va de 9 €/mois (entrée de gamme) à 35 €/mois (premium). Les tarifs grimpent avec l'âge de l'animal — souscrire tôt fige un meilleur prix.",
    action: { label: "Comparer les formules d'assurance chat" },
    appliesWhen: hasPetSpecies("cat"),
    priority: 68,
    figures: [
      { label: "Fourchette 2026", value: "9 - 35 €/mois" },
      { label: "Âge optimal", value: "avant 2 ans" },
    ],
    sources: [
      "https://www.moneyvox.fr/assurance/actualites/107615/combien-ca-coute-assurer-votre-chien-ou-votre-chat-en-2026",
    ],
    lastVerified: "2026-07-18",
  },
  {
    id: "pets-budget-chat",
    category: "pets",
    title: "Budget chat : 600 à 1 000 € par an",
    body: (p) => {
      const count = p.pets?.find((pet) => pet.species === "cat")?.count ?? 1;
      if (count > 1) {
        return `Nourriture, litière et soins courants (hors assurance) coûtent 600 à 1 000 € par an et par chat — soit ${600 * count} à ${1000 * count} € pour tes ${count} chats. Provisionne 50-85 €/mois/chat dans une catégorie dédiée pour absorber les visites vétérinaires.`;
      }
      return "Nourriture, litière et soins courants (hors assurance) : 600 à 1 000 € par an, soit 50 à 85 €/mois. Provisionne cette somme dans une catégorie dédiée pour éviter que les visites vétérinaires percutent ton reste à vivre.";
    },
    action: { label: "Créer une catégorie de dépense dédiée au chat" },
    appliesWhen: hasPetSpecies("cat"),
    priority: 72,
    figures: (p) => {
      const count = p.pets?.find((pet) => pet.species === "cat")?.count ?? 1;
      return [
        { label: "Budget annuel/chat", value: "600 - 1 000 €" },
        { label: "Par mois/chat", value: "50 - 85 €" },
        ...(count > 1
          ? [{ label: `Total ${count} chats`, value: `${600 * count} - ${1000 * count} €/an` }]
          : []),
      ];
    },
    sources: [
      "https://www.moneyvox.fr/assurance/actualites/107615/combien-ca-coute-assurer-votre-chien-ou-votre-chat-en-2026",
    ],
    lastVerified: "2026-07-18",
  },
  {
    id: "pets-ligne-budget-dediee",
    countries: "all",
    category: "pets",
    title: "Un animal = une ligne budgétaire dédiée",
    body:
      "Nourriture, soins courants, vétérinaire et imprévus : un animal est une dépense récurrente ET irrégulière. Une urgence vétérinaire peut coûter plusieurs centaines d'euros d'un coup. Crée une catégorie de dépense dédiée et une petite provision mensuelle — même modeste, elle absorbe les à-coups.",
    action: { label: "Créer une catégorie animaux + provision mensuelle" },
    appliesWhen: hasAnyPet,
    priority: 60,
    sources: [
      "https://www.moneyvox.fr/assurance/actualites/107615/combien-ca-coute-assurer-votre-chien-ou-votre-chat-en-2026",
    ],
    lastVerified: "2026-07-18",
  },

  // ==========================================================================
  // BELGIQUE — recherche vérifiée 2026-07-27 (SPF Finances, Wikifin/FSMA,
  // Agence fédérale de la Dette). Pas de taux volatils codés en dur.
  // ==========================================================================
  {
    id: "be-fonds-urgence",
    category: "emergency",
    countries: ["BE"],
    title: "Ta réserve d'épargne : 3 à 6 mois de salaire net",
    body:
      "Wikifin (l'éducation financière officielle de la FSMA) considère qu'une réserve de 3 à 6 mois de salaire net est idéale. Garde-la sur un compte d'épargne accessible, séparée de l'épargne pour tes projets planifiés.",
    action: {
      label: "Comparer les comptes d'épargne sur Wikifin",
      link: "https://www.wikifin.be/fr/epargner-et-investir/comparateur-de-comptes-depargne",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "Cible", value: "3-6 mois de salaire net" }],
    sources: [
      "https://www.wikifin.be/fr/budget-payer-emprunter-et-assurer/budget-et-gestion-de-budget/quest-ce-quune-reserve-depargne",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "be-epargne-reglementee",
    category: "tax",
    countries: ["BE"],
    title: "Compte d'épargne réglementé : 1 020 € d'intérêts exonérés",
    body:
      "Les premiers 1 020 € d'intérêts par personne et par an sur les comptes d'épargne réglementés sont exonérés de précompte mobilier (15 % au-delà, au lieu de 30 %). Attention : l'exonération vaut par PERSONNE, pas par banque — si tu cumules plusieurs banques et dépasses le plafond, c'est à toi de régulariser via ta déclaration.",
    action: {
      label: "Vérifier le régime de tes comptes d'épargne",
      link: "https://fin.belgium.be/fr/particuliers/declaration-impot/revenus/epargne-placements",
    },
    appliesWhen: always,
    priority: 84,
    figures: [
      { label: "Exonérés / pers. / an", value: "1 020 €" },
      { label: "Au-delà", value: "précompte 15 %" },
    ],
    sources: [
      "https://fin.belgium.be/fr/particuliers/declaration-impot/revenus/epargne-placements",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "be-epargne-pension",
    category: "retirement",
    countries: ["BE"],
    title: "Épargne-pension : vise 1 050 € — pas 1 200 €",
    body:
      "Deux régimes en 2026 : jusqu'à 1 050 €/an avec 30 % de réduction d'impôt, ou jusqu'à 1 350 €/an avec 25 % (sur demande explicite à ta banque). Zone piège : entre 1 050 et 1 260 € versés, ton avantage fiscal est INFÉRIEUR à celui d'un versement de 1 050 € pile. Soit tu restes à 1 050 €, soit tu vas franchement vers 1 350 €.",
    action: {
      label: "Vérifier ton plafond auprès de ta banque",
      link: "https://fin.belgium.be/fr/particuliers/avantages-fiscaux/epargne-pension",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 86,
    figures: [
      { label: "Plafond de base", value: "1 050 € → 30 %" },
      { label: "Plafond majoré", value: "1 350 € → 25 %" },
      { label: "Zone à éviter", value: "1 050 - 1 260 €" },
    ],
    sources: [
      "https://fin.belgium.be/fr/particuliers/avantages-fiscaux/epargne-pension",
      "https://www.wikifin.be/fr/impots-emploi-et-revenus/declaration-dimpots/reductions-fiscales/lepargne-pension",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "be-taxe-plus-values",
    category: "long_term",
    countries: ["BE"],
    title: "Plus-values : 10 % depuis 2026, mais 10 000 € de franchise",
    body:
      "Depuis le 1er janvier 2026, les plus-values sur actifs financiers des particuliers sont taxées à 10 % — avec une exonération annuelle de 10 000 € par contribuable. Pour les actifs achetés avant 2026, la valeur de référence est celle du 31 décembre 2025 (pas ton prix d'achat). Étaler tes ventes sur plusieurs années peut faire rester sous la franchise.",
    action: {
      label: "Lire le régime officiel de la taxe",
      link: "https://fin.belgium.be/fr/particuliers/declaration-impot/revenus/taxe-plus-values",
    },
    appliesWhen: always,
    priority: 78,
    figures: [
      { label: "Taux", value: "10 %" },
      { label: "Franchise annuelle", value: "10 000 €" },
    ],
    sources: [
      "https://fin.belgium.be/fr/particuliers/declaration-impot/revenus/taxe-plus-values",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "be-bons-etat",
    category: "long_term",
    countries: ["BE"],
    title: "Bons d'État : une émission chaque trimestre",
    body:
      "L'Agence fédérale de la Dette émet des bons d'État début mars, juin, septembre et décembre. Les coupons subissent le précompte mobilier de 30 % : compare toujours le rendement NET avec les comptes à terme bancaires avant de souscrire — le gagnant change selon les émissions.",
    action: {
      label: "Voir les émissions en cours",
      link: "https://www.debtagency.be/fr/productsbeinfo",
    },
    appliesWhen: always,
    priority: 70,
    sources: ["https://www.debtagency.be/fr/productsbeinfo"],
    lastVerified: "2026-07-27",
  },
  {
    id: "be-succession-regions",
    category: "inheritance",
    countries: ["BE"],
    title: "Succession et donation : tout dépend de ta région",
    body:
      "Les droits de succession et de donation sont une compétence RÉGIONALE : les taux et abattements diffèrent entre la Flandre, la Wallonie et Bruxelles — et c'est le domicile fiscal du défunt ou du donateur qui compte, pas celui de l'héritier. Avant toute planification (donation mobilière, immobilière), vérifie les règles de TA région.",
    action: {
      label: "Vérifier les règles de ta région",
      link: "https://www.wikifin.be/fr/famille/heriter",
    },
    appliesWhen: ageIn("36-50", "51-65", "66+"),
    priority: 68,
    sources: [
      "https://www.wikifin.be/fr/famille/heriter",
    ],
    lastVerified: "2026-07-27",
  },

  // ==========================================================================
  // SUISSE — recherche vérifiée 2026-07-27 (AFC/estv, OFSP/priminfo, canton
  // GE, banques de référence). Montants 3a = valeurs OFAS 2025-2026.
  // ==========================================================================
  {
    id: "ch-fonds-urgence",
    category: "emergency",
    countries: ["CH"],
    title: "Réserve de sécurité : 3 à 6 mois de dépenses",
    body:
      "Recommandation courante en Suisse : garder l'équivalent de 3 à 6 mois de dépenses courantes sur un compte épargne liquide (davantage si tu es indépendant). Exemple : 4 500 CHF de charges mensuelles → vise 13 500 à 27 000 CHF avant tout investissement.",
    action: { label: "Calculer 3-6 mois de tes charges dans le tab Budget" },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "Cible", value: "3-6 mois de dépenses" }],
    sources: ["https://www.cler.ch/fr/blog/blog/clever-auf-gratis-konten-sparen"],
    lastVerified: "2026-07-27",
  },
  {
    id: "ch-pilier-3a",
    category: "retirement",
    countries: ["CH"],
    title: "Pilier 3a : 7 258 CHF déductibles en 2026",
    body:
      "Verser dans le pilier 3a réduit directement ton revenu imposable (fédéral, cantonal et communal). Plafond 2026 : 7 258 CHF si tu as une caisse de pension ; 20 % du revenu net (max 36 288 CHF) sans caisse de pension. Dans un couple à deux revenus, CHACUN a son propre plafond. À créditer avant le 31 décembre.",
    action: {
      label: "Programmer un versement mensuel automatique vers le 3a",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 88,
    figures: [
      { label: "Avec caisse de pension", value: "7 258 CHF" },
      { label: "Sans caisse de pension", value: "20 % · max 36 288 CHF" },
    ],
    sources: [
      "https://www.ubs.com/ch/fr/services/pension/pillar-3/maximal-contribution.html",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "ch-3a-rachat-retroactif",
    category: "retirement",
    countries: ["CH"],
    title: "Nouveau : rattrape tes lacunes 3a (dès 2026)",
    body:
      "2026 est la première année où tu peux racheter rétroactivement une lacune de versement 3a — uniquement pour les lacunes apparues à partir de 2025, jusqu'à 10 ans en arrière. Conditions : avoir eu un revenu AVS l'année de la lacune et verser d'abord le maximum de l'année en cours. Chaque lacune se comble en un versement unique, déductible.",
    action: { label: "Vérifier tes années incomplètes auprès de ta fondation 3a" },
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 80,
    sources: [
      "https://www.zurich.ch/fr/services/savoir/prevoyance-et-placement/erachats-ulterieurs-pilier-3a",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "ch-rachat-lpp",
    category: "retirement",
    countries: ["CH"],
    title: "Rachat dans ta caisse de pension : puissant mais encadré",
    body:
      "Les rachats volontaires dans le 2e pilier sont intégralement déductibles du revenu imposable. Ton potentiel de rachat figure sur ton certificat de prévoyance. Deux règles d'or : étale un gros rachat sur 2-3 ans pour casser la progression fiscale, et AUCUN retrait en capital dans les 3 ans qui suivent (art. 79b LPP), sinon la déduction est annulée avec rappel d'impôt.",
    action: {
      label: "Lire ton certificat de prévoyance (potentiel de rachat)",
      link: "https://www.ge.ch/impot-prevoyance-retraite-du-2e-3e-pilier/comment-deduire-rachats-au-2e-3e-pilier",
    },
    appliesWhen: ageIn("36-50", "51-65"),
    priority: 76,
    figures: [{ label: "Blocage après rachat", value: "3 ans (art. 79b)" }],
    sources: [
      "https://www.ge.ch/impot-prevoyance-retraite-du-2e-3e-pilier/comment-deduire-rachats-au-2e-3e-pilier",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "ch-impot-anticipe",
    category: "tax",
    countries: ["CH"],
    title: "Impôt anticipé 35 % : récupère-le, c'est le tien",
    body:
      "35 % de tes intérêts et dividendes suisses sont retenus à la source — mais ce n'est PAS un impôt définitif. Déclare correctement ces rendements dans l'état des titres de ta déclaration et tu récupères l'intégralité (imputée sur tes impôts cantonaux). Délai : 3 ans après la fin de l'année concernée. Ne laisse pas dormir cet argent.",
    action: {
      label: "Vérifier ton état des titres",
      link: "https://www.estv.admin.ch/estv/fr/accueil/impot-anticipe.html",
    },
    appliesWhen: always,
    priority: 74,
    figures: [
      { label: "Retenue", value: "35 %" },
      { label: "Récupérable", value: "100 % (délai 3 ans)" },
    ],
    sources: ["https://www.estv.admin.ch/estv/fr/accueil/impot-anticipe.html"],
    lastVerified: "2026-07-27",
  },
  {
    id: "ch-lamal-franchise",
    category: "insurance",
    countries: ["CH"],
    title: "LAMal : ta franchise est un levier budgétaire",
    body:
      "Adultes : franchise de 300 CHF (ordinaire) à 2 500 CHF (maximale), plus une quote-part de 10 % plafonnée à 700 CHF/an. Peu de frais médicaux → franchise haute et prime réduite ; frais réguliers → franchise basse. Le changement ne se fait qu'au 1er janvier. Et vérifie tes droits aux subsides : chaque canton réduit les primes des revenus modestes selon ses propres règles.",
    action: {
      label: "Comparer primes et franchises sur Priminfo",
      link: "https://www.priminfo.admin.ch/fr/sparen/grundversicherung",
    },
    appliesWhen: always,
    priority: 82,
    figures: [
      { label: "Franchises adultes", value: "300 → 2 500 CHF" },
      { label: "Quote-part max", value: "700 CHF/an" },
    ],
    sources: [
      "https://www.priminfo.admin.ch/fr/sparen/grundversicherung",
      "https://www.bag.admin.ch/fr/assurance-maladie-reduction-des-primes",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "ch-loyer-tiers",
    category: "housing",
    countries: ["CH"],
    title: "La règle du tiers : ton loyer face aux régies",
    body:
      "Pratique standard des régies suisses : un dossier de location n'est accepté que si le revenu net fait au moins 3× le loyer charges comprises. Ce n'est pas une loi, mais c'est un double repère : critère d'acceptation ET garde-fou budgétaire. Dans les villes tendues où le tiers est dépassé, compense sur les autres postes.",
    action: { label: "Vérifier ton ratio loyer/revenu dans le tab Budget" },
    appliesWhen: housingIn("renter"),
    priority: 72,
    figures: [{ label: "Repère", value: "loyer ≤ 1/3 du revenu net" }],
    sources: [
      "https://www.bcbe.ch/la-bcbe/blog/logement/couts-de-location-maximum",
    ],
    lastVerified: "2026-07-27",
  },

  // ==========================================================================
  // LUXEMBOURG — recherche vérifiée 2026-07-27 (ACD/impotsdirects, guichet.lu,
  // CAE, lëtzfin/CSSF). Plafond 111bis = 4 500 € depuis 2026 (loi 19.12.2025).
  // ==========================================================================
  {
    id: "lu-fonds-urgence",
    category: "emergency",
    countries: ["LU"],
    title: "Épargne de sécurité : 3 à 6 mois de salaire",
    body:
      "Lëtzfin (l'éducation financière de la CSSF) recommande de constituer une épargne de sécurité représentant 3 à 6 mois de salaire, sur un compte accessible. Une fois ce matelas en place, l'excédent peut aller vers des placements de plus long terme.",
    action: {
      label: "Lire la recommandation Lëtzfin",
      link: "https://www.letzfin.lu/pourquoi-est-il-important-de-mettre-de-largent-de-cote-pour-des-situations-durgence/",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "Cible", value: "3-6 mois de salaire" }],
    sources: [
      "https://www.letzfin.lu/pourquoi-est-il-important-de-mettre-de-largent-de-cote-pour-des-situations-durgence/",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "lu-prevoyance-111bis",
    category: "retirement",
    countries: ["LU"],
    title: "Prévoyance-vieillesse : 4 500 € déductibles par an (nouveau)",
    body:
      "Depuis l'année d'imposition 2026, le plafond déductible d'un contrat de prévoyance-vieillesse (art. 111bis LIR) passe de 3 200 € à 4 500 € par contribuable et par an. Conditions : contrat d'au moins 10 ans, sortie entre 60 et 75 ans. Un remboursement anticipé est imposé au taux plein — c'est de l'épargne longue, pas un livret.",
    action: {
      label: "Vérifier le régime sur le site de l'ACD",
      link: "https://impotsdirects.public.lu/fr/az/p/prevoyance_vieillesse.html",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 88,
    figures: [
      { label: "Plafond 2026", value: "4 500 € / an" },
      { label: "Durée minimale", value: "10 ans" },
    ],
    sources: ["https://impotsdirects.public.lu/fr/az/p/prevoyance_vieillesse.html"],
    lastVerified: "2026-07-27",
  },
  {
    id: "lu-epargne-logement",
    category: "real_estate",
    countries: ["LU"],
    title: "Épargne-logement : déduction doublée pour les jeunes",
    body:
      "Les cotisations d'épargne-logement sont déductibles jusqu'à 672 €/an — et le plafond est DOUBLÉ (1 344 €) pour les jeunes souscripteurs (jusqu'à 40 ans environ), puis majoré pour le conjoint imposé collectivement et chaque enfant. Contrat d'au moins 10 ans, affecté au financement de la résidence principale. Si tu comptes acheter un jour, plus tu commences jeune, plus la déduction est intéressante.",
    action: {
      label: "Voir les conditions officielles",
      link: "https://impotsdirects.public.lu/fr/az/c/cotis-epargne-logement.html",
    },
    appliesWhen: and(
      ageIn("18-25", "26-35"),
      housingIn("renter", "free_housing"),
    ),
    priority: 78,
    figures: [
      { label: "Plafond jeune", value: "1 344 € / an" },
      { label: "Plafond standard", value: "672 € / an" },
    ],
    sources: ["https://impotsdirects.public.lu/fr/az/c/cotis-epargne-logement.html"],
    lastVerified: "2026-07-27",
  },
  {
    id: "lu-frontaliers-assimilation",
    category: "tax",
    countries: ["LU"],
    title: "Frontalier au Luxembourg ? L'assimilation change tout",
    body:
      "Sans assimilation fiscale, un frontalier n'a accès à AUCUNE déduction luxembourgeoise (prévoyance 111bis, épargne-logement, assurances). Tu peux demander le traitement équivalent résident si ≥ 90 % de tes revenus mondiaux sont imposables au Luxembourg (ou si tes revenus hors Luxembourg restent sous 13 000 € ; règle spéciale à 50 % pour les résidents belges). Ça se coche dans la déclaration.",
    action: {
      label: "Vérifier tes conditions d'assimilation",
      link: "https://guichet.public.lu/fr/citoyens/fiscalite/declaration-impot-decompte/activite-professionnelle/declaration-revenus/assimilation-resident.html",
    },
    appliesWhen: always,
    priority: 66,
    figures: [
      { label: "Seuil général", value: "≥ 90 % des revenus" },
      { label: "Résidents belges", value: "50 % des revenus pro" },
    ],
    sources: [
      "https://guichet.public.lu/fr/citoyens/fiscalite/declaration-impot-decompte/activite-professionnelle/declaration-revenus/assimilation-resident.html",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "lu-allocations-familiales",
    category: "kids",
    countries: ["LU"],
    title: "Allocation pour l'avenir des enfants : à intégrer au budget",
    body:
      "La CAE verse 315,04 €/mois par enfant (valeur au 1er juin 2026, indexée), majorée à 338,85 € de 6 à 11 ans et 374,48 € à partir de 12 ans. Versée du mois de naissance aux 18 ans. Une ligne de revenu stable à intégrer dans ton budget — et idéalement à flécher en partie vers l'épargne de l'enfant.",
    action: {
      label: "Voir les montants à jour (CAE)",
      link: "https://cae.public.lu/fr/allocations/allocation-pour-lavenir-des-enfants/montants.html",
    },
    appliesWhen: hasAnyKids,
    priority: 84,
    figures: [
      { label: "Base / enfant", value: "315,04 € / mois" },
      { label: "12 ans et +", value: "374,48 € / mois" },
    ],
    sources: [
      "https://cae.public.lu/fr/allocations/allocation-pour-lavenir-des-enfants/montants.html",
    ],
    lastVerified: "2026-07-27",
  },

  // ==========================================================================
  // CANADA — recherche vérifiée 2026-07-27 (ARC/canada.ca, Revenu Québec).
  // Montants en dollars canadiens ($). Cycle ACE = juillet → juin.
  // ==========================================================================
  {
    id: "ca-fonds-urgence",
    category: "emergency",
    countries: ["CA"],
    title: "Fonds d'urgence : 3 à 6 mois de dépenses",
    body:
      "L'Agence de la consommation en matière financière du Canada recommande un fonds d'urgence couvrant 3 à 6 mois de dépenses courantes, sur un compte accessible (un CELI liquide fait très bien l'affaire : les retraits n'y sont pas imposés).",
    action: {
      label: "Lire la recommandation de l'ACFC",
      link: "https://www.canada.ca/en/financial-consumer-agency/services/savings-investments/setting-up-emergency-funds.html",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "Cible", value: "3-6 mois de dépenses" }],
    sources: [
      "https://www.canada.ca/en/financial-consumer-agency/services/savings-investments/setting-up-emergency-funds.html",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "ca-celi",
    category: "long_term",
    countries: ["CA"],
    title: "CELI : 7 000 $ de plus en 2026, gains jamais imposés",
    body:
      "Le plafond CELI 2026 est de 7 000 $, et tes droits inutilisés depuis tes 18 ans (2009 au plus tôt) s'accumulent — jusqu'à 109 000 $ si tu n'as jamais cotisé. Gains et retraits : zéro impôt. Piège classique : un retrait ne recrée tes droits que le 1er JANVIER SUIVANT — re-cotiser la même année peut te coûter 1 %/mois de pénalité.",
    action: {
      label: "Vérifier tes droits CELI (Mon dossier ARC)",
      link: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html",
    },
    appliesWhen: always,
    priority: 88,
    figures: [
      { label: "Plafond 2026", value: "7 000 $" },
      { label: "Cumul max depuis 2009", value: "109 000 $" },
    ],
    sources: [
      "https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "ca-reer",
    category: "retirement",
    countries: ["CA"],
    title: "REER : déduis jusqu'à 18 % de ton revenu",
    body:
      "Tes cotisations REER se déduisent de ton revenu imposable (fédéral ET provincial) : 18 % du revenu gagné de l'année précédente, max 33 810 $ en 2026, plus tes droits reportés. Date limite pour l'année d'imposition 2025 : 2 mars 2026. Plus ton taux marginal est élevé, plus le REER bat le CELI — et l'inverse en début de carrière.",
    action: {
      label: "Vérifier ton maximum déductible (avis de cotisation)",
      link: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans.html",
    },
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 84,
    figures: [
      { label: "Taux", value: "18 % du revenu" },
      { label: "Max 2026", value: "33 810 $" },
    ],
    sources: [
      "https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "ca-celiapp",
    category: "real_estate",
    countries: ["CA"],
    title: "CELIAPP : ouvre-le même avec 1 $, le compteur ne démarre qu'après",
    body:
      "Pour une première propriété : 8 000 $/an, 40 000 $ à vie — cotisations déductibles comme un REER ET retrait non imposé comme un CELI. Le meilleur des deux mondes. Contrairement au CELI, tes droits ne commencent à s'accumuler qu'à l'OUVERTURE du compte (report max 8 000 $) : ouvre-le dès que l'achat devient un projet, même de loin.",
    action: {
      label: "Voir les règles du CELIAPP",
      link: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html",
    },
    appliesWhen: and(
      ageIn("18-25", "26-35", "36-50"),
      housingIn("renter", "free_housing"),
    ),
    priority: 86,
    figures: [
      { label: "Par an", value: "8 000 $" },
      { label: "À vie", value: "40 000 $" },
    ],
    sources: [
      "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account/contributing-your-fhsa.html",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "ca-reee",
    category: "kids",
    countries: ["CA"],
    title: "REEE : 20 % de subvention immédiate pour les études",
    body:
      "Chaque dollar versé au REEE de ton enfant rapporte 20 % de subvention fédérale (SCEE) sur les premiers 2 500 $/an — soit 500 $ offerts chaque année, max 7 200 $ à vie. Au Québec, l'IQEE ajoute 10 % (max 3 600 $ à vie) : jusqu'à 30 % de rendement garanti avant même d'investir. Aucun placement ne bat ça.",
    action: {
      label: "Estimer les subventions REEE",
      link: "https://www.canada.ca/en/services/benefits/education/education-savings/estimating-amounts.html",
    },
    appliesWhen: hasAnyKids,
    priority: 90,
    figures: [
      { label: "SCEE fédérale", value: "20 % · max 500 $/an" },
      { label: "IQEE (Québec)", value: "+10 %" },
      { label: "SCEE à vie", value: "7 200 $" },
    ],
    sources: [
      "https://www.canada.ca/en/services/benefits/education/education-savings/estimating-amounts.html",
      "https://www.revenuquebec.ca/en/citizens/tax-credits/quebec-education-savings-incentive/determining-the-qesi-amount/",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "ca-ace",
    category: "kids",
    countries: ["CA"],
    title: "Allocation canadienne pour enfants : jusqu'à 679 $/mois",
    body:
      "L'ACE (non imposable) atteint 8 157 $/an (679,75 $/mois) par enfant de moins de 6 ans et 6 883 $/an de 6 à 17 ans pour la période juillet 2026 - juin 2027, dégressive au-delà de 38 237 $ de revenu familial net. Elle est recalculée chaque juillet sur le revenu de l'année précédente — déclare tes impôts à temps même sans revenu, sinon elle s'arrête.",
    action: {
      label: "Voir le calcul de l'ACE",
      link: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview.html",
    },
    appliesWhen: hasAnyKids,
    priority: 88,
    figures: [
      { label: "< 6 ans", value: "max 679,75 $/mois" },
      { label: "6-17 ans", value: "max 573,58 $/mois" },
    ],
    sources: [
      "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview/canada-child-benefit-we-calculate-your-ccb.html",
    ],
    lastVerified: "2026-07-27",
  },

  // ==========================================================================
  // AUTRE PAYS — conseils universels sans dispositif fiscal local.
  // ==========================================================================
  {
    id: "other-fonds-urgence",
    category: "emergency",
    // "OTHER" + pays sans recommandation officielle locale de fonds d'urgence
    countries: ["OTHER", "MA", "DZ", "TN", "SN", "CI", "CM"],
    title: "Le socle universel : 3 à 6 mois de dépenses de côté",
    body:
      "Quel que soit le pays, la règle ne change pas : garde l'équivalent de 3 à 6 mois de dépenses courantes sur un compte accessible, séparé du compte courant. C'est ce matelas qui transforme un imprévu (panne, perte d'emploi, santé) en simple contrariété au lieu d'une dette.",
    action: { label: "Calculer 3-6 mois de tes charges dans le tab Budget" },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "Cible", value: "3-6 mois de dépenses" }],
    sources: ["Principe universel de finances personnelles"],
    lastVerified: "2026-07-27",
  },
  {
    id: "other-epargne-automatique",
    category: "emergency",
    countries: ["OTHER", "MA", "DZ", "TN", "SN", "CI", "CM"],
    title: "Automatise ton épargne le jour de paie",
    body:
      "Programme un virement automatique vers ton épargne le jour où ton revenu arrive — pas en fin de mois avec « ce qui reste ». Se payer en premier est le levier d'épargne le plus robuste, dans tous les systèmes fiscaux. Renseigne-toi ensuite sur les enveloppes fiscalement avantagées de ton pays (retraite, logement, études).",
    action: { label: "Programmer un virement automatique jour de paie" },
    appliesWhen: always,
    priority: 84,
    sources: ["Principe universel de finances personnelles"],
    lastVerified: "2026-07-27",
  },

  // ==========================================================================
  // FRANCE — AIDES RÉGIONALES. Les dispositifs existent et sont sourcés ;
  // les tarifs changent chaque rentrée → AUCUN montant codé en dur.
  // ==========================================================================
  {
    id: "fr-idf-imagine-r",
    category: "emergency",
    countries: ["FR"],
    title: "Imagine R : le transport francilien à tarif étudiant",
    body:
      "En Île-de-France, le forfait Imagine R (scolaires, étudiants et jeunes) donne accès à tout le réseau à tarif très réduit par rapport au Navigo classique — souvent l'un des premiers postes d'économie d'un foyer francilien avec ados ou étudiants. Les tarifs changent chaque rentrée : vérifie le prix en vigueur et les aides (certains départements en remboursent une partie).",
    action: {
      label: "Voir les tarifs Imagine R en vigueur",
      link: "https://www.iledefrance-mobilites.fr/titres-et-tarifs",
    },
    appliesWhen: and(
      regionIs("Île-de-France"),
      or(ageIn("under_18", "18-25"), kids("12-15", "16-18", "19+")),
    ),
    priority: 82,
    sources: ["https://www.iledefrance-mobilites.fr/titres-et-tarifs"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-occitanie-carte-jeune",
    category: "emergency",
    countries: ["FR"],
    title: "Carte Jeune Région : les aides occitanes pour les 15-25 ans",
    body:
      "En Occitanie, la Carte Jeune Région (gratuite) ouvre des aides concrètes aux lycéens et jeunes : manuels scolaires, prêt d'ordinateur, aides à la lecture, au sport et à la mobilité. Les montants évoluent chaque année scolaire — le réflexe : créer la carte dès l'entrée au lycée et activer chaque aide à laquelle le foyer a droit.",
    action: {
      label: "Créer la Carte Jeune Région",
      link: "https://www.laregion.fr/-cartejeune-",
    },
    appliesWhen: and(
      regionIs("Occitanie"),
      or(ageIn("under_18", "18-25"), kids("12-15", "16-18", "19+")),
    ),
    priority: 82,
    sources: ["https://www.laregion.fr/-cartejeune-"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-region-aides-jeunes",
    category: "emergency",
    countries: ["FR"],
    title: "Ta région distribue des aides que presque personne ne réclame",
    body:
      "Chaque région française finance des dispositifs jeunesse : cartes jeunes, transport scolaire subventionné, aide au permis, au BAFA, à la culture et au sport, primes de rentrée. Ce sont des centaines d'euros par an qui ne demandent qu'un dossier. Le point d'entrée : le site de TA région (rubrique jeunesse/éducation) et le simulateur national 1jeune1solution.",
    action: {
      label: "Simuler tes aides sur 1jeune1solution",
      link: "https://www.1jeune1solution.gouv.fr/mes-aides",
    },
    appliesWhen: or(ageIn("under_18", "18-25"), hasAnyKids),
    priority: 74,
    sources: ["https://www.1jeune1solution.gouv.fr/mes-aides"],
    lastVerified: "2026-08-06",
  },

  // ==========================================================================
  // ROYAUME-UNI — recherche vérifiée 2026-07-27 (gov.uk, MoneyHelper, Hansard).
  // Année fiscale 6 avril → 5 avril. Réforme Cash ISA au 06/04/2027 anticipée.
  // ==========================================================================
  {
    id: "gb-fonds-urgence",
    category: "emergency",
    countries: ["GB"],
    title: "Emergency fund : 3 mois de dépenses essentielles",
    body:
      "MoneyHelper (le service public d'éducation financière) recommande au minimum 3 mois de dépenses essentielles sur un compte à accès immédiat — 3 à 6 mois pour être confortable. Exemple : 1 000 £ de dépenses mensuelles → vise 3 000 £ avant tout investissement.",
    action: {
      label: "Lire la recommandation MoneyHelper",
      link: "https://www.moneyhelper.org.uk/en/savings/types-of-savings/emergency-savings-how-much-is-enough",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "Cible", value: "3-6 mois de dépenses" }],
    sources: [
      "https://www.moneyhelper.org.uk/en/savings/types-of-savings/emergency-savings-how-much-is-enough",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "gb-isa",
    category: "long_term",
    countries: ["GB"],
    title: "ISA : 20 000 £ par an, gains jamais imposés",
    body:
      "Chaque année fiscale (6 avril - 5 avril), tu peux verser jusqu'à 20 000 £ en ISA — intérêts et plus-values totalement exonérés, à vie. À répartir librement entre Cash ISA et Stocks & Shares ISA. Attention : à partir d'avril 2027, la part versable en Cash ISA sera limitée à 12 000 £/an pour les moins de 65 ans — le reste devra aller vers l'investissement.",
    action: {
      label: "Voir les règles ISA officielles",
      link: "https://www.gov.uk/individual-savings-accounts",
    },
    appliesWhen: always,
    priority: 88,
    figures: [
      { label: "Plafond annuel", value: "20 000 £" },
      { label: "Cash ISA dès 04/2027", value: "12 000 £ (< 65 ans)" },
    ],
    sources: ["https://www.gov.uk/individual-savings-accounts"],
    lastVerified: "2026-07-27",
  },
  {
    id: "gb-lisa",
    category: "real_estate",
    countries: ["GB"],
    title: "Lifetime ISA : 25 % offerts pour ta première maison",
    body:
      "Entre 18 et 39 ans, ouvre un LISA : l'État ajoute 25 % à tes versements (max 4 000 £/an → 1 000 £ de bonus). Utilisable pour une première résidence ≤ 450 000 £ (compte ouvert depuis 12 mois min) ou à partir de 60 ans. Piège : tout autre retrait subit une pénalité de 25 % qui entame ton capital, pas seulement le bonus.",
    action: {
      label: "Voir les conditions du LISA",
      link: "https://www.gov.uk/lifetime-isa",
    },
    appliesWhen: and(
      ageIn("18-25", "26-35"),
      housingIn("renter", "free_housing"),
    ),
    priority: 86,
    figures: [
      { label: "Bonus d'État", value: "25 % · max 1 000 £/an" },
      { label: "Plafond achat", value: "450 000 £" },
    ],
    sources: ["https://www.gov.uk/lifetime-isa"],
    lastVerified: "2026-07-27",
  },
  {
    id: "gb-auto-enrolment",
    category: "retirement",
    countries: ["GB"],
    title: "Pension : ne quitte jamais l'auto-enrolment",
    body:
      "Ta pension d'entreprise reçoit au minimum 8 % des « qualifying earnings » (la tranche 6 240 - 50 270 £), dont 3 % payés par l'employeur — de l'argent gratuit que tu perds si tu opt-out. Beaucoup d'employeurs matchent au-delà du minimum : demande aux RH jusqu'où ils montent et cotise assez pour capter tout le match.",
    action: {
      label: "Vérifier les taux de ta workplace pension",
      link: "https://www.gov.uk/workplace-pensions/what-you-your-employer-and-the-government-pay",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 90,
    figures: [
      { label: "Minimum total", value: "8 %" },
      { label: "Dont employeur", value: "3 %" },
    ],
    sources: [
      "https://www.gov.uk/workplace-pensions/what-you-your-employer-and-the-government-pay",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "gb-psa",
    category: "tax",
    countries: ["GB"],
    title: "Tes intérêts hors ISA ont un plafond non imposé",
    body:
      "La Personal Savings Allowance exonère 1 000 £ d'intérêts par an si tu es imposé à 20 %, 500 £ à 40 %, rien à 45 %. Au-delà, les intérêts sont imposés — alors que dans un ISA ils ne le sont jamais. Si ton épargne hors ISA génère plus que ta PSA, bascule le surplus en ISA en priorité.",
    action: {
      label: "Vérifier ta PSA",
      link: "https://www.gov.uk/apply-tax-free-interest-on-savings",
    },
    appliesWhen: always,
    priority: 74,
    figures: [
      { label: "Basic rate", value: "1 000 £" },
      { label: "Higher rate", value: "500 £" },
    ],
    sources: ["https://www.gov.uk/apply-tax-free-interest-on-savings"],
    lastVerified: "2026-07-27",
  },
  {
    id: "gb-child-benefit",
    category: "kids",
    countries: ["GB"],
    title: "Child Benefit : réclame-le même si tu gagnes bien",
    body:
      "27,05 £/semaine pour l'aîné, 17,90 £ par enfant supplémentaire (2026/27). La reprise fiscale (HICBC) démarre à 60 000 £ de revenu INDIVIDUEL — pas du foyer : deux parents à 59 000 £ chacun ne rendent rien. Même au-delà de 80 000 £, réclamer sans paiement protège tes droits de retraite (crédits National Insurance).",
    action: {
      label: "Vérifier tes droits Child Benefit",
      link: "https://www.gov.uk/child-benefit/what-youll-get",
    },
    appliesWhen: hasAnyKids,
    priority: 86,
    figures: [
      { label: "Aîné", value: "27,05 £/sem" },
      { label: "Seuil de reprise", value: "60 000 £ individuel" },
    ],
    sources: [
      "https://www.gov.uk/child-benefit/what-youll-get",
      "https://www.gov.uk/child-benefit-tax-charge",
    ],
    lastVerified: "2026-07-27",
  },

  // ==========================================================================
  // ÉTATS-UNIS — recherche vérifiée 2026-07-27 (irs.gov Notice 2025-67,
  // Rev. Proc. 2025-19, consumerfinance.gov). Montants tax year 2026.
  // ==========================================================================
  {
    id: "us-fonds-urgence",
    category: "emergency",
    countries: ["US"],
    title: "Emergency fund : commence par 1 mois, vise 3 à 6",
    body:
      "La recherche du CFPB montre qu'avoir au moins 1 mois de revenu d'avance réduit fortement le risque d'impayés — c'est le premier palier. La règle couramment citée par les planificateurs est 3 à 6 mois de dépenses. Méthode CFPB : virement automatique le jour de paie et affecter les rentrées exceptionnelles (remboursement d'impôt) à l'épargne.",
    action: {
      label: "Lire le guide du CFPB",
      link: "https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/",
    },
    appliesWhen: always,
    priority: 98,
    figures: [
      { label: "Premier palier", value: "1 mois de revenu" },
      { label: "Cible courante", value: "3-6 mois" },
    ],
    sources: [
      "https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "us-401k-match",
    category: "retirement",
    countries: ["US"],
    title: "401(k) : capte tout le match de ton employeur",
    body:
      "Le plafond de cotisation salarié 2026 est de 24 500 $ (+8 000 $ de catch-up à partir de 50 ans). Mais la priorité absolue : cotiser au moins jusqu'au match complet de ton employeur — c'est un rendement immédiat qu'aucun placement ne bat. Le match s'ajoute à ton plafond personnel, il ne le consomme pas.",
    action: {
      label: "Vérifier la formule de match de ton employeur (HR)",
      link: "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 92,
    figures: [
      { label: "Plafond salarié 2026", value: "24 500 $" },
      { label: "Catch-up 50+", value: "+8 000 $" },
    ],
    sources: [
      "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "us-ira-roth",
    category: "retirement",
    countries: ["US"],
    title: "IRA : 7 500 $ de plus, et le choix Roth ou traditionnel",
    body:
      "Après le match 401(k), l'IRA : 7 500 $ en 2026 (traditionnel + Roth combinés, +1 100 $ à 50 ans et plus). Traditionnel = déduction aujourd'hui, imposé à la retraite ; Roth = pas de déduction, mais croissance et retraits exonérés à vie — souvent gagnant en début de carrière quand ton taux d'imposition est bas. Le Roth a des limites de revenu (phase-out dès 153 000 $ célibataire en 2026).",
    action: {
      label: "Comparer IRA traditionnel et Roth (IRS)",
      link: "https://www.irs.gov/retirement-plans/individual-retirement-arrangements-iras",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 84,
    figures: [
      { label: "Plafond 2026 (combiné)", value: "7 500 $" },
      { label: "Catch-up 50+", value: "+1 100 $" },
    ],
    sources: [
      "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "us-hsa",
    category: "insurance",
    countries: ["US"],
    title: "HSA : le seul compte à triple avantage fiscal",
    body:
      "Si ta couverture santé est un HDHP (franchise élevée), le HSA cumule trois avantages : cotisations déductibles, croissance non imposée, retraits exonérés pour les dépenses médicales. Plafonds 2026 : 4 400 $ (individuel) / 8 750 $ (famille), +1 000 $ à partir de 55 ans. Le compte te suit d'employeur en employeur — et après 65 ans il fonctionne comme une retraite complémentaire.",
    action: {
      label: "Voir les règles HSA (IRS Pub. 969)",
      link: "https://www.irs.gov/publications/p969",
    },
    appliesWhen: always,
    priority: 80,
    figures: [
      { label: "Individuel 2026", value: "4 400 $" },
      { label: "Famille 2026", value: "8 750 $" },
    ],
    sources: ["https://www.irs.gov/pub/irs-drop/rp-25-19.pdf"],
    lastVerified: "2026-07-27",
  },
  {
    id: "us-529",
    category: "kids",
    countries: ["US"],
    title: "529 plan : les études grandissent en franchise d'impôt",
    body:
      "Les cotisations ne sont pas déductibles au fédéral, mais la croissance est exonérée et les retraits pour études qualifiées aussi. Nouveau en 2026 : le plafond K-12 (école privée) passe à 20 000 $/an. Beaucoup d'États ajoutent une déduction sur l'impôt d'État — vérifie le plan de TON État avant d'en choisir un autre.",
    action: {
      label: "Voir les règles 529 (IRS)",
      link: "https://www.irs.gov/taxtopics/tc313",
    },
    appliesWhen: hasAnyKids,
    priority: 86,
    figures: [{ label: "K-12 dès 2026", value: "20 000 $/an" }],
    sources: ["https://www.irs.gov/taxtopics/tc313"],
    lastVerified: "2026-07-27",
  },
  {
    id: "us-credit-score",
    category: "emergency",
    countries: ["US"],
    title: "Ton credit score est une ligne de budget invisible",
    body:
      "Un bon score réduit le coût de TOUT ce que tu empruntes (hypothèque, auto, cartes). Les experts cités par le CFPB conseillent de garder l'utilisation de ton crédit sous 30 % de tes limites — et payer le solde en entier chaque mois est optimal : inutile de « porter un solde » pour bâtir son score, c'est un mythe qui coûte des intérêts.",
    action: {
      label: "Lire les conseils score du CFPB",
      link: "https://www.consumerfinance.gov/ask-cfpb/how-do-i-get-and-keep-a-good-credit-score-en-318/",
    },
    appliesWhen: always,
    priority: 76,
    figures: [{ label: "Utilisation conseillée", value: "< 30 %" }],
    sources: [
      "https://www.consumerfinance.gov/ask-cfpb/how-do-i-get-and-keep-a-good-credit-score-en-318/",
    ],
    lastVerified: "2026-07-27",
  },

  // ==========================================================================
  // ALLEMAGNE — recherche vérifiée 2026-07-27 (finanzamt.nrw, Arbeitsagentur,
  // Deutsche Rentenversicherung/BBG, Finanztip, Stiftung Warentest).
  // Riester exclu (réforme en cours, successeur non voté).
  // ==========================================================================
  {
    id: "de-notgroschen",
    category: "emergency",
    countries: ["DE"],
    title: "Notgroschen : 3 à 6 salaires nets sur un Tagesgeld",
    body:
      "Recommandation Finanztip : garde 3 à 6 salaires mensuels nets (jamais moins de 3) sur un Tagesgeldkonto — disponible à tout moment et couvert par la garantie légale des dépôts. Exemple : 2 000 € nets/mois → 6 000 à 12 000 €. Ajuste vers le haut si famille, propriété ou emploi moins stable.",
    action: { label: "Calculer 3-6 mois de tes charges dans le tab Budget" },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "Cible", value: "3-6 salaires nets" }],
    sources: ["https://www.finanztip.de/tagesgeld/"],
    lastVerified: "2026-07-27",
  },
  {
    id: "de-sparerpauschbetrag",
    category: "tax",
    countries: ["DE"],
    title: "1 000 € de revenus du capital non imposés — si tu le demandes",
    body:
      "Le Sparerpauschbetrag exonère 1 000 € par personne et par an (2 000 € pour un couple marié) d'intérêts, dividendes et plus-values. Mais la banque prélève l'impôt à la source SAUF si tu as déposé un Freistellungsauftrag. Si tu as plusieurs banques, répartis-le — la somme de tous tes ordres ne doit pas dépasser ton plafond.",
    action: {
      label: "Vérifier tes Freistellungsaufträge dans chaque banque",
      link: "https://www.finanzamt.nrw.de/steuerinfos/privatpersonen/einkuenfte-aus-kapitalvermoegen/sparerpauschbetrag-freistellungsauftrag",
    },
    appliesWhen: always,
    priority: 84,
    figures: [
      { label: "Par personne", value: "1 000 €/an" },
      { label: "Couple marié", value: "2 000 €/an" },
    ],
    sources: [
      "https://www.finanzamt.nrw.de/steuerinfos/privatpersonen/einkuenfte-aus-kapitalvermoegen/sparerpauschbetrag-freistellungsauftrag",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "de-bav",
    category: "retirement",
    countries: ["DE"],
    title: "bAV : ton employeur doit ajouter 15 %",
    body:
      "En convertissant du salaire brut vers une retraite d'entreprise (Entgeltumwandlung), tu économises impôt et cotisations — et depuis 2022 ton employeur est OBLIGÉ d'ajouter 15 % sur la part convertie. En 2026 : jusqu'à 8 112 €/an exonérés d'impôt, dont 4 056 € aussi exonérés de cotisations sociales. Vérifie les frais du contrat proposé avant de signer.",
    action: { label: "Demander l'offre bAV et le Zuschuss aux RH" },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 86,
    figures: [
      { label: "Zuschuss employeur", value: "15 % obligatoire" },
      { label: "Exonéré d'impôt 2026", value: "8 112 €/an" },
    ],
    sources: [
      "https://www.bundesregierung.de/breg-de/aktuelles/beitragsgemessungsgrenzen-2386514",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "de-etf-sparplan",
    category: "long_term",
    countries: ["DE"],
    title: "ETF-Sparplan : la machine à épargner allemande",
    body:
      "Un plan d'épargne programmé sur un ETF actions monde largement diversifié, souvent dès 25 €/mois. Les règles de Finanztip et Stiftung Warentest : horizon d'au moins 15 ans, ETF monde (type MSCI World/FTSE All-World), frais courants sous 0,3 %. Ce n'est pas une garantie de rendement — c'est une discipline d'investissement long terme.",
    action: {
      label: "Comparer les ETF-Sparpläne (Finanztip)",
      link: "https://www.finanztip.de/indexfonds-etf/fondssparplan/",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50"),
    priority: 80,
    figures: [
      { label: "Horizon minimum", value: "15 ans" },
      { label: "Frais (TER)", value: "< 0,3 %" },
    ],
    sources: [
      "https://www.finanztip.de/indexfonds-etf/fondssparplan/",
      "https://www.test.de/ETF-Sparplan-Vergleich-5015866-0/",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "de-kindergeld",
    category: "kids",
    countries: ["DE"],
    title: "Kindergeld 2026 : 259 € par mois et par enfant",
    body:
      "Le Kindergeld passe à 259 €/mois par enfant au 1er janvier 2026 (versement automatique, sans nouvelle demande). Familles à revenus modestes : le Kinderzuschlag peut ajouter jusqu'à 297 €/mois par enfant — il faut le demander, beaucoup d'ayants droit passent à côté. Intègre ces montants dans ton budget et flèche une partie vers l'épargne de l'enfant.",
    action: {
      label: "Vérifier tes droits (Arbeitsagentur)",
      link: "https://www.arbeitsagentur.de/news/kindergeld-steigt-2026",
    },
    appliesWhen: hasAnyKids,
    priority: 86,
    figures: [
      { label: "Kindergeld 2026", value: "259 €/mois/enfant" },
      { label: "Kinderzuschlag max", value: "297 €/mois" },
    ],
    sources: ["https://www.arbeitsagentur.de/news/kindergeld-steigt-2026"],
    lastVerified: "2026-07-27",
  },
  {
    id: "de-vl",
    category: "emergency",
    countries: ["DE"],
    title: "VL : jusqu'à 40 €/mois offerts par ton employeur",
    body:
      "Les vermögenswirksame Leistungen sont un versement de l'employeur (jusqu'à 40 €/mois selon ta convention collective) dans un contrat d'épargne à ton nom — fonds actions, Bausparvertrag ou remboursement de crédit immobilier. Beaucoup de salariés ne les réclament jamais. Selon ton revenu, l'État ajoute en plus une prime (Arbeitnehmersparzulage).",
    action: { label: "Demander aux RH si tu as droit aux VL" },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 78,
    figures: [{ label: "Max employeur", value: "40 €/mois (480 €/an)" }],
    sources: [
      "https://www.buhl.de/steuer/tipps/vermoegenswirksame-leistungen/",
    ],
    lastVerified: "2026-07-27",
  },

  // ==========================================================================
  // ESPAGNE — recherche vérifiée 2026-07-27 (AEAT Manual Renta 2025,
  // finanzasparatodos.es BdE/CNMV, BOE RD 42/2022, Ministerio de Inclusión).
  // País Vasco / Navarra (régime foral) : règles différentes, non couvertes.
  // ==========================================================================
  {
    id: "es-fondo-emergencia",
    category: "emergency",
    countries: ["ES"],
    title: "Fondo de emergencia : 3 à 6 mois de dépenses essentielles",
    body:
      "Finanzas para Todos (Banco de España + CNMV) recommande 3 à 6 mois de dépenses fixes essentielles sur un compte disponible : 3 mois suffisent avec des revenus stables, vise 6 mois si tu es autónomo ou avec des personnes à charge.",
    action: {
      label: "Lire la recommandation officielle",
      link: "https://www.finanzasparatodos.es/cuanto-debe-tener-tu-fondo-de-emergencia",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "Cible", value: "3-6 mois de dépenses" }],
    sources: [
      "https://www.finanzasparatodos.es/cuanto-debe-tener-tu-fondo-de-emergencia",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "es-plan-pensiones",
    category: "retirement",
    countries: ["ES"],
    title: "Plan de pensiones : 1 500 € seul, jusqu'à 10 000 € via l'entreprise",
    body:
      "Le plafond de réduction IRPF d'un plan individuel n'est que de 1 500 €/an — mais il monte jusqu'à 10 000 € au total quand ton entreprise contribue à un plan d'emploi (+8 500 €). Si ton employeur propose un plan de pensiones de empleo, c'est là que se joue l'avantage fiscal, pas sur le plan individuel.",
    action: {
      label: "Vérifier si ton entreprise a un plan de empleo",
      link: "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025.html",
    },
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 84,
    figures: [
      { label: "Plan individuel", value: "1 500 €/an" },
      { label: "Avec l'entreprise", value: "jusqu'à 10 000 €" },
    ],
    sources: [
      "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025.html",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "es-ahorro-fiscalidad",
    category: "tax",
    countries: ["ES"],
    title: "Ton épargne est imposée de 19 à 30 % — planifie tes ventes",
    body:
      "Intérêts, dividendes et plus-values suivent le barème de l'épargne : 19 % jusqu'à 6 000 €, 21 % jusqu'à 50 000 €, 23 % jusqu'à 200 000 €, 27 % puis 30 % au-delà de 300 000 € (durci en 2025). La banque retient 19 % à la source, régularisé en déclaration. Étaler une grosse vente sur deux exercices peut réduire la tranche applicable.",
    action: { label: "Anticiper la fiscalité avant une vente importante" },
    appliesWhen: always,
    priority: 76,
    figures: [
      { label: "Jusqu'à 6 000 €", value: "19 %" },
      { label: "> 300 000 €", value: "30 %" },
    ],
    sources: [
      "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c15-calculo-impuesto-determinacion-cuotas-integras/gravamen-base-liquidable-ahorro/gravamen-estatal.html",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "es-bono-alquiler-joven",
    category: "housing",
    countries: ["ES"],
    title: "Bono Alquiler Joven : 250 €/mois si tu as 35 ans ou moins",
    body:
      "L'aide d'État au loyer des jeunes : 250 €/mois pendant 2 ans, pour les 35 ans ou moins avec revenus réguliers (foyer < 3× IPREM), loyer ≤ 600 €/mois (jusqu'à 900 € selon les régions). Chaque communauté autonome ouvre ses propres fenêtres de candidature et les fonds s'épuisent vite : surveille la sede electrónica de TA région.",
    action: {
      label: "Voir les conditions officielles",
      link: "https://www.mivau.gob.es/vivienda/bono-alquiler-joven",
    },
    appliesWhen: and(ageIn("18-25", "26-35"), housingIn("renter")),
    priority: 86,
    figures: [
      { label: "Aide", value: "250 €/mois · 2 ans" },
      { label: "Loyer max", value: "600 € (900 € selon CCAA)" },
    ],
    sources: [
      "https://www.boe.es/buscar/act.php?id=BOE-A-2022-802",
      "https://www.mivau.gob.es/vivienda/bono-alquiler-joven",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "es-ayudas-hijos",
    category: "kids",
    countries: ["ES"],
    title: "Moins de 3 ans : 1 200 €/an de deducción por maternidad",
    body:
      "La deducción por maternidad vaut 1 200 €/an par enfant de moins de 3 ans — versement anticipé de 100 €/mois possible (modelo 140). Familles à revenus modestes : le CAPI verse en plus 115 €/mois (< 3 ans), 80,50 € (3-6 ans) ou 57,50 € (6-18 ans) par enfant — mais il est incompatible avec la deducción les mois où il est perçu : compare les deux.",
    action: {
      label: "Vérifier deducción et CAPI",
      link: "https://sede.agenciatributaria.gob.es/Sede/ciudadanos-familias-personas-discapacidad/deducciones-relacionadas-hijos-descendientes/deduccion-maternidad.html",
    },
    appliesWhen: kids("0-6"),
    priority: 86,
    figures: [
      { label: "Maternidad < 3 ans", value: "1 200 €/an" },
      { label: "CAPI < 3 ans", value: "115 €/mois" },
    ],
    sources: [
      "https://sede.agenciatributaria.gob.es/Sede/ciudadanos-familias-personas-discapacidad/deducciones-relacionadas-hijos-descendientes/deduccion-maternidad.html",
      "https://www.inclusion.gob.es/en/web/inclusion/que-es-el-capi",
    ],
    lastVerified: "2026-07-27",
  },

  // ==========================================================================
  // CAMEROUN (CEMAC, XAF) — recherche vérifiée 2026-07-27 (MINFI, DGTCFM,
  // décret 2024/056 multi-sources). Devise : franc CFA XAF, parité fixe EUR.
  // ==========================================================================
  {
    id: "cm-epargne-exoneree",
    category: "tax",
    countries: ["CM"],
    title: "Ton livret d'épargne est net d'impôt jusqu'à 10 millions FCFA",
    body:
      "Le Code général des impôts exonère d'IRCM les intérêts des comptes d'épargne dont le placement ne dépasse pas 10 000 000 FCFA (ainsi que l'épargne-logement). Au-delà, les intérêts subissent 16,5 % retenus à la source. Un compte d'épargne bancaire sous ce seuil est donc doublement gagnant : intérêts nets et dépôt couvert par la garantie bancaire.",
    action: {
      label: "Voir les exonérations du CGI (MINFI)",
      link: "https://minfi.gov.cm/les-exonerations-fiscales-a-caractere-social-dans-le-code-general-des-impots/",
    },
    appliesWhen: always,
    priority: 88,
    figures: [
      { label: "Exonéré jusqu'à", value: "10 M FCFA" },
      { label: "Au-delà", value: "IRCM 16,5 %" },
    ],
    sources: [
      "https://minfi.gov.cm/les-exonerations-fiscales-a-caractere-social-dans-le-code-general-des-impots/",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "cm-allocations-cnps",
    category: "kids",
    countries: ["CM"],
    title: "Allocations familiales CNPS : 4 500 FCFA par enfant",
    body:
      "Depuis le décret 2024/056, les allocations familiales CNPS sont de 4 500 FCFA par enfant et par mois (jusqu'à 18 ans, 21 ans si étudiant ou apprenti). C'est financé par la cotisation patronale — rien n'est prélevé sur ton salaire, mais il faut que ton employeur t'ait déclaré et que tu constitues le dossier. Beaucoup d'ayants droit ne les réclament jamais.",
    action: { label: "Constituer le dossier allocations auprès de la CNPS" },
    appliesWhen: hasAnyKids,
    priority: 86,
    figures: [{ label: "Par enfant", value: "4 500 FCFA/mois" }],
    sources: [
      "Décret n° 2024/056 du 21 février 2024",
      "https://iskm.issa.int/node/7557",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "cm-mobile-money",
    category: "emergency",
    countries: ["CM"],
    title: "Mobile money : la taxe frappe deux fois",
    body:
      "La taxe sur les transferts d'argent (0,2 %) s'applique à l'ENVOI et au RETRAIT : un cycle complet coûte 0,4 % de taxe, plus les frais de l'opérateur qui pèsent bien davantage — surtout sur les petits montants. Regroupe tes transferts, garde l'argent dans le wallet quand c'est possible (le dépôt n'est pas taxé), et compare les grilles Orange Money / MTN MoMo.",
    action: { label: "Regrouper les transferts et comparer les grilles tarifaires" },
    appliesWhen: always,
    priority: 82,
    figures: [
      { label: "Taxe envoi", value: "0,2 %" },
      { label: "Cycle envoi + retrait", value: "0,4 % + frais" },
    ],
    sources: [
      "https://blog.avocats.deloitte.fr/les-specificites-de-la-taxe-sur-les-transferts-dargent-au-cameroun/",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "cm-tontine",
    category: "emergency",
    countries: ["CM"],
    title: "Tontine (njangi) : sécurise-la comme un vrai contrat",
    body:
      "La tontine est un formidable outil d'épargne collective — mais sans aucune protection légale des fonds, tout repose sur la confiance. Les bonnes pratiques : règlement intérieur écrit, registre signé à chaque séance, double signature sur la caisse, ordre de ramassage tiré au sort, et adosse la caisse à un compte bancaire ou mobile money pour la traçabilité. Ne place jamais TOUTE ton épargne en tontine.",
    action: { label: "Formaliser le règlement et le registre de ta tontine" },
    appliesWhen: always,
    priority: 78,
    sources: [
      "https://droit.cairn.info/revue-revue-de-lersuma-2021-HS3-page-277",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "cm-titres-publics",
    category: "long_term",
    countries: ["CM"],
    title: "Titres publics : des intérêts exonérés d'impôt",
    body:
      "Les Obligations du Trésor (OTA) camerounaises versent des intérêts exonérés d'IRCM — et la loi de finances 2026 étend l'exonération aux titres des autres États CEMAC. La souscription passe par les banques agréées SVT, avec un ticket minimum réel d'environ 1 000 000 FCFA. Une option de diversification une fois ton épargne de précaution constituée.",
    action: {
      label: "Se renseigner auprès d'une banque SVT",
      link: "https://dgtcfm.cm/pourquoi-investir-dans-les-titres-publics/",
    },
    appliesWhen: always,
    priority: 70,
    figures: [{ label: "Ticket minimum", value: "~1 M FCFA" }],
    sources: ["https://dgtcfm.cm/pourquoi-investir-dans-les-titres-publics/"],
    lastVerified: "2026-07-27",
  },

  // ==========================================================================
  // ITALIE — recherche vérifiée 2026-07-28 (Legge di Bilancio 2026 via Mefop/
  // Assogestioni, circolare INPS 7/2026, Poste Italiane). Plafond fonds de
  // pension relevé à 5 300 € en 2026 (l'ancien 5 164,57 € reste valable pour
  // la déclaration des revenus 2025).
  // ==========================================================================
  {
    id: "it-fondo-emergenza",
    category: "emergency",
    countries: ["IT"],
    title: "Fondo di emergenza : 3 à 6 mois de dépenses essentielles",
    body:
      "Recommandation usuelle en Italie : garder 3 à 6 mois de dépenses essentielles sur un support liquide (conto deposito svincolabile, libretto), jusqu'à 12 mois si tes revenus sont irréguliers. C'est le prérequis avant fonds de pension et investissements.",
    action: {
      label: "Voir le portail d'éducation financière de la Banca d'Italia",
      link: "https://economiapertutti.bancaditalia.it/",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "Cible", value: "3-6 mois de dépenses" }],
    sources: ["https://economiapertutti.bancaditalia.it/"],
    lastVerified: "2026-07-28",
  },
  {
    id: "it-fondi-pensione",
    category: "retirement",
    countries: ["IT"],
    title: "Fondo pensione : 5 300 € déductibles (nouveau plafond 2026)",
    body:
      "La Legge di Bilancio 2026 a relevé le plafond de déductibilité de la previdenza complementare de 5 164,57 € à 5 300 €/an (contributions salarié + employeur ; le TFR versé au fonds ne compte PAS dans le plafond). À la sortie, la prestation est taxée 15 %, taux qui descend jusqu'à 9 % avec l'ancienneté — bien mieux que le TFR laissé en entreprise.",
    action: { label: "Vérifier ton fonds de catégorie (contrat collectif)" },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 86,
    figures: [
      { label: "Plafond 2026", value: "5 300 €/an" },
      { label: "Taxation sortie", value: "15 % → 9 %" },
    ],
    sources: [
      "https://www.mefop.it/blog/blog-mefop/deducibilita-extradeducibilita-post-legge-bilancio-2026",
    ],
    lastVerified: "2026-07-28",
  },
  {
    id: "it-assegno-unico",
    category: "kids",
    countries: ["IT"],
    title: "Assegno unico : jusqu'à 203,80 €/mois — mais mets ton ISEE à jour",
    body:
      "En 2026, l'assegno unico va de 58,30 € à 203,80 €/mois par enfant mineur selon l'ISEE (+50 % pour un enfant de moins d'1 an). Piège administratif : sans DSU/ISEE à jour, tu ne touches que le MINIMUM à partir de mars — renouvelle l'ISEE en début d'année, c'est plusieurs centaines d'euros par an.",
    action: {
      label: "Mettre à jour l'ISEE et vérifier le montant (INPS)",
      link: "https://www.inps.it/it/it/dettaglio-scheda.schede-servizio-strumento.schede-servizi.assegno-unico-e-universale-per-i-figli-a-carico-55984.assegno-unico-e-universale-per-i-figli-a-carico.html",
    },
    appliesWhen: hasAnyKids,
    priority: 88,
    figures: [
      { label: "Max (ISEE bas)", value: "203,80 €/mois" },
      { label: "< 1 an", value: "+50 %" },
    ],
    sources: ["Circolare INPS n. 7 del 30/01/2026"],
    lastVerified: "2026-07-28",
  },
  {
    id: "it-bfp-fiscalita",
    category: "long_term",
    countries: ["IT"],
    title: "12,5 % vs 26 % : la fiscalité fait la moitié du rendement",
    body:
      "Les Buoni Fruttiferi Postali et les titres d'État sont taxés à 12,5 % sur les intérêts ; un conto deposito ou une obligation privée à 26 %. À taux facial proche, compare toujours le NET — et n'oublie pas l'imposta di bollo de 0,2 %/an au-delà de 5 000 € qui rogne le rendement réel.",
    action: {
      label: "Comparer les rendements nets",
      link: "https://buonielibretti.poste.it/faq-buoni-e-libretti",
    },
    appliesWhen: always,
    priority: 76,
    figures: [
      { label: "BFP / titres d'État", value: "12,5 %" },
      { label: "Conto deposito", value: "26 %" },
    ],
    sources: ["https://buonielibretti.poste.it/faq-buoni-e-libretti"],
    lastVerified: "2026-07-28",
  },

  // ==========================================================================
  // PORTUGAL — recherche vérifiée 2026-07-28 (portaldasfinancas EBF art. 21,
  // IGCP AforroNet, gov.pt/OCC pour IRS Jovem). Abono de família exclu
  // (montants non confirmés sur seg-social.pt).
  // ==========================================================================
  {
    id: "pt-fundo-emergencia",
    category: "emergency",
    countries: ["PT"],
    title: "Fundo de emergência : 4 à 6 mois de dépenses",
    body:
      "Recommandation usuelle au Portugal : garder l'équivalent de 4 à 6 mois de dépenses mensuelles totales (fixes + variables) sur un support à liquidité immédiate — jusqu'à 12 mois pour les indépendants. À constituer avant tout PPR ou investissement.",
    action: {
      label: "Voir Todos Contam (Banco de Portugal)",
      link: "https://www.todoscontam.pt/pt-pt/fundo-de-emergencia",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "Cible", value: "4-6 mois de dépenses" }],
    sources: ["https://www.todoscontam.pt/pt-pt/fundo-de-emergencia"],
    lastVerified: "2026-07-28",
  },
  {
    id: "pt-ppr",
    category: "retirement",
    countries: ["PT"],
    title: "PPR : 20 % de tes versements remboursés par l'IRS",
    body:
      "Le PPR donne une déduction d'IRS de 20 % des versements : jusqu'à 400 € (< 35 ans au 1er janvier), 350 € (35-50 ans), 300 € (> 50 ans). Deux avertissements : la limite globale des deduções à coleta selon ton revenu peut réduire le gain réel, et un rachat hors conditions légales rembourse les déductions MAJORÉES de 10 % par an écoulé — c'est un engagement long terme.",
    action: {
      label: "Voir l'art. 21 de l'EBF (Portal das Finanças)",
      link: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf/Pages/bf-artigo-21-ordm-.aspx",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 86,
    figures: [
      { label: "Déduction", value: "20 % des versements" },
      { label: "Max < 35 ans", value: "400 €/an" },
    ],
    sources: [
      "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf/Pages/bf-artigo-21-ordm-.aspx",
    ],
    lastVerified: "2026-07-28",
  },
  {
    id: "pt-certificados-aforro",
    category: "long_term",
    countries: ["PT"],
    title: "Certificados de Aforro : l'épargne d'État dès 100 €",
    body:
      "La Série F rémunère selon l'Euribor 3 mois (plafonnée à 2,5 %) plus une prime de permanence qui monte jusqu'à 1,75 % à partir de la 2e année. Souscription dès 100 €, rachat possible après 3 mois, intérêts imposés à 28 % retenus à la source par l'IGCP — rien à déclarer. Une brique simple entre le fonds d'urgence et l'investissement.",
    action: {
      label: "Voir les conditions IGCP (AforroNet)",
      link: "https://aforronet.igcp.pt/iimf.aforronet.ui/condicoes/CondicoesSubscricao.aspx",
    },
    appliesWhen: always,
    priority: 78,
    figures: [
      { label: "Minimum", value: "100 €" },
      { label: "Prime permanence", value: "jusqu'à +1,75 %" },
    ],
    sources: [
      "https://aforronet.igcp.pt/iimf.aforronet.ui/condicoes/CondicoesSubscricao.aspx",
    ],
    lastVerified: "2026-07-28",
  },
  {
    id: "pt-irs-jovem",
    category: "tax",
    countries: ["PT"],
    title: "IRS Jovem : jusqu'à 10 ans d'impôt allégé avant 35 ans",
    body:
      "Si tu as entre 18 et 35 ans (et n'es plus à charge), l'IRS Jovem exonère tes revenus du travail pendant 10 ans : 100 % la 1re année, 75 % les années 2-4, 50 % les années 5-7, 25 % les années 8-10 — dans la limite d'un plafond annuel (55 × IAS). Applicable dès la retenue mensuelle : signale-le à ton employeur, ne le découvre pas à la déclaration.",
    action: {
      label: "Vérifier ton éligibilité (gov.pt)",
      link: "https://www.gov.pt/noticias/novo-modelo-de-irs-jovem-em-2025",
    },
    appliesWhen: ageIn("18-25", "26-35"),
    priority: 88,
    figures: [
      { label: "Année 1", value: "100 % exonéré" },
      { label: "Durée", value: "10 ans" },
    ],
    sources: [
      "https://www.gov.pt/noticias/novo-modelo-de-irs-jovem-em-2025",
      "https://www.occ.pt/sites/default/files/public/2025-02/Guia_Pratico_IRS_J6fevCa.pdf",
    ],
    lastVerified: "2026-07-28",
  },

  // ==========================================================================
  // MAROC — recherche vérifiée 2026-07-28 (CGI 2026 art. 28/68/73, maroc.ma,
  // FMEF). La FMEF ne publie PAS de règle "3-6 mois" → fonds d'urgence via
  // les cartes universelles. Devise : dirham (DH).
  // ==========================================================================
  {
    id: "ma-pea",
    category: "long_term",
    countries: ["MA"],
    title: "PEA marocain : la Bourse de Casablanca sans impôt",
    body:
      "Le Plan d'Épargne en Actions exonère dividendes et plus-values (au lieu de 15 % et 20 % de retenue) pour les titres cotés à Casablanca — plafond de versements de 2 000 000 DH (l'ancien plafond de 600 000 DH qui circule encore est périmé). Condition : garder le plan au moins 5 ans, sinon clôture automatique et imposition de droit commun.",
    action: { label: "Ouvrir un PEA auprès d'une banque ou société de bourse" },
    appliesWhen: always,
    priority: 84,
    figures: [
      { label: "Plafond", value: "2 000 000 DH" },
      { label: "Durée minimale", value: "5 ans" },
    ],
    sources: ["Code Général des Impôts 2026, art. 68 (DGI)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "ma-pel",
    category: "real_estate",
    countries: ["MA"],
    title: "PEL : des intérêts nets d'impôt pour ton futur logement",
    body:
      "Le Plan d'Épargne Logement exonère d'IR les intérêts, dans la limite de 400 000 DH de versements — à condition de garder le plan au moins 3 ans et d'affecter les fonds à l'acquisition ou la construction de ta résidence principale. Un retrait anticipé clôture le plan et rend les gains imposables.",
    action: { label: "Comparer les PEL des banques marocaines" },
    appliesWhen: housingIn("renter", "free_housing"),
    priority: 80,
    figures: [
      { label: "Plafond", value: "400 000 DH" },
      { label: "Durée minimale", value: "3 ans" },
    ],
    sources: ["Code Général des Impôts 2026, art. 68 (DGI)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "ma-pee",
    category: "kids",
    countries: ["MA"],
    title: "PEE : épargne défiscalisée pour les études des enfants",
    body:
      "Le Plan d'Épargne Éducation exonère d'IR les intérêts, jusqu'à 300 000 DH PAR ENFANT à charge, si les fonds financent leurs études (tous cycles + formation professionnelle). Durée minimale 5 ans, un seul PEE par personne. Commencer tôt transforme les années de primaire en capital pour le supérieur.",
    action: { label: "Ouvrir un PEE au nom de chaque enfant" },
    appliesWhen: hasAnyKids,
    priority: 86,
    figures: [
      { label: "Plafond / enfant", value: "300 000 DH" },
      { label: "Durée minimale", value: "5 ans" },
    ],
    sources: ["Code Général des Impôts 2026, art. 68 (DGI)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "ma-retraite-deduction",
    category: "retirement",
    countries: ["MA"],
    title: "Retraite complémentaire : une déduction massive pour les salariés",
    body:
      "Les cotisations d'assurance retraite (CIMR ou assureur marocain) sont déductibles jusqu'à 50 % de ton salaire net imposable si tes revenus sont exclusivement salariaux (10 % du revenu global sinon). Conditions : contrat d'au moins 8 ans, prestations à partir de 45 ans, et l'option pour la déductibilité mentionnée sur l'attestation.",
    action: {
      label: "Se renseigner auprès de la CIMR",
      link: "https://www.cimr.ma/cotiser-a-la-cimr/",
    },
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 84,
    figures: [
      { label: "Salariés", value: "jusqu'à 50 % du net imposable" },
      { label: "Durée minimale", value: "8 ans" },
    ],
    sources: ["Code Général des Impôts 2026, art. 28-III (DGI)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "ma-allocations-cnss",
    category: "kids",
    countries: ["MA"],
    title: "Allocations CNSS : 300 DH par enfant — et la hausse du 4e au 6e",
    body:
      "La CNSS verse 300 DH/mois pour chacun des trois premiers enfants, et 100 DH/mois du 4e au 6e (relevé de 36 DH par le décret d'octobre 2025, avec effet rétroactif à janvier 2023 — vérifie que le rappel t'a bien été versé). Enfants couverts jusqu'à 12 ans automatiquement, au-delà avec certificat de scolarité.",
    action: { label: "Vérifier tes allocations et le rappel rétroactif (CNSS)" },
    appliesWhen: hasAnyKids,
    priority: 84,
    figures: [
      { label: "Enfants 1-3", value: "300 DH/mois" },
      { label: "Enfants 4-6", value: "100 DH/mois" },
    ],
    sources: [
      "https://www.maroc.ma/fr/actualites/plus-de-136000-familles-beneficieront-des-allocations-familiales-accordees-par-la-cnss",
    ],
    lastVerified: "2026-07-28",
  },
  {
    id: "ma-compte-carnet",
    category: "tax",
    countries: ["MA"],
    title: "Compte sur carnet : 30 % retenus sur tes intérêts",
    body:
      "Les intérêts des comptes sur carnet subissent une retenue à la source de 30 % (libératoire) pour les particuliers sans activité professionnelle — 20 % imputable si tu es imposé au régime professionnel. Compare toujours le rendement NET, et pour l'épargne longue regarde les enveloppes exonérées (PEL, PEE, PEA) avant le carnet.",
    action: { label: "Comparer carnet vs enveloppes exonérées selon ton objectif" },
    appliesWhen: always,
    priority: 74,
    figures: [{ label: "Retenue particuliers", value: "30 % libératoire" }],
    sources: ["Code Général des Impôts 2026, art. 73-II (DGI)"],
    lastVerified: "2026-07-28",
  },

  // ==========================================================================
  // SÉNÉGAL & CÔTE D'IVOIRE (UEMOA, XOF) — recherche vérifiée 2026-07-28
  // (CGI SN art. 105/173 lu intégralement, DGI CI, UMOA-Titres, BCEAO, CLEISS,
  // tarifs officiels Wave/Orange). Devise : franc CFA XOF, parité fixe EUR.
  // ==========================================================================
  {
    id: "uemoa-oat-tresor",
    category: "long_term",
    countries: ["SN", "CI"],
    title: "Obligations du Trésor : accessibles dès 10 000 FCFA",
    body:
      "Le marché des titres publics UEMOA est ouvert aux particuliers : les Obligations Assimilables du Trésor (OAT) ont un nominal de 10 000 FCFA — le vrai point d'entrée (les Bons à 1 000 000 FCFA sont hors de portée). Souscription via une banque ou une SGI avec un compte-titres, et les intérêts des titres de TON État sont exonérés d'impôt pour ses résidents.",
    action: {
      label: "Voir le guide particuliers UMOA-Titres",
      link: "https://www.umoatitres.org/particuliers/",
    },
    appliesWhen: always,
    priority: 76,
    figures: [
      { label: "OAT (nominal)", value: "10 000 FCFA" },
      { label: "Intérêts résidents", value: "exonérés" },
    ],
    sources: ["https://www.umoatitres.org/particuliers/"],
    lastVerified: "2026-07-28",
  },
  {
    id: "uemoa-tontine-sfd",
    category: "emergency",
    countries: ["SN", "CI"],
    title: "Tontine : sécurise-la, ou passe par un SFD agréé",
    body:
      "La tontine n'a aucun statut juridique dans l'UEMOA — tout repose sur la confiance. Bonnes pratiques : règlement écrit signé, registre des versements, trésorier distinct du président, et versements tracés via mobile money plutôt qu'en espèces. L'alternative réglementée : les Systèmes Financiers Décentralisés agréés (mutuelles, microfinance), supervisés par la BCEAO — l'épargne y est encadrée.",
    action: { label: "Formaliser la tontine ou comparer avec un SFD agréé" },
    appliesWhen: always,
    priority: 80,
    sources: [
      "https://www.bceao.int/fr/reglementations/loi-portant-reglementation-des-systemes-financiers-decentralises-de-lumoa",
    ],
    lastVerified: "2026-07-28",
  },
  {
    id: "sn-livret-exonere",
    category: "tax",
    countries: ["SN"],
    title: "Ton livret d'épargne est exonéré d'impôt",
    body:
      "Le CGI sénégalais (art. 105-3°) exonère d'impôt sur le revenu les intérêts des livrets d'épargne des personnes physiques servis par une banque, un SFD ou une caisse d'épargne au Sénégal — dans la limite d'un plafond fixé par arrêté ministériel. Hors livret, les intérêts de comptes de dépôt subissent une retenue de 8 % (16 % en droit commun). Le livret d'abord, donc.",
    action: { label: "Ouvrir un livret d'épargne bancaire ou SFD" },
    appliesWhen: always,
    priority: 86,
    figures: [
      { label: "Livret", value: "intérêts exonérés" },
      { label: "Compte de dépôt", value: "retenue 8 %" },
    ],
    sources: ["Code général des impôts (Sénégal), art. 105-3° et 173-2"],
    lastVerified: "2026-07-28",
  },
  {
    id: "sn-allocations-css",
    category: "kids",
    countries: ["SN"],
    title: "Allocations familiales CSS : 2 600 FCFA par enfant",
    body:
      "La Caisse de Sécurité Sociale verse 2 600 FCFA par mois et par enfant (payés par trimestre, maximum 6 enfants) aux travailleurs salariés déclarés — enfants de 2 à 14 ans, prolongé à 18 ans si scolarisé et 21 ans pour études. Ça suppose d'être déclaré par ton employeur : c'est aussi un argument pour exiger la formalisation.",
    action: { label: "Vérifier tes droits auprès de la CSS" },
    appliesWhen: hasAnyKids,
    priority: 82,
    figures: [{ label: "Par enfant", value: "2 600 FCFA/mois" }],
    sources: ["https://www.cleiss.fr/docs/regimes/regime_senegal.html"],
    lastVerified: "2026-07-28",
  },
  {
    id: "sn-mobile-money",
    category: "emergency",
    countries: ["SN"],
    title: "Mobile money : compare avant chaque transfert",
    body:
      "Au Sénégal, Wave facture 1 % le transfert (dépôts et retraits gratuits) et Orange Money 0,8 % (retrait devenu gratuit). Les grilles bougent souvent : compare avant les gros transferts. Et rappelle-toi que l'argent qui dort sur un wallet n'est pas rémunéré — bascule l'excédent vers un livret exonéré.",
    action: { label: "Comparer Wave / Orange Money sur ton usage réel" },
    appliesWhen: always,
    priority: 78,
    figures: [
      { label: "Wave transfert", value: "1 %" },
      { label: "Orange Money", value: "0,8 %" },
    ],
    sources: [
      "https://www.wave.com/fr/",
      "https://assistance.orange.sn/questions/2386693-orange-money-tarifs-envoi-retrait-argent",
    ],
    lastVerified: "2026-07-28",
  },
  {
    id: "ci-allocations-cnps",
    category: "kids",
    countries: ["CI"],
    title: "Allocations familiales CNPS : 5 000 FCFA par enfant",
    body:
      "La CNPS verse 5 000 FCFA par mois et par enfant (paiement trimestriel) aux salariés du privé — condition : 18 jours ou 120 h de travail par mois, enfants de 12 mois à 14 ans (18 ans en apprentissage, 21 ans pour études). Les fonctionnaires relèvent d'un autre régime (7 500 FCFA versés par l'État). Être déclaré, c'est aussi ça.",
    action: { label: "Vérifier tes droits auprès de la CNPS" },
    appliesWhen: hasAnyKids,
    priority: 82,
    figures: [
      { label: "Privé (CNPS)", value: "5 000 FCFA/mois" },
      { label: "Fonctionnaires", value: "7 500 FCFA/mois" },
    ],
    sources: [
      "https://www.cleiss.fr/docs/regimes/regime_cotedivoire.html",
      "https://www.dgbf.ci/wp-content/uploads/2024/06/ALLOCATIONS-FAMILIALES.pdf",
    ],
    lastVerified: "2026-07-28",
  },
  {
    id: "ci-epargne-fiscalite",
    category: "tax",
    countries: ["CI"],
    title: "Compte d'épargne populaire : des intérêts sans impôt",
    body:
      "En Côte d'Ivoire, les intérêts des comptes d'épargne populaire sont exonérés d'IRC, et les bons et obligations du Trésor sont exonérés d'IGR. Les comptes de dépôt classiques bénéficient de taux réduits selon la durée (jusqu'à 13,5 % pour un particulier, contre 18 % en droit commun). Choisir la bonne enveloppe change directement ton rendement net.",
    action: { label: "Demander un compte d'épargne populaire à ta banque" },
    appliesWhen: always,
    priority: 84,
    figures: [
      { label: "Épargne populaire", value: "exonérée d'IRC" },
      { label: "Droit commun", value: "18 %" },
    ],
    sources: ["DGI Côte d'Ivoire — Impôts et taxes (IRC, art. 192 s. CGI)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "ci-mobile-money",
    category: "emergency",
    countries: ["CI"],
    title: "Mobile money : le transfert peut être gratuit, le retrait non",
    body:
      "En Côte d'Ivoire, Orange Money facture 0 FCFA le transfert national OM→OM mais 1 % le retrait ; Wave facture 1 % le transfert avec dépôts et retraits gratuits. Selon que tu envoies ou que tu retires, le gagnant change — compare sur TON usage. Et l'argent qui dort sur le wallet n'est pas rémunéré.",
    action: { label: "Comparer Orange Money / Wave sur ton usage réel" },
    appliesWhen: always,
    priority: 78,
    figures: [
      { label: "OM transfert national", value: "0 FCFA" },
      { label: "OM retrait", value: "1 %" },
    ],
    sources: [
      "https://www.orange.ci/fr/tarifs-orange-money.html",
      "https://www.wave.com/fr/",
    ],
    lastVerified: "2026-07-28",
  },

  // ==========================================================================
  // ALGÉRIE — recherche vérifiée 2026-07-28 (cnas.dz, règlement Banque
  // d'Algérie 2020-02). Taux CNEP non affichés (partiellement vérifiés,
  // sites officiels inaccessibles depuis l'étranger). Devise : dinar (DA).
  // ==========================================================================
  {
    id: "dz-allocations-cnas",
    category: "kids",
    countries: ["DZ"],
    title: "Allocations familiales CNAS : vérifie ton barème",
    body:
      "La CNAS verse 600 DA/mois par enfant (du 1er au 5e) si ton revenu mensuel est ≤ 15 000 DA, 300 DA sinon — plus une prime de scolarité annuelle de 800 DA par enfant (barème réduit au-delà du 5e enfant). Enfants couverts jusqu'à 17 ans (21 ans si études). Réservé aux salariés déclarés : vérifie que ton employeur te déclare.",
    action: {
      label: "Vérifier tes droits sur cnas.dz",
      link: "https://cnas.dz",
    },
    appliesWhen: hasAnyKids,
    priority: 82,
    figures: [
      { label: "Revenu ≤ 15 000 DA", value: "600 DA/mois/enfant" },
      { label: "Prime scolarité", value: "800 DA/an" },
    ],
    sources: ["https://cnas.dz (page المنح العائلية)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "dz-epargne-logement",
    category: "real_estate",
    countries: ["DZ"],
    title: "Livret Épargne Logement : la porte du crédit préférentiel",
    body:
      "Le Livret Épargne Logement (CNEP-Banque, aussi via Algérie Poste) donne accès, après une phase d'épargne, à des crédits immobiliers à conditions préférentielles — en plus de rémunérer ton épargne. Les taux ne sont pas publiés en ligne de façon fiable : compare en agence le LEL et le Livret Épargne Populaire selon ton projet.",
    action: { label: "Comparer LEL et LEP en agence CNEP ou Algérie Poste" },
    appliesWhen: housingIn("renter", "free_housing"),
    priority: 80,
    sources: ["https://www.poste.dz/services/particular/cnep-ecnep"],
    lastVerified: "2026-07-28",
  },
  {
    id: "dz-finance-islamique",
    category: "long_term",
    countries: ["DZ"],
    title: "Finance islamique : un cadre officiel depuis 2020",
    body:
      "Le règlement 2020-02 de la Banque d'Algérie encadre la finance islamique : mourabaha, ijara, moudaraba, comptes d'investissement — sans intérêts, avec certification de conformité charia obligatoire. Les banques publiques (BNA, CPA, BEA…) et des banques dédiées (Al Baraka, Al Salam) proposent ces guichets. Une épargne conforme ET supervisée, si c'est ton critère.",
    action: { label: "Comparer les guichets finance islamique des banques" },
    appliesWhen: always,
    priority: 74,
    sources: [
      "Règlement n° 2020-02 du 15 mars 2020 de la Banque d'Algérie (JO 22/03/2020)",
    ],
    lastVerified: "2026-07-28",
  },

  // ==========================================================================
  // TUNISIE — recherche vérifiée 2026-07-28 (BCT pour le TRE, art. 39 code
  // IRPP/IS, sources bancaires agréées concordantes). Devise : dinar (DT).
  // Allocations CNSS exclues des cartes (montants ≈ 7 DT/mois, plafond 122
  // DT/trimestre — documentées au corpus).
  // ==========================================================================
  {
    id: "tn-epargne-tre",
    category: "emergency",
    countries: ["TN"],
    title: "Ton épargne de précaution mérite au moins le TRE",
    body:
      "Les comptes d'épargne (bancaires et postaux) sont rémunérés au minimum au Taux de Rémunération de l'Épargne fixé par la Banque Centrale — 6 % depuis janvier 2026. Avec une inflation autour de 5 %, le rendement réel reste mince : le TRE protège ton matelas de précaution, mais il ne construit pas un patrimoine — pour ça, regarde le CEA et l'assurance-vie.",
    action: { label: "Vérifier que ton compte épargne sert bien le TRE" },
    appliesWhen: always,
    priority: 90,
    figures: [{ label: "TRE (janv. 2026)", value: "6 %/an" }],
    sources: ["Banque Centrale de Tunisie — décision du 30/12/2025"],
    lastVerified: "2026-07-28",
  },
  {
    id: "tn-cea",
    category: "tax",
    countries: ["TN"],
    title: "CEA : déduis jusqu'à 100 000 DT de ton assiette IRPP",
    body:
      "Le Compte Épargne en Actions déduit tes versements de l'assiette IRPP (jusqu'à 100 000 DT/an), investis à 80 % minimum en actions cotées à la BVMT. Conditions : principal bloqué 5 ans (dividendes disponibles), et l'avantage est plafonné par le minimum d'impôt — la déduction ne ramène jamais ton impôt à zéro. Retrait anticipé = reprise de l'impôt + pénalités.",
    action: { label: "Ouvrir un CEA auprès d'une banque ou d'un intermédiaire" },
    appliesWhen: always,
    priority: 84,
    figures: [
      { label: "Déduction max", value: "100 000 DT/an" },
      { label: "Blocage", value: "5 ans" },
    ],
    sources: ["Art. 39 code IRPP/IS · loi 89-114 (minimum d'impôt)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "tn-assurance-vie",
    category: "retirement",
    countries: ["TN"],
    title: "Assurance-vie : 100 000 DT déductibles, sortie exonérée",
    body:
      "Les primes d'assurance-vie (et takaful) sont déductibles de l'assiette IRPP jusqu'à 100 000 DT/an — plafond relevé par la loi de finances 2021, beaucoup de contenus citent encore l'ancien 10 000 DT. Contrat d'au moins 8 ans, capitaux exonérés à la sortie, avantage soumis au minimum d'impôt. Le pilier retraite long terme tunisien.",
    action: { label: "Comparer les contrats d'assureurs agréés" },
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 84,
    figures: [
      { label: "Déduction max", value: "100 000 DT/an" },
      { label: "Durée minimale", value: "8 ans" },
    ],
    sources: ["Art. 39 §2 code IRPP/IS · loi de finances 2021"],
    lastVerified: "2026-07-28",
  },
];

// ============================================================================
// Moteur : match + tri + grouping
// ============================================================================

// Un conseil ne s'affiche que s'il est valable dans le pays de l'utilisateur.
// Sans pays renseigné → France (comportement historique du catalogue).
function countryMatches(card: AdviceCard, profile: UserProfile): boolean {
  const scope = card.countries ?? ["FR"];
  if (scope === "all") return true;
  return scope.includes(profile.country ?? "FR");
}

export function matchAdvice(
  profile: UserProfile,
  catalog: AdviceCard[] = ADVICE_CATALOG_FR,
): AdviceCard[] {
  return catalog
    .filter((card) => countryMatches(card, profile) && card.appliesWhen(profile))
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
