// Stockage de la série de points mensuels.
//
// PUREMENT LOCAL, et ça n'est pas un oubli. La série est un encouragement, pas
// une donnée : la synchroniser demanderait de la chiffrer, de la fusionner
// entre appareils, de trancher les conflits — beaucoup de complexité pour un
// compteur. Sur un nouvel appareil elle repart de zéro, ce qui est le pire qui
// puisse arriver, et ce n'est pas grave.
//
// La clé est SÉPARÉE de `netbudget:state` : un point mensuel s'enregistre à un
// moment où l'écran principal n'est pas forcément en train de sauvegarder, et
// écrire dans le même objet ferait courir le risque d'écraser le budget avec
// une copie périmée.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { addSnapshot, previousSnapshot, type Snapshot } from "./recap";
import { computeStreak, markCheckIn, monthKey, type Month, type Streak } from "./streak";

const KEY = "netbudget:streak";

type Stored = {
  months: Month[];
  /** Derniers paliers déjà fêtés, pour ne pas rejouer la même célébration. */
  celebrated: number[];
  /** Chiffres relevés à chaque point, pour comparer d'un mois sur l'autre. */
  snapshots: Snapshot[];
};

const EMPTY: Stored = { months: [], celebrated: [], snapshots: [] };

async function read(): Promise<Stored> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      months: Array.isArray(parsed.months) ? parsed.months.filter(isMonth) : [],
      celebrated: Array.isArray(parsed.celebrated)
        ? parsed.celebrated.filter((n) => typeof n === "number")
        : [],
      snapshots: Array.isArray(parsed.snapshots)
        ? parsed.snapshots.filter(isSnapshot)
        : [],
    };
  } catch {
    // Un compteur illisible ne doit jamais empêcher l'app de démarrer.
    return EMPTY;
  }
}

// Une entrée corrompue fausserait la série sans qu'on le voie : on filtre au
// lieu de faire confiance à ce qui sort du disque.
function isMonth(v: unknown): v is Month {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

// Un instantané amputé d'un champ produirait un écart de plusieurs centaines
// d'euros sorti de nulle part, sur un écran censé rassurer.
function isSnapshot(v: unknown): v is Snapshot {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    isMonth(s.month) &&
    ["net", "expenses", "remaining"].every((k) => Number.isFinite(s[k]))
  );
}

async function write(s: Stored): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Silencieux : perdre un point de série ne vaut pas d'interrompre l'usage.
  }
}

export async function loadStreak(now: Date = new Date()): Promise<Streak> {
  return computeStreak((await read()).months, now);
}

/**
 * Enregistre le point du mois et rend la série à jour.
 *
 * `figures` est facultatif : sans budget saisi, il n'y a rien à photographier,
 * et le point reste valable — on ne refuse pas une habitude à quelqu'un qui
 * n'a pas encore rempli son budget.
 */
export async function recordCheckIn(
  figures?: Omit<Snapshot, "month">,
  now: Date = new Date(),
): Promise<Streak> {
  const stored = await read();
  const months = markCheckIn(stored.months, now);
  const snapshots = figures
    ? addSnapshot(stored.snapshots, { month: monthKey(now), ...figures })
    : stored.snapshots;
  await write({ ...stored, months, snapshots });
  return computeStreak(months, now);
}

/** Instantané du dernier point d'un mois précédent, ou null s'il n'y en a pas. */
export async function lastSnapshot(now: Date = new Date()): Promise<Snapshot | null> {
  return previousSnapshot((await read()).snapshots, monthKey(now));
}

/**
 * Un palier atteint n'est fêté qu'une fois : sans cette mémoire, la
 * célébration se rejouerait à chaque ouverture du mois.
 */
export async function claimMilestone(milestone: number): Promise<boolean> {
  const stored = await read();
  if (stored.celebrated.includes(milestone)) return false;
  await write({ ...stored, celebrated: [...stored.celebrated, milestone] });
  return true;
}

export async function clearStreak(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // idem
  }
}
