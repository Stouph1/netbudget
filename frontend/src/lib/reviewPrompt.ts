// Demande de note sur la boutique.
//
// QUAND DEMANDER. Jamais au premier lancement : on ne note pas une app qu'on
// vient d'ouvrir. On demande juste après un bon moment (point du mois validé,
// palier de série, objectif qui avance, formule débloquée), à quelqu'un qui
// revient : au moins trois jours d'usage distincts, deux jours après la
// première ouverture.
//
// COMBIEN DE FOIS. Apple plafonne à trois affichages par an et peut en ignorer
// certains sans le dire. On espace donc les demandes de 90 jours et on en
// garde au plus trois sur douze mois : au-delà, on gaspille des occasions que
// la boutique n'affichera pas.
//
// Le module est PUR pour la règle (`shouldAskForReview`) ; seul l'enrobage
// touche au stockage et à la boutique.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";

const KEY = "netbudget:review";
const DAY_MS = 86_400_000;

export const MIN_ACTIVE_DAYS = 3;
export const MIN_DAYS_SINCE_FIRST = 2;
export const MIN_DAYS_BETWEEN_ASKS = 90;
export const MAX_ASKS_PER_YEAR = 3;

export type ReviewState = {
  /** Première ouverture connue (ISO). */
  firstOpen: string | null;
  /** Jours d'usage distincts, au format AAAA-MM-JJ, les plus récents gardés. */
  activeDays: string[];
  /** Dates des demandes déjà faites (ISO). */
  asked: string[];
};

const EMPTY: ReviewState = { firstOpen: null, activeDays: [], asked: [] };

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Faut-il demander une note maintenant ? Règle pure, testée. */
export function shouldAskForReview(state: ReviewState, now: Date): boolean {
  if (!state.firstOpen) return false;
  const first = new Date(state.firstOpen).getTime();
  if (Number.isNaN(first)) return false;
  if (now.getTime() - first < MIN_DAYS_SINCE_FIRST * DAY_MS) return false;
  if (new Set(state.activeDays).size < MIN_ACTIVE_DAYS) return false;

  const asks = state.asked
    .map((s) => new Date(s).getTime())
    .filter((t) => !Number.isNaN(t));
  const last = Math.max(-Infinity, ...asks);
  if (now.getTime() - last < MIN_DAYS_BETWEEN_ASKS * DAY_MS) return false;
  const lastYear = asks.filter((t) => now.getTime() - t < 365 * DAY_MS);
  return lastYear.length < MAX_ASKS_PER_YEAR;
}

/** Enregistre un jour d'usage. Pur : renvoie le nouvel état. */
export function withVisit(state: ReviewState, now: Date): ReviewState {
  const day = dayKey(now);
  const activeDays = state.activeDays.includes(day)
    ? state.activeDays
    : [...state.activeDays, day].slice(-30);
  return { ...state, firstOpen: state.firstOpen ?? now.toISOString(), activeDays };
}

async function read(): Promise<ReviewState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<ReviewState>;
    return {
      firstOpen: typeof p.firstOpen === "string" ? p.firstOpen : null,
      activeDays: Array.isArray(p.activeDays) ? p.activeDays.filter((d) => typeof d === "string") : [],
      asked: Array.isArray(p.asked) ? p.asked.filter((d) => typeof d === "string") : [],
    };
  } catch {
    return EMPTY;
  }
}

async function write(s: ReviewState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/** À appeler à chaque lancement. */
export async function recordReviewVisit(now: Date = new Date()): Promise<void> {
  await write(withVisit(await read(), now));
}

/**
 * À appeler juste après un bon moment. Ne fait rien si la règle ne le permet
 * pas, ni si la boutique n'est pas disponible. Ne rejette jamais.
 */
export async function askForReviewAfterHappyMoment(now: Date = new Date()): Promise<void> {
  try {
    const state = withVisit(await read(), now);
    if (!shouldAskForReview(state, now)) {
      await write(state);
      return;
    }
    if (!(await StoreReview.isAvailableAsync())) return;
    await write({ ...state, asked: [...state.asked, now.toISOString()].slice(-6) });
    await StoreReview.requestReview();
  } catch {
    // Non essentiel : une demande de note ne doit jamais casser un écran.
  }
}
