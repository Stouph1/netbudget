// Types Premium — Grand Dispatching (S1-S4) + profil étendu.
//
// Storage model : tout est encapsulé dans des blobs `encrypted_payloads`
// côté Supabase, une entrée par payload_key (voir premiumStore.ts).
// L'encryption client-side (libsodium) sera branchée en Phase 5 ;
// pour l'instant on stocke en JSON clair (stub) pour dev-velocity.

// ============================================================================
// Comptes bancaires / instruments d'épargne
// ============================================================================

export type AccountKind =
  | "livret_a"
  | "ldds"
  | "lep"
  | "pel"
  | "cel"
  | "pea"
  | "pea_pme"
  | "cto" // compte titres ordinaire
  | "assurance_vie"
  | "per" // plan épargne retraite
  | "compte_courant"
  | "livret_bancaire"
  | "espèces"
  | "crypto"
  | "immobilier"
  | "autre";

export type Account = {
  id: string;
  kind: AccountKind;
  label: string;         // nom donné par l'user ("PEA Boursorama", "Livret A Livret bleu")
  currency: string;      // "EUR" par défaut
  interestRate?: number; // % annuel (indicatif — Livret A 3%, LDDS 3%, LEP 5%, etc.)
  ceiling?: number;      // plafond légal si applicable (Livret A 22 950€, etc.)
  createdAt: string;     // ISO 8601
};

// ============================================================================
// S1 — Objectifs d'épargne
// ============================================================================

export type SavingsGoal = {
  id: string;
  label: string;              // ex: "Voyage Japon", "Apport maison", "Retraite anticipée"
  targetAmount: number;       // montant cible en devise du compte
  currentAmount: number;      // épargné à date
  targetDate?: string;        // ISO 8601 — date butoir optionnelle
  accountId?: string;         // rattachement à un compte
  monthlyContribution?: number; // versement mensuel prévu
  extraP: boolean;            // "ExtraP" = extra-budgétaire (n'entre pas dans le grand total)
  color?: string;             // pour la data-viz (hex)
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// S1 — Patrimoine (biens détenus, valorisés mais pas activement épargnés)
// ============================================================================

export type PatrimoineCategory = "foncier" | "objets" | "equipement" | "autres";

export type PatrimoineItem = {
  id: string;
  label: string;              // "Appartement Paris 15e", "Voiture", "Vélo cargo"
  category: PatrimoineCategory;
  estimatedValue: number;
  currency: string;
  acquiredAt?: string;        // date d'acquisition (ISO)
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Blob S1 complet — c'est ce qui va dans encrypted_payloads.payload_key="s1"
// ============================================================================

export type S1Payload = {
  version: 1;
  accounts: Account[];
  goals: SavingsGoal[];
  patrimoine: PatrimoineItem[];
};

export const EMPTY_S1_PAYLOAD: S1Payload = {
  version: 1,
  accounts: [],
  goals: [],
  patrimoine: [],
};
