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
// User profile (les 4 axes de personnalisation + revenus)
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

export type UserProfile = {
  age?: AgeBracket;
  family?: FamilyStatus;
  housing?: HousingStatus;
  zone?: Zone;
  income?: IncomeBracket;
  tmi?: TaxBracket;
  country?: Country;
  hasEmergencyFund?: boolean; // dérivable de S3 provisions
  hasChildrenUnder6?: boolean;
  numChildren?: number;
};

// ============================================================================
// Advice card
// ============================================================================

export type AdviceCategory =
  | "emergency"       // Épargne de précaution
  | "long_term"       // Investissements long terme (PEA, AV)
  | "retirement"      // Préparation retraite (PER, SCPI)
  | "tax"             // Optimisation fiscale
  | "real_estate"     // Crédit immobilier
  | "insurance"       // Prévoyance
  | "kids"            // Enfants et transmission
  | "housing"         // Choix logement (locataire vs propriétaire)
  ;

export type AdviceAction = {
  label: string;      // Verbe à l'infinitif : "Ouvrir un PEA", "Comparer 3 courtiers"
  link?: string;      // Optionnel : URL de ressource externe (impots.gouv.fr, etc.)
};

// Prédicat : renvoie true si le conseil s'applique au profil donné.
export type AdvicePredicate = (profile: UserProfile) => boolean;

export type AdviceCard = {
  id: string;                    // slug unique, ex: "livret-a-plafond-2026"
  category: AdviceCategory;
  title: string;                 // ≤ 60 chars
  body: string;                  // 2-3 phrases
  action: AdviceAction;
  appliesWhen: AdvicePredicate;
  priority: number;              // 1-100, plus haut = plus important (tri desc)
  figures?: {                    // chiffres 2026 mis en avant dans l'UI
    label: string;
    value: string;               // ex: "22 950 €", "1,5%", "35%"
  }[];
  sources: string[];             // URLs pour transparency
  lastVerified: string;          // ISO date — quand ce chiffre a été vérifié
};
