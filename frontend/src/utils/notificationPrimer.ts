// Demande de permission de notifier : QUAND la poser.
//
// LE CONSTAT. L'app ne demandait la permission que depuis l'écran de réglages.
// Presque personne n'y va : résultat, zéro notification pour presque tout le
// monde — rappels mensuels, caps, droits, tout restait programmé dans le vide
// puisque `ensureMonthlyRemindersScheduled` exige une permission déjà donnée.
//
// LA RÈGLE. On ne demande pas au premier lancement (avant d'avoir rendu le
// moindre service, c'est un refus quasi garanti, et sur iOS il est définitif).
// On demande à partir de la DEUXIÈME ouverture, une fois, avec un écran à
// nous qui dit ce qu'on enverra et combien. Si la personne dit « plus tard »,
// on retente une seule fois, 14 jours après. Si elle a refusé au système, on
// ne redemande jamais : le chemin passe par les réglages du téléphone.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const OPENS_KEY = "netbudget:notifications:opens";
const PRIMED_KEY = "netbudget:notifications:primedAt";
const RETRY_AFTER_MS = 14 * 86_400_000;

/** Nombre d'ouvertures à partir duquel on ose demander. */
export const ASK_FROM_OPEN = 2;

async function bumpOpens(): Promise<number> {
  try {
    const n = (parseInt((await AsyncStorage.getItem(OPENS_KEY)) ?? "0", 10) || 0) + 1;
    await AsyncStorage.setItem(OPENS_KEY, String(n));
    return n;
  } catch {
    return ASK_FROM_OPEN; // sans stockage, on se comporte comme une seconde ouverture
  }
}

/** Décision pure, testable : faut-il montrer l'écran d'explication ? */
export function decidePrime(input: {
  opens: number;
  status: "granted" | "denied" | "undetermined";
  canAskAgain: boolean;
  primedAt: Date | null;
  now: Date;
}): boolean {
  if (input.status !== "undetermined" || !input.canAskAgain) return false;
  if (input.opens < ASK_FROM_OPEN) return false;
  if (input.primedAt && input.now.getTime() - input.primedAt.getTime() < RETRY_AFTER_MS) return false;
  return true;
}

/** À appeler une fois par ouverture. Ne déclenche jamais la demande système. */
export async function shouldPrimeNotifications(now: Date = new Date()): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const opens = await bumpOpens();
  let primedAt: Date | null = null;
  try {
    const raw = await AsyncStorage.getItem(PRIMED_KEY);
    primedAt = raw ? new Date(raw) : null;
  } catch {}
  try {
    const perms = await Notifications.getPermissionsAsync();
    return decidePrime({
      opens,
      status: perms.status as "granted" | "denied" | "undetermined",
      canAskAgain: perms.canAskAgain !== false,
      primedAt,
      now,
    });
  } catch {
    return false;
  }
}

export async function markPrimed(now: Date = new Date()): Promise<void> {
  try {
    await AsyncStorage.setItem(PRIMED_KEY, now.toISOString());
  } catch {}
}

// ---------------------------------------------------------------------------
// Signal « permission accordée » : le planificateur (usePersonalNotifications)
// s'y abonne pour reprogrammer aussitôt, sans attendre la prochaine ouverture.
// ---------------------------------------------------------------------------
const listeners = new Set<() => void>();

export function onNotificationsGranted(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitNotificationsGranted(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {}
  }
}
