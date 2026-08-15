// Palier d'abonnement actif.
//
// ÉTAT ACTUEL : la facturation n'est pas encore branchée. Tant que c'est le
// cas, tout le monde est traité comme « family » — sinon les fonctionnalités
// seraient bloquées avant même qu'il soit possible de payer, et l'app
// deviendrait intestable.
//
// Les RÈGLES, elles, sont déjà en place et vérifiées (voir entitlements.ts).
// Le jour où RevenueCat est branché, il suffit de remplacer la lecture par
// l'entitlement renvoyé par le fournisseur : rien d'autre ne bouge dans l'app,
// parce qu'aucun écran ne connaît les limites — ils passent tous par
// `canCreateEvent()`.
//
// ⚠️ Le palier ne doit JAMAIS faire autorité côté client au moment de payer :
// un stockage local se modifie. Il sert à l'affichage et au confort ; la vraie
// vérification appartient au serveur (entitlement signé RevenueCat + contrôle
// dans les policies Supabase).

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Tier } from "./entitlements";

const KEY = "netbudget:tier";

/** Palier appliqué tant que la facturation n'est pas en service. */
export const TIER_BEFORE_BILLING: Tier = "family";

const VALID: readonly Tier[] = ["free", "solo", "duo", "family"];

export function parseTier(raw: unknown): Tier | null {
  return typeof raw === "string" && (VALID as readonly string[]).includes(raw)
    ? (raw as Tier)
    : null;
}

export async function loadTier(): Promise<Tier> {
  try {
    return parseTier(await AsyncStorage.getItem(KEY)) ?? TIER_BEFORE_BILLING;
  } catch {
    return TIER_BEFORE_BILLING;
  }
}

/**
 * Force un palier — pour tester les limites avant que la facturation existe.
 * Sera remplacé par l'entitlement du fournisseur de paiement.
 */
export async function setTier(tier: Tier): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, tier);
  } catch {}
}
