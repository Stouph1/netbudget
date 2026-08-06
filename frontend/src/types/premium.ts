// Types Premium — S1 Épargne (objectifs).
//
// Storage model : tout est encapsulé dans des blobs `encrypted_payloads`
// côté Supabase, une entrée par payload_key (voir premiumStore.ts).
// L'encryption client-side (libsodium) sera branchée en Phase 5 ;
// pour l'instant on stocke en JSON clair (stub) pour dev-velocity.
//
// Simplification 2026-07-13 : sections Comptes et Patrimoine retirées du MVP
// (peu de valeur perçue). L'info "où est l'argent" sera dérivée du profil
// user au niveau de l'advice engine (a-t-il un PEA ? une AV ?).

// ============================================================================
// S1 — Objectifs d'épargne
// ============================================================================

export type SavingsGoal = {
  id: string;
  label: string;              // ex: "Voyage Japon", "Apport maison", "Retraite anticipée"
  targetAmount: number;       // montant cible en devise
  currentAmount: number;      // épargné à date
  targetDate?: string;        // ISO 8601 — date butoir optionnelle
  monthlyContribution?: number; // versement mensuel prévu
  extraP: boolean;            // "ExtraP" = extra-budgétaire (n'entre pas dans le grand total)
  color?: string;             // pour la data-viz (hex)
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Blob S1 complet — c'est ce qui va dans encrypted_payloads.payload_key="s1"
// ============================================================================

export type S1Payload = {
  version: 1;
  goals: SavingsGoal[];
};

export const EMPTY_S1_PAYLOAD: S1Payload = {
  version: 1,
  goals: [],
};
