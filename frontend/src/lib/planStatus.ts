// Ce que « Ta formule » dit de l'échéance. Pur, donc testable sans écran.

import type { StoreSubscription } from "./billing/provider";
import type { PlanInfo } from "./tier";

/** La ligne d'état, dans l'ordre où elle compte pour l'abonné. */
export type PlanStatus =
  | { kind: "billingIssue" }
  | { kind: "trial"; date: string | null; willRenew: boolean }
  | { kind: "ending"; date: string | null }
  | { kind: "renews"; date: string | null }
  | { kind: "validUntil"; date: string }
  | { kind: "otherStore"; store: "apple" | "google" }
  | { kind: "none" };

/**
 * Choisit ce qu'on dit de l'échéance. Exporté pour les tests : c'est la partie
 * où une erreur coûte cher (« renouvellement » dit à quelqu'un qui a résilié).
 */
export function planStatus(plan: PlanInfo, store: StoreSubscription | null, os: string): PlanStatus {
  if (store) {
    if (store.billingIssue) return { kind: "billingIssue" };
    if (store.isTrial) return { kind: "trial", date: store.expiresAt, willRenew: store.willRenew };
    if (!store.willRenew) return { kind: "ending", date: store.expiresAt };
    return { kind: "renews", date: store.expiresAt };
  }
  // La boutique de ce téléphone ne connaît pas l'abonnement : il a été pris
  // sur l'autre plateforme. On le dit, sinon « Gérer » mène à une page vide.
  const from = plan.ownPlatform === "apple" || plan.ownPlatform === "google" ? plan.ownPlatform : null;
  const thisStore = os === "ios" ? "apple" : os === "android" ? "google" : null;
  if (from && thisStore && from !== thisStore) return { kind: "otherStore", store: from };
  if (plan.ownStatus === "in_grace") return { kind: "billingIssue" };
  if (plan.ownStatus === "trial") return { kind: "trial", date: plan.ownExpiresAt, willRenew: true };
  if (plan.ownExpiresAt) return { kind: "validUntil", date: plan.ownExpiresAt };
  return { kind: "none" };
}

