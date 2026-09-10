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
  AdviceI18n,
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

// Véhicule du foyer. `hasVehicle` = a répondu autre chose que « aucun ».
const vehicleIs =
  (...energies: NonNullable<UserProfile["vehicle"]>[]): AdvicePredicate =>
  (p) =>
    !!p.vehicle && energies.includes(p.vehicle);
const hasVehicle: AdvicePredicate = (p) => !!p.vehicle && p.vehicle !== "none";
const answeredVehicle: AdvicePredicate = (p) => p.vehicle !== undefined;

// Cadre de vie / logement / situation pro
const zoneIs =
  (...zones: NonNullable<UserProfile["zone"]>[]): AdvicePredicate =>
  (p) =>
    !!p.zone && zones.includes(p.zone);

const housingTypeIs =
  (t: NonNullable<UserProfile["housingType"]>): AdvicePredicate =>
  (p) =>
    p.housingType === t;

const propertyCountAtLeast =
  (n: number): AdvicePredicate =>
  (p) =>
    (p.propertyCount ?? 0) >= n;

const occupationIs =
  (...occ: NonNullable<UserProfile["occupation"]>[]): AdvicePredicate =>
  (p) =>
    !!p.occupation && occ.includes(p.occupation);

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

// Handicap : soi, un enfant du foyer, ou un proche aidé.
const disabledSelf: AdvicePredicate = (p) => p.disabilitySelf === true;
const disabledChild: AdvicePredicate = (p) => p.disabilityChild === true;
const isCaregiver: AdvicePredicate = (p) => p.caregiver === true;
const disabilityAny: AdvicePredicate = (p) =>
  p.disabilitySelf === true || p.disabilityChild === true || p.caregiver === true;
const hasPetSpecies =
  (...species: PetSpecies[]): AdvicePredicate =>
  (p) =>
    p.hasPets === true && !!p.pets?.some((pet) => species.includes(pet.species));

// ============================================================================
// Répartition budgétaire personnalisée : calculée depuis le profil (âge,
// logement, enfants, capacité d'épargne…). Ne JAMAIS citer un ratio générique
// dans les textes — le titre affiche le mix réel, le corps doit s'y accorder.
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

// Les trois champs portent des CLÉS i18n (`adv.mix.<slug>.…`) tant que
// `i18n` n'est pas fourni ; avec `i18n`, ils sont déjà traduits.
export type BudgetMixProfile = {
  name: string;        // ex: "adv.mix.batisseur.name"
  tagline: string;     // 1 ligne courte
  description: string; // 2-3 phrases pour expliquer simplement
};

/** Fabrique les 3 clés d'un archétype, traduites si `i18n` est fourni. */
function mixProfile(slug: string, i18n?: AdviceI18n): BudgetMixProfile {
  const keys = {
    name: `adv.mix.${slug}.name`,
    tagline: `adv.mix.${slug}.tagline`,
    description: `adv.mix.${slug}.description`,
  };
  if (!i18n) return keys;
  return {
    name: i18n.t(keys.name),
    tagline: i18n.t(keys.tagline),
    description: i18n.t(keys.description),
  };
}

export function getBudgetMixProfile(
  p: UserProfile,
  i18n?: AdviceI18n,
): BudgetMixProfile {
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
  if (isUnder18) return mixProfile("apprenti", i18n);

  // Ordre de priorité : du plus spécifique au plus générique
  if (isSingleParent) return mixProfile("capitaine-solo", i18n);
  if (hasChildren) return mixProfile("batisseur", i18n);
  if (isOwnerSenior) return mixProfile("serenite", i18n);
  if (isAccessor) return mixProfile("grimpeur", i18n);
  if (isHighTMI) return mixProfile("stratege", i18n);
  if (isYoungRenter && savingsLow) return mixProfile("debutant", i18n);
  if (isYoungRenter) return mixProfile("sprinteur", i18n);

  return mixProfile("equilibre", i18n);
}

// Explique POURQUOI le mix est ce qu'il est, pour la modal d'info.
// Renvoie 3 lignes explicatives (une par catégorie) + un reminder.
// Les trois raisons et le rappel portent des CLÉS i18n (`adv.mix.…`) tant que
// `i18n` n'est pas fourni ; avec `i18n`, ils sont déjà traduits.
export function explainBudgetSplit(
  p: UserProfile,
  i18n?: AdviceI18n,
): {
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
  let besoinsReason = "adv.mix.besoins.default";
  if (isAccessor) besoinsReason = "adv.mix.besoins.accessor";
  else if (isSingleParent) besoinsReason = "adv.mix.besoins.single-parent";
  else if (hasChildren) besoinsReason = "adv.mix.besoins.kids";
  else if (isRenter) besoinsReason = "adv.mix.besoins.renter";
  else if (isOwnerSenior) besoinsReason = "adv.mix.besoins.owner-senior";

  // Envies
  let enviesReason = "adv.mix.envies.default";
  if (isSingleParent) enviesReason = "adv.mix.envies.single-parent";
  else if (hasChildren) enviesReason = "adv.mix.envies.kids";
  else if (isOwnerSenior) enviesReason = "adv.mix.envies.owner-senior";

  // Épargne
  let epargneReason = "adv.mix.epargne.default";
  if (split.epargne >= 25) epargneReason = "adv.mix.epargne.high";
  else if (split.epargne <= 15) epargneReason = "adv.mix.epargne.low";
  else if (p.tmi === "41" || p.tmi === "45")
    epargneReason = "adv.mix.epargne.tmi";

  const reminder = isPersonalized
    ? "adv.mix.reminder.personalized"
    : "adv.mix.reminder.generic";

  const tr = (key: string) => (i18n ? i18n.t(key) : key);

  return {
    split,
    isPersonalized,
    mix: getBudgetMixProfile(p, i18n),
    besoinsReason: tr(besoinsReason),
    enviesReason: tr(enviesReason),
    epargneReason: tr(epargneReason),
    reminder: tr(reminder),
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
    titleKey: "adv.priority-emergency-fund.title",
    bodyKey: "adv.priority-emergency-fund.body",
    actionLabelKey: "adv.priority-emergency-fund.action",
    action: {
      link: "https://www.economie.gouv.fr/particuliers/livret-a",
    },
    appliesWhen: savingsCapacityLow,
    priority: 100,
    figures: [
      { label: "adv.priority-emergency-fund.fig.0.label", value: "adv.priority-emergency-fund.fig.0.value" },
      { label: "adv.priority-emergency-fund.fig.1.label", value: "adv.priority-emergency-fund.fig.1.value" },
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
    titleKey: "adv.budget-split-personalized.title",
    // Corps DYNAMIQUE : le contexte dépend des ratios calculés. On compose
    // uniquement à partir de clés i18n (aucun texte en dur ici).
    body: (p, { t, tp }) => {
      const s = computeBudgetSplit(p);
      const parts: string[] = [];
      if (s.besoins >= 60) parts.push(t("adv.budget-split-personalized.part.needs"));
      if (s.epargne >= 25) parts.push(t("adv.budget-split-personalized.part.margin"));
      if (s.epargne <= 15) parts.push(t("adv.budget-split-personalized.part.fragile"));
      const context = parts.length
        ? tp("adv.budget-split-personalized.context", {
            parts: parts.join(t("adv.listSep")),
          })
        : "";
      return tp("adv.budget-split-personalized.body", { context });
    },
    actionLabelKey: "adv.budget-split-personalized.action",
    action: {},
    appliesWhen: always,
    priority: 80,
    // Chiffres DYNAMIQUES : les valeurs sont calculées, les libellés portent
    // des clés (résolues par `resolveFigures`).
    figures: (p) => {
      const s = computeBudgetSplit(p);
      return [
        { label: "adv.budget-split-personalized.fig.0.label", value: `${s.besoins}%` },
        { label: "adv.budget-split-personalized.fig.1.label", value: `${s.envies}%` },
        { label: "adv.budget-split-personalized.fig.2.label", value: `${s.epargne}%` },
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
    titleKey: "adv.emergency-fund-locataire.title",
    bodyKey: "adv.emergency-fund-locataire.body",
    actionLabelKey: "adv.emergency-fund-locataire.action",
    action: {
      link: "https://www.economie.gouv.fr/particuliers/livret-a",
    },
    appliesWhen: housingIn("renter"),
    priority: 90,
    figures: [
      { label: "adv.emergency-fund-locataire.fig.0.label", value: "22 950 €" },
      { label: "adv.emergency-fund-locataire.fig.1.label", value: "1,5%" },
    ],
    sources: [
      "https://www.economie.gouv.fr/actualites/epargne-reglementee-de-nouveaux-taux-pour-le-livret-et-le-lep-au-1er-fevrier-2026",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "lep-menages-modestes",
    category: "emergency",
    titleKey: "adv.lep-menages-modestes.title",
    bodyKey: "adv.lep-menages-modestes.body",
    actionLabelKey: "adv.lep-menages-modestes.action",
    action: {
      link: "https://www.economie.gouv.fr/particuliers/livret-epargne-populaire-lep",
    },
    appliesWhen: (p) => p.income === "low" || p.income === "medium",
    priority: 85,
    nominalRatePct: 2.5,
    figures: [
      { label: "adv.lep-menages-modestes.fig.0.label", value: "2,5%" },
      { label: "adv.lep-menages-modestes.fig.1.label", value: "10 000 €" },
    ],
    sources: [
      "https://www.economie.gouv.fr/actualites/epargne-reglementee-de-nouveaux-taux-pour-le-livret-et-le-lep-au-1er-fevrier-2026",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "ldds-cascade-livret-a",
    category: "emergency",
    titleKey: "adv.ldds-cascade-livret-a.title",
    bodyKey: "adv.ldds-cascade-livret-a.body",
    actionLabelKey: "adv.ldds-cascade-livret-a.action",
    action: {},
    appliesWhen: always,
    priority: 65,
    figures: [
      { label: "adv.ldds-cascade-livret-a.fig.0.label", value: "12 000 €" },
      { label: "adv.ldds-cascade-livret-a.fig.1.label", value: "34 950 €" },
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
    titleKey: "adv.pea-jeune-actif.title",
    bodyKey: "adv.pea-jeune-actif.body",
    actionLabelKey: "adv.pea-jeune-actif.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2385",
    },
    appliesWhen: ageIn("18-25", "26-35"),
    priority: 88,
    figures: [
      { label: "adv.pea-jeune-actif.fig.0.label", value: "150 000 €" },
      { label: "adv.pea-jeune-actif.fig.1.label", value: "adv.pea-jeune-actif.fig.1.value" },
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
    titleKey: "adv.av-vs-pea-nouvelle-parite.title",
    bodyKey: "adv.av-vs-pea-nouvelle-parite.body",
    actionLabelKey: "adv.av-vs-pea-nouvelle-parite.action",
    action: {},
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 75,
    figures: [
      { label: "adv.av-vs-pea-nouvelle-parite.fig.0.label", value: "18,6%" },
      { label: "adv.av-vs-pea-nouvelle-parite.fig.1.label", value: "17,2%" },
      { label: "adv.av-vs-pea-nouvelle-parite.fig.2.label", value: "adv.av-vs-pea-nouvelle-parite.fig.2.value" },
    ],
    sources: [
      "https://www.legifrance.gouv.fr (loi n° 2026-103 du 19 février 2026)",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "couple-pea-double",
    category: "long_term",
    titleKey: "adv.couple-pea-double.title",
    bodyKey: "adv.couple-pea-double.body",
    actionLabelKey: "adv.couple-pea-double.action",
    action: {},
    appliesWhen: familyIn("couple_no_kids", "couple_with_kids"),
    priority: 68,
    figures: [
      { label: "adv.couple-pea-double.fig.0.label", value: "300 000 €" },
      { label: "adv.couple-pea-double.fig.1.label", value: "75 000 €" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F2385"],
    lastVerified: VERIFIED,
  },
  {
    id: "av-abattement-fiscal",
    category: "long_term",
    titleKey: "adv.av-abattement-fiscal.title",
    bodyKey: "adv.av-abattement-fiscal.body",
    actionLabelKey: "adv.av-abattement-fiscal.action",
    action: {},
    appliesWhen: ageIn("36-50", "51-65", "66+"),
    priority: 66,
    figures: [
      { label: "adv.av-abattement-fiscal.fig.0.label", value: "4 600 €" },
      { label: "adv.av-abattement-fiscal.fig.1.label", value: "9 200 €" },
      { label: "adv.av-abattement-fiscal.fig.2.label", value: "7,5%" },
    ],
    sources: [
      "https://www.france-epargne.fr/outils/fiscalite/fiscalite-placement",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "per-tmi-41",
    category: "retirement",
    titleKey: "adv.per-tmi-41.title",
    bodyKey: "adv.per-tmi-41.body",
    actionLabelKey: "adv.per-tmi-41.action",
    action: {},
    appliesWhen: tmiAtLeast("41"),
    priority: 90,
    figures: [
      { label: "adv.per-tmi-41.fig.0.label", value: "adv.per-tmi-41.fig.0.value" },
      { label: "adv.per-tmi-41.fig.1.label", value: "≥ 30%" },
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
    titleKey: "adv.per-warning-tmi-retraite.title",
    bodyKey: "adv.per-warning-tmi-retraite.body",
    actionLabelKey: "adv.per-warning-tmi-retraite.action",
    action: {},
    appliesWhen: and(tmiAtLeast("30"), ageIn("36-50", "51-65")),
    priority: 82,
    figures: [{ label: "adv.per-warning-tmi-retraite.fig.0.label", value: "adv.per-warning-tmi-retraite.fig.0.value" }],
    sources: ["https://www.ramify.fr/epargne/per-pea-assurance-vie"],
    lastVerified: VERIFIED,
  },

  // ==========================================================================
  // IMMOBILIER
  // ==========================================================================
  {
    id: "hcsf-taux-endettement",
    category: "real_estate",
    titleKey: "adv.hcsf-taux-endettement.title",
    bodyKey: "adv.hcsf-taux-endettement.body",
    actionLabelKey: "adv.hcsf-taux-endettement.action",
    action: {},
    appliesWhen: housingIn("renter"),
    priority: 85,
    figures: [
      { label: "adv.hcsf-taux-endettement.fig.0.label", value: "35%" },
      { label: "adv.hcsf-taux-endettement.fig.1.label", value: "adv.hcsf-taux-endettement.fig.1.value" },
      { label: "adv.hcsf-taux-endettement.fig.2.label", value: "adv.hcsf-taux-endettement.fig.2.value" },
    ],
    sources: [
      "https://www.economie.gouv.fr/hcsf/mesures/mesure-relative-loctroi-de-credits-immobiliers",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "apport-optimal-30pct",
    category: "real_estate",
    titleKey: "adv.apport-optimal-30pct.title",
    bodyKey: "adv.apport-optimal-30pct.body",
    actionLabelKey: "adv.apport-optimal-30pct.action",
    action: {},
    appliesWhen: and(housingIn("renter"), ageIn("26-35", "36-50")),
    priority: 72,
    figures: [
      { label: "adv.apport-optimal-30pct.fig.0.label", value: "≥ 30%" },
      { label: "adv.apport-optimal-30pct.fig.1.label", value: "~7%" },
      { label: "adv.apport-optimal-30pct.fig.2.label", value: "~3%" },
    ],
    sources: ["https://www.service-public.gouv.fr"],
    lastVerified: VERIFIED,
  },
  {
    id: "acheter-jeune-grande-ville",
    category: "housing",
    titleKey: "adv.acheter-jeune-grande-ville.title",
    bodyKey: "adv.acheter-jeune-grande-ville.body",
    actionLabelKey: "adv.acheter-jeune-grande-ville.action",
    action: {},
    appliesWhen: and(ageIn("18-25", "26-35"), (p) => p.zone === "big_city"),
    priority: 68,
    sources: ["https://www.insee.fr"],
    lastVerified: VERIFIED,
  },
  {
    id: "relance-logement-jeanbrun",
    category: "tax",
    titleKey: "adv.relance-logement-jeanbrun.title",
    bodyKey: "adv.relance-logement-jeanbrun.body",
    actionLabelKey: "adv.relance-logement-jeanbrun.action",
    action: {
      link: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053508155",
    },
    appliesWhen: and(tmiAtLeast("30"), ageIn("36-50", "51-65")),
    priority: 65,
    figures: [
      { label: "adv.relance-logement-jeanbrun.fig.0.label", value: "3,5% → 5,5%" },
      { label: "adv.relance-logement-jeanbrun.fig.1.label", value: "adv.relance-logement-jeanbrun.fig.1.value" },
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
    titleKey: "adv.garde-enfants-credit-impot.title",
    bodyKey: "adv.garde-enfants-credit-impot.body",
    actionLabelKey: "adv.garde-enfants-credit-impot.action",
    action: {
      link: "https://www.impots.gouv.fr/particulier/questions/je-fais-garder-mon-jeune-enfant-lexterieur-du-domicile-que-puis-je-deduire",
    },
    appliesWhen: kids("0-6"),
    priority: 92,
    figures: [
      { label: "adv.garde-enfants-credit-impot.fig.0.label", value: "50%" },
      { label: "adv.garde-enfants-credit-impot.fig.1.label", value: "3 500 €" },
      { label: "adv.garde-enfants-credit-impot.fig.2.label", value: "1 750 €" },
    ],
    sources: [
      "https://www.impots.gouv.fr/particulier/questions/je-fais-garder-mon-jeune-enfant-lexterieur-du-domicile-que-puis-je-deduire",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "livret-jeune-ado",
    category: "kids",
    titleKey: "adv.livret-jeune-ado.title",
    bodyKey: "adv.livret-jeune-ado.body",
    actionLabelKey: "adv.livret-jeune-ado.action",
    action: {
      link: "https://www.service-public.fr/particuliers/vosdroits/F2904",
    },
    appliesWhen: kids("12-15", "16-18"),
    priority: 78,
    nominalRatePct: 1.5,
    figures: [
      { label: "adv.livret-jeune-ado.fig.0.label", value: "adv.livret-jeune-ado.fig.0.value" },
      { label: "adv.livret-jeune-ado.fig.1.label", value: "1 600 €" },
      { label: "adv.livret-jeune-ado.fig.2.label", value: "1,50%" },
      { label: "adv.livret-jeune-ado.fig.3.label", value: "adv.livret-jeune-ado.fig.3.value" },
    ],
    sources: ["https://www.service-public.fr/particuliers/vosdroits/F2904"],
    lastVerified: VERIFIED,
  },
  {
    id: "pel-enfant-etudes",
    category: "kids",
    titleKey: "adv.pel-enfant-etudes.title",
    bodyKey: "adv.pel-enfant-etudes.body",
    actionLabelKey: "adv.pel-enfant-etudes.action",
    action: {
      link: "https://www.service-public.fr/particuliers/vosdroits/F16140",
    },
    appliesWhen: kids("7-11", "12-15"),
    priority: 62,
    nominalRatePct: 2.0,
    figures: [
      { label: "adv.pel-enfant-etudes.fig.0.label", value: "2,00%" },
      { label: "adv.pel-enfant-etudes.fig.1.label", value: "3,20%" },
      { label: "adv.pel-enfant-etudes.fig.2.label", value: "225 €" },
      { label: "adv.pel-enfant-etudes.fig.3.label", value: "540 €" },
    ],
    sources: [
      "https://www.service-public.fr/particuliers/vosdroits/F16140",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "budget-etudes-sup",
    category: "kids",
    titleKey: "adv.budget-etudes-sup.title",
    bodyKey: "adv.budget-etudes-sup.body",
    actionLabelKey: "adv.budget-etudes-sup.action",
    action: {},
    appliesWhen: kids("12-15", "16-18"),
    priority: 74,
    figures: [
      { label: "adv.budget-etudes-sup.fig.0.label", value: "adv.budget-etudes-sup.fig.0.value" },
      { label: "adv.budget-etudes-sup.fig.1.label", value: "adv.budget-etudes-sup.fig.1.value" },
      { label: "adv.budget-etudes-sup.fig.2.label", value: "15-60 k€" },
    ],
    sources: ["https://www.enseignementsup-recherche.gouv.fr"],
    lastVerified: VERIFIED,
  },
  {
    id: "autonomie-ado-carte",
    category: "kids",
    titleKey: "adv.autonomie-ado-carte.title",
    bodyKey: "adv.autonomie-ado-carte.body",
    actionLabelKey: "adv.autonomie-ado-carte.action",
    action: {},
    appliesWhen: kids("16-18"),
    priority: 58,
    sources: ["https://www.service-public.fr"],
    lastVerified: VERIFIED,
  },
  {
    id: "cto-enfant-early",
    category: "kids",
    titleKey: "adv.cto-enfant-early.title",
    bodyKey: "adv.cto-enfant-early.body",
    actionLabelKey: "adv.cto-enfant-early.action",
    action: {
      link: "https://www.service-public.fr/particuliers/vosdroits/F32164",
    },
    appliesWhen: kids("0-6", "7-11"),
    priority: 82,
    figures: [
      { label: "adv.cto-enfant-early.fig.0.label", value: "adv.cto-enfant-early.fig.0.value" },
      { label: "adv.cto-enfant-early.fig.1.label", value: "adv.cto-enfant-early.fig.1.value" },
      { label: "adv.cto-enfant-early.fig.2.label", value: "~22 000 €" },
      { label: "adv.cto-enfant-early.fig.3.label", value: "adv.cto-enfant-early.fig.3.value" },
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
    titleKey: "adv.av-enfant-transmission.title",
    bodyKey: "adv.av-enfant-transmission.body",
    actionLabelKey: "adv.av-enfant-transmission.action",
    action: {},
    appliesWhen: kids("0-6", "7-11", "12-15"),
    priority: 70,
    figures: [
      { label: "adv.av-enfant-transmission.fig.0.label", value: "adv.av-enfant-transmission.fig.0.value" },
      { label: "adv.av-enfant-transmission.fig.1.label", value: "adv.av-enfant-transmission.fig.1.value" },
      { label: "adv.av-enfant-transmission.fig.2.label", value: "adv.av-enfant-transmission.fig.2.value" },
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
    titleKey: "adv.under18-livret-jeune.title",
    bodyKey: "adv.under18-livret-jeune.body",
    actionLabelKey: "adv.under18-livret-jeune.action",
    action: {
      link: "https://www.service-public.fr/particuliers/vosdroits/F2367",
    },
    appliesWhen: ageIn("under_18"),
    priority: 90,
    nominalRatePct: 1.5,
    figures: [
      { label: "adv.under18-livret-jeune.fig.0.label", value: "adv.under18-livret-jeune.fig.0.value" },
      { label: "adv.under18-livret-jeune.fig.1.label", value: "1 600 €" },
      { label: "adv.under18-livret-jeune.fig.2.label", value: "1,5%" },
    ],
    sources: ["https://www.service-public.fr/particuliers/vosdroits/F2367"],
    lastVerified: VERIFIED,
  },
  {
    id: "under18-budget-basics",
    category: "emergency",
    titleKey: "adv.under18-budget-basics.title",
    bodyKey: "adv.under18-budget-basics.body",
    actionLabelKey: "adv.under18-budget-basics.action",
    action: {},
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
    titleKey: "adv.donation-100k-par-enfant.title",
    bodyKey: "adv.donation-100k-par-enfant.body",
    actionLabelKey: "adv.donation-100k-par-enfant.action",
    action: {
      link: "https://www.impots.gouv.fr/particulier/donation",
    },
    appliesWhen: and(hasAnyKids, ageIn("36-50", "51-65", "66+")),
    priority: 82,
    figures: [
      { label: "adv.donation-100k-par-enfant.fig.0.label", value: "100 000 €" },
      { label: "adv.donation-100k-par-enfant.fig.1.label", value: "31 865 €" },
      { label: "adv.donation-100k-par-enfant.fig.2.label", value: "adv.donation-100k-par-enfant.fig.2.value" },
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
    titleKey: "adv.av-transmission-abattement.title",
    bodyKey: "adv.av-transmission-abattement.body",
    actionLabelKey: "adv.av-transmission-abattement.action",
    action: {},
    appliesWhen: and(ageIn("36-50", "51-65"), hasAnyKids),
    priority: 80,
    figures: [
      { label: "adv.av-transmission-abattement.fig.0.label", value: "152 500 €" },
      { label: "adv.av-transmission-abattement.fig.1.label", value: "20%" },
      { label: "adv.av-transmission-abattement.fig.2.label", value: "31,25%" },
    ],
    sources: ["https://www.legifrance.gouv.fr (art. 990 I CGI)"],
    lastVerified: VERIFIED,
  },
  {
    id: "av-souscrire-avant-70-ans",
    category: "inheritance",
    titleKey: "adv.av-souscrire-avant-70-ans.title",
    bodyKey: "adv.av-souscrire-avant-70-ans.body",
    actionLabelKey: "adv.av-souscrire-avant-70-ans.action",
    action: {},
    appliesWhen: ageIn("51-65"),
    priority: 76,
    figures: [
      { label: "adv.av-souscrire-avant-70-ans.fig.0.label", value: "152 500 €" },
      { label: "adv.av-souscrire-avant-70-ans.fig.1.label", value: "30 500 €" },
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
    titleKey: "adv.shared-compte-joint-solidarite.title",
    bodyKey: "adv.shared-compte-joint-solidarite.body",
    actionLabelKey: "adv.shared-compte-joint-solidarite.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10412",
    },
    appliesWhen: inWorkspace("couple", "family", "coloc"),
    priority: 88,
    figures: [
      { label: "adv.shared-compte-joint-solidarite.fig.0.label", value: "100%" },
      { label: "adv.shared-compte-joint-solidarite.fig.1.label", value: "adv.shared-compte-joint-solidarite.fig.1.value" },
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
    titleKey: "adv.shared-dettes-menage-art220.title",
    bodyKey: "adv.shared-dettes-menage-art220.body",
    actionLabelKey: "adv.shared-dettes-menage-art220.action",
    action: {},
    appliesWhen: inWorkspace("couple", "family"),
    priority: 82,
    figures: [
      { label: "adv.shared-dettes-menage-art220.fig.0.label", value: "adv.shared-dettes-menage-art220.fig.0.value" },
      { label: "adv.shared-dettes-menage-art220.fig.1.label", value: "adv.shared-dettes-menage-art220.fig.1.value" },
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
    titleKey: "adv.shared-prorata-modele-legal.title",
    bodyKey: "adv.shared-prorata-modele-legal.body",
    actionLabelKey: "adv.shared-prorata-modele-legal.action",
    action: {},
    appliesWhen: inWorkspace("couple", "family"),
    priority: 80,
    figures: [
      { label: "adv.shared-prorata-modele-legal.fig.0.label", value: "adv.shared-prorata-modele-legal.fig.0.value" },
      { label: "adv.shared-prorata-modele-legal.fig.1.label", value: "adv.shared-prorata-modele-legal.fig.1.value" },
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
    titleKey: "adv.shared-cheque-responsable-unique.title",
    bodyKey: "adv.shared-cheque-responsable-unique.body",
    actionLabelKey: "adv.shared-cheque-responsable-unique.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10412",
    },
    appliesWhen: inWorkspace("couple", "family", "coloc"),
    priority: 70,
    figures: [
      { label: "adv.shared-cheque-responsable-unique.fig.0.label", value: "adv.shared-cheque-responsable-unique.fig.0.value" },
      { label: "adv.shared-cheque-responsable-unique.fig.1.label", value: "adv.shared-cheque-responsable-unique.fig.1.value" },
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
    titleKey: "adv.shared-livret-a-individuel.title",
    bodyKey: "adv.shared-livret-a-individuel.body",
    actionLabelKey: "adv.shared-livret-a-individuel.action",
    action: {},
    appliesWhen: inWorkspace("couple", "family"),
    priority: 74,
    figures: [
      { label: "adv.shared-livret-a-individuel.fig.0.label", value: "45 900 €" },
      { label: "adv.shared-livret-a-individuel.fig.1.label", value: "adv.shared-livret-a-individuel.fig.1.value" },
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
    titleKey: "adv.shared-separation-compte-joint.title",
    bodyKey: "adv.shared-separation-compte-joint.body",
    actionLabelKey: "adv.shared-separation-compte-joint.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10412",
    },
    appliesWhen: inWorkspace("couple", "family"),
    priority: 60,
    figures: [
      { label: "adv.shared-separation-compte-joint.fig.0.label", value: "adv.shared-separation-compte-joint.fig.0.value" },
      { label: "adv.shared-separation-compte-joint.fig.1.label", value: "adv.shared-separation-compte-joint.fig.1.value" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F10412"],
    lastVerified: "2026-07-16",
  },
  {
    id: "shared-declaration-commune",
    category: "shared",
    titleKey: "adv.shared-declaration-commune.title",
    bodyKey: "adv.shared-declaration-commune.body",
    actionLabelKey: "adv.shared-declaration-commune.action",
    action: {
      link: "https://www.impots.gouv.fr/particulier/mariage-et-impots-en-commun",
    },
    appliesWhen: inWorkspace("couple", "family"),
    priority: 72,
    figures: [
      { label: "adv.shared-declaration-commune.fig.0.label", value: "2" },
      { label: "adv.shared-declaration-commune.fig.1.label", value: "adv.shared-declaration-commune.fig.1.value" },
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
    titleKey: "adv.shared-donation-concubin-60pct.title",
    bodyKey: "adv.shared-donation-concubin-60pct.body",
    actionLabelKey: "adv.shared-donation-concubin-60pct.action",
    action: {},
    appliesWhen: inWorkspace("couple"),
    priority: 64,
    figures: [
      { label: "adv.shared-donation-concubin-60pct.fig.0.label", value: "80 724 €" },
      { label: "adv.shared-donation-concubin-60pct.fig.1.label", value: "adv.shared-donation-concubin-60pct.fig.1.value" },
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
    titleKey: "adv.shared-succession-concubin.title",
    bodyKey: "adv.shared-succession-concubin.body",
    actionLabelKey: "adv.shared-succession-concubin.action",
    action: {},
    appliesWhen: inWorkspace("couple", "family"),
    priority: 68,
    figures: [
      { label: "adv.shared-succession-concubin.fig.0.label", value: "0%" },
      { label: "adv.shared-succession-concubin.fig.1.label", value: "adv.shared-succession-concubin.fig.1.value" },
    ],
    sources: [
      "https://www.notaires.fr/fr/article/mariage-pacs-et-concubinage-elements-de-comparaison",
    ],
    lastVerified: "2026-07-16",
  },
  {
    id: "shared-quotient-familial-1807",
    category: "shared",
    titleKey: "adv.shared-quotient-familial-1807.title",
    bodyKey: "adv.shared-quotient-familial-1807.body",
    actionLabelKey: "adv.shared-quotient-familial-1807.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2705",
    },
    appliesWhen: (p) =>
      p.workspaceKind === "family" || hasAnyKids(p),
    priority: 66,
    figures: [
      { label: "adv.shared-quotient-familial-1807.fig.0.label", value: "1 807 €" },
      { label: "adv.shared-quotient-familial-1807.fig.1.label", value: "adv.shared-quotient-familial-1807.fig.1.value" },
      { label: "adv.shared-quotient-familial-1807.fig.2.label", value: "adv.shared-quotient-familial-1807.fig.2.value" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F2705"],
    lastVerified: "2026-07-16",
  },
  {
    id: "shared-coloc-compte-indivis",
    category: "shared",
    titleKey: "adv.shared-coloc-compte-indivis.title",
    bodyKey: "adv.shared-coloc-compte-indivis.body",
    actionLabelKey: "adv.shared-coloc-compte-indivis.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2812",
    },
    appliesWhen: inWorkspace("coloc"),
    priority: 84,
    figures: [
      { label: "adv.shared-coloc-compte-indivis.fig.0.label", value: "adv.shared-coloc-compte-indivis.fig.0.value" },
      { label: "adv.shared-coloc-compte-indivis.fig.1.label", value: "adv.shared-coloc-compte-indivis.fig.1.value" },
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
    titleKey: "adv.asso-compte-bancaire-dedie.title",
    bodyKey: "adv.asso-compte-bancaire-dedie.body",
    actionLabelKey: "adv.asso-compte-bancaire-dedie.action",
    action: {
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
    titleKey: "adv.asso-budget-previsionnel.title",
    bodyKey: "adv.asso-budget-previsionnel.body",
    actionLabelKey: "adv.asso-budget-previsionnel.action",
    action: {},
    appliesWhen: inWorkspace("association"),
    priority: 90,
    sources: ["https://www.associations.gouv.fr"],
    lastVerified: "2026-07-24",
  },
  {
    id: "asso-comptabilite-registre",
    category: "association",
    titleKey: "adv.asso-comptabilite-registre.title",
    bodyKey: "adv.asso-comptabilite-registre.body",
    actionLabelKey: "adv.asso-comptabilite-registre.action",
    action: {
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
    titleKey: "adv.asso-reserve-tresorerie.title",
    bodyKey: "adv.asso-reserve-tresorerie.body",
    actionLabelKey: "adv.asso-reserve-tresorerie.action",
    action: {},
    appliesWhen: inWorkspace("association"),
    priority: 86,
    figures: [{ label: "adv.asso-reserve-tresorerie.fig.0.label", value: "adv.asso-reserve-tresorerie.fig.0.value" }],
    sources: ["https://www.associations.gouv.fr"],
    lastVerified: "2026-07-24",
  },
  {
    id: "asso-dons-recu-fiscal",
    category: "association",
    titleKey: "adv.asso-dons-recu-fiscal.title",
    bodyKey: "adv.asso-dons-recu-fiscal.body",
    actionLabelKey: "adv.asso-dons-recu-fiscal.action",
    action: {
      link: "https://www.impots.gouv.fr/particulier/les-dons-aux-associations",
    },
    appliesWhen: inWorkspace("association"),
    priority: 84,
    figures: [
      { label: "adv.asso-dons-recu-fiscal.fig.0.label", value: "adv.asso-dons-recu-fiscal.fig.0.value" },
      { label: "adv.asso-dons-recu-fiscal.fig.1.label", value: "adv.asso-dons-recu-fiscal.fig.1.value" },
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
    titleKey: "adv.asso-subventions.title",
    bodyKey: "adv.asso-subventions.body",
    actionLabelKey: "adv.asso-subventions.action",
    action: {
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
    titleKey: "adv.asso-assurance-rc.title",
    bodyKey: "adv.asso-assurance-rc.body",
    actionLabelKey: "adv.asso-assurance-rc.action",
    action: {
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
    titleKey: "adv.asso-cotisations-suivi.title",
    bodyKey: "adv.asso-cotisations-suivi.body",
    actionLabelKey: "adv.asso-cotisations-suivi.action",
    action: {},
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
    titleKey: "adv.donation-enfant-100k-couple.title",
    bodyKey: "adv.donation-enfant-100k-couple.body",
    actionLabelKey: "adv.donation-enfant-100k-couple.action",
    action: {
      link: "https://www.impots.gouv.fr/particulier/questions/que-puis-je-donner-mes-enfants-petits-enfants-sans-avoir-payer-de-droits",
    },
    appliesWhen: and(
      hasAnyKids,
      familyIn("couple_no_kids", "couple_with_kids"),
      ageIn("36-50", "51-65", "66+"),
    ),
    priority: 78,
    figures: [
      { label: "adv.donation-enfant-100k-couple.fig.0.label", value: "100 000 €" },
      { label: "adv.donation-enfant-100k-couple.fig.1.label", value: "200 000 €" },
      { label: "adv.donation-enfant-100k-couple.fig.2.label", value: "adv.donation-enfant-100k-couple.fig.2.value" },
    ],
    sources: [
      "https://www.impots.gouv.fr/particulier/questions/que-puis-je-donner-mes-enfants-petits-enfants-sans-avoir-payer-de-droits",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "donation-grand-parent-63k",
    category: "inheritance",
    titleKey: "adv.donation-grand-parent-63k.title",
    bodyKey: "adv.donation-grand-parent-63k.body",
    actionLabelKey: "adv.donation-grand-parent-63k.action",
    action: {
      link: "https://www.impots.gouv.fr/particulier/questions/jai-perdu-mon-fils-comment-aider-mes-petits-enfants",
    },
    appliesWhen: ageIn("51-65", "66+"),
    priority: 65,
    figures: [
      { label: "adv.donation-grand-parent-63k.fig.0.label", value: "31 865 €" },
      { label: "adv.donation-grand-parent-63k.fig.1.label", value: "31 865 €" },
      { label: "adv.donation-grand-parent-63k.fig.2.label", value: "63 730 €" },
      { label: "adv.donation-grand-parent-63k.fig.3.label", value: "adv.donation-grand-parent-63k.fig.3.value" },
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
    titleKey: "adv.per-plafond-37680.title",
    bodyKey: "adv.per-plafond-37680.body",
    actionLabelKey: "adv.per-plafond-37680.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F34982",
    },
    appliesWhen: and(tmiAtLeast("30"), ageIn("26-35", "36-50", "51-65")),
    priority: 84,
    figures: [
      { label: "adv.per-plafond-37680.fig.0.label", value: "adv.per-plafond-37680.fig.0.value" },
      { label: "adv.per-plafond-37680.fig.1.label", value: "37 680 €" },
      { label: "adv.per-plafond-37680.fig.2.label", value: "adv.per-plafond-37680.fig.2.value" },
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
    titleKey: "adv.per-non-actif-4710.title",
    bodyKey: "adv.per-non-actif-4710.body",
    actionLabelKey: "adv.per-non-actif-4710.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F34982",
    },
    appliesWhen: ageIn("51-65", "66+"),
    priority: 60,
    figures: [
      { label: "adv.per-non-actif-4710.fig.0.label", value: "4 710 €" },
      { label: "adv.per-non-actif-4710.fig.1.label", value: "adv.per-non-actif-4710.fig.1.value" },
      { label: "adv.per-non-actif-4710.fig.2.label", value: "adv.per-non-actif-4710.fig.2.value" },
    ],
    sources: [
      "https://www.service-public.gouv.fr/particuliers/vosdroits/F34982",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "per-report-5-ans",
    category: "retirement",
    titleKey: "adv.per-report-5-ans.title",
    bodyKey: "adv.per-report-5-ans.body",
    actionLabelKey: "adv.per-report-5-ans.action",
    action: {},
    appliesWhen: and(tmiAtLeast("30"), ageIn("36-50", "51-65")),
    priority: 62,
    figures: [
      { label: "adv.per-report-5-ans.fig.0.label", value: "adv.per-report-5-ans.fig.0.value" },
      { label: "adv.per-report-5-ans.fig.1.label", value: "adv.per-report-5-ans.fig.1.value" },
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
    titleKey: "adv.scpi-retraite-diversif.title",
    bodyKey: "adv.scpi-retraite-diversif.body",
    actionLabelKey: "adv.scpi-retraite-diversif.action",
    action: {
      link: "https://www.aspim.fr",
    },
    appliesWhen: ageIn("36-50", "51-65"),
    priority: 55,
    figures: [
      { label: "adv.scpi-retraite-diversif.fig.0.label", value: "4,92%" },
      { label: "adv.scpi-retraite-diversif.fig.1.label", value: "200 - 1 000 €" },
      { label: "adv.scpi-retraite-diversif.fig.2.label", value: "adv.scpi-retraite-diversif.fig.2.value" },
      { label: "adv.scpi-retraite-diversif.fig.3.label", value: "+1,46%" },
    ],
    sources: [
      "https://www.aspim.fr/actualites/collecte-et-performance-des-fonds-immobiliers-grand-public-au-premier-trimestre-2026-et-principaux-indicateurs-des-scpi-en-2025/",
    ],
    lastVerified: VERIFIED,
  },
  {
    id: "scpi-choix-categorie",
    category: "long_term",
    titleKey: "adv.scpi-choix-categorie.title",
    bodyKey: "adv.scpi-choix-categorie.body",
    actionLabelKey: "adv.scpi-choix-categorie.action",
    action: {
      link: "https://www.aspim.fr",
    },
    appliesWhen: ageIn("36-50", "51-65"),
    priority: 50,
    figures: [
      { label: "adv.scpi-choix-categorie.fig.0.label", value: "+6,4%" },
      { label: "adv.scpi-choix-categorie.fig.1.label", value: "+5,7%" },
      { label: "adv.scpi-choix-categorie.fig.2.label", value: "+2,4%" },
      { label: "adv.scpi-choix-categorie.fig.3.label", value: "0,0%" },
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
    titleKey: "adv.prevoyance-deces-parents.title",
    bodyKey: "adv.prevoyance-deces-parents.body",
    actionLabelKey: "adv.prevoyance-deces-parents.action",
    action: {},
    appliesWhen: and(
      familyIn("couple_with_kids", "single_parent"),
      ageIn("26-35", "36-50"),
    ),
    priority: 78,
    figures: [
      { label: "adv.prevoyance-deces-parents.fig.0.label", value: "15-30 €" },
      { label: "adv.prevoyance-deces-parents.fig.1.label", value: "100-300 k€" },
      { label: "adv.prevoyance-deces-parents.fig.2.label", value: "adv.prevoyance-deces-parents.fig.2.value" },
    ],
    sources: ["https://www.acpr.banque-france.fr"],
    lastVerified: VERIFIED,
  },
  {
    id: "prevoyance-invalidite",
    category: "insurance",
    titleKey: "adv.prevoyance-invalidite.title",
    bodyKey: "adv.prevoyance-invalidite.body",
    actionLabelKey: "adv.prevoyance-invalidite.action",
    action: {},
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 62,
    sources: ["https://www.ameli.fr", "https://www.acpr.banque-france.fr"],
    lastVerified: VERIFIED,
  },
  {
    id: "prevoyance-dependance-senior",
    category: "insurance",
    titleKey: "adv.prevoyance-dependance-senior.title",
    bodyKey: "adv.prevoyance-dependance-senior.body",
    actionLabelKey: "adv.prevoyance-dependance-senior.action",
    action: {},
    appliesWhen: ageIn("51-65"),
    priority: 55,
    figures: [
      { label: "adv.prevoyance-dependance-senior.fig.0.label", value: "adv.prevoyance-dependance-senior.fig.0.value" },
      { label: "adv.prevoyance-dependance-senior.fig.1.label", value: "adv.prevoyance-dependance-senior.fig.1.value" },
      { label: "adv.prevoyance-dependance-senior.fig.2.label", value: "adv.prevoyance-dependance-senior.fig.2.value" },
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
    titleKey: "adv.pets-assurance-chien.title",
    bodyKey: "adv.pets-assurance-chien.body",
    actionLabelKey: "adv.pets-assurance-chien.action",
    action: {},
    appliesWhen: hasPetSpecies("dog"),
    priority: 70,
    figures: [
      { label: "adv.pets-assurance-chien.fig.0.label", value: "adv.pets-assurance-chien.fig.0.value" },
      { label: "adv.pets-assurance-chien.fig.1.label", value: "adv.pets-assurance-chien.fig.1.value" },
      { label: "adv.pets-assurance-chien.fig.2.label", value: "adv.pets-assurance-chien.fig.2.value" },
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
    titleKey: "adv.pets-assurance-chat.title",
    bodyKey: "adv.pets-assurance-chat.body",
    actionLabelKey: "adv.pets-assurance-chat.action",
    action: {},
    appliesWhen: hasPetSpecies("cat"),
    priority: 68,
    figures: [
      { label: "adv.pets-assurance-chat.fig.0.label", value: "adv.pets-assurance-chat.fig.0.value" },
      { label: "adv.pets-assurance-chat.fig.1.label", value: "adv.pets-assurance-chat.fig.1.value" },
    ],
    sources: [
      "https://www.moneyvox.fr/assurance/actualites/107615/combien-ca-coute-assurer-votre-chien-ou-votre-chat-en-2026",
    ],
    lastVerified: "2026-07-18",
  },
  {
    id: "pets-budget-chat",
    category: "pets",
    titleKey: "adv.pets-budget-chat.title",
    // Corps DYNAMIQUE (dépend du nombre de chats) : composé depuis des clés
    // i18n paramétrées, jamais depuis du texte en dur.
    body: (p, { t, tp }) => {
      const count = p.pets?.find((pet) => pet.species === "cat")?.count ?? 1;
      if (count > 1) {
        return tp("adv.pets-budget-chat.body.multi", {
          count,
          low: 600 * count,
          high: 1000 * count,
        });
      }
      return t("adv.pets-budget-chat.body");
    },
    actionLabelKey: "adv.pets-budget-chat.action",
    action: {},
    appliesWhen: hasPetSpecies("cat"),
    priority: 72,
    figures: (p, { tp }) => {
      const count = p.pets?.find((pet) => pet.species === "cat")?.count ?? 1;
      return [
        { label: "adv.pets-budget-chat.fig.0.label", value: "600 - 1 000 €" },
        { label: "adv.pets-budget-chat.fig.1.label", value: "50 - 85 €" },
        ...(count > 1
          ? [
              {
                label: tp("adv.pets-budget-chat.fig.total.label", { count }),
                value: `${600 * count} - ${1000 * count} €/an`,
              },
            ]
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
    titleKey: "adv.pets-ligne-budget-dediee.title",
    bodyKey: "adv.pets-ligne-budget-dediee.body",
    actionLabelKey: "adv.pets-ligne-budget-dediee.action",
    action: {},
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
    titleKey: "adv.be-fonds-urgence.title",
    bodyKey: "adv.be-fonds-urgence.body",
    actionLabelKey: "adv.be-fonds-urgence.action",
    action: {
      link: "https://www.wikifin.be/fr/epargner-et-investir/comparateur-de-comptes-depargne",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "adv.be-fonds-urgence.fig.0.label", value: "adv.be-fonds-urgence.fig.0.value" }],
    sources: [
      "https://www.wikifin.be/fr/budget-payer-emprunter-et-assurer/budget-et-gestion-de-budget/quest-ce-quune-reserve-depargne",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "be-epargne-reglementee",
    category: "tax",
    countries: ["BE"],
    titleKey: "adv.be-epargne-reglementee.title",
    bodyKey: "adv.be-epargne-reglementee.body",
    actionLabelKey: "adv.be-epargne-reglementee.action",
    action: {
      link: "https://fin.belgium.be/fr/particuliers/declaration-impot/revenus/epargne-placements",
    },
    appliesWhen: always,
    priority: 84,
    figures: [
      { label: "adv.be-epargne-reglementee.fig.0.label", value: "1 020 €" },
      { label: "adv.be-epargne-reglementee.fig.1.label", value: "adv.be-epargne-reglementee.fig.1.value" },
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
    titleKey: "adv.be-epargne-pension.title",
    bodyKey: "adv.be-epargne-pension.body",
    actionLabelKey: "adv.be-epargne-pension.action",
    action: {
      link: "https://fin.belgium.be/fr/particuliers/avantages-fiscaux/epargne-pension",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 86,
    figures: [
      { label: "adv.be-epargne-pension.fig.0.label", value: "1 050 € → 30 %" },
      { label: "adv.be-epargne-pension.fig.1.label", value: "1 350 € → 25 %" },
      { label: "adv.be-epargne-pension.fig.2.label", value: "1 050 - 1 260 €" },
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
    titleKey: "adv.be-taxe-plus-values.title",
    bodyKey: "adv.be-taxe-plus-values.body",
    actionLabelKey: "adv.be-taxe-plus-values.action",
    action: {
      link: "https://fin.belgium.be/fr/particuliers/declaration-impot/revenus/taxe-plus-values",
    },
    appliesWhen: always,
    priority: 78,
    figures: [
      { label: "adv.be-taxe-plus-values.fig.0.label", value: "10 %" },
      { label: "adv.be-taxe-plus-values.fig.1.label", value: "10 000 €" },
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
    titleKey: "adv.be-bons-etat.title",
    bodyKey: "adv.be-bons-etat.body",
    actionLabelKey: "adv.be-bons-etat.action",
    action: {
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
    titleKey: "adv.be-succession-regions.title",
    bodyKey: "adv.be-succession-regions.body",
    actionLabelKey: "adv.be-succession-regions.action",
    action: {
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
    titleKey: "adv.ch-fonds-urgence.title",
    bodyKey: "adv.ch-fonds-urgence.body",
    actionLabelKey: "adv.ch-fonds-urgence.action",
    action: {},
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "adv.ch-fonds-urgence.fig.0.label", value: "adv.ch-fonds-urgence.fig.0.value" }],
    sources: ["https://www.cler.ch/fr/blog/blog/clever-auf-gratis-konten-sparen"],
    lastVerified: "2026-07-27",
  },
  {
    id: "ch-pilier-3a",
    category: "retirement",
    countries: ["CH"],
    titleKey: "adv.ch-pilier-3a.title",
    bodyKey: "adv.ch-pilier-3a.body",
    actionLabelKey: "adv.ch-pilier-3a.action",
    action: {},
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 88,
    figures: [
      { label: "adv.ch-pilier-3a.fig.0.label", value: "7 258 CHF" },
      { label: "adv.ch-pilier-3a.fig.1.label", value: "adv.ch-pilier-3a.fig.1.value" },
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
    titleKey: "adv.ch-3a-rachat-retroactif.title",
    bodyKey: "adv.ch-3a-rachat-retroactif.body",
    actionLabelKey: "adv.ch-3a-rachat-retroactif.action",
    action: {},
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
    titleKey: "adv.ch-rachat-lpp.title",
    bodyKey: "adv.ch-rachat-lpp.body",
    actionLabelKey: "adv.ch-rachat-lpp.action",
    action: {
      link: "https://www.ge.ch/impot-prevoyance-retraite-du-2e-3e-pilier/comment-deduire-rachats-au-2e-3e-pilier",
    },
    appliesWhen: ageIn("36-50", "51-65"),
    priority: 76,
    figures: [{ label: "adv.ch-rachat-lpp.fig.0.label", value: "adv.ch-rachat-lpp.fig.0.value" }],
    sources: [
      "https://www.ge.ch/impot-prevoyance-retraite-du-2e-3e-pilier/comment-deduire-rachats-au-2e-3e-pilier",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "ch-impot-anticipe",
    category: "tax",
    countries: ["CH"],
    titleKey: "adv.ch-impot-anticipe.title",
    bodyKey: "adv.ch-impot-anticipe.body",
    actionLabelKey: "adv.ch-impot-anticipe.action",
    action: {
      link: "https://www.estv.admin.ch/estv/fr/accueil/impot-anticipe.html",
    },
    appliesWhen: always,
    priority: 74,
    figures: [
      { label: "adv.ch-impot-anticipe.fig.0.label", value: "35 %" },
      { label: "adv.ch-impot-anticipe.fig.1.label", value: "adv.ch-impot-anticipe.fig.1.value" },
    ],
    sources: ["https://www.estv.admin.ch/estv/fr/accueil/impot-anticipe.html"],
    lastVerified: "2026-07-27",
  },
  {
    id: "ch-lamal-franchise",
    category: "insurance",
    countries: ["CH"],
    titleKey: "adv.ch-lamal-franchise.title",
    bodyKey: "adv.ch-lamal-franchise.body",
    actionLabelKey: "adv.ch-lamal-franchise.action",
    action: {
      link: "https://www.priminfo.admin.ch/fr/sparen/grundversicherung",
    },
    appliesWhen: always,
    priority: 82,
    figures: [
      { label: "adv.ch-lamal-franchise.fig.0.label", value: "300 → 2 500 CHF" },
      { label: "adv.ch-lamal-franchise.fig.1.label", value: "adv.ch-lamal-franchise.fig.1.value" },
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
    titleKey: "adv.ch-loyer-tiers.title",
    bodyKey: "adv.ch-loyer-tiers.body",
    actionLabelKey: "adv.ch-loyer-tiers.action",
    action: {},
    appliesWhen: housingIn("renter"),
    priority: 72,
    figures: [{ label: "adv.ch-loyer-tiers.fig.0.label", value: "adv.ch-loyer-tiers.fig.0.value" }],
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
    titleKey: "adv.lu-fonds-urgence.title",
    bodyKey: "adv.lu-fonds-urgence.body",
    actionLabelKey: "adv.lu-fonds-urgence.action",
    action: {
      link: "https://www.letzfin.lu/pourquoi-est-il-important-de-mettre-de-largent-de-cote-pour-des-situations-durgence/",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "adv.lu-fonds-urgence.fig.0.label", value: "adv.lu-fonds-urgence.fig.0.value" }],
    sources: [
      "https://www.letzfin.lu/pourquoi-est-il-important-de-mettre-de-largent-de-cote-pour-des-situations-durgence/",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "lu-prevoyance-111bis",
    category: "retirement",
    countries: ["LU"],
    titleKey: "adv.lu-prevoyance-111bis.title",
    bodyKey: "adv.lu-prevoyance-111bis.body",
    actionLabelKey: "adv.lu-prevoyance-111bis.action",
    action: {
      link: "https://impotsdirects.public.lu/fr/az/p/prevoyance_vieillesse.html",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 88,
    figures: [
      { label: "adv.lu-prevoyance-111bis.fig.0.label", value: "adv.lu-prevoyance-111bis.fig.0.value" },
      { label: "adv.lu-prevoyance-111bis.fig.1.label", value: "adv.lu-prevoyance-111bis.fig.1.value" },
    ],
    sources: ["https://impotsdirects.public.lu/fr/az/p/prevoyance_vieillesse.html"],
    lastVerified: "2026-07-27",
  },
  {
    id: "lu-epargne-logement",
    category: "real_estate",
    countries: ["LU"],
    titleKey: "adv.lu-epargne-logement.title",
    bodyKey: "adv.lu-epargne-logement.body",
    actionLabelKey: "adv.lu-epargne-logement.action",
    action: {
      link: "https://impotsdirects.public.lu/fr/az/c/cotis-epargne-logement.html",
    },
    appliesWhen: and(
      ageIn("18-25", "26-35"),
      housingIn("renter", "free_housing"),
    ),
    priority: 78,
    figures: [
      { label: "adv.lu-epargne-logement.fig.0.label", value: "adv.lu-epargne-logement.fig.0.value" },
      { label: "adv.lu-epargne-logement.fig.1.label", value: "adv.lu-epargne-logement.fig.1.value" },
    ],
    sources: ["https://impotsdirects.public.lu/fr/az/c/cotis-epargne-logement.html"],
    lastVerified: "2026-07-27",
  },
  {
    id: "lu-frontaliers-assimilation",
    category: "tax",
    countries: ["LU"],
    titleKey: "adv.lu-frontaliers-assimilation.title",
    bodyKey: "adv.lu-frontaliers-assimilation.body",
    actionLabelKey: "adv.lu-frontaliers-assimilation.action",
    action: {
      link: "https://guichet.public.lu/fr/citoyens/fiscalite/declaration-impot-decompte/activite-professionnelle/declaration-revenus/assimilation-resident.html",
    },
    appliesWhen: always,
    priority: 66,
    figures: [
      { label: "adv.lu-frontaliers-assimilation.fig.0.label", value: "adv.lu-frontaliers-assimilation.fig.0.value" },
      { label: "adv.lu-frontaliers-assimilation.fig.1.label", value: "adv.lu-frontaliers-assimilation.fig.1.value" },
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
    titleKey: "adv.lu-allocations-familiales.title",
    bodyKey: "adv.lu-allocations-familiales.body",
    actionLabelKey: "adv.lu-allocations-familiales.action",
    action: {
      link: "https://cae.public.lu/fr/allocations/allocation-pour-lavenir-des-enfants/montants.html",
    },
    appliesWhen: hasAnyKids,
    priority: 84,
    figures: [
      { label: "adv.lu-allocations-familiales.fig.0.label", value: "adv.lu-allocations-familiales.fig.0.value" },
      { label: "adv.lu-allocations-familiales.fig.1.label", value: "adv.lu-allocations-familiales.fig.1.value" },
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
    titleKey: "adv.ca-fonds-urgence.title",
    bodyKey: "adv.ca-fonds-urgence.body",
    actionLabelKey: "adv.ca-fonds-urgence.action",
    action: {
      link: "https://www.canada.ca/en/financial-consumer-agency/services/savings-investments/setting-up-emergency-funds.html",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "adv.ca-fonds-urgence.fig.0.label", value: "adv.ca-fonds-urgence.fig.0.value" }],
    sources: [
      "https://www.canada.ca/en/financial-consumer-agency/services/savings-investments/setting-up-emergency-funds.html",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "ca-celi",
    category: "long_term",
    countries: ["CA"],
    titleKey: "adv.ca-celi.title",
    bodyKey: "adv.ca-celi.body",
    actionLabelKey: "adv.ca-celi.action",
    action: {
      link: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html",
    },
    appliesWhen: always,
    priority: 88,
    figures: [
      { label: "adv.ca-celi.fig.0.label", value: "7 000 $" },
      { label: "adv.ca-celi.fig.1.label", value: "109 000 $" },
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
    titleKey: "adv.ca-reer.title",
    bodyKey: "adv.ca-reer.body",
    actionLabelKey: "adv.ca-reer.action",
    action: {
      link: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans.html",
    },
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 84,
    figures: [
      { label: "adv.ca-reer.fig.0.label", value: "adv.ca-reer.fig.0.value" },
      { label: "adv.ca-reer.fig.1.label", value: "33 810 $" },
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
    titleKey: "adv.ca-celiapp.title",
    bodyKey: "adv.ca-celiapp.body",
    actionLabelKey: "adv.ca-celiapp.action",
    action: {
      link: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html",
    },
    appliesWhen: and(
      ageIn("18-25", "26-35", "36-50"),
      housingIn("renter", "free_housing"),
    ),
    priority: 86,
    figures: [
      { label: "adv.ca-celiapp.fig.0.label", value: "8 000 $" },
      { label: "adv.ca-celiapp.fig.1.label", value: "40 000 $" },
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
    titleKey: "adv.ca-reee.title",
    bodyKey: "adv.ca-reee.body",
    actionLabelKey: "adv.ca-reee.action",
    action: {
      link: "https://www.canada.ca/en/services/benefits/education/education-savings/estimating-amounts.html",
    },
    appliesWhen: hasAnyKids,
    priority: 90,
    figures: [
      { label: "adv.ca-reee.fig.0.label", value: "adv.ca-reee.fig.0.value" },
      { label: "adv.ca-reee.fig.1.label", value: "+10 %" },
      { label: "adv.ca-reee.fig.2.label", value: "7 200 $" },
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
    titleKey: "adv.ca-ace.title",
    bodyKey: "adv.ca-ace.body",
    actionLabelKey: "adv.ca-ace.action",
    action: {
      link: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview.html",
    },
    appliesWhen: hasAnyKids,
    priority: 88,
    figures: [
      { label: "adv.ca-ace.fig.0.label", value: "adv.ca-ace.fig.0.value" },
      { label: "adv.ca-ace.fig.1.label", value: "adv.ca-ace.fig.1.value" },
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
    titleKey: "adv.other-fonds-urgence.title",
    bodyKey: "adv.other-fonds-urgence.body",
    actionLabelKey: "adv.other-fonds-urgence.action",
    action: {},
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "adv.other-fonds-urgence.fig.0.label", value: "adv.other-fonds-urgence.fig.0.value" }],
    sources: ["Principe universel de finances personnelles"],
    lastVerified: "2026-07-27",
  },
  {
    id: "other-epargne-automatique",
    category: "emergency",
    countries: ["OTHER", "MA", "DZ", "TN", "SN", "CI", "CM"],
    titleKey: "adv.other-epargne-automatique.title",
    bodyKey: "adv.other-epargne-automatique.body",
    actionLabelKey: "adv.other-epargne-automatique.action",
    action: {},
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
    titleKey: "adv.fr-idf-imagine-r.title",
    bodyKey: "adv.fr-idf-imagine-r.body",
    actionLabelKey: "adv.fr-idf-imagine-r.action",
    action: {
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
    titleKey: "adv.fr-occitanie-carte-jeune.title",
    bodyKey: "adv.fr-occitanie-carte-jeune.body",
    actionLabelKey: "adv.fr-occitanie-carte-jeune.action",
    action: {
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
    titleKey: "adv.fr-region-aides-jeunes.title",
    bodyKey: "adv.fr-region-aides-jeunes.body",
    actionLabelKey: "adv.fr-region-aides-jeunes.action",
    action: {
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
    titleKey: "adv.gb-fonds-urgence.title",
    bodyKey: "adv.gb-fonds-urgence.body",
    actionLabelKey: "adv.gb-fonds-urgence.action",
    action: {
      link: "https://www.moneyhelper.org.uk/en/savings/types-of-savings/emergency-savings-how-much-is-enough",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "adv.gb-fonds-urgence.fig.0.label", value: "adv.gb-fonds-urgence.fig.0.value" }],
    sources: [
      "https://www.moneyhelper.org.uk/en/savings/types-of-savings/emergency-savings-how-much-is-enough",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "gb-isa",
    category: "long_term",
    countries: ["GB"],
    titleKey: "adv.gb-isa.title",
    bodyKey: "adv.gb-isa.body",
    actionLabelKey: "adv.gb-isa.action",
    action: {
      link: "https://www.gov.uk/individual-savings-accounts",
    },
    appliesWhen: always,
    priority: 88,
    figures: [
      { label: "adv.gb-isa.fig.0.label", value: "20 000 £" },
      { label: "adv.gb-isa.fig.1.label", value: "adv.gb-isa.fig.1.value" },
    ],
    sources: ["https://www.gov.uk/individual-savings-accounts"],
    lastVerified: "2026-07-27",
  },
  {
    id: "gb-lisa",
    category: "real_estate",
    countries: ["GB"],
    titleKey: "adv.gb-lisa.title",
    bodyKey: "adv.gb-lisa.body",
    actionLabelKey: "adv.gb-lisa.action",
    action: {
      link: "https://www.gov.uk/lifetime-isa",
    },
    appliesWhen: and(
      ageIn("18-25", "26-35"),
      housingIn("renter", "free_housing"),
    ),
    priority: 86,
    figures: [
      { label: "adv.gb-lisa.fig.0.label", value: "adv.gb-lisa.fig.0.value" },
      { label: "adv.gb-lisa.fig.1.label", value: "450 000 £" },
    ],
    sources: ["https://www.gov.uk/lifetime-isa"],
    lastVerified: "2026-07-27",
  },
  {
    id: "gb-auto-enrolment",
    category: "retirement",
    countries: ["GB"],
    titleKey: "adv.gb-auto-enrolment.title",
    bodyKey: "adv.gb-auto-enrolment.body",
    actionLabelKey: "adv.gb-auto-enrolment.action",
    action: {
      link: "https://www.gov.uk/workplace-pensions/what-you-your-employer-and-the-government-pay",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 90,
    figures: [
      { label: "adv.gb-auto-enrolment.fig.0.label", value: "8 %" },
      { label: "adv.gb-auto-enrolment.fig.1.label", value: "3 %" },
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
    titleKey: "adv.gb-psa.title",
    bodyKey: "adv.gb-psa.body",
    actionLabelKey: "adv.gb-psa.action",
    action: {
      link: "https://www.gov.uk/apply-tax-free-interest-on-savings",
    },
    appliesWhen: always,
    priority: 74,
    figures: [
      { label: "adv.gb-psa.fig.0.label", value: "1 000 £" },
      { label: "adv.gb-psa.fig.1.label", value: "500 £" },
    ],
    sources: ["https://www.gov.uk/apply-tax-free-interest-on-savings"],
    lastVerified: "2026-07-27",
  },
  {
    id: "gb-child-benefit",
    category: "kids",
    countries: ["GB"],
    titleKey: "adv.gb-child-benefit.title",
    bodyKey: "adv.gb-child-benefit.body",
    actionLabelKey: "adv.gb-child-benefit.action",
    action: {
      link: "https://www.gov.uk/child-benefit/what-youll-get",
    },
    appliesWhen: hasAnyKids,
    priority: 86,
    figures: [
      { label: "adv.gb-child-benefit.fig.0.label", value: "adv.gb-child-benefit.fig.0.value" },
      { label: "adv.gb-child-benefit.fig.1.label", value: "adv.gb-child-benefit.fig.1.value" },
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
    titleKey: "adv.us-fonds-urgence.title",
    bodyKey: "adv.us-fonds-urgence.body",
    actionLabelKey: "adv.us-fonds-urgence.action",
    action: {
      link: "https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/",
    },
    appliesWhen: always,
    priority: 98,
    figures: [
      { label: "adv.us-fonds-urgence.fig.0.label", value: "adv.us-fonds-urgence.fig.0.value" },
      { label: "adv.us-fonds-urgence.fig.1.label", value: "adv.us-fonds-urgence.fig.1.value" },
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
    titleKey: "adv.us-401k-match.title",
    bodyKey: "adv.us-401k-match.body",
    actionLabelKey: "adv.us-401k-match.action",
    action: {
      link: "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 92,
    figures: [
      { label: "adv.us-401k-match.fig.0.label", value: "24 500 $" },
      { label: "adv.us-401k-match.fig.1.label", value: "+8 000 $" },
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
    titleKey: "adv.us-ira-roth.title",
    bodyKey: "adv.us-ira-roth.body",
    actionLabelKey: "adv.us-ira-roth.action",
    action: {
      link: "https://www.irs.gov/retirement-plans/individual-retirement-arrangements-iras",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 84,
    figures: [
      { label: "adv.us-ira-roth.fig.0.label", value: "7 500 $" },
      { label: "adv.us-ira-roth.fig.1.label", value: "+1 100 $" },
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
    titleKey: "adv.us-hsa.title",
    bodyKey: "adv.us-hsa.body",
    actionLabelKey: "adv.us-hsa.action",
    action: {
      link: "https://www.irs.gov/publications/p969",
    },
    appliesWhen: always,
    priority: 80,
    figures: [
      { label: "adv.us-hsa.fig.0.label", value: "4 400 $" },
      { label: "adv.us-hsa.fig.1.label", value: "8 750 $" },
    ],
    sources: ["https://www.irs.gov/pub/irs-drop/rp-25-19.pdf"],
    lastVerified: "2026-07-27",
  },
  {
    id: "us-529",
    category: "kids",
    countries: ["US"],
    titleKey: "adv.us-529.title",
    bodyKey: "adv.us-529.body",
    actionLabelKey: "adv.us-529.action",
    action: {
      link: "https://www.irs.gov/taxtopics/tc313",
    },
    appliesWhen: hasAnyKids,
    priority: 86,
    figures: [{ label: "adv.us-529.fig.0.label", value: "adv.us-529.fig.0.value" }],
    sources: ["https://www.irs.gov/taxtopics/tc313"],
    lastVerified: "2026-07-27",
  },
  {
    id: "us-credit-score",
    category: "emergency",
    countries: ["US"],
    titleKey: "adv.us-credit-score.title",
    bodyKey: "adv.us-credit-score.body",
    actionLabelKey: "adv.us-credit-score.action",
    action: {
      link: "https://www.consumerfinance.gov/ask-cfpb/how-do-i-get-and-keep-a-good-credit-score-en-318/",
    },
    appliesWhen: always,
    priority: 76,
    figures: [{ label: "adv.us-credit-score.fig.0.label", value: "< 30 %" }],
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
    titleKey: "adv.de-notgroschen.title",
    bodyKey: "adv.de-notgroschen.body",
    actionLabelKey: "adv.de-notgroschen.action",
    action: {},
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "adv.de-notgroschen.fig.0.label", value: "adv.de-notgroschen.fig.0.value" }],
    sources: ["https://www.finanztip.de/tagesgeld/"],
    lastVerified: "2026-07-27",
  },
  {
    id: "de-sparerpauschbetrag",
    category: "tax",
    countries: ["DE"],
    titleKey: "adv.de-sparerpauschbetrag.title",
    bodyKey: "adv.de-sparerpauschbetrag.body",
    actionLabelKey: "adv.de-sparerpauschbetrag.action",
    action: {
      link: "https://www.finanzamt.nrw.de/steuerinfos/privatpersonen/einkuenfte-aus-kapitalvermoegen/sparerpauschbetrag-freistellungsauftrag",
    },
    appliesWhen: always,
    priority: 84,
    figures: [
      { label: "adv.de-sparerpauschbetrag.fig.0.label", value: "adv.de-sparerpauschbetrag.fig.0.value" },
      { label: "adv.de-sparerpauschbetrag.fig.1.label", value: "adv.de-sparerpauschbetrag.fig.1.value" },
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
    titleKey: "adv.de-bav.title",
    bodyKey: "adv.de-bav.body",
    actionLabelKey: "adv.de-bav.action",
    action: {},
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 86,
    figures: [
      { label: "adv.de-bav.fig.0.label", value: "adv.de-bav.fig.0.value" },
      { label: "adv.de-bav.fig.1.label", value: "adv.de-bav.fig.1.value" },
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
    titleKey: "adv.de-etf-sparplan.title",
    bodyKey: "adv.de-etf-sparplan.body",
    actionLabelKey: "adv.de-etf-sparplan.action",
    action: {
      link: "https://www.finanztip.de/indexfonds-etf/fondssparplan/",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50"),
    priority: 80,
    figures: [
      { label: "adv.de-etf-sparplan.fig.0.label", value: "adv.de-etf-sparplan.fig.0.value" },
      { label: "adv.de-etf-sparplan.fig.1.label", value: "< 0,3 %" },
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
    titleKey: "adv.de-kindergeld.title",
    bodyKey: "adv.de-kindergeld.body",
    actionLabelKey: "adv.de-kindergeld.action",
    action: {
      link: "https://www.arbeitsagentur.de/news/kindergeld-steigt-2026",
    },
    appliesWhen: hasAnyKids,
    priority: 86,
    figures: [
      { label: "adv.de-kindergeld.fig.0.label", value: "adv.de-kindergeld.fig.0.value" },
      { label: "adv.de-kindergeld.fig.1.label", value: "adv.de-kindergeld.fig.1.value" },
    ],
    sources: ["https://www.arbeitsagentur.de/news/kindergeld-steigt-2026"],
    lastVerified: "2026-07-27",
  },
  {
    id: "de-vl",
    category: "emergency",
    countries: ["DE"],
    titleKey: "adv.de-vl.title",
    bodyKey: "adv.de-vl.body",
    actionLabelKey: "adv.de-vl.action",
    action: {},
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 78,
    figures: [{ label: "adv.de-vl.fig.0.label", value: "adv.de-vl.fig.0.value" }],
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
    titleKey: "adv.es-fondo-emergencia.title",
    bodyKey: "adv.es-fondo-emergencia.body",
    actionLabelKey: "adv.es-fondo-emergencia.action",
    action: {
      link: "https://www.finanzasparatodos.es/cuanto-debe-tener-tu-fondo-de-emergencia",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "adv.es-fondo-emergencia.fig.0.label", value: "adv.es-fondo-emergencia.fig.0.value" }],
    sources: [
      "https://www.finanzasparatodos.es/cuanto-debe-tener-tu-fondo-de-emergencia",
    ],
    lastVerified: "2026-07-27",
  },
  {
    id: "es-plan-pensiones",
    category: "retirement",
    countries: ["ES"],
    titleKey: "adv.es-plan-pensiones.title",
    bodyKey: "adv.es-plan-pensiones.body",
    actionLabelKey: "adv.es-plan-pensiones.action",
    action: {
      link: "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025.html",
    },
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 84,
    figures: [
      { label: "adv.es-plan-pensiones.fig.0.label", value: "adv.es-plan-pensiones.fig.0.value" },
      { label: "adv.es-plan-pensiones.fig.1.label", value: "adv.es-plan-pensiones.fig.1.value" },
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
    titleKey: "adv.es-ahorro-fiscalidad.title",
    bodyKey: "adv.es-ahorro-fiscalidad.body",
    actionLabelKey: "adv.es-ahorro-fiscalidad.action",
    action: {},
    appliesWhen: always,
    priority: 76,
    figures: [
      { label: "adv.es-ahorro-fiscalidad.fig.0.label", value: "19 %" },
      { label: "adv.es-ahorro-fiscalidad.fig.1.label", value: "30 %" },
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
    titleKey: "adv.es-bono-alquiler-joven.title",
    bodyKey: "adv.es-bono-alquiler-joven.body",
    actionLabelKey: "adv.es-bono-alquiler-joven.action",
    action: {
      link: "https://www.mivau.gob.es/vivienda/bono-alquiler-joven",
    },
    appliesWhen: and(ageIn("18-25", "26-35"), housingIn("renter")),
    priority: 86,
    figures: [
      { label: "adv.es-bono-alquiler-joven.fig.0.label", value: "adv.es-bono-alquiler-joven.fig.0.value" },
      { label: "adv.es-bono-alquiler-joven.fig.1.label", value: "adv.es-bono-alquiler-joven.fig.1.value" },
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
    titleKey: "adv.es-ayudas-hijos.title",
    bodyKey: "adv.es-ayudas-hijos.body",
    actionLabelKey: "adv.es-ayudas-hijos.action",
    action: {
      link: "https://sede.agenciatributaria.gob.es/Sede/ciudadanos-familias-personas-discapacidad/deducciones-relacionadas-hijos-descendientes/deduccion-maternidad.html",
    },
    appliesWhen: kids("0-6"),
    priority: 86,
    figures: [
      { label: "adv.es-ayudas-hijos.fig.0.label", value: "adv.es-ayudas-hijos.fig.0.value" },
      { label: "adv.es-ayudas-hijos.fig.1.label", value: "adv.es-ayudas-hijos.fig.1.value" },
    ],
    sources: [
      "https://sede.agenciatributaria.gob.es/Sede/ciudadanos-familias-personas-discapacidad/deducciones-relacionadas-hijos-descendientes/deduccion-maternidad.html",
      "https://www.inclusion.gob.es/en/web/inclusion/que-es-el-capi",
    ],
    lastVerified: "2026-07-27",
  },

  {
    id: "es-avales-ico",
    category: "real_estate",
    countries: ["ES"],
    titleKey: "adv.es-avales-ico.title",
    bodyKey: "adv.es-avales-ico.body",
    actionLabelKey: "adv.es-avales-ico.action",
    action: {
      link: "https://www.ico.es/en/linea-avales-hipoteca-primera-vivienda",
    },
    appliesWhen: and(housingIn("renter", "free_housing"), or(ageIn("18-25", "26-35"), hasAnyKids)),
    priority: 84,
    figures: [{ label: "adv.es-avales-ico.fig.0.label", value: "adv.es-avales-ico.fig.0.value" }],
    sources: ["https://www.ico.es/en/linea-avales-hipoteca-primera-vivienda"],
    lastVerified: "2026-08-06",
  },
  {
    id: "es-imv",
    category: "emergency",
    countries: ["ES"],
    titleKey: "adv.es-imv.title",
    bodyKey: "adv.es-imv.body",
    actionLabelKey: "adv.es-imv.action",
    action: {
      link: "https://imv.seg-social.es/",
    },
    appliesWhen: or(savingsCapacityLow, occupationIs("unemployed")),
    priority: 90,
    figures: [{ label: "adv.es-imv.fig.0.label", value: "adv.es-imv.fig.0.value" }],
    sources: ["https://revista.seg-social.es/-/gu%C3%ADa-sobre-el-nuevo-complemento-a-la-infancia-del-imv"],
    lastVerified: "2026-08-06",
  },
  {
    id: "es-sialp",
    category: "long_term",
    countries: ["ES"],
    titleKey: "adv.es-sialp.title",
    bodyKey: "adv.es-sialp.body",
    actionLabelKey: "adv.es-sialp.action",
    action: {
      link: "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-mobiliario/rendimientos-integrar-base-imponible-ahorro/rendimientos-operaciones-capitalizacion-seguros-vida-invalidez/planes-ahorro-largo-plazo/caracteristicas-requisitos.html",
    },
    appliesWhen: always,
    priority: 74,
    figures: [{ label: "adv.es-sialp.fig.0.label", value: "adv.es-sialp.fig.0.value" }],
    sources: ["https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c05-rendimientos-capital-mobiliario/rendimientos-integrar-base-imponible-ahorro/rendimientos-operaciones-capitalizacion-seguros-vida-invalidez/planes-ahorro-largo-plazo/caracteristicas-requisitos.html"],
    lastVerified: "2026-08-06",
  },
  {
    id: "es-bono-cultural",
    category: "emergency",
    countries: ["ES"],
    titleKey: "adv.es-bono-cultural.title",
    bodyKey: "adv.es-bono-cultural.body",
    actionLabelKey: "adv.es-bono-cultural.action",
    action: {
      link: "https://bonoculturajoven.gob.es/",
    },
    appliesWhen: ageIn("18-25"),
    priority: 78,
    figures: [{ label: "adv.es-bono-cultural.fig.0.label", value: "400 €" }],
    sources: ["https://www.cultura.gob.es/actualidad/2026/06/260622-bono-cultural-joven-2026.html"],
    lastVerified: "2026-08-06",
  },

  // ==========================================================================
  // CAMEROUN (CEMAC, XAF) — recherche vérifiée 2026-07-27 (MINFI, DGTCFM,
  // décret 2024/056 multi-sources). Devise : franc CFA XAF, parité fixe EUR.
  // ==========================================================================
  {
    id: "cm-epargne-exoneree",
    category: "tax",
    countries: ["CM"],
    titleKey: "adv.cm-epargne-exoneree.title",
    bodyKey: "adv.cm-epargne-exoneree.body",
    actionLabelKey: "adv.cm-epargne-exoneree.action",
    action: {
      link: "https://minfi.gov.cm/les-exonerations-fiscales-a-caractere-social-dans-le-code-general-des-impots/",
    },
    appliesWhen: always,
    priority: 88,
    figures: [
      { label: "adv.cm-epargne-exoneree.fig.0.label", value: "10 M FCFA" },
      { label: "adv.cm-epargne-exoneree.fig.1.label", value: "IRCM 16,5 %" },
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
    titleKey: "adv.cm-allocations-cnps.title",
    bodyKey: "adv.cm-allocations-cnps.body",
    actionLabelKey: "adv.cm-allocations-cnps.action",
    action: {},
    appliesWhen: hasAnyKids,
    priority: 86,
    figures: [{ label: "adv.cm-allocations-cnps.fig.0.label", value: "adv.cm-allocations-cnps.fig.0.value" }],
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
    titleKey: "adv.cm-mobile-money.title",
    bodyKey: "adv.cm-mobile-money.body",
    actionLabelKey: "adv.cm-mobile-money.action",
    action: {},
    appliesWhen: always,
    priority: 82,
    figures: [
      { label: "adv.cm-mobile-money.fig.0.label", value: "0,2 %" },
      { label: "adv.cm-mobile-money.fig.1.label", value: "adv.cm-mobile-money.fig.1.value" },
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
    titleKey: "adv.cm-tontine.title",
    bodyKey: "adv.cm-tontine.body",
    actionLabelKey: "adv.cm-tontine.action",
    action: {},
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
    titleKey: "adv.cm-titres-publics.title",
    bodyKey: "adv.cm-titres-publics.body",
    actionLabelKey: "adv.cm-titres-publics.action",
    action: {
      link: "https://dgtcfm.cm/pourquoi-investir-dans-les-titres-publics/",
    },
    appliesWhen: always,
    priority: 70,
    figures: [{ label: "adv.cm-titres-publics.fig.0.label", value: "~1 M FCFA" }],
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
    titleKey: "adv.it-fondo-emergenza.title",
    bodyKey: "adv.it-fondo-emergenza.body",
    actionLabelKey: "adv.it-fondo-emergenza.action",
    action: {
      link: "https://economiapertutti.bancaditalia.it/",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "adv.it-fondo-emergenza.fig.0.label", value: "adv.it-fondo-emergenza.fig.0.value" }],
    sources: ["https://economiapertutti.bancaditalia.it/"],
    lastVerified: "2026-07-28",
  },
  {
    id: "it-fondi-pensione",
    category: "retirement",
    countries: ["IT"],
    titleKey: "adv.it-fondi-pensione.title",
    bodyKey: "adv.it-fondi-pensione.body",
    actionLabelKey: "adv.it-fondi-pensione.action",
    action: {},
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 86,
    figures: [
      { label: "adv.it-fondi-pensione.fig.0.label", value: "adv.it-fondi-pensione.fig.0.value" },
      { label: "adv.it-fondi-pensione.fig.1.label", value: "15 % → 9 %" },
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
    titleKey: "adv.it-assegno-unico.title",
    bodyKey: "adv.it-assegno-unico.body",
    actionLabelKey: "adv.it-assegno-unico.action",
    action: {
      link: "https://www.inps.it/it/it/dettaglio-scheda.schede-servizio-strumento.schede-servizi.assegno-unico-e-universale-per-i-figli-a-carico-55984.assegno-unico-e-universale-per-i-figli-a-carico.html",
    },
    appliesWhen: hasAnyKids,
    priority: 88,
    figures: [
      { label: "adv.it-assegno-unico.fig.0.label", value: "adv.it-assegno-unico.fig.0.value" },
      { label: "adv.it-assegno-unico.fig.1.label", value: "+50 %" },
    ],
    sources: ["Circolare INPS n. 7 del 30/01/2026"],
    lastVerified: "2026-07-28",
  },
  {
    id: "it-bfp-fiscalita",
    category: "long_term",
    countries: ["IT"],
    titleKey: "adv.it-bfp-fiscalita.title",
    bodyKey: "adv.it-bfp-fiscalita.body",
    actionLabelKey: "adv.it-bfp-fiscalita.action",
    action: {
      link: "https://buonielibretti.poste.it/faq-buoni-e-libretti",
    },
    appliesWhen: always,
    priority: 76,
    figures: [
      { label: "adv.it-bfp-fiscalita.fig.0.label", value: "12,5 %" },
      { label: "adv.it-bfp-fiscalita.fig.1.label", value: "26 %" },
    ],
    sources: ["https://buonielibretti.poste.it/faq-buoni-e-libretti"],
    lastVerified: "2026-07-28",
  },

  {
    id: "it-tfr-scelta",
    category: "retirement",
    countries: ["IT"],
    titleKey: "adv.it-tfr-scelta.title",
    bodyKey: "adv.it-tfr-scelta.body",
    actionLabelKey: "adv.it-tfr-scelta.action",
    action: {
      link: "https://www.covip.it/per-il-cittadino/educazione-previdenziale/faq/conferimento-tfr",
    },
    appliesWhen: occupationIs("employee"),
    priority: 84,
    sources: ["https://www.covip.it/per-il-cittadino/educazione-previdenziale/faq/conferimento-tfr"],
    lastVerified: "2026-08-06",
  },
  {
    id: "it-garanzia-prima-casa",
    category: "real_estate",
    countries: ["IT"],
    titleKey: "adv.it-garanzia-prima-casa.title",
    bodyKey: "adv.it-garanzia-prima-casa.body",
    actionLabelKey: "adv.it-garanzia-prima-casa.action",
    action: {
      link: "https://www.consap.it/fondi-di-garanzia/casa/fondo-prima-casa/",
    },
    appliesWhen: and(housingIn("renter", "free_housing"), ageIn("18-25", "26-35")),
    priority: 84,
    figures: [{ label: "adv.it-garanzia-prima-casa.fig.0.label", value: "adv.it-garanzia-prima-casa.fig.0.value" }],
    sources: ["https://www.consap.it/fondi-di-garanzia/casa/fondo-prima-casa/"],
    lastVerified: "2026-08-06",
  },
  {
    id: "it-bonus-nido",
    category: "kids",
    countries: ["IT"],
    titleKey: "adv.it-bonus-nido.title",
    bodyKey: "adv.it-bonus-nido.body",
    actionLabelKey: "adv.it-bonus-nido.action",
    action: {
      link: "https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.03.bonus-asilo-nido-2026-attivo-il-servizio-per-la-domanda.html",
    },
    appliesWhen: kids("0-6"),
    priority: 86,
    figures: [{ label: "adv.it-bonus-nido.fig.0.label", value: "adv.it-bonus-nido.fig.0.value" }],
    sources: ["https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.03.bonus-asilo-nido-2026-attivo-il-servizio-per-la-domanda.html"],
    lastVerified: "2026-08-06",
  },
  {
    id: "it-carte-giovani",
    category: "emergency",
    countries: ["IT"],
    titleKey: "adv.it-carte-giovani.title",
    bodyKey: "adv.it-carte-giovani.body",
    actionLabelKey: "adv.it-carte-giovani.action",
    action: {
      link: "https://cartegiovani.cultura.gov.it/",
    },
    appliesWhen: ageIn("18-25"),
    priority: 80,
    figures: [{ label: "adv.it-carte-giovani.fig.0.label", value: "1 000 €" }],
    sources: ["https://cartegiovani.cultura.gov.it/"],
    lastVerified: "2026-08-06",
  },
  {
    id: "it-isee-annuale",
    category: "tax",
    countries: ["IT"],
    titleKey: "adv.it-isee-annuale.title",
    bodyKey: "adv.it-isee-annuale.body",
    actionLabelKey: "adv.it-isee-annuale.action",
    action: {
      link: "https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-strumenti.come-acquisire-la-dsu-precompilata-e-richiedere-l-isee-53358.come-acquisire-la-dsu-precompilata-e-richiedere-l-isee.html",
    },
    appliesWhen: always,
    priority: 82,
    sources: ["https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-strumenti.come-acquisire-la-dsu-precompilata-e-richiedere-l-isee-53358.come-acquisire-la-dsu-precompilata-e-richiedere-l-isee.html"],
    lastVerified: "2026-08-06",
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
    titleKey: "adv.pt-fundo-emergencia.title",
    bodyKey: "adv.pt-fundo-emergencia.body",
    actionLabelKey: "adv.pt-fundo-emergencia.action",
    action: {
      link: "https://www.todoscontam.pt/pt-pt/fundo-de-emergencia",
    },
    appliesWhen: always,
    priority: 98,
    figures: [{ label: "adv.pt-fundo-emergencia.fig.0.label", value: "adv.pt-fundo-emergencia.fig.0.value" }],
    sources: ["https://www.todoscontam.pt/pt-pt/fundo-de-emergencia"],
    lastVerified: "2026-07-28",
  },
  {
    id: "pt-ppr",
    category: "retirement",
    countries: ["PT"],
    titleKey: "adv.pt-ppr.title",
    bodyKey: "adv.pt-ppr.body",
    actionLabelKey: "adv.pt-ppr.action",
    action: {
      link: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf/Pages/bf-artigo-21-ordm-.aspx",
    },
    appliesWhen: ageIn("18-25", "26-35", "36-50", "51-65"),
    priority: 86,
    figures: [
      { label: "adv.pt-ppr.fig.0.label", value: "adv.pt-ppr.fig.0.value" },
      { label: "adv.pt-ppr.fig.1.label", value: "adv.pt-ppr.fig.1.value" },
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
    titleKey: "adv.pt-certificados-aforro.title",
    bodyKey: "adv.pt-certificados-aforro.body",
    actionLabelKey: "adv.pt-certificados-aforro.action",
    action: {
      link: "https://aforronet.igcp.pt/iimf.aforronet.ui/condicoes/CondicoesSubscricao.aspx",
    },
    appliesWhen: always,
    priority: 78,
    figures: [
      { label: "adv.pt-certificados-aforro.fig.0.label", value: "100 €" },
      { label: "adv.pt-certificados-aforro.fig.1.label", value: "adv.pt-certificados-aforro.fig.1.value" },
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
    titleKey: "adv.pt-irs-jovem.title",
    bodyKey: "adv.pt-irs-jovem.body",
    actionLabelKey: "adv.pt-irs-jovem.action",
    action: {
      link: "https://www.gov.pt/noticias/novo-modelo-de-irs-jovem-em-2025",
    },
    appliesWhen: ageIn("18-25", "26-35"),
    priority: 88,
    figures: [
      { label: "adv.pt-irs-jovem.fig.0.label", value: "adv.pt-irs-jovem.fig.0.value" },
      { label: "adv.pt-irs-jovem.fig.1.label", value: "adv.pt-irs-jovem.fig.1.value" },
    ],
    sources: [
      "https://www.gov.pt/noticias/novo-modelo-de-irs-jovem-em-2025",
      "https://www.occ.pt/sites/default/files/public/2025-02/Guia_Pratico_IRS_J6fevCa.pdf",
    ],
    lastVerified: "2026-07-28",
  },

  {
    id: "pt-porta65",
    category: "housing",
    countries: ["PT"],
    titleKey: "adv.pt-porta65.title",
    bodyKey: "adv.pt-porta65.body",
    actionLabelKey: "adv.pt-porta65.action",
    action: {
      link: "https://www.portaldahabitacao.pt/web/guest/porta-65-jovem",
    },
    appliesWhen: and(housingIn("renter"), ageIn("18-25", "26-35")),
    priority: 86,
    sources: ["https://www.portaldahabitacao.pt/web/guest/porta-65-jovem"],
    lastVerified: "2026-08-06",
  },
  {
    id: "pt-garantia-publica",
    category: "real_estate",
    countries: ["PT"],
    titleKey: "adv.pt-garantia-publica.title",
    bodyKey: "adv.pt-garantia-publica.body",
    actionLabelKey: "adv.pt-garantia-publica.action",
    action: {
      link: "https://www.gov.pt/servicos/pedir-a-garantia-publica-para-credito-a-habitacao",
    },
    appliesWhen: and(housingIn("renter", "free_housing"), ageIn("18-25", "26-35")),
    priority: 88,
    figures: [{ label: "adv.pt-garantia-publica.fig.0.label", value: "adv.pt-garantia-publica.fig.0.value" }],
    sources: ["https://www.gov.pt/servicos/pedir-a-garantia-publica-para-credito-a-habitacao"],
    lastVerified: "2026-08-06",
  },
  {
    id: "pt-imt-jovem",
    category: "real_estate",
    countries: ["PT"],
    titleKey: "adv.pt-imt-jovem.title",
    bodyKey: "adv.pt-imt-jovem.body",
    actionLabelKey: "adv.pt-imt-jovem.action",
    action: {
      link: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/IMT_Jovem/Pages/default.aspx",
    },
    appliesWhen: and(housingIn("renter", "free_housing"), ageIn("18-25", "26-35")),
    priority: 86,
    sources: ["https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/IMT_Jovem/Pages/default.aspx"],
    lastVerified: "2026-08-06",
  },
  {
    id: "pt-abono-familia",
    category: "kids",
    countries: ["PT"],
    titleKey: "adv.pt-abono-familia.title",
    bodyKey: "adv.pt-abono-familia.body",
    actionLabelKey: "adv.pt-abono-familia.action",
    action: {
      link: "https://www.seg-social.pt/abono-de-familia-para-criancas-e-jovens",
    },
    appliesWhen: hasAnyKids,
    priority: 84,
    sources: ["https://www.seg-social.pt/abono-de-familia-para-criancas-e-jovens"],
    lastVerified: "2026-08-06",
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
    titleKey: "adv.ma-pea.title",
    bodyKey: "adv.ma-pea.body",
    actionLabelKey: "adv.ma-pea.action",
    action: {},
    appliesWhen: always,
    priority: 84,
    figures: [
      { label: "adv.ma-pea.fig.0.label", value: "2 000 000 DH" },
      { label: "adv.ma-pea.fig.1.label", value: "adv.ma-pea.fig.1.value" },
    ],
    sources: ["Code Général des Impôts 2026, art. 68 (DGI)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "ma-pel",
    category: "real_estate",
    countries: ["MA"],
    titleKey: "adv.ma-pel.title",
    bodyKey: "adv.ma-pel.body",
    actionLabelKey: "adv.ma-pel.action",
    action: {},
    appliesWhen: housingIn("renter", "free_housing"),
    priority: 80,
    figures: [
      { label: "adv.ma-pel.fig.0.label", value: "400 000 DH" },
      { label: "adv.ma-pel.fig.1.label", value: "adv.ma-pel.fig.1.value" },
    ],
    sources: ["Code Général des Impôts 2026, art. 68 (DGI)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "ma-pee",
    category: "kids",
    countries: ["MA"],
    titleKey: "adv.ma-pee.title",
    bodyKey: "adv.ma-pee.body",
    actionLabelKey: "adv.ma-pee.action",
    action: {},
    appliesWhen: hasAnyKids,
    priority: 86,
    figures: [
      { label: "adv.ma-pee.fig.0.label", value: "300 000 DH" },
      { label: "adv.ma-pee.fig.1.label", value: "adv.ma-pee.fig.1.value" },
    ],
    sources: ["Code Général des Impôts 2026, art. 68 (DGI)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "ma-retraite-deduction",
    category: "retirement",
    countries: ["MA"],
    titleKey: "adv.ma-retraite-deduction.title",
    bodyKey: "adv.ma-retraite-deduction.body",
    actionLabelKey: "adv.ma-retraite-deduction.action",
    action: {
      link: "https://www.cimr.ma/cotiser-a-la-cimr/",
    },
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 84,
    figures: [
      { label: "adv.ma-retraite-deduction.fig.0.label", value: "adv.ma-retraite-deduction.fig.0.value" },
      { label: "adv.ma-retraite-deduction.fig.1.label", value: "adv.ma-retraite-deduction.fig.1.value" },
    ],
    sources: ["Code Général des Impôts 2026, art. 28-III (DGI)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "ma-allocations-cnss",
    category: "kids",
    countries: ["MA"],
    titleKey: "adv.ma-allocations-cnss.title",
    bodyKey: "adv.ma-allocations-cnss.body",
    actionLabelKey: "adv.ma-allocations-cnss.action",
    action: {},
    appliesWhen: hasAnyKids,
    priority: 84,
    figures: [
      { label: "adv.ma-allocations-cnss.fig.0.label", value: "adv.ma-allocations-cnss.fig.0.value" },
      { label: "adv.ma-allocations-cnss.fig.1.label", value: "adv.ma-allocations-cnss.fig.1.value" },
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
    titleKey: "adv.ma-compte-carnet.title",
    bodyKey: "adv.ma-compte-carnet.body",
    actionLabelKey: "adv.ma-compte-carnet.action",
    action: {},
    appliesWhen: always,
    priority: 74,
    figures: [{ label: "adv.ma-compte-carnet.fig.0.label", value: "adv.ma-compte-carnet.fig.0.value" }],
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
    titleKey: "adv.uemoa-oat-tresor.title",
    bodyKey: "adv.uemoa-oat-tresor.body",
    actionLabelKey: "adv.uemoa-oat-tresor.action",
    action: {
      link: "https://www.umoatitres.org/particuliers/",
    },
    appliesWhen: always,
    priority: 76,
    figures: [
      { label: "adv.uemoa-oat-tresor.fig.0.label", value: "10 000 FCFA" },
      { label: "adv.uemoa-oat-tresor.fig.1.label", value: "adv.uemoa-oat-tresor.fig.1.value" },
    ],
    sources: ["https://www.umoatitres.org/particuliers/"],
    lastVerified: "2026-07-28",
  },
  {
    id: "uemoa-tontine-sfd",
    category: "emergency",
    countries: ["SN", "CI"],
    titleKey: "adv.uemoa-tontine-sfd.title",
    bodyKey: "adv.uemoa-tontine-sfd.body",
    actionLabelKey: "adv.uemoa-tontine-sfd.action",
    action: {},
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
    titleKey: "adv.sn-livret-exonere.title",
    bodyKey: "adv.sn-livret-exonere.body",
    actionLabelKey: "adv.sn-livret-exonere.action",
    action: {},
    appliesWhen: always,
    priority: 86,
    figures: [
      { label: "adv.sn-livret-exonere.fig.0.label", value: "adv.sn-livret-exonere.fig.0.value" },
      { label: "adv.sn-livret-exonere.fig.1.label", value: "adv.sn-livret-exonere.fig.1.value" },
    ],
    sources: ["Code général des impôts (Sénégal), art. 105-3° et 173-2"],
    lastVerified: "2026-07-28",
  },
  {
    id: "sn-allocations-css",
    category: "kids",
    countries: ["SN"],
    titleKey: "adv.sn-allocations-css.title",
    bodyKey: "adv.sn-allocations-css.body",
    actionLabelKey: "adv.sn-allocations-css.action",
    action: {},
    appliesWhen: hasAnyKids,
    priority: 82,
    figures: [{ label: "adv.sn-allocations-css.fig.0.label", value: "adv.sn-allocations-css.fig.0.value" }],
    sources: ["https://www.cleiss.fr/docs/regimes/regime_senegal.html"],
    lastVerified: "2026-07-28",
  },
  {
    id: "sn-mobile-money",
    category: "emergency",
    countries: ["SN"],
    titleKey: "adv.sn-mobile-money.title",
    bodyKey: "adv.sn-mobile-money.body",
    actionLabelKey: "adv.sn-mobile-money.action",
    action: {},
    appliesWhen: always,
    priority: 78,
    figures: [
      { label: "adv.sn-mobile-money.fig.0.label", value: "1 %" },
      { label: "adv.sn-mobile-money.fig.1.label", value: "0,8 %" },
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
    titleKey: "adv.ci-allocations-cnps.title",
    bodyKey: "adv.ci-allocations-cnps.body",
    actionLabelKey: "adv.ci-allocations-cnps.action",
    action: {},
    appliesWhen: hasAnyKids,
    priority: 82,
    figures: [
      { label: "adv.ci-allocations-cnps.fig.0.label", value: "adv.ci-allocations-cnps.fig.0.value" },
      { label: "adv.ci-allocations-cnps.fig.1.label", value: "adv.ci-allocations-cnps.fig.1.value" },
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
    titleKey: "adv.ci-epargne-fiscalite.title",
    bodyKey: "adv.ci-epargne-fiscalite.body",
    actionLabelKey: "adv.ci-epargne-fiscalite.action",
    action: {},
    appliesWhen: always,
    priority: 84,
    figures: [
      { label: "adv.ci-epargne-fiscalite.fig.0.label", value: "adv.ci-epargne-fiscalite.fig.0.value" },
      { label: "adv.ci-epargne-fiscalite.fig.1.label", value: "18 %" },
    ],
    sources: ["DGI Côte d'Ivoire — Impôts et taxes (IRC, art. 192 s. CGI)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "ci-mobile-money",
    category: "emergency",
    countries: ["CI"],
    titleKey: "adv.ci-mobile-money.title",
    bodyKey: "adv.ci-mobile-money.body",
    actionLabelKey: "adv.ci-mobile-money.action",
    action: {},
    appliesWhen: always,
    priority: 78,
    figures: [
      { label: "adv.ci-mobile-money.fig.0.label", value: "0 FCFA" },
      { label: "adv.ci-mobile-money.fig.1.label", value: "1 %" },
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
    titleKey: "adv.dz-allocations-cnas.title",
    bodyKey: "adv.dz-allocations-cnas.body",
    actionLabelKey: "adv.dz-allocations-cnas.action",
    action: {
      link: "https://cnas.dz",
    },
    appliesWhen: hasAnyKids,
    priority: 82,
    figures: [
      { label: "adv.dz-allocations-cnas.fig.0.label", value: "adv.dz-allocations-cnas.fig.0.value" },
      { label: "adv.dz-allocations-cnas.fig.1.label", value: "adv.dz-allocations-cnas.fig.1.value" },
    ],
    sources: ["https://cnas.dz (page المنح العائلية)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "dz-epargne-logement",
    category: "real_estate",
    countries: ["DZ"],
    titleKey: "adv.dz-epargne-logement.title",
    bodyKey: "adv.dz-epargne-logement.body",
    actionLabelKey: "adv.dz-epargne-logement.action",
    action: {},
    appliesWhen: housingIn("renter", "free_housing"),
    priority: 80,
    sources: ["https://www.poste.dz/services/particular/cnep-ecnep"],
    lastVerified: "2026-07-28",
  },
  {
    id: "dz-finance-islamique",
    category: "long_term",
    countries: ["DZ"],
    titleKey: "adv.dz-finance-islamique.title",
    bodyKey: "adv.dz-finance-islamique.body",
    actionLabelKey: "adv.dz-finance-islamique.action",
    action: {},
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
    titleKey: "adv.tn-epargne-tre.title",
    bodyKey: "adv.tn-epargne-tre.body",
    actionLabelKey: "adv.tn-epargne-tre.action",
    action: {},
    appliesWhen: always,
    priority: 90,
    figures: [{ label: "adv.tn-epargne-tre.fig.0.label", value: "adv.tn-epargne-tre.fig.0.value" }],
    sources: ["Banque Centrale de Tunisie — décision du 30/12/2025"],
    lastVerified: "2026-07-28",
  },
  {
    id: "tn-cea",
    category: "tax",
    countries: ["TN"],
    titleKey: "adv.tn-cea.title",
    bodyKey: "adv.tn-cea.body",
    actionLabelKey: "adv.tn-cea.action",
    action: {},
    appliesWhen: always,
    priority: 84,
    figures: [
      { label: "adv.tn-cea.fig.0.label", value: "adv.tn-cea.fig.0.value" },
      { label: "adv.tn-cea.fig.1.label", value: "adv.tn-cea.fig.1.value" },
    ],
    sources: ["Art. 39 code IRPP/IS · loi 89-114 (minimum d'impôt)"],
    lastVerified: "2026-07-28",
  },
  {
    id: "tn-assurance-vie",
    category: "retirement",
    countries: ["TN"],
    titleKey: "adv.tn-assurance-vie.title",
    bodyKey: "adv.tn-assurance-vie.body",
    actionLabelKey: "adv.tn-assurance-vie.action",
    action: {},
    appliesWhen: ageIn("26-35", "36-50", "51-65"),
    priority: 84,
    figures: [
      { label: "adv.tn-assurance-vie.fig.0.label", value: "adv.tn-assurance-vie.fig.0.value" },
      { label: "adv.tn-assurance-vie.fig.1.label", value: "adv.tn-assurance-vie.fig.1.value" },
    ],
    sources: ["Art. 39 §2 code IRPP/IS · loi de finances 2021"],
    lastVerified: "2026-07-28",
  },

  // ==========================================================================
  // SAISONNIER FRANCE — cartes actives seulement certains mois (months).
  // Dispositifs cités sans montants (ils changent chaque année).
  // ==========================================================================
  {
    id: "season-rentree",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.season-rentree.title",
    bodyKey: "adv.season-rentree.body",
    actionLabelKey: "adv.season-rentree.action",
    action: {
      link: "https://www.caf.fr/allocataires/aides-et-demarches/droits-et-prestations/enfance-et-jeunesse/l-allocation-de-rentree-scolaire-ars",
    },
    appliesWhen: hasAnyKids,
    months: [7, 8, 9],
    priority: 88,
    sources: ["https://www.caf.fr"],
    lastVerified: "2026-08-06",
  },
  {
    id: "season-chauffage",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.season-chauffage.title",
    bodyKey: "adv.season-chauffage.body",
    actionLabelKey: "adv.season-chauffage.action",
    action: {
      link: "https://chequeenergie.gouv.fr",
    },
    appliesWhen: always,
    months: [10, 11, 12, 1, 2],
    priority: 84,
    sources: ["https://chequeenergie.gouv.fr"],
    lastVerified: "2026-08-06",
  },
  {
    id: "season-impots",
    category: "tax",
    countries: ["FR"],
    titleKey: "adv.season-impots.title",
    bodyKey: "adv.season-impots.body",
    actionLabelKey: "adv.season-impots.action",
    action: {
      link: "https://www.impots.gouv.fr",
    },
    appliesWhen: always,
    months: [4, 5, 6],
    priority: 86,
    sources: ["https://www.impots.gouv.fr"],
    lastVerified: "2026-08-06",
  },
  {
    id: "season-fetes",
    category: "emergency",
    countries: "all",
    titleKey: "adv.season-fetes.title",
    bodyKey: "adv.season-fetes.body",
    actionLabelKey: "adv.season-fetes.action",
    action: {},
    appliesWhen: always,
    months: [11, 12],
    priority: 82,
    sources: ["Principe universel de finances personnelles"],
    lastVerified: "2026-08-06",
  },
  {
    id: "season-soldes",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.season-soldes.title",
    bodyKey: "adv.season-soldes.body",
    actionLabelKey: "adv.season-soldes.action",
    action: {},
    appliesWhen: always,
    months: [1, 6, 7],
    priority: 76,
    sources: ["Principe universel de finances personnelles"],
    lastVerified: "2026-08-06",
  },

  // ==========================================================================
  // PROPRIÉTAIRE BAILLEUR — recherche vérifiée 2026-08-06 (impots.gouv.fr,
  // service-public F32744/F2329/F947, ANIL, décret 87-713).
  // ==========================================================================
  {
    id: "immo-net-net-net",
    category: "real_estate",
    countries: ["FR"],
    titleKey: "adv.immo-net-net-net.title",
    bodyKey: "adv.immo-net-net-net.body",
    actionLabelKey: "adv.immo-net-net-net.action",
    action: {},
    appliesWhen: propertyCountAtLeast(2),
    priority: 90,
    figures: [
      { label: "adv.immo-net-net-net.fig.0.label", value: "17,2 %" },
      { label: "adv.immo-net-net-net.fig.1.label", value: "18,6 %" },
    ],
    sources: [
      "https://www.impots.gouv.fr/particulier/questions/je-donne-un-bien-en-location-dois-je-payer-des-prelevements-sociaux",
      "https://www.service-public.gouv.fr/particuliers/vosdroits/F2329",
    ],
    lastVerified: "2026-08-06",
  },
  {
    id: "immo-micro-foncier-reel",
    category: "tax",
    countries: ["FR"],
    titleKey: "adv.immo-micro-foncier-reel.title",
    bodyKey: "adv.immo-micro-foncier-reel.body",
    actionLabelKey: "adv.immo-micro-foncier-reel.action",
    action: {
      link: "https://www.impots.gouv.fr/particulier/location-vide-de-meubles",
    },
    appliesWhen: propertyCountAtLeast(2),
    priority: 84,
    figures: [
      { label: "adv.immo-micro-foncier-reel.fig.0.label", value: "adv.immo-micro-foncier-reel.fig.0.value" },
      { label: "adv.immo-micro-foncier-reel.fig.1.label", value: "adv.immo-micro-foncier-reel.fig.1.value" },
    ],
    sources: ["https://www.impots.gouv.fr/particulier/location-vide-de-meubles"],
    lastVerified: "2026-08-06",
  },
  {
    id: "immo-lmnp-2026",
    category: "tax",
    countries: ["FR"],
    titleKey: "adv.immo-lmnp-2026.title",
    bodyKey: "adv.immo-lmnp-2026.body",
    actionLabelKey: "adv.immo-lmnp-2026.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F32744",
    },
    appliesWhen: propertyCountAtLeast(2),
    priority: 82,
    figures: [
      { label: "adv.immo-lmnp-2026.fig.0.label", value: "83 600 € · 50 %" },
      { label: "adv.immo-lmnp-2026.fig.1.label", value: "15 000 € · 30 %" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F32744"],
    lastVerified: "2026-08-06",
  },
  {
    id: "immo-charges-recuperables",
    category: "real_estate",
    countries: ["FR"],
    titleKey: "adv.immo-charges-recuperables.title",
    bodyKey: "adv.immo-charges-recuperables.body",
    actionLabelKey: "adv.immo-charges-recuperables.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F947",
    },
    appliesWhen: propertyCountAtLeast(2),
    priority: 78,
    sources: [
      "https://www.service-public.gouv.fr/particuliers/vosdroits/F947",
      "Décret n° 87-713 du 26 août 1987",
    ],
    lastVerified: "2026-08-06",
  },
  {
    id: "immo-gli-visale",
    category: "insurance",
    countries: ["FR"],
    titleKey: "adv.immo-gli-visale.title",
    bodyKey: "adv.immo-gli-visale.body",
    actionLabelKey: "adv.immo-gli-visale.action",
    action: {
      link: "https://www.anil.org/votre-besoin/gerer-un-bien/bailleur/impayes-de-loyer/",
    },
    appliesWhen: propertyCountAtLeast(2),
    priority: 74,
    sources: ["https://www.anil.org/votre-besoin/gerer-un-bien/bailleur/impayes-de-loyer/"],
    lastVerified: "2026-08-06",
  },

  // ==========================================================================
  // TYPE DE LOGEMENT & CADRE DE VIE — principes généraux, sans chiffres.
  // ==========================================================================
  {
    id: "housing-maison-entretien",
    category: "housing",
    countries: "all",
    titleKey: "adv.housing-maison-entretien.title",
    bodyKey: "adv.housing-maison-entretien.body",
    actionLabelKey: "adv.housing-maison-entretien.action",
    action: {},
    appliesWhen: and(housingTypeIs("house"), housingIn("owner", "accessor")),
    priority: 80,
    sources: ["Principe universel de finances personnelles"],
    lastVerified: "2026-08-06",
  },
  {
    id: "housing-appart-copro",
    category: "housing",
    countries: ["FR"],
    titleKey: "adv.housing-appart-copro.title",
    bodyKey: "adv.housing-appart-copro.body",
    actionLabelKey: "adv.housing-appart-copro.action",
    action: {},
    appliesWhen: and(housingTypeIs("apartment"), housingIn("owner", "accessor")),
    priority: 80,
    sources: ["Loi n° 65-557 du 10 juillet 1965 · loi ALUR (fonds de travaux)"],
    lastVerified: "2026-08-06",
  },
  {
    id: "zone-montagne-hiver",
    category: "emergency",
    countries: "all",
    titleKey: "adv.zone-montagne-hiver.title",
    bodyKey: "adv.zone-montagne-hiver.body",
    actionLabelKey: "adv.zone-montagne-hiver.action",
    action: {},
    appliesWhen: zoneIs("mountain"),
    months: [8, 9, 10, 11, 12, 1, 2],
    priority: 78,
    sources: ["Principe universel de finances personnelles"],
    lastVerified: "2026-08-06",
  },
  {
    id: "zone-littoral-saison",
    category: "emergency",
    countries: "all",
    titleKey: "adv.zone-littoral-saison.title",
    bodyKey: "adv.zone-littoral-saison.body",
    actionLabelKey: "adv.zone-littoral-saison.action",
    action: {},
    appliesWhen: zoneIs("coastal"),
    priority: 72,
    sources: ["Principe universel de finances personnelles"],
    lastVerified: "2026-08-06",
  },

  // ==========================================================================
  // RÉGIONS FRANCE (vague 2) + DROM — recherche vérifiée 2026-08-06.
  // Dispositifs sourcés ; montants volatils exclus. e-PASS Jeunes PACA
  // SUPPRIMÉ (remplacé par ZOU!/Pass Santé) — ne jamais le citer.
  // ==========================================================================
  {
    id: "fr-aura-pass-region",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-aura-pass-region.title",
    bodyKey: "adv.fr-aura-pass-region.body",
    actionLabelKey: "adv.fr-aura-pass-region.action",
    action: { link: "https://www.auvergnerhonealpes.fr/passregionjeunes" },
    appliesWhen: and(regionIs("Auvergne-Rhône-Alpes"), or(ageIn("under_18", "18-25"), kids("12-15", "16-18", "19+"))),
    priority: 80,
    sources: ["https://www.auvergnerhonealpes.fr/passregionjeunes"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-hdf-transport",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-hdf-transport.title",
    bodyKey: "adv.fr-hdf-transport.body",
    actionLabelKey: "adv.fr-hdf-transport.action",
    action: { link: "https://guide-aides.hautsdefrance.fr/dispositif458" },
    appliesWhen: regionIs("Hauts-de-France"),
    priority: 80,
    figures: [{ label: "adv.fr-hdf-transport.fig.0.label", value: "adv.fr-hdf-transport.fig.0.value" }, { label: "adv.fr-hdf-transport.fig.1.label", value: "adv.fr-hdf-transport.fig.1.value" }],
    sources: ["https://guide-aides.hautsdefrance.fr/dispositif458"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-sud-zou",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-sud-zou.title",
    bodyKey: "adv.fr-sud-zou.body",
    actionLabelKey: "adv.fr-sud-zou.action",
    action: { link: "https://www.maregionsud.fr/ma-region/cest-quoi-la-region/education-orientation-et-apprentissage/toutes-vos-aides-en-1-clic" },
    appliesWhen: and(regionIs("Provence-Alpes-Côte d'Azur"), or(ageIn("under_18", "18-25"), kids("12-15", "16-18", "19+"))),
    priority: 80,
    sources: ["https://www.maregionsud.fr/vos-aides/detail/e-pass-jeunes"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-grand-est-jeunest",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-grand-est-jeunest.title",
    bodyKey: "adv.fr-grand-est-jeunest.body",
    actionLabelKey: "adv.fr-grand-est-jeunest.action",
    action: { link: "https://www.jeunest.fr/" },
    appliesWhen: and(regionIs("Grand Est"), or(ageIn("under_18", "18-25", "26-35"), kids("12-15", "16-18", "19+"))),
    priority: 80,
    sources: ["https://www.jeunest.fr/"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-pdl-epass",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-pdl-epass.title",
    bodyKey: "adv.fr-pdl-epass.body",
    actionLabelKey: "adv.fr-pdl-epass.action",
    action: { link: "https://www.epassjeunes-paysdelaloire.fr/" },
    appliesWhen: and(regionIs("Pays de la Loire"), or(ageIn("under_18", "18-25"), kids("12-15", "16-18"))),
    priority: 80,
    figures: [{ label: "adv.fr-pdl-epass.fig.0.label", value: "adv.fr-pdl-epass.fig.0.value" }, { label: "adv.fr-pdl-epass.fig.1.label", value: "> 130 €" }],
    sources: ["https://www.epassjeunes-paysdelaloire.fr/"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-na-bretagne-portails",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-na-bretagne-portails.title",
    bodyKey: "adv.fr-na-bretagne-portails.body",
    // Action DYNAMIQUE (le lien dépend de la région) : le libellé porte la clé
    // i18n en ligne, `resolveAction` la traduit.
    action: (p) => ({
      label: "adv.fr-na-bretagne-portails.action",
      link: p.region === "Bretagne" ? "https://jeunes.bretagne.bzh" : "https://jeunes.nouvelle-aquitaine.fr/les-aides",
    }),
    appliesWhen: and(regionIs("Nouvelle-Aquitaine", "Bretagne"), or(ageIn("under_18", "18-25"), hasAnyKids)),
    priority: 78,
    sources: ["https://jeunes.nouvelle-aquitaine.fr/les-aides", "https://jeunes.bretagne.bzh"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-permis-1-euro",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-permis-1-euro.title",
    bodyKey: "adv.fr-permis-1-euro.body",
    actionLabelKey: "adv.fr-permis-1-euro.action",
    action: { link: "https://www.securite-routiere.gouv.fr/passer-son-permis-de-conduire/financement-du-permis-de-conduire/permis-1-eu-par-jour/conditions-deligibilite" },
    appliesWhen: or(ageIn("under_18", "18-25"), kids("16-18", "19+")),
    priority: 76,
    figures: [{ label: "adv.fr-permis-1-euro.fig.0.label", value: "adv.fr-permis-1-euro.fig.0.value" }],
    sources: ["https://www.securite-routiere.gouv.fr/passer-son-permis-de-conduire/financement-du-permis-de-conduire/permis-1-eu-par-jour/conditions-deligibilite"],
    lastVerified: "2026-08-06",
  },
  {
    id: "drom-abattement-ir",
    category: "tax",
    countries: ["FR"],
    titleKey: "adv.drom-abattement-ir.title",
    // Corps DYNAMIQUE : le taux dépend du département — clés posées EN LIGNE.
    body: (p, { t }) => {
      const forte = p.region === "Guyane" || p.region === "Mayotte";
      return forte
        ? t("adv.drom-abattement-ir.body.forte")
        : t("adv.drom-abattement-ir.body.standard");
    },
    actionLabelKey: "adv.drom-abattement-ir.action",
    action: { link: "https://www.impots.gouv.fr" },
    appliesWhen: regionIs("Guadeloupe", "Martinique", "Guyane", "La Réunion", "Mayotte"),
    priority: 84,
    sources: ["BOFiP BOI-IR-LIQ-20-30-10"],
    lastVerified: "2026-08-06",
  },
  {
    id: "drom-ladom",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.drom-ladom.title",
    bodyKey: "adv.drom-ladom.body",
    actionLabelKey: "adv.drom-ladom.action",
    action: { link: "https://ladom.fr" },
    appliesWhen: regionIs("Guadeloupe", "Martinique", "Guyane", "La Réunion", "Mayotte"),
    priority: 82,
    sources: ["https://ladom.fr/vie-etudiante/pme/"],
    lastVerified: "2026-08-06",
  },
  {
    id: "drom-bqp",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.drom-bqp.title",
    bodyKey: "adv.drom-bqp.body",
    actionLabelKey: "adv.drom-bqp.action",
    action: {},
    appliesWhen: regionIs("Guadeloupe", "Martinique", "Guyane", "La Réunion", "Mayotte"),
    priority: 80,
    sources: ["https://www.reunion.gouv.fr/Actions-de-l-Etat/Economie-commerce-exterieur-et-fiscalite-locale/Bouclier-qualite-prix-BQP"],
    lastVerified: "2026-08-06",
  },

  // ==========================================================================
  // MICRO-ENTREPRENEUR — recherche vérifiée 2026-08-06 (service-public
  // F36232/F23267/F21746/A18795/F23369). ACRE réduite à 25 % au 01/07/2026.
  // ==========================================================================
  {
    id: "ae-provision",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.ae-provision.title",
    bodyKey: "adv.ae-provision.body",
    actionLabelKey: "adv.ae-provision.action",
    action: {},
    appliesWhen: occupationIs("self_employed"),
    priority: 92,
    figures: [
      { label: "adv.ae-provision.fig.0.label", value: "12,3 %" },
      { label: "adv.ae-provision.fig.1.label", value: "21,2 %" },
      { label: "adv.ae-provision.fig.2.label", value: "25,6 %" },
    ],
    sources: ["https://entreprendre.service-public.gouv.fr/vosdroits/F36232"],
    lastVerified: "2026-08-06",
  },
  {
    id: "ae-plafonds-tva",
    category: "tax",
    countries: ["FR"],
    titleKey: "adv.ae-plafonds-tva.title",
    bodyKey: "adv.ae-plafonds-tva.body",
    actionLabelKey: "adv.ae-plafonds-tva.action",
    action: { link: "https://entreprendre.service-public.gouv.fr/vosdroits/F21746" },
    appliesWhen: occupationIs("self_employed"),
    priority: 86,
    figures: [
      { label: "adv.ae-plafonds-tva.fig.0.label", value: "37 500 €" },
      { label: "adv.ae-plafonds-tva.fig.1.label", value: "85 000 €" },
    ],
    sources: ["https://entreprendre.service-public.gouv.fr/vosdroits/F23267", "https://entreprendre.service-public.gouv.fr/vosdroits/F21746"],
    lastVerified: "2026-08-06",
  },
  {
    id: "ae-acre-2026",
    category: "tax",
    countries: ["FR"],
    titleKey: "adv.ae-acre-2026.title",
    bodyKey: "adv.ae-acre-2026.body",
    actionLabelKey: "adv.ae-acre-2026.action",
    // Écran interne : la vérification d'éligibilité se fait dans l'app, sur la
    // liste officielle des situations (fiche F11677), puis renvoie vers le
    // formulaire. Un simple lien laissait la personne seule devant la fiche.
    action: { route: "/acre" },
    appliesWhen: occupationIs("self_employed"),
    priority: 80,
    figures: [{ label: "adv.ae-acre-2026.fig.0.label", value: "adv.ae-acre-2026.fig.0.value" }],
    sources: [
      "https://entreprendre.service-public.gouv.fr/vosdroits/F11677",
      "https://entreprendre.service-public.gouv.fr/actualites/A18795",
    ],
    lastVerified: "2026-09-10",
  },
  {
    id: "ae-chomage-retraite",
    category: "insurance",
    countries: ["FR"],
    titleKey: "adv.ae-chomage-retraite.title",
    bodyKey: "adv.ae-chomage-retraite.body",
    actionLabelKey: "adv.ae-chomage-retraite.action",
    action: {
      link: "https://entreprendre.service-public.gouv.fr/vosdroits/F23369",
    },
    appliesWhen: occupationIs("self_employed"),
    priority: 84,
    figures: [{ label: "adv.ae-chomage-retraite.fig.0.label", value: "adv.ae-chomage-retraite.fig.0.value" }],
    sources: ["https://entreprendre.service-public.gouv.fr/vosdroits/F23369", "https://www.francetravail.fr"],
    lastVerified: "2026-08-06",
  },


  // ==========================================================================
  // VÉHICULE — vérifié 2026-09-10 (service-public F2628 et F1989, ADEME Car
  // Labelling, prix-carburants.gouv.fr, primealaconversion.gouv.fr).
  //
  // Un véhicule est un vrai poste de budget — assurance, carburant, entretien,
  // achat — et un sujet où l'on décide mal par manque de repères. Aucun chiffre
  // ci-dessous n'est de nous : ceux qui existent viennent d'une fiche
  // officielle datée ; là où le site officiel ne donne pas de montant sur sa
  // page d'accueil (aides à l'achat), on n'en donne pas non plus.
  // ==========================================================================
  {
    id: "veh-assurance-obligatoire",
    category: "vehicle",
    countries: ["FR"],
    titleKey: "adv.veh-assurance-obligatoire.title",
    bodyKey: "adv.veh-assurance-obligatoire.body",
    actionLabelKey: "adv.veh-assurance-obligatoire.action",
    action: { link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2628" },
    appliesWhen: hasVehicle,
    priority: 88,
    figures: [
      { label: "adv.veh-assurance-obligatoire.fig.0.label", value: "3 750 €" },
      { label: "adv.veh-assurance-obligatoire.fig.1.label", value: "500 €" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F2628"],
    lastVerified: "2026-04-10",
  },
  {
    id: "veh-comparer-ademe",
    category: "vehicle",
    countries: ["FR"],
    titleKey: "adv.veh-comparer-ademe.title",
    bodyKey: "adv.veh-comparer-ademe.body",
    actionLabelKey: "adv.veh-comparer-ademe.action",
    action: { link: "https://carlabelling.ademe.fr/" },
    // Qui a un véhicule finira par le remplacer ; qui n'en a pas envisage
    // peut-être d'en prendre un. Les deux ont besoin du comparateur.
    appliesWhen: answeredVehicle,
    priority: 82,
    figures: [{ label: "adv.veh-comparer-ademe.fig.0.label", value: "3 451" }],
    sources: ["https://carlabelling.ademe.fr/"],
    lastVerified: "2026-09-10",
  },
  {
    id: "veh-prix-carburants",
    category: "vehicle",
    countries: ["FR"],
    titleKey: "adv.veh-prix-carburants.title",
    bodyKey: "adv.veh-prix-carburants.body",
    actionLabelKey: "adv.veh-prix-carburants.action",
    action: { link: "https://www.prix-carburants.gouv.fr/" },
    appliesWhen: vehicleIs("petrol", "diesel", "hybrid"),
    priority: 78,
    sources: ["https://www.prix-carburants.gouv.fr/"],
    lastVerified: "2026-09-10",
  },
  {
    id: "veh-frais-reels-km",
    category: "vehicle",
    countries: ["FR"],
    titleKey: "adv.veh-frais-reels-km.title",
    bodyKey: "adv.veh-frais-reels-km.body",
    actionLabelKey: "adv.veh-frais-reels-km.action",
    action: { link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F1989" },
    appliesWhen: and(hasVehicle, occupationIs("employee", "civil_servant")),
    priority: 76,
    figures: [
      { label: "adv.veh-frais-reels-km.fig.0.label", value: "509 €" },
      { label: "adv.veh-frais-reels-km.fig.1.label", value: "14 555 €" },
      { label: "adv.veh-frais-reels-km.fig.2.label", value: "+20 %" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F1989"],
    lastVerified: "2026-04-15",
  },
  {
    id: "veh-aides-achat",
    category: "vehicle",
    countries: ["FR"],
    titleKey: "adv.veh-aides-achat.title",
    bodyKey: "adv.veh-aides-achat.body",
    actionLabelKey: "adv.veh-aides-achat.action",
    action: { link: "https://www.primealaconversion.gouv.fr/" },
    appliesWhen: answeredVehicle,
    priority: 74,
    // Aucun montant : la page officielle renvoie aux barèmes PDF et n'en
    // affiche pas. On ne recopie pas un chiffre qu'on n'a pas lu.
    sources: ["https://www.primealaconversion.gouv.fr/"],
    lastVerified: "2026-09-10",
  },

  // ==========================================================================
  // DÉCLARATION DE REVENUS — guide instructif. Vérifié 2026-09-10 sur
  // service-public F358 (05/06/2026), F1989 (15/04/2026), F23267 (13/05/2026).
  // ==========================================================================
  {
    id: "impots-declaration-guide",
    category: "tax",
    countries: ["FR"],
    titleKey: "adv.impots-declaration-guide.title",
    bodyKey: "adv.impots-declaration-guide.body",
    actionLabelKey: "adv.impots-declaration-guide.action",
    // Écran interne : un pas-à-pas coché, chaque étape portant sa source.
    action: { route: "/impots" },
    appliesWhen: always,
    priority: 83,
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F358"],
    lastVerified: "2026-06-05",
  },
  {
    id: "impots-frais-reels",
    category: "tax",
    countries: ["FR"],
    titleKey: "adv.impots-frais-reels.title",
    bodyKey: "adv.impots-frais-reels.body",
    actionLabelKey: "adv.impots-frais-reels.action",
    action: { link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F1989" },
    appliesWhen: occupationIs("employee", "civil_servant"),
    priority: 72,
    figures: [
      { label: "adv.impots-frais-reels.fig.0.label", value: "10 %" },
      { label: "adv.impots-frais-reels.fig.1.label", value: "509 €" },
      { label: "adv.impots-frais-reels.fig.2.label", value: "14 555 €" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F1989"],
    lastVerified: "2026-04-15",
  },
  {
    id: "impots-micro-2042cpro",
    category: "tax",
    countries: ["FR"],
    titleKey: "adv.impots-micro-2042cpro.title",
    bodyKey: "adv.impots-micro-2042cpro.body",
    actionLabelKey: "adv.impots-micro-2042cpro.action",
    action: { link: "https://entreprendre.service-public.gouv.fr/vosdroits/F23267" },
    appliesWhen: occupationIs("self_employed"),
    priority: 85,
    figures: [
      { label: "adv.impots-micro-2042cpro.fig.0.label", value: "71 %" },
      { label: "adv.impots-micro-2042cpro.fig.1.label", value: "50 %" },
      { label: "adv.impots-micro-2042cpro.fig.2.label", value: "34 %" },
      { label: "adv.impots-micro-2042cpro.fig.3.label", value: "305 €" },
    ],
    sources: ["https://entreprendre.service-public.gouv.fr/vosdroits/F23267"],
    lastVerified: "2026-05-13",
  },
  // ==========================================================================
  // INTERNATIONAL — portails de déclaration et véhicule. Vérifié 2026-09-10.
  //
  // Chaque carte renvoie vers LE site officiel du pays, lu ce jour-là ; les
  // rares chiffres cités (dates HMRC, IRS, ouverture Renta) ont été lus sur la
  // page indiquée. Pas de carte pour le Sénégal, l'Algérie ni la Suisse-véhicule :
  // aucune page officielle n'était joignable, et on ne cite pas ce qu'on n'a
  // pas lu.
  // ==========================================================================
  {
    id: "tax-portal-be",
    category: "tax",
    countries: ["BE"],
    titleKey: "adv.tax-portal-be.title",
    bodyKey: "adv.tax-portal-be.body",
    actionLabelKey: "adv.tax-portal-be.action",
    action: { link: "https://fin.belgium.be/fr/particuliers/declaration_impot" },
    appliesWhen: always,
    priority: 80,
    sources: ["https://fin.belgium.be/fr/particuliers/declaration_impot"],
    lastVerified: "2026-09-10",
  },
  {
    id: "tax-portal-lu",
    category: "tax",
    countries: ["LU"],
    titleKey: "adv.tax-portal-lu.title",
    bodyKey: "adv.tax-portal-lu.body",
    actionLabelKey: "adv.tax-portal-lu.action",
    action: { link: "https://guichet.public.lu/fr/citoyens/fiscalite/declaration-impot-decompte.html" },
    appliesWhen: always,
    priority: 80,
    sources: ["https://guichet.public.lu/fr/citoyens/fiscalite/declaration-impot-decompte.html"],
    lastVerified: "2026-09-09",
  },
  {
    id: "tax-portal-ca",
    category: "tax",
    countries: ["CA"],
    titleKey: "adv.tax-portal-ca.title",
    bodyKey: "adv.tax-portal-ca.body",
    actionLabelKey: "adv.tax-portal-ca.action",
    action: { link: "https://www.canada.ca/fr/agence-revenu.html" },
    appliesWhen: always,
    priority: 80,
    sources: ["https://www.canada.ca/fr/agence-revenu.html"],
    lastVerified: "2026-02-10",
  },
  {
    id: "tax-portal-de",
    category: "tax",
    countries: ["DE"],
    titleKey: "adv.tax-portal-de.title",
    bodyKey: "adv.tax-portal-de.body",
    actionLabelKey: "adv.tax-portal-de.action",
    action: { link: "https://www.elster.de/eportal/start" },
    appliesWhen: always,
    priority: 80,
    sources: ["https://www.elster.de/eportal/start"],
    lastVerified: "2026-09-10",
  },
  {
    id: "tax-portal-gb",
    category: "tax",
    countries: ["GB"],
    titleKey: "adv.tax-portal-gb.title",
    bodyKey: "adv.tax-portal-gb.body",
    actionLabelKey: "adv.tax-portal-gb.action",
    action: { link: "https://www.gov.uk/self-assessment-tax-returns" },
    appliesWhen: always,
    priority: 80,
    figures: [
      { label: "adv.tax-portal-gb.fig.0.label", value: "5 Oct." },
      { label: "adv.tax-portal-gb.fig.1.label", value: "31 Jan." },
    ],
    sources: ["https://www.gov.uk/self-assessment-tax-returns"],
    lastVerified: "2026-09-10",
  },
  {
    id: "tax-portal-us",
    category: "tax",
    countries: ["US"],
    titleKey: "adv.tax-portal-us.title",
    bodyKey: "adv.tax-portal-us.body",
    actionLabelKey: "adv.tax-portal-us.action",
    action: { link: "https://www.irs.gov/filing" },
    appliesWhen: always,
    priority: 80,
    figures: [
      { label: "adv.tax-portal-us.fig.0.label", value: "April 15" },
      { label: "adv.tax-portal-us.fig.1.label", value: "Oct. 15" },
    ],
    sources: ["https://www.irs.gov/filing"],
    lastVerified: "2026-06-28",
  },
  {
    id: "tax-portal-es",
    category: "tax",
    countries: ["ES"],
    titleKey: "adv.tax-portal-es.title",
    bodyKey: "adv.tax-portal-es.body",
    actionLabelKey: "adv.tax-portal-es.action",
    action: { link: "https://sede.agenciatributaria.gob.es/Sede/Renta.html" },
    appliesWhen: always,
    priority: 80,
    figures: [
      { label: "adv.tax-portal-es.fig.0.label", value: "8 avr. 2026" },
    ],
    sources: ["https://sede.agenciatributaria.gob.es/Sede/Renta.html"],
    lastVerified: "2026-07-02",
  },
  {
    id: "tax-portal-it",
    category: "tax",
    countries: ["IT"],
    titleKey: "adv.tax-portal-it.title",
    bodyKey: "adv.tax-portal-it.body",
    actionLabelKey: "adv.tax-portal-it.action",
    action: { link: "https://www.agenziaentrate.gov.it/portale/web/guest/schede/dichiarazioni/dichiarazione-precompilata" },
    appliesWhen: always,
    priority: 80,
    sources: ["https://www.agenziaentrate.gov.it/portale/web/guest/schede/dichiarazioni/dichiarazione-precompilata"],
    lastVerified: "2026-09-10",
  },
  {
    id: "tax-portal-pt",
    category: "tax",
    countries: ["PT"],
    titleKey: "adv.tax-portal-pt.title",
    bodyKey: "adv.tax-portal-pt.body",
    actionLabelKey: "adv.tax-portal-pt.action",
    action: { link: "https://www.portaldasfinancas.gov.pt/" },
    appliesWhen: always,
    priority: 80,
    sources: ["https://www.portaldasfinancas.gov.pt/"],
    lastVerified: "2026-09-10",
  },
  {
    id: "tax-portal-ch",
    category: "tax",
    countries: ["CH"],
    titleKey: "adv.tax-portal-ch.title",
    bodyKey: "adv.tax-portal-ch.body",
    actionLabelKey: "adv.tax-portal-ch.action",
    action: { link: "https://www.estv.admin.ch/" },
    appliesWhen: always,
    priority: 80,
    sources: ["https://www.estv.admin.ch/"],
    lastVerified: "2026-09-10",
  },
  {
    id: "tax-portal-ma",
    category: "tax",
    countries: ["MA"],
    titleKey: "adv.tax-portal-ma.title",
    bodyKey: "adv.tax-portal-ma.body",
    actionLabelKey: "adv.tax-portal-ma.action",
    action: { link: "https://www.tax.gov.ma/" },
    appliesWhen: always,
    priority: 80,
    sources: ["https://www.tax.gov.ma/"],
    lastVerified: "2026-09-10",
  },
  {
    id: "tax-portal-tn",
    category: "tax",
    countries: ["TN"],
    titleKey: "adv.tax-portal-tn.title",
    bodyKey: "adv.tax-portal-tn.body",
    actionLabelKey: "adv.tax-portal-tn.action",
    action: { link: "https://www.finances.gov.tn/" },
    appliesWhen: always,
    priority: 80,
    sources: ["https://www.finances.gov.tn/"],
    lastVerified: "2026-02-26",
  },
  {
    id: "tax-portal-ci",
    category: "tax",
    countries: ["CI"],
    titleKey: "adv.tax-portal-ci.title",
    bodyKey: "adv.tax-portal-ci.body",
    actionLabelKey: "adv.tax-portal-ci.action",
    action: { link: "https://www.dgi.gouv.ci/" },
    appliesWhen: always,
    priority: 80,
    sources: ["https://www.dgi.gouv.ci/"],
    lastVerified: "2026-09-10",
  },
  {
    id: "tax-portal-cm",
    category: "tax",
    countries: ["CM"],
    titleKey: "adv.tax-portal-cm.title",
    bodyKey: "adv.tax-portal-cm.body",
    actionLabelKey: "adv.tax-portal-cm.action",
    action: { link: "https://www.impots.cm/" },
    appliesWhen: always,
    priority: 80,
    sources: ["https://www.impots.cm/"],
    lastVerified: "2026-09-10",
  },
  {
    id: "veh-be-assurance",
    category: "vehicle",
    countries: ["BE"],
    titleKey: "adv.veh-be-assurance.title",
    bodyKey: "adv.veh-be-assurance.body",
    actionLabelKey: "adv.veh-be-assurance.action",
    action: { link: "https://economie.fgov.be/fr/themes/services-financiers/assurances/assurance-auto" },
    appliesWhen: hasVehicle,
    priority: 86,
    sources: ["https://economie.fgov.be/fr/themes/services-financiers/assurances/assurance-auto"],
    lastVerified: "2025-07-23",
  },
  {
    id: "veh-be-tarif-carburant",
    category: "vehicle",
    countries: ["BE"],
    titleKey: "adv.veh-be-tarif-carburant.title",
    bodyKey: "adv.veh-be-tarif-carburant.body",
    actionLabelKey: "adv.veh-be-tarif-carburant.action",
    action: { link: "https://economie.fgov.be/fr/themes/energie/prix-de-lenergie/prix-maximum-des-produits/tarif-officiel-des-produits" },
    appliesWhen: vehicleIs("petrol", "diesel", "hybrid"),
    priority: 78,
    sources: ["https://economie.fgov.be/fr/themes/energie/prix-de-lenergie/prix-maximum-des-produits/tarif-officiel-des-produits"],
    lastVerified: "2026-09-10",
  },
  {
    id: "veh-gb-insurance",
    category: "vehicle",
    countries: ["GB"],
    titleKey: "adv.veh-gb-insurance.title",
    bodyKey: "adv.veh-gb-insurance.body",
    actionLabelKey: "adv.veh-gb-insurance.action",
    action: { link: "https://www.gov.uk/vehicle-insurance" },
    appliesWhen: hasVehicle,
    priority: 86,
    sources: ["https://www.gov.uk/vehicle-insurance"],
    lastVerified: "2026-09-10",
  },
  {
    id: "veh-us-fueleconomy",
    category: "vehicle",
    countries: ["US"],
    titleKey: "adv.veh-us-fueleconomy.title",
    bodyKey: "adv.veh-us-fueleconomy.body",
    actionLabelKey: "adv.veh-us-fueleconomy.action",
    action: { link: "https://www.fueleconomy.gov/" },
    appliesWhen: answeredVehicle,
    priority: 82,
    sources: ["https://www.fueleconomy.gov/"],
    lastVerified: "2026-01-21",
  },
  {
    id: "veh-ca-cotes",
    category: "vehicle",
    countries: ["CA"],
    titleKey: "adv.veh-ca-cotes.title",
    bodyKey: "adv.veh-ca-cotes.body",
    actionLabelKey: "adv.veh-ca-cotes.action",
    action: { link: "https://fcr-ccc.nrcan-rncan.gc.ca/fr" },
    appliesWhen: answeredVehicle,
    priority: 82,
    sources: ["https://fcr-ccc.nrcan-rncan.gc.ca/fr"],
    lastVerified: "2026-03-19",
  },
  {
    id: "veh-es-geoportal",
    category: "vehicle",
    countries: ["ES"],
    titleKey: "adv.veh-es-geoportal.title",
    bodyKey: "adv.veh-es-geoportal.body",
    actionLabelKey: "adv.veh-es-geoportal.action",
    action: { link: "https://geoportalgasolineras.es/" },
    appliesWhen: vehicleIs("petrol", "diesel", "hybrid"),
    priority: 78,
    sources: ["https://geoportalgasolineras.es/"],
    lastVerified: "2026-09-10",
  },
  {
    id: "veh-it-osservaprezzi",
    category: "vehicle",
    countries: ["IT"],
    titleKey: "adv.veh-it-osservaprezzi.title",
    bodyKey: "adv.veh-it-osservaprezzi.body",
    actionLabelKey: "adv.veh-it-osservaprezzi.action",
    action: { link: "https://carburanti.mise.gov.it/ospzSearch/home" },
    appliesWhen: vehicleIs("petrol", "diesel", "hybrid"),
    priority: 78,
    sources: ["https://carburanti.mise.gov.it/ospzSearch/home"],
    lastVerified: "2026-09-10",
  },
  {
    id: "veh-pt-dgeg",
    category: "vehicle",
    countries: ["PT"],
    titleKey: "adv.veh-pt-dgeg.title",
    bodyKey: "adv.veh-pt-dgeg.body",
    actionLabelKey: "adv.veh-pt-dgeg.action",
    action: { link: "https://precoscombustiveis.dgeg.gov.pt/" },
    appliesWhen: vehicleIs("petrol", "diesel", "hybrid"),
    priority: 78,
    sources: ["https://precoscombustiveis.dgeg.gov.pt/"],
    lastVerified: "2026-09-10",
  },
  {
    id: "veh-de-mtsk",
    category: "vehicle",
    countries: ["DE"],
    titleKey: "adv.veh-de-mtsk.title",
    bodyKey: "adv.veh-de-mtsk.body",
    actionLabelKey: "adv.veh-de-mtsk.action",
    action: { link: "https://www.bundeskartellamt.de/DE/Aufgaben/MarkttransparenzstelleFuerKraftstoffe/markttransparenzstellefuerkraftstoffe_node.html" },
    appliesWhen: vehicleIs("petrol", "diesel", "hybrid"),
    priority: 78,
    sources: ["https://www.bundeskartellamt.de/DE/Aufgaben/MarkttransparenzstelleFuerKraftstoffe/markttransparenzstellefuerkraftstoffe_node.html"],
    lastVerified: "2026-09-10",
  },
  // ==========================================================================
  // VAGUE IDF + CULTURE + IMPÔTS + ENFANTS + ANIMAUX — vérifiée 2026-08-06
  // (IDFM, iledefrance.fr, culture.gouv.fr, impots.gouv.fr, service-public,
  // solidarites.gouv.fr, agriculture.gouv.fr).
  // ==========================================================================
  {
    id: "fr-idf-solidarite-transport",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-idf-solidarite-transport.title",
    bodyKey: "adv.fr-idf-solidarite-transport.body",
    actionLabelKey: "adv.fr-idf-solidarite-transport.action",
    action: {
      link: "https://www.iledefrance-mobilites.fr/aide-et-contacts/reductions-et-gratuite/quest-ce-que-la-tarification-solidarite-transport",
    },
    appliesWhen: regionIs("Île-de-France"),
    priority: 86,
    figures: [{ label: "adv.fr-idf-solidarite-transport.fig.0.label", value: "adv.fr-idf-solidarite-transport.fig.0.value" }],
    sources: ["https://www.iledefrance-mobilites.fr/aide-et-contacts/reductions-et-gratuite/quest-ce-que-la-tarification-solidarite-transport"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-idf-labaz-permis",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-idf-labaz-permis.title",
    bodyKey: "adv.fr-idf-labaz-permis.body",
    actionLabelKey: "adv.fr-idf-labaz-permis.action",
    action: {
      link: "https://www.iledefrance.fr/tous-les-services/labaz-lappli-pour-les-15-25-ans",
    },
    appliesWhen: and(regionIs("Île-de-France"), ageIn("18-25")),
    priority: 82,
    figures: [{ label: "adv.fr-idf-labaz-permis.fig.0.label", value: "1 000 €" }],
    sources: ["https://www.iledefrance.fr/tous-les-services/labaz-lappli-pour-les-15-25-ans"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-musees-gratuits-26",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-musees-gratuits-26.title",
    bodyKey: "adv.fr-musees-gratuits-26.body",
    actionLabelKey: "adv.fr-musees-gratuits-26.action",
    action: {
      link: "https://www.culture.gouv.fr/thematiques/musees/Les-musees-en-France/les-politiques-des-musees-de-france/politique-des-publics/la-gratuite-des-collections-permanentes-pour-les-moins-de-26-ans-dans-les-musees-nationaux",
    },
    appliesWhen: or(ageIn("under_18", "18-25"), hasAnyKids),
    priority: 72,
    sources: ["https://www.culture.gouv.fr/thematiques/musees/Les-musees-en-France/les-politiques-des-musees-de-france/politique-des-publics/la-gratuite-des-collections-permanentes-pour-les-moins-de-26-ans-dans-les-musees-nationaux"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-opera-jeunes",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-opera-jeunes.title",
    bodyKey: "adv.fr-opera-jeunes.body",
    actionLabelKey: "adv.fr-opera-jeunes.action",
    action: {
      link: "https://www.operadeparis.fr/billetterie/billets-services/offres-spectateurs/avant-premieres-jeunes",
    },
    appliesWhen: ageIn("18-25", "26-35"),
    priority: 64,
    sources: ["https://www.operadeparis.fr/billetterie/billets-services/offres-spectateurs/avant-premieres-jeunes", "https://www.comedie-francaise.fr/moins-de-28-ans"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-billet-conge-annuel",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-billet-conge-annuel.title",
    bodyKey: "adv.fr-billet-conge-annuel.body",
    actionLabelKey: "adv.fr-billet-conge-annuel.action",
    action: {},
    appliesWhen: always,
    months: [4, 5, 6, 7],
    priority: 70,
    figures: [{ label: "adv.fr-billet-conge-annuel.fig.0.label", value: "adv.fr-billet-conge-annuel.fig.0.value" }],
    sources: ["https://www.aide-sociale.fr/billet-annuel-sncf/"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-credit-impot-garde",
    category: "kids",
    countries: ["FR"],
    titleKey: "adv.fr-credit-impot-garde.title",
    bodyKey: "adv.fr-credit-impot-garde.body",
    actionLabelKey: "adv.fr-credit-impot-garde.action",
    action: {
      link: "https://www.impots.gouv.fr/particulier/questions/je-fais-garder-mon-jeune-enfant-lexterieur-du-domicile-que-puis-je-deduire",
    },
    appliesWhen: kids("0-6"),
    priority: 88,
    figures: [
      { label: "adv.fr-credit-impot-garde.fig.0.label", value: "50 %" },
      { label: "adv.fr-credit-impot-garde.fig.1.label", value: "1 750 €" },
    ],
    sources: ["https://www.impots.gouv.fr/particulier/questions/je-fais-garder-mon-jeune-enfant-lexterieur-du-domicile-que-puis-je-deduire"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-cmg-reforme",
    category: "kids",
    countries: ["FR"],
    titleKey: "adv.fr-cmg-reforme.title",
    bodyKey: "adv.fr-cmg-reforme.body",
    actionLabelKey: "adv.fr-cmg-reforme.action",
    action: {
      link: "https://www.caf.fr/allocataires/actualites/actualites-nationales/reforme-du-cmg-la-foire-aux-questions",
    },
    appliesWhen: kids("0-6", "7-11"),
    priority: 84,
    sources: ["https://solidarites.gouv.fr/complement-de-libre-choix-du-mode-de-garde", "https://www.caf.fr/allocataires/actualites/actualites-nationales/reforme-du-cmg-la-foire-aux-questions"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-pension-alimentaire-majeur",
    category: "tax",
    countries: ["FR"],
    titleKey: "adv.fr-pension-alimentaire-majeur.title",
    bodyKey: "adv.fr-pension-alimentaire-majeur.body",
    actionLabelKey: "adv.fr-pension-alimentaire-majeur.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/actualites/A15453",
    },
    appliesWhen: kids("19+"),
    priority: 84,
    figures: [
      { label: "adv.fr-pension-alimentaire-majeur.fig.0.label", value: "6 855 €" },
      { label: "adv.fr-pension-alimentaire-majeur.fig.1.label", value: "4 075 €" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/actualites/A15453"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-dons-coluche-double",
    category: "tax",
    countries: ["FR"],
    titleKey: "adv.fr-dons-coluche-double.title",
    bodyKey: "adv.fr-dons-coluche-double.body",
    actionLabelKey: "adv.fr-dons-coluche-double.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F426",
    },
    appliesWhen: always,
    priority: 78,
    figures: [
      { label: "adv.fr-dons-coluche-double.fig.0.label", value: "75 %" },
      { label: "adv.fr-dons-coluche-double.fig.1.label", value: "2 000 €" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F426"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-parent-isole-case-t",
    category: "tax",
    countries: ["FR"],
    titleKey: "adv.fr-parent-isole-case-t.title",
    bodyKey: "adv.fr-parent-isole-case-t.body",
    actionLabelKey: "adv.fr-parent-isole-case-t.action",
    action: {
      link: "https://www.impots.gouv.fr",
    },
    appliesWhen: familyIn("single_parent"),
    priority: 90,
    sources: ["https://www.impots.gouv.fr (brochure IR — parent isolé, case T)"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-cantine-bourses",
    category: "kids",
    countries: ["FR"],
    titleKey: "adv.fr-cantine-bourses.title",
    bodyKey: "adv.fr-cantine-bourses.body",
    actionLabelKey: "adv.fr-cantine-bourses.action",
    action: {
      link: "https://www.education.gouv.fr/les-aides-financieres-au-college-4970",
    },
    appliesWhen: kids("7-11", "12-15", "16-18"),
    priority: 82,
    sources: ["https://www.education.gouv.fr/les-aides-financieres-au-college-4970", "https://www.economie.gouv.fr/particuliers/gerer-mon-argent/beneficier-daides-et-de-reductions-dimpots/restauration-scolaire-et-etudiante-quelles-aides-pouvez-vous-obtenir"],
    lastVerified: "2026-08-06",
  },
  {
    id: "pets-identification-obligatoire",
    category: "pets",
    countries: ["FR"],
    titleKey: "adv.pets-identification-obligatoire.title",
    bodyKey: "adv.pets-identification-obligatoire.body",
    actionLabelKey: "adv.pets-identification-obligatoire.action",
    action: {
      link: "https://www.i-cad.fr",
    },
    appliesWhen: hasAnyPet,
    priority: 76,
    figures: [{ label: "adv.pets-identification-obligatoire.fig.0.label", value: "750 €" }],
    sources: ["https://www.i-cad.fr", "https://agriculture.gouv.fr/animaux-de-compagnie-equides-tout-savoir-sur-le-certificat-dengagement-et-de-connaissance"],
    lastVerified: "2026-08-06",
  },

  // ==========================================================================
  // ABONNEMENTS — l'hémorragie silencieuse de tous les budgets.
  // ==========================================================================
  {
    id: "abo-audit-annuel",
    category: "emergency",
    countries: "all",
    titleKey: "adv.abo-audit-annuel.title",
    bodyKey: "adv.abo-audit-annuel.body",
    actionLabelKey: "adv.abo-audit-annuel.action",
    action: {},
    appliesWhen: always,
    priority: 86,
    sources: ["Principe universel de finances personnelles"],
    lastVerified: "2026-08-06",
  },
  {
    id: "abo-resiliation-3-clics",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.abo-resiliation-3-clics.title",
    bodyKey: "adv.abo-resiliation-3-clics.body",
    actionLabelKey: "adv.abo-resiliation-3-clics.action",
    action: {
      link: "https://www.economie.gouv.fr/particuliers/resiliation-contrats-trois-clics",
    },
    appliesWhen: always,
    priority: 80,
    sources: ["https://www.economie.gouv.fr/particuliers/resiliation-contrats-trois-clics"],
    lastVerified: "2026-08-06",
  },

  // ==========================================================================
  // IMMOBILIER JEUNES / PRIMO-ACCÉDANTS — dispositifs vérifiés, montants
  // volatils exclus (plafonds PTZ/PEL changent).
  // ==========================================================================
  {
    id: "immo-ptz-primo",
    category: "real_estate",
    countries: ["FR"],
    titleKey: "adv.immo-ptz-primo.title",
    bodyKey: "adv.immo-ptz-primo.body",
    actionLabelKey: "adv.immo-ptz-primo.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10871",
    },
    appliesWhen: and(housingIn("renter", "free_housing"), ageIn("18-25", "26-35", "36-50")),
    priority: 84,
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F10871"],
    lastVerified: "2026-08-06",
  },
  {
    id: "immo-pel-jeune",
    category: "real_estate",
    countries: ["FR"],
    titleKey: "adv.immo-pel-jeune.title",
    bodyKey: "adv.immo-pel-jeune.body",
    actionLabelKey: "adv.immo-pel-jeune.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F16140",
    },
    appliesWhen: and(housingIn("renter", "free_housing"), ageIn("18-25", "26-35")),
    priority: 74,
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F16140"],
    lastVerified: "2026-08-06",
  },
  {
    id: "immo-bail-mobilite",
    category: "housing",
    countries: ["FR"],
    titleKey: "adv.immo-bail-mobilite.title",
    bodyKey: "adv.immo-bail-mobilite.body",
    actionLabelKey: "adv.immo-bail-mobilite.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F34759",
    },
    appliesWhen: and(housingIn("renter"), or(ageIn("18-25"), occupationIs("student"))),
    priority: 80,
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F34759"],
    lastVerified: "2026-08-06",
  },
  {
    id: "immo-action-logement-jeunes",
    category: "housing",
    countries: ["FR"],
    titleKey: "adv.immo-action-logement-jeunes.title",
    bodyKey: "adv.immo-action-logement-jeunes.body",
    actionLabelKey: "adv.immo-action-logement-jeunes.action",
    action: {
      link: "https://www.actionlogement.fr",
    },
    appliesWhen: and(housingIn("renter"), ageIn("18-25", "26-35")),
    priority: 82,
    sources: ["https://www.actionlogement.fr"],
    lastVerified: "2026-08-06",
  },

  // ==========================================================================
  // TRANSVERSE FRANCE — banque, énergie, santé, télécom (recherche vérifiée
  // 2026-08-06, sources : service-public, Banque de France, ARCEP, ameli,
  // médiateur de l'énergie). Montants volatils signalés en corpus.
  // ==========================================================================
  {
    id: "fr-mobilite-bancaire",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-mobilite-bancaire.title",
    bodyKey: "adv.fr-mobilite-bancaire.body",
    actionLabelKey: "adv.fr-mobilite-bancaire.action",
    action: {
      link: "https://www.tarifs-bancaires.gouv.fr",
    },
    appliesWhen: always,
    priority: 78,
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F33881", "https://www.tarifs-bancaires.gouv.fr"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-frais-incidents",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-frais-incidents.title",
    bodyKey: "adv.fr-frais-incidents.body",
    actionLabelKey: "adv.fr-frais-incidents.action",
    action: {
      link: "https://www.banque-france.fr/fr/a-votre-service/particuliers/connaitre-pratiques-bancaires-assurance/compte-frais/le-plafonnement-des-frais-bancaires-et-loffre-clientele-fragile",
    },
    appliesWhen: savingsCapacityLow,
    priority: 92,
    figures: [
      { label: "adv.fr-frais-incidents.fig.0.label", value: "adv.fr-frais-incidents.fig.0.value" },
      { label: "adv.fr-frais-incidents.fig.1.label", value: "adv.fr-frais-incidents.fig.1.value" },
    ],
    sources: ["https://www.banque-france.fr/fr/a-votre-service/particuliers/connaitre-pratiques-bancaires-assurance/compte-frais/le-plafonnement-des-frais-bancaires-et-loffre-clientele-fragile"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-frais-succession",
    category: "inheritance",
    countries: ["FR"],
    titleKey: "adv.fr-frais-succession.title",
    bodyKey: "adv.fr-frais-succession.body",
    actionLabelKey: "adv.fr-frais-succession.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/actualites/A18973",
    },
    appliesWhen: always,
    priority: 60,
    figures: [{ label: "adv.fr-frais-succession.fig.0.label", value: "adv.fr-frais-succession.fig.0.value" }],
    sources: ["https://www.service-public.gouv.fr/particuliers/actualites/A18973"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-cheque-energie",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-cheque-energie.title",
    bodyKey: "adv.fr-cheque-energie.body",
    actionLabelKey: "adv.fr-cheque-energie.action",
    action: {
      link: "https://chequeenergie.gouv.fr",
    },
    appliesWhen: savingsCapacityLow,
    priority: 90,
    figures: [{ label: "adv.fr-cheque-energie.fig.0.label", value: "adv.fr-cheque-energie.fig.0.value" }],
    sources: ["https://www.service-public.gouv.fr/particuliers/actualites/A17885", "https://chequeenergie.gouv.fr/beneficiaire/faq"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-energie-fournisseur",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-energie-fournisseur.title",
    bodyKey: "adv.fr-energie-fournisseur.body",
    actionLabelKey: "adv.fr-energie-fournisseur.action",
    action: {
      link: "https://comparateur-offres.energie-info.fr",
    },
    appliesWhen: always,
    priority: 82,
    sources: ["https://www.energie-info.fr/fiche_pratique/je-souhaite-changer-de-fournisseur-delectricite-ou-de-gaz-naturel/"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-c2s",
    category: "insurance",
    countries: ["FR"],
    titleKey: "adv.fr-c2s.title",
    bodyKey: "adv.fr-c2s.body",
    actionLabelKey: "adv.fr-c2s.action",
    action: {
      link: "https://www.ameli.fr/assure/droits-demarches/difficultes-acces-droits-soins/complementaire-sante/complementaire-sante-beneficiaires",
    },
    appliesWhen: savingsCapacityLow,
    priority: 92,
    sources: ["https://www.complementaire-sante-solidaire.gouv.fr/presentation-du-droit"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-100-sante",
    category: "insurance",
    countries: ["FR"],
    titleKey: "adv.fr-100-sante.title",
    bodyKey: "adv.fr-100-sante.body",
    actionLabelKey: "adv.fr-100-sante.action",
    action: {
      link: "https://www.ameli.fr/assure/remboursements/rembourse/soins-protheses-dentaires-optique-audition/soins-dentaires-comprendre-le-100-sante",
    },
    appliesWhen: always,
    priority: 80,
    sources: ["https://sante.gouv.fr/systeme-de-sante/100pourcent-sante/"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-mt-dents",
    category: "kids",
    countries: ["FR"],
    titleKey: "adv.fr-mt-dents.title",
    bodyKey: "adv.fr-mt-dents.body",
    actionLabelKey: "adv.fr-mt-dents.action",
    action: {
      link: "https://www.ameli.fr/assure/sante/themes/carie-dentaire/mt-dents-tous-les-ans",
    },
    appliesWhen: or(hasAnyKids, ageIn("18-25")),
    priority: 76,
    sources: ["https://www.ameli.fr/assure/sante/themes/carie-dentaire/mt-dents-tous-les-ans"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-resiliation-mutuelle",
    category: "insurance",
    countries: ["FR"],
    titleKey: "adv.fr-resiliation-mutuelle.title",
    bodyKey: "adv.fr-resiliation-mutuelle.body",
    actionLabelKey: "adv.fr-resiliation-mutuelle.action",
    action: {
      link: "https://www.economie.gouv.fr/particuliers/gerer-mon-argent/emprunter-et-sassurer/assurance-habitation-auto-complementaire-sante-comment-resilier-son-contrat",
    },
    appliesWhen: always,
    priority: 78,
    sources: ["https://www.economie.gouv.fr/particuliers/gerer-mon-argent/emprunter-et-sassurer/assurance-habitation-auto-complementaire-sante-comment-resilier-son-contrat"],
    lastVerified: "2026-08-06",
  },
  {
    id: "fr-telecom-resiliation",
    category: "emergency",
    countries: ["FR"],
    titleKey: "adv.fr-telecom-resiliation.title",
    bodyKey: "adv.fr-telecom-resiliation.body",
    actionLabelKey: "adv.fr-telecom-resiliation.action",
    action: {
      link: "https://www.arcep.fr/mes-demarches-et-services/consommateurs/fiches-pratiques/quelles-sont-les-conditions-et-consequences-de-la-resiliation-du-contrat-par-le-consommateur.html",
    },
    appliesWhen: always,
    priority: 76,
    figures: [{ label: "adv.fr-telecom-resiliation.fig.0.label", value: "adv.fr-telecom-resiliation.fig.0.value" }],
    sources: ["https://www.arcep.fr/mes-demarches-et-services/consommateurs/fiches-pratiques/quelles-sont-les-conditions-et-consequences-de-la-resiliation-du-contrat-par-le-consommateur.html"],
    lastVerified: "2026-08-06",
  },

  // ==========================================================================
  // HANDICAP & AUTONOMIE — FRANCE (recherche vérifiée 2026-08-08 :
  // service-public, CNSA, monparcourshandicap, CAF, Agefiph, impots.gouv,
  // Légifrance). Ce sont des DROITS : le ton reste factuel et digne, jamais
  // misérabiliste. Le non-recours est massif (DREES) — d'où ces cartes.
  // Montants revalorisés au 1er avril : re-vérifier chaque printemps.
  // ==========================================================================
  {
    id: "hand-aah",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-aah.title",
    bodyKey: "adv.hand-aah.body",
    actionLabelKey: "adv.hand-aah.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F12242",
    },
    appliesWhen: disabledSelf,
    priority: 96,
    figures: [
      { label: "adv.hand-aah.fig.0.label", value: "adv.hand-aah.fig.0.value" },
      { label: "adv.hand-aah.fig.1.label", value: "adv.hand-aah.fig.1.value" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F12242", "https://www.service-public.gouv.fr/particuliers/actualites/A16521"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-pch",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-pch.title",
    bodyKey: "adv.hand-pch.body",
    actionLabelKey: "adv.hand-pch.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F14202",
    },
    appliesWhen: or(disabledSelf, disabledChild),
    priority: 94,
    figures: [
      { label: "adv.hand-pch.fig.0.label", value: "adv.hand-pch.fig.0.value" },
      { label: "adv.hand-pch.fig.1.label", value: "adv.hand-pch.fig.1.value" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F14202"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-mdph-dossier",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-mdph-dossier.title",
    bodyKey: "adv.hand-mdph-dossier.body",
    actionLabelKey: "adv.hand-mdph-dossier.action",
    action: {
      link: "https://www.monparcourshandicap.gouv.fr/aides/le-depot-du-dossier-et-le-traitement-de-la-demande-par-la-maison-departementale-des-personnes",
    },
    appliesWhen: disabilityAny,
    priority: 92,
    sources: ["https://www.monparcourshandicap.gouv.fr/aides/le-depot-du-dossier-et-le-traitement-de-la-demande-par-la-maison-departementale-des-personnes"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-recours",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-recours.title",
    bodyKey: "adv.hand-recours.body",
    actionLabelKey: "adv.hand-recours.action",
    action: {
      link: "https://www.cnsa.fr/sites/default/files/2024-06/Fiche-accessible-en-Facile_A_lire_Voies-Recours_MDPH-Demande-Refusee.pdf",
    },
    appliesWhen: disabilityAny,
    priority: 84,
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F2474"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-cmi",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-cmi.title",
    bodyKey: "adv.hand-cmi.body",
    actionLabelKey: "adv.hand-cmi.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F34049",
    },
    appliesWhen: or(disabledSelf, disabledChild),
    priority: 90,
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F34049"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-fiscalite",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-fiscalite.title",
    bodyKey: "adv.hand-fiscalite.body",
    actionLabelKey: "adv.hand-fiscalite.action",
    action: {
      link: "https://www.impots.gouv.fr/particulier/questions/jai-une-carte-dinvalidite-comment-la-declarer",
    },
    appliesWhen: or(disabledSelf, disabledChild),
    priority: 86,
    figures: [{ label: "adv.hand-fiscalite.fig.0.label", value: "5,5 %" }],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F387", "https://bofip.impots.gouv.fr/bofip/1724-PGP"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-logement",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-logement.title",
    bodyKey: "adv.hand-logement.body",
    actionLabelKey: "adv.hand-logement.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F37501",
    },
    appliesWhen: and(or(disabledSelf, disabledChild), housingIn("owner", "accessor", "renter")),
    priority: 88,
    figures: [{ label: "adv.hand-logement.fig.0.label", value: "adv.hand-logement.fig.0.value" }],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F37501"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-emploi",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-emploi.title",
    bodyKey: "adv.hand-emploi.body",
    actionLabelKey: "adv.hand-emploi.action",
    action: {
      link: "https://www.agefiph.fr/aides-financieres",
    },
    appliesWhen: and(disabledSelf, occupationIs("employee", "self_employed", "civil_servant", "unemployed", "student")),
    priority: 88,
    figures: [{ label: "adv.hand-emploi.fig.0.label", value: "6 300 €" }],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F1650", "https://www.agefiph.fr/aides-financieres"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-mva",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-mva.title",
    bodyKey: "adv.hand-mva.body",
    actionLabelKey: "adv.hand-mva.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F12903",
    },
    appliesWhen: disabledSelf,
    priority: 82,
    figures: [{ label: "adv.hand-mva.fig.0.label", value: "adv.hand-mva.fig.0.value" }],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F12903"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-aeeh",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-aeeh.title",
    bodyKey: "adv.hand-aeeh.body",
    actionLabelKey: "adv.hand-aeeh.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F14809",
    },
    appliesWhen: disabledChild,
    priority: 96,
    figures: [
      { label: "adv.hand-aeeh.fig.0.label", value: "adv.hand-aeeh.fig.0.value" },
      { label: "adv.hand-aeeh.fig.1.label", value: "adv.hand-aeeh.fig.1.value" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F14809"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-aeeh-vs-pch",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-aeeh-vs-pch.title",
    bodyKey: "adv.hand-aeeh-vs-pch.body",
    actionLabelKey: "adv.hand-aeeh-vs-pch.action",
    action: {
      link: "https://www.caf.fr/allocataires/vies-de-famille/articles/handicap-complement-d-aeeh-ou-pch-que-choisir",
    },
    appliesWhen: disabledChild,
    priority: 92,
    sources: ["https://www.caf.fr/allocataires/vies-de-famille/articles/handicap-complement-d-aeeh-ou-pch-que-choisir"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-scolarite",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-scolarite.title",
    bodyKey: "adv.hand-scolarite.body",
    actionLabelKey: "adv.hand-scolarite.action",
    action: {
      link: "https://www.monparcourshandicap.gouv.fr/scolarite/quels-sont-les-accompagnements-notifies-par-la-mdph",
    },
    appliesWhen: disabledChild,
    priority: 90,
    sources: ["https://www.monparcourshandicap.gouv.fr/scolarite/quels-sont-les-accompagnements-notifies-par-la-mdph"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-ajpp",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-ajpp.title",
    bodyKey: "adv.hand-ajpp.body",
    actionLabelKey: "adv.hand-ajpp.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F15132",
    },
    appliesWhen: disabledChild,
    priority: 86,
    figures: [{ label: "adv.hand-ajpp.fig.0.label", value: "66,64 €" }],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F15132"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-aidant",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-aidant.title",
    bodyKey: "adv.hand-aidant.body",
    actionLabelKey: "adv.hand-aidant.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F16920",
    },
    appliesWhen: or(isCaregiver, disabledChild),
    priority: 84,
    figures: [
      { label: "adv.hand-aidant.fig.0.label", value: "adv.hand-aidant.fig.0.value" },
      { label: "adv.hand-aidant.fig.1.label", value: "adv.hand-aidant.fig.1.value" },
    ],
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F16920", "https://www.cnsa.fr/budget-et-financement/autres-allocations-et-prestations/allocation-journaliere-du-proche-aidant"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-pch-parentalite",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-pch-parentalite.title",
    bodyKey: "adv.hand-pch-parentalite.body",
    actionLabelKey: "adv.hand-pch-parentalite.action",
    action: {
      link: "https://www.monparcourshandicap.gouv.fr/aides/la-prestation-de-compensation-du-handicap-pch-parentalite",
    },
    appliesWhen: and(disabledSelf, kids("0-6")),
    priority: 88,
    sources: ["https://www.monparcourshandicap.gouv.fr/aides/la-prestation-de-compensation-du-handicap-pch-parentalite"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-retraite",
    category: "disability",
    countries: ["FR"],
    titleKey: "adv.hand-retraite.title",
    bodyKey: "adv.hand-retraite.body",
    actionLabelKey: "adv.hand-retraite.action",
    action: {
      link: "https://www.service-public.gouv.fr/particuliers/vosdroits/F12242",
    },
    appliesWhen: and(disabledSelf, ageIn("51-65", "66+")),
    priority: 86,
    sources: ["https://www.service-public.gouv.fr/particuliers/vosdroits/F12242"],
    lastVerified: "2026-08-08",
  },

  // ==========================================================================
  // HANDICAP — HORS FRANCE (recherche vérifiée 2026-08-08). Règle appliquée :
  // ces allocations sont TOUTES différentielles (calculées sur les ressources)
  // → on n'affiche jamais « tu toucheras X », on renvoie au simulateur officiel.
  // Aucun vocabulaire français transposé : ni AAH, ni MDPH, ni PCH ailleurs.
  // ==========================================================================
  {
    id: "hand-be-arr-ai",
    category: "disability",
    countries: ["BE"],
    titleKey: "adv.hand-be-arr-ai.title",
    bodyKey: "adv.hand-be-arr-ai.body",
    actionLabelKey: "adv.hand-be-arr-ai.action",
    action: {
      link: "https://handicap.belgium.be/fr/allocations/allocation-integration",
    },
    appliesWhen: disabledSelf,
    priority: 96,
    sources: ["https://handicap.belgium.be/fr/allocations/allocation-de-remplacement-de-revenus", "https://handicap.belgium.be/fr/allocations/allocation-integration"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-be-bim",
    category: "disability",
    countries: ["BE"],
    titleKey: "adv.hand-be-bim.title",
    bodyKey: "adv.hand-be-bim.body",
    actionLabelKey: "adv.hand-be-bim.action",
    action: {
      link: "https://www.inami.fgov.be/fr/themes/soins-de-sante-cout-et-remboursement/facilites-financieres/intervention-majoree-plafonds-des-revenus",
    },
    appliesWhen: disabilityAny,
    priority: 92,
    sources: ["https://www.inami.fgov.be/fr/themes/soins-de-sante-cout-et-remboursement/facilites-financieres/intervention-majoree-plafonds-des-revenus"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-be-enfant",
    category: "disability",
    countries: ["BE"],
    titleKey: "adv.hand-be-enfant.title",
    bodyKey: "adv.hand-be-enfant.body",
    actionLabelKey: "adv.hand-be-enfant.action",
    action: {
      link: "https://www.handicap.brussels/fr/themes/les-aides-financieres/les-allocations/les-allocations-familiales-majorees-afm",
    },
    appliesWhen: disabledChild,
    priority: 94,
    sources: ["https://www.famiwal.be/foire-aux-questions-faq", "https://www.handicap.brussels/fr/themes/les-aides-financieres/les-allocations/les-allocations-familiales-majorees-afm"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-ch-reeducation",
    category: "disability",
    countries: ["CH"],
    titleKey: "adv.hand-ch-reeducation.title",
    bodyKey: "adv.hand-ch-reeducation.body",
    actionLabelKey: "adv.hand-ch-reeducation.action",
    action: {
      link: "https://www.ahv-iv.ch/fr/M%C3%A9mentos-Formulaires/M%C3%A9mentos/Assurance-invalidit%C3%A9-AI",
    },
    appliesWhen: disabledSelf,
    priority: 96,
    sources: ["https://www.bsv.admin.ch/dam/fr/sd-web/sAgdISSXenMT/f_Betr%C3%A4ge%202026.pdf"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-ch-impotence",
    category: "disability",
    countries: ["CH"],
    titleKey: "adv.hand-ch-impotence.title",
    bodyKey: "adv.hand-ch-impotence.body",
    actionLabelKey: "adv.hand-ch-impotence.action",
    action: {
      link: "https://www.ahv-iv.ch/fr/M%C3%A9mentos-Formulaires/M%C3%A9mentos/Assurance-invalidit%C3%A9-AI",
    },
    appliesWhen: or(disabledSelf, disabledChild),
    priority: 92,
    figures: [
      { label: "adv.hand-ch-impotence.fig.0.label", value: "adv.hand-ch-impotence.fig.0.value" },
      { label: "adv.hand-ch-impotence.fig.1.label", value: "adv.hand-ch-impotence.fig.1.value" },
    ],
    sources: ["https://www.bsv.admin.ch/dam/fr/sd-web/sAgdISSXenMT/f_Betr%C3%A4ge%202026.pdf"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-ca-ciph",
    category: "disability",
    countries: ["CA"],
    titleKey: "adv.hand-ca-ciph.title",
    bodyKey: "adv.hand-ca-ciph.body",
    actionLabelKey: "adv.hand-ca-ciph.action",
    action: {
      link: "https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/segments/deductions-credits-impot-personnes-handicapees/credit-impot-personnes-handicapees.html",
    },
    appliesWhen: or(disabledSelf, disabledChild),
    priority: 98,
    sources: ["https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/segments/deductions-credits-impot-personnes-handicapees/credit-impot-personnes-handicapees.html"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-ca-reei",
    category: "disability",
    countries: ["CA"],
    titleKey: "adv.hand-ca-reei.title",
    bodyKey: "adv.hand-ca-reei.body",
    actionLabelKey: "adv.hand-ca-reei.action",
    action: {
      link: "https://www.canada.ca/fr/emploi-developpement-social/programmes/epargne-invalidite.html",
    },
    appliesWhen: or(disabledSelf, disabledChild),
    priority: 96,
    figures: [
      { label: "adv.hand-ca-reei.fig.0.label", value: "adv.hand-ca-reei.fig.0.value" },
      { label: "adv.hand-ca-reei.fig.1.label", value: "adv.hand-ca-reei.fig.1.value" },
    ],
    sources: ["https://www.canada.ca/fr/emploi-developpement-social/programmes/epargne-invalidite.html"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-ca-pcph",
    category: "disability",
    countries: ["CA"],
    titleKey: "adv.hand-ca-pcph.title",
    bodyKey: "adv.hand-ca-pcph.body",
    actionLabelKey: "adv.hand-ca-pcph.action",
    action: {
      link: "https://www.canada.ca/fr/services/prestations/handicap.html",
    },
    appliesWhen: disabledSelf,
    priority: 92,
    sources: ["https://laws.justice.gc.ca/fra/reglements/DORS-2025-35/TexteComplet.html"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-lu-rpgh",
    category: "disability",
    countries: ["LU"],
    titleKey: "adv.hand-lu-rpgh.title",
    bodyKey: "adv.hand-lu-rpgh.body",
    actionLabelKey: "adv.hand-lu-rpgh.action",
    action: {
      link: "https://fns.public.lu/fr/rpgh.html",
    },
    appliesWhen: disabledSelf,
    priority: 96,
    sources: ["https://fns.public.lu/fr/rpgh.html", "https://cns.public.lu/fr/assure/droits-demarches/dossiers-thematiques/dependance.html"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-lu-enfant",
    category: "disability",
    countries: ["LU"],
    titleKey: "adv.hand-lu-enfant.title",
    bodyKey: "adv.hand-lu-enfant.body",
    actionLabelKey: "adv.hand-lu-enfant.action",
    action: {
      link: "https://cae.public.lu/fr/allocations/enfant-handicape.html",
    },
    appliesWhen: disabledChild,
    priority: 94,
    figures: [{ label: "adv.hand-lu-enfant.fig.0.label", value: "adv.hand-lu-enfant.fig.0.value" }],
    sources: ["https://cae.public.lu/fr/allocations/enfant-handicape.html"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-ma-carte",
    category: "disability",
    countries: ["MA"],
    titleKey: "adv.hand-ma-carte.title",
    bodyKey: "adv.hand-ma-carte.body",
    actionLabelKey: "adv.hand-ma-carte.action",
    action: {
      link: "https://social.gov.ma/",
    },
    appliesWhen: or(disabledSelf, disabledChild),
    priority: 94,
    sources: ["https://social.gov.ma/madame-la-ministre-lance-la-plateforme-electronique-pour-la-gestion-des-demandes-de-la-carte-des-personnes-en-situation-de-handicap/"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-sn-cec",
    category: "disability",
    countries: ["SN"],
    titleKey: "adv.hand-sn-cec.title",
    bodyKey: "adv.hand-sn-cec.body",
    actionLabelKey: "adv.hand-sn-cec.action",
    action: {
      link: "https://www.primature.sn/actions-et-realisations/sante-et-protection-sociale/cartes-degalite-des-chances",
    },
    appliesWhen: or(disabledSelf, disabledChild),
    priority: 94,
    sources: ["https://www.primature.sn/actions-et-realisations/sante-et-protection-sociale/cartes-degalite-des-chances"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-dz-allocation",
    category: "disability",
    countries: ["DZ"],
    titleKey: "adv.hand-dz-allocation.title",
    bodyKey: "adv.hand-dz-allocation.body",
    actionLabelKey: "adv.hand-dz-allocation.action",
    action: {
      link: "https://bawabatic.dz/?req=informations&op=detail&id=789&lang=fr",
    },
    appliesWhen: or(disabledSelf, disabledChild),
    priority: 94,
    sources: ["https://bawabatic.dz/?req=informations&op=detail&id=789&lang=fr"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-tn-carte",
    category: "disability",
    countries: ["TN"],
    titleKey: "adv.hand-tn-carte.title",
    bodyKey: "adv.hand-tn-carte.body",
    actionLabelKey: "adv.hand-tn-carte.action",
    action: {
      link: "https://www.social.gov.tn/en/attribution-disabled-persons-card",
    },
    appliesWhen: or(disabledSelf, disabledChild),
    priority: 94,
    sources: ["https://www.social.gov.tn/en/attribution-disabled-persons-card"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-cm-carte",
    category: "disability",
    countries: ["CM"],
    titleKey: "adv.hand-cm-carte.title",
    bodyKey: "adv.hand-cm-carte.body",
    actionLabelKey: "adv.hand-cm-carte.action",
    action: {
      link: "http://www.minas.cm/fr/component/k2/item/4-personnes-handicapees.html",
    },
    appliesWhen: or(disabledSelf, disabledChild),
    priority: 92,
    sources: ["http://www.minas.cm/fr/component/k2/item/4-personnes-handicapees.html"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-ci-cmu",
    category: "disability",
    countries: ["CI"],
    titleKey: "adv.hand-ci-cmu.title",
    bodyKey: "adv.hand-ci-cmu.body",
    actionLabelKey: "adv.hand-ci-cmu.action",
    action: {
      link: "https://dg-cmu.ci/faq/",
    },
    appliesWhen: or(disabledSelf, disabledChild),
    priority: 90,
    sources: ["https://dg-cmu.ci/faq/"],
    lastVerified: "2026-08-08",
  },
  {
    id: "hand-universel-nonrecours",
    category: "disability",
    countries: "all",
    titleKey: "adv.hand-universel-nonrecours.title",
    bodyKey: "adv.hand-universel-nonrecours.body",
    actionLabelKey: "adv.hand-universel-nonrecours.action",
    action: {},
    appliesWhen: disabilityAny,
    priority: 88,
    sources: ["https://drees.solidarites-sante.gouv.fr/sites/default/files/2023-04/ER1263.pdf"],
    lastVerified: "2026-08-08",
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

// Conseils saisonniers : une carte peut déclarer les mois où elle est
// pertinente (1-12). Sans `months`, elle est valable toute l'année.
function monthMatches(card: AdviceCard, now: Date = new Date()): boolean {
  if (!card.months || card.months.length === 0) return true;
  return card.months.includes(now.getMonth() + 1);
}

/**
 * Recul de priorité d'un placement qui ne suit pas les prix.
 *
 * POURQUOI RECULER PLUTÔT QU'ÉCARTER. Un livret qui perd 1 % par an face à
 * l'inflation reste le bon endroit pour une épargne de précaution : disponible
 * tout de suite, sans risque, sans frais. Le supprimer du catalogue priverait
 * du seul conseil correct quelqu'un qui n'a pas encore de fonds d'urgence.
 * On le fait donc descendre derrière les conseils qui, eux, protègent le
 * pouvoir d'achat.
 *
 * POURQUOI JAMAIS DE BONUS. Un placement qui bat l'inflation ne doit pas
 * remonter devant « constitue une épargne de précaution » ou « renégocie ton
 * assurance emprunteur ». L'urgence d'un conseil ne se mesure pas à son
 * rendement, et un bonus ferait passer un produit financier devant un geste
 * qui rapporte davantage et tout de suite.
 *
 * Le recul est proportionnel à l'écart et plafonné : au-delà, on classerait
 * un bon conseil derrière des banalités.
 */
export function inflationPenalty(card: AdviceCard, inflationPct?: number): number {
  if (inflationPct === undefined || card.nominalRatePct === undefined) return 0;
  const gap = inflationPct - card.nominalRatePct;
  if (gap <= 0) return 0;
  return Math.min(25, Math.round(gap * 8));
}

/** Priorité une fois l'inflation prise en compte. */
export function effectivePriority(card: AdviceCard, inflationPct?: number): number {
  return card.priority - inflationPenalty(card, inflationPct);
}

/**
 * `inflationPct` est facultatif : sans lui, le classement est exactement
 * celui d'avant. C'est ce qui permet aux pays sans chiffre officiel, et aux
 * tests du catalogue, de garder un ordre stable et prévisible.
 */
export function matchAdvice(
  profile: UserProfile,
  catalog: AdviceCard[] = ADVICE_CATALOG_FR,
  inflationPct?: number,
): AdviceCard[] {
  return catalog
    .filter(
      (card) =>
        countryMatches(card, profile) &&
        monthMatches(card) &&
        card.appliesWhen(profile),
    )
    .sort(
      (a, b) => effectivePriority(b, inflationPct) - effectivePriority(a, inflationPct),
    );
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
  inflationPct?: number,
): { group: AdviceGroup; cards: AdviceCard[] }[] {
  return groupByAdviceGroup(matchAdvice(profile, catalog, inflationPct));
}

// Utilitaire : accès aux categories par card (pour retro-compat imports).
export type { AdviceCategory };
