// Palier d'abonnement actif.
//
// LA RÈGLE : le palier vient du SERVEUR, jamais du stockage local. Une valeur
// locale se modifie en trente secondes — la croire, c'est offrir la formule
// Famille à qui sait éditer un fichier. La boutique encaisse, RevenueCat vérifie
// le reçu, un webhook écrit le verdict, et `my_tier()` le renvoie. La table
// n'a aucune policy d'écriture : même en appelant l'API directement, personne ne
// peut s'accorder un palier.
//
// LE CACHE LOCAL N'EST QU'UN CACHE. Il évite un aller-retour réseau à chaque
// démarrage et permet à l'app de fonctionner hors ligne. Il ne fait jamais
// autorité : dès que le serveur répond, il est remplacé. Et il ne sert de repli
// que pour la LECTURE — aucune décision de facturation ne repose sur lui.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { parseTier, type Tier } from "./entitlements";

export { parseTier };

const CACHE_KEY = "netbudget:tier:cache";

/**
 * Palier appliqué tant que la facturation n'est pas en service.
 *
 * « free », donc les limites s'appliquent réellement : c'est le seul moyen de
 * voir l'application telle qu'un utilisateur non abonné la verra, et donc de
 * vérifier que chaque blocage propose bien une issue. Une app testée en accès
 * total ne révèle jamais ses impasses.
 *
 * Pour tester un palier payant sans boutique : passer temporairement cette
 * valeur à "solo", "duo" ou "family", puis la remettre.
 */
const TIER_DURING_DEV: Tier = "free";

/**
 * La facturation est-elle en service ?
 *
 * Un seul interrupteur, à passer à true le jour où les produits existent dans
 * les boutiques et où le webhook écrit vraiment. Avant, le serveur renverrait
 * "free" pour tout le monde et l'app serait intestable.
 */
export const BILLING_LIVE = false;

async function readCache(): Promise<Tier | null> {
  try {
    return parseTier(await AsyncStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
}

async function writeCache(tier: Tier): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, tier);
  } catch {}
}

/**
 * Palier de l'utilisateur connecté.
 *
 * Ordre : serveur d'abord, cache en repli. Jamais l'inverse — un cache qui
 * prime sur le serveur laisserait un abonnement résilié actif indéfiniment.
 */
export async function loadTier(): Promise<Tier> {
  if (!BILLING_LIVE) return TIER_DURING_DEV;

  try {
    const { data, error } = await supabase.rpc("my_tier");
    const fromServer = error ? null : parseTier(data);
    if (fromServer) {
      await writeCache(fromServer);
      return fromServer;
    }
  } catch {
    // Hors ligne : on retombe sur le cache ci-dessous.
  }

  // Le cache ne sert qu'à ne pas dégrader l'expérience d'un abonné hors
  // ligne. Il ne peut pas accorder plus que ce que le serveur a déjà accordé
  // au moins une fois.
  return (await readCache()) ?? "free";
}

/** Vide le cache — à la déconnexion, sinon le palier suivrait le compte suivant. */
export async function forgetTier(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {}
}
