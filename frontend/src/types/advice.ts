// Types du moteur de conseils Premium (Advice Engine).
//
// Design principle : arbre de règles DÉTERMINISTE (pas d'IA runtime).
//  - Chaque conseil est un `AdviceCard` avec un prédicat `appliesWhen`
//    évalué contre un `UserProfile`.
//  - Le moteur retourne la liste des cards qui matchent, triées par
//    priorité (numérique) puis par fréquence d'affichage (rotation).
//
// Contenu 2026 : voir docs/advice-corpus-fr-v1.md pour le sourcing.

// ============================================================================
// User profile (les axes de personnalisation)
// ============================================================================

export type AgeBracket = "under_18" | "18-25" | "26-35" | "36-50" | "51-65" | "66+";

export type FamilyStatus =
  | "single"
  | "couple_no_kids"
  | "couple_with_kids"
  | "single_parent";

export type HousingStatus = "renter" | "owner" | "accessor" | "free_housing";
// accessor = accédant (crédit en cours) · free_housing = hébergé gratuitement

export type Zone = "big_city" | "province"; // grande ville vs province (loyers différenciés)

export type IncomeBracket = "low" | "medium" | "high" | "very_high"; // dérivable si non demandé

export type TaxBracket = "0" | "11" | "30" | "41" | "45"; // TMI FR 2026

export type Country =
  | "FR" | "BE" | "CH" | "LU" | "CA"
  | "DE" | "GB" | "US" | "ES" | "IT" | "PT"
  | "MA" | "DZ" | "TN" | "SN" | "CI" | "CM"
  | "OTHER";

// Tranches d'âge des enfants — les conseils diffèrent radicalement selon l'âge.
export type ChildAgeBracket = "0-6" | "7-11" | "12-15" | "16-18" | "19+";

// Capacité d'épargne mensuelle (dispo après charges fixes).
// À terme, dérivable automatiquement depuis le tab Budget du free tier.
export type SavingsCapacity =
  | "under_100"
  | "100_300"
  | "300_800"
  | "800_2000"
  | "2000_plus";

// Type du workspace actif — injecté automatiquement par l'app (pas demandé
// dans l'onboarding). Permet aux conseils "budget à plusieurs" de matcher
// selon le contexte : un workspace "couple" → conseils compte joint, etc.
export type WorkspaceKindForAdvice =
  | "couple"
  | "family"
  | "coloc"
  | "association"
  | "other";

// Animaux de compagnie — impacte le budget (nourriture, vétérinaire, assurance).
export type PetSpecies = "dog" | "cat" | "small_mammal" | "bird" | "fish" | "reptile";

export type Pet = {
  species: PetSpecies;
  count: number; // nombre d'animaux de cette espèce
};

export type UserProfile = {
  age?: AgeBracket;
  family?: FamilyStatus;
  housing?: HousingStatus;
  zone?: Zone;
  income?: IncomeBracket;
  tmi?: TaxBracket;
  country?: Country;
  region?: string; // région française (les aides locales varient) — voir constants/geo.ts
  hasEmergencyFund?: boolean;
  children?: ChildAgeBracket[];      // multi-select des tranches d'âge
  monthlySavingsCapacity?: SavingsCapacity;
  workspaceKind?: WorkspaceKindForAdvice | null; // null/undefined = compte perso
  hasPets?: boolean;
  pets?: Pet[];                      // rempli seulement si hasPets === true
};

// ============================================================================
// Helpers de dérivation (utilisés par les prédicats des cards)
// ============================================================================

export function hasChildrenIn(
  brackets: ChildAgeBracket[],
): (p: UserProfile) => boolean {
  return (p) => !!p.children?.some((b) => brackets.includes(b));
}

export function hasAnyKids(p: UserProfile): boolean {
  return !!p.children?.length;
}

// ============================================================================
// Advice card
// ============================================================================

export type AdviceCategory =
  | "emergency"       // → Budget & Épargne
  | "long_term"       // → Investissements
  | "retirement"      // → Investissements
  | "tax"             // → Impôts & Fiscalité
  | "real_estate"     // → Immobilier
  | "housing"         // → Immobilier
  | "kids"            // → Enfants
  | "inheritance"     // → Transmission
  | "insurance"       // → Prévoyance
  | "shared"          // → Budget à plusieurs (couple / famille / coloc)
  | "association"     // → Association (trésorerie, dons, subventions)
  | "pets";           // → Animaux de compagnie

// Regroupement UI par thème visible pour l'user.
export type AdviceGroup = {
  key: string;
  label: string;
  icon: string;
  categories: AdviceCategory[];
};

export const ADVICE_GROUPS: AdviceGroup[] = [
  {
    key: "shared",
    label: "Budget à plusieurs",
    icon: "users",
    categories: ["shared"],
  },
  {
    key: "association",
    label: "Association",
    icon: "award",
    categories: ["association"],
  },
  {
    key: "budget",
    label: "Budget & Épargne",
    icon: "shield",
    categories: ["emergency"],
  },
  {
    key: "invest",
    label: "Investissements",
    icon: "trending-up",
    categories: ["long_term", "retirement"],
  },
  {
    key: "tax",
    label: "Impôts & Fiscalité",
    icon: "file-text",
    categories: ["tax"],
  },
  {
    key: "housing",
    label: "Immobilier",
    icon: "home",
    categories: ["real_estate", "housing"],
  },
  {
    key: "kids",
    label: "Enfants",
    icon: "users",
    categories: ["kids"],
  },
  {
    key: "inheritance",
    label: "Transmission",
    icon: "gift",
    categories: ["inheritance"],
  },
  {
    key: "insurance",
    label: "Prévoyance",
    icon: "umbrella",
    categories: ["insurance"],
  },
  {
    key: "pets",
    label: "Animaux de compagnie",
    icon: "heart", // Feather n'a pas d'icône "patte" ; heart reste sobre et clair
    categories: ["pets"],
  },
];

export type AdviceAction = {
  label: string;      // Verbe à l'infinitif : "Ouvrir un PEA", "Comparer 3 courtiers"
  link?: string;      // Optionnel : URL de ressource externe (impots.gouv.fr, etc.)
};

// Prédicat : renvoie true si le conseil s'applique au profil donné.
export type AdvicePredicate = (profile: UserProfile) => boolean;

export type AdviceFigure = { label: string; value: string };

// body et figures peuvent être STATIQUES (string / array) ou DYNAMIQUES (fonctions
// qui prennent le profil et renvoient le contenu). Utile pour des conseils dont
// le contenu dépend du profil (ex: répartition budgétaire personnalisée).
export type AdviceCard = {
  id: string;
  category: AdviceCategory;
  // Pays où le conseil est valable. Absent = ["FR"] (catalogue historique).
  // "all" = universel (fonds d'urgence, répartition budgétaire…).
  countries?: Country[] | "all";
  title: string;
  body: string | ((p: UserProfile) => string);
  action: AdviceAction | ((p: UserProfile) => AdviceAction);
  appliesWhen: AdvicePredicate;
  priority: number;
  figures?: AdviceFigure[] | ((p: UserProfile) => AdviceFigure[]);
  sources: string[];
  lastVerified: string;
};

// Helpers pour l'UI : résoudre les champs dynamiques.
export function resolveBody(card: AdviceCard, p: UserProfile): string {
  return typeof card.body === "function" ? card.body(p) : card.body;
}
export function resolveAction(card: AdviceCard, p: UserProfile): AdviceAction {
  return typeof card.action === "function" ? card.action(p) : card.action;
}
export function resolveFigures(
  card: AdviceCard,
  p: UserProfile,
): AdviceFigure[] {
  if (!card.figures) return [];
  return typeof card.figures === "function" ? card.figures(p) : card.figures;
}
