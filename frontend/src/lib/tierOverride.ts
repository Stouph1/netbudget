// Palier forcé, pour les tests. Rien d'autre.
//
// À QUOI ÇA SERT. Vérifier les quatre paliers demande sinon quatre comptes,
// quatre inscriptions et quatre passages dans l'éditeur SQL. Personne ne fait
// ça quatre fois par jour — donc personne ne teste les trois paliers qu'il
// n'utilise pas, et les défauts sortent en production.
//
// POURQUOI CE N'EST PAS UNE FAILLE, et pourquoi il faut quand même le lire de
// près :
//
//   - la porte ne s'ouvre QUE si le serveur a répondu `is_tester = true`. Un
//     utilisateur ne peut pas se déclarer testeur : le drapeau est en base, et
//     la table n'a aucune policy d'écriture ;
//   - le palier forcé ne donne AUCUN droit côté serveur. Les données restent
//     protégées par RLS. Ce qu'il change, c'est ce que l'interface affiche —
//     donc ce qu'on peut voir et vérifier.
//
// Autrement dit : quelqu'un qui parviendrait à forcer ce réglage verrait des
// écrans, pas des données. C'est exactement la même surface que le palier de
// développement qui existe déjà dans tier.ts.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseTier, type Tier } from "./entitlements";

const KEY = "netbudget:tier:override";

/**
 * Porte d'entrée, fermée par défaut.
 *
 * Ouverte uniquement par `useIsTester`, après réponse du serveur. Un module qui
 * lit le palier n'a pas à savoir tout ça : il appelle `tierOverride()` et
 * reçoit null s'il n'a rien à faire.
 */
let allowed = false;
let cached: Tier | null = null;
const listeners = new Set<() => void>();

/** Réservé à useIsTester : déclare que le serveur a reconnu un testeur. */
export function allowTierOverride(next: boolean): void {
  if (allowed === next) return;
  allowed = next;
  if (!next) cached = null;
  for (const l of listeners) l();
}

export function onTierOverrideChange(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Charge le palier forcé depuis le stockage. À appeler une fois au démarrage. */
export async function loadTierOverride(): Promise<void> {
  try {
    cached = parseTier(await AsyncStorage.getItem(KEY));
  } catch {
    cached = null;
  }
}

/** Palier forcé actif, ou null. Synchrone : lu à chaque décision d'affichage. */
export function tierOverride(): Tier | null {
  return allowed ? cached : null;
}

export async function setTierOverride(tier: Tier | null): Promise<void> {
  cached = tier;
  try {
    if (tier) await AsyncStorage.setItem(KEY, tier);
    else await AsyncStorage.removeItem(KEY);
  } catch {}
  for (const l of listeners) l();
}
