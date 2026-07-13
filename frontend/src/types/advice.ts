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

export type AgeBracket = "18-25" | "26-35" | "36-50" | "51-65" | "66+";

export type FamilyStatus =
  | "single"
  | "couple_no_kids"
  | "couple_with_kids"
  | "single_parent";

export type HousingStatus = "renter" | "owner" | "accessor"; // accessor = accédant (crédit en cours)

export type Zone = "big_city" | "province"; // grande ville vs province (loyers différenciés)

export type IncomeBracket = "low" | "medium" | "high" | "very_high"; // dérivable si non demandé

export type TaxBracket = "0" | "11" | "30" | "41" | "45"; // TMI FR 2026

export type Country = "FR" | "BE" | "CH" | "LU" | "CA" | "OTHER";

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

export type UserProfile = {
  age?: AgeBracket;
  family?: FamilyStatus;
  housing?: HousingStatus;
  zone?: Zone;
  income?: IncomeBracket;
  tmi?: TaxBracket;
  country?: Country;
  hasEmergencyFund?: boolean;
  children?: ChildAgeBracket[];      // multi-select des tranches d'âge
  monthlySavingsCapacity?: SavingsCapacity;
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
  | "insurance";      // → Prévoyance

// Regroupement UI par thème visible pour l'user.
export type AdviceGroup = {
  key: string;
  label: string;
  icon: string;
  categories: AdviceCategory[];
};

export const ADVICE_GROUPS: AdviceGroup[] = [
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
];

export type AdviceAction = {
  label: string;      // Verbe à l'infinitif : "Ouvrir un PEA", "Comparer 3 courtiers"
  link?: string;      // Optionnel : URL de ressource externe (impots.gouv.fr, etc.)
};

// Prédicat : renvoie true si le conseil s'applique au profil donné.
export type AdvicePredicate = (profile: UserProfile) => boolean;

export type AdviceCard = {
  id: string;
  category: AdviceCategory;
  title: string;                 // ≤ 60 chars
  body: string;                  // 2-3 phrases
  action: AdviceAction;
  appliesWhen: AdvicePredicate;
  priority: number;              // 1-100, plus haut = plus important (tri desc)
  figures?: {
    label: string;
    value: string;
  }[];
  sources: string[];
  lastVerified: string;          // ISO date
};
