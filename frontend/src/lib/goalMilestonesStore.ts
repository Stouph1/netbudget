// Mémoire des caps déjà fêtés, par objectif.
//
// LOCAL ET NON SYNCHRONISÉ, délibérément. Ce n'est pas une donnée d'épargne,
// c'est le souvenir d'une félicitation. La synchroniser voudrait dire la
// chiffrer et la fusionner entre appareils — beaucoup de machinerie pour
// éviter, au pire, qu'une félicitation se rejoue une fois sur un téléphone
// neuf. Le coût et le risque seraient sans rapport avec l'enjeu.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { highestMilestone } from "./goalMilestones";

const KEY = "netbudget:goals:milestones";

/** identifiant d'objectif → cap le plus élevé déjà annoncé. */
type Seen = Record<string, number>;

async function read(): Promise<Seen> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Seen = {};
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) out[id] = v;
    }
    return out;
  } catch {
    return {};
  }
}

async function write(seen: Seen): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(seen));
  } catch {
    // Au pire, une félicitation se rejoue. Rien qui vaille une alerte.
  }
}

export async function seenMilestones(): Promise<Seen> {
  return read();
}

/**
 * Enregistre le niveau atteint pour un objectif.
 *
 * On ne redescend JAMAIS la valeur mémorisée : un retrait ne doit pas remettre
 * en jeu un cap déjà annoncé, sinon le repasser rejouerait la fête.
 */
export async function rememberMilestone(goalId: string, pct: number): Promise<void> {
  const seen = await read();
  const next = Math.max(seen[goalId] ?? 0, highestMilestone(pct));
  if (next === (seen[goalId] ?? 0)) return;
  await write({ ...seen, [goalId]: next });
}

/** Nettoie les objectifs supprimés, pour ne pas garder une mémoire morte. */
export async function pruneMilestones(liveGoalIds: readonly string[]): Promise<void> {
  const seen = await read();
  const live = new Set(liveGoalIds);
  const kept = Object.fromEntries(Object.entries(seen).filter(([id]) => live.has(id)));
  if (Object.keys(kept).length !== Object.keys(seen).length) await write(kept);
}
