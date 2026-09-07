// Traduction d'un événement RevenueCat vers une ligne de `subscriptions`.
//
// POURQUOI CE FICHIER EST SÉPARÉ DU WEBHOOK. Ces trois fonctions décident du
// palier d'un client qui vient de payer. Si l'une se trompe, quelqu'un est
// débité et ne reçoit rien — le pire défaut possible dans une application
// payante, et celui qu'on découvre par un message de réclamation.
//
// Or le webhook lui-même ne se teste pas : il ouvre une connexion Supabase et
// lit des variables d'environnement. Isolées ici, sans aucune importation, ces
// fonctions se testent depuis le projet — voir __tests__/billingMapping.test.ts.
//
// Le dossier `_shared` est celui que la CLI Supabase embarque avec les
// fonctions. Un fichier placé hors de `supabase/` ne serait pas déployé.

/** Paliers acceptés. Tout le reste est rejeté plutôt qu'interprété. */
export const TIERS = ["free", "solo", "duo", "family"] as const;
export type Tier = (typeof TIERS)[number];

/** Types d'événements qui retirent l'accès. */
export const REVOKING = new Set(["EXPIRATION", "REFUND", "SUBSCRIPTION_PAUSED"]);

/** Types qui signalent une résiliation sans retirer la période déjà payée. */
export const CANCELLING = new Set(["CANCELLATION", "UNSUBSCRIBE"]);

/**
 * Droits RevenueCat → palier.
 *
 * On lit le DROIT et non l'identifiant de produit : ça permet d'ajouter une
 * offre promotionnelle ou de renommer un produit sans redéployer le webhook.
 *
 * Ordre décroissant : quelqu'un dont deux droits se chevauchent — ça arrive
 * quelques heures pendant un changement de formule — garde le plus généreux.
 * Lui retirer ce qu'il vient d'acheter serait le pire moment pour se tromper.
 */
export function tierFromEntitlements(ids: readonly string[]): Tier {
  if (ids.includes("family")) return "family";
  if (ids.includes("duo")) return "duo";
  if (ids.includes("solo")) return "solo";
  return "free";
}

/**
 * Boutique RevenueCat → colonne `platform`.
 *
 * Cette colonne porte une contrainte CHECK : apple, google, stripe,
 * promotional, test. Une valeur hors liste fait ÉCHOUER l'écriture — on
 * traduit donc, on ne recopie jamais ce que RevenueCat envoie.
 *
 * Le repli sur « apple » est délibéré : une boutique inconnue ne doit pas
 * empêcher d'enregistrer un achat réel. Mieux vaut une ligne mal étiquetée
 * qu'un client sans son abonnement.
 */
export function platformFromStore(raw: unknown): string {
  const store = String(raw ?? "").toLowerCase();
  if (store.includes("app_store") || store.includes("mac")) return "apple";
  if (store.includes("play")) return "google";
  if (store.includes("stripe")) return "stripe";
  if (store.includes("promo")) return "promotional";
  return "apple";
}

/**
 * Type d'événement → colonne `status`.
 *
 * Obligatoire en base, et contrainte à : trial, active, expired, cancelled,
 * in_grace, paused. C'est aussi ce que lit `my_tier()`, qui n'accorde un accès
 * que sur trial, active et in_grace.
 *
 * `in_grace` sur un incident de paiement est le choix important : on garde
 * l'accès pendant que la banque et la boutique se parlent. Couper tout de
 * suite punirait quelqu'un pour une carte expirée.
 */
export function statusFor(type: string, periodType: string): string {
  if (REVOKING.has(type)) {
    if (type === "REFUND") return "cancelled";
    if (type === "SUBSCRIPTION_PAUSED") return "paused";
    return "expired";
  }
  if (type === "BILLING_ISSUE") return "in_grace";
  return periodType.toUpperCase() === "TRIAL" ? "trial" : "active";
}
