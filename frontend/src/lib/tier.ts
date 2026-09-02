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
import { tierOverride } from "./tierOverride";

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
 * Déduite de la présence d'une clé RevenueCat, PAS d'un booléen à basculer à la
 * main. Un interrupteur manuel se retrouve un jour à `true` sans clé — l'app
 * demande alors son palier à un serveur que rien n'alimente, et tous les
 * abonnés deviennent gratuits — ou à `false` avec les clés en place, et les
 * abonnés paient sans rien recevoir. Ici les deux ne peuvent pas se
 * désynchroniser : poser la clé suffit à mettre la facturation en service.
 *
 * On regarde les deux plateformes, pas seulement celle qui exécute : un abonné
 * qui ouvre la version web doit retrouver son palier, alors qu'aucun achat n'y
 * est possible.
 */
export const BILLING_LIVE =
  Boolean(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY) ||
  Boolean(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY);

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
  // Palier forcé par un testeur. Placé AVANT tout le reste, y compris avant
  // le serveur : c'est le but, pouvoir voir les quatre paliers sans quatre
  // comptes. La porte ne s'ouvre que sur un `is_tester` confirmé en base —
  // voir tierOverride.ts.
  const forced = tierOverride();
  if (forced) return forced;

  // ON DEMANDE TOUJOURS AU SERVEUR, même quand la boutique n'est pas encore en
  // service.
  //
  // C'ÉTAIT UN DÉFAUT GRAVE ET SILENCIEUX. Il y avait ici un raccourci
  // « si la facturation n'est pas branchée, renvoyer le palier de
  // développement » — donc « free ». Or `my_tier()` existe déjà et répond, et
  // c'est par lui qu'on accorde un palier à la main pendant la phase de test
  // (grant_test_tier). Avec le raccourci, les huit testeurs restaient gratuits
  // quoi qu'on écrive en base, sans le moindre message : les profils Solo, Duo
  // et Famille n'auraient rien pu tester.
  //
  // Interroger le serveur sans boutique ne coûte rien : la table n'a aucune
  // policy d'écriture, et `my_tier()` renvoie « free » par défaut.
  try {
    const { data, error } = await supabase.rpc("my_tier");
    const fromServer = error ? null : parseTier(data);
    if (fromServer) {
      await writeCache(fromServer);
      return fromServer;
    }
  } catch {
    // Hors ligne, ou pas de session : on retombe plus bas.
  }

  // Le serveur n'a pas répondu. En développement, le palier de confort permet
  // de travailler sans réseau ni compte.
  if (!BILLING_LIVE) return TIER_DURING_DEV;

  // Le cache ne sert qu'à ne pas dégrader l'expérience d'un abonné hors
  // ligne. Il ne peut pas accorder plus que ce que le serveur a déjà accordé
  // au moins une fois.
  return (await readCache()) ?? "free";
}

const listeners = new Set<(tier: Tier) => void>();

/** S'abonner aux changements de palier. Renvoie la fonction de désabonnement. */
export function onTierChange(listener: (tier: Tier) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Redemande le palier au serveur après un achat, en insistant un peu.
 *
 * POURQUOI DES TENTATIVES RÉPÉTÉES. Entre le moment où la boutique encaisse et
 * celui où notre webhook a écrit le verdict, il s'écoule de une à quelques
 * secondes. Interroger le serveur une seule fois juste après l'achat renvoie
 * donc souvent « free » : le client vient de payer et voit son abonnement
 * refusé. C'est la pire seconde possible de toute l'application.
 *
 * On s'arrête dès qu'un palier payant apparaît, ou après la dernière tentative.
 * Si le webhook a vraiment échoué, `restore()` reste la porte de sortie, et
 * elle est déjà à l'écran.
 */
export async function refreshTier(attempts = 5): Promise<Tier> {
  let tier: Tier = "free";
  for (let i = 0; i < attempts; i++) {
    tier = await loadTier();
    if (tier !== "free") break;
    // Attente croissante : 1s, 2s, 3s, 4s. Inutile de marteler le serveur.
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  for (const notify of listeners) notify(tier);
  return tier;
}

/** Vide le cache — à la déconnexion, sinon le palier suivrait le compte suivant. */
export async function forgetTier(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {}
  for (const notify of listeners) notify("free");
}
