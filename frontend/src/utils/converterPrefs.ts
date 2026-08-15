// Persistance du convertisseur : paire de devises, montant, historique.
//
// POURQUOI CE FICHIER EXISTE : tout l'état du convertisseur vivait en mémoire.
// Quelqu'un qui convertit des euros en francs CFA retrouvait EUR → USD à chaque
// réouverture de l'app, et son historique effacé. Sur un outil qu'on utilise
// justement parce qu'on a TOUJOURS la même paire à convertir, c'est le défaut
// qui fait abandonner.
//
// La lecture est tolérante : un stockage corrompu, une devise supprimée du
// référentiel ou un ancien format ne doivent jamais empêcher le convertisseur
// de s'ouvrir. Dans le doute, on repart des valeurs par défaut.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { CURRENCIES, type CurrencyCode } from "./currency";

const KEY = "netbudget:converter";

/** Nombre de conversions conservées — au-delà, l'historique n'est plus consulté. */
const HISTORY_MAX = 15;

export type ConverterHistoryEntry = {
  id: string;
  from: CurrencyCode;
  to: CurrencyCode;
  amount: number;
  result: number;
  timestamp: number;
};

export type ConverterPrefs = {
  from: CurrencyCode;
  to: CurrencyCode;
  amount: string;
  history: ConverterHistoryEntry[];
};

export const DEFAULT_CONVERTER_PREFS: ConverterPrefs = {
  from: "EUR",
  to: "USD",
  amount: "100",
  history: [],
};

function isKnownCurrency(code: unknown): code is CurrencyCode {
  return typeof code === "string" && CURRENCIES.some((c) => c.code === code);
}

function sanitizeEntry(raw: unknown): ConverterHistoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  if (!isKnownCurrency(e.from) || !isKnownCurrency(e.to)) return null;
  if (typeof e.amount !== "number" || !Number.isFinite(e.amount)) return null;
  if (typeof e.result !== "number" || !Number.isFinite(e.result)) return null;
  return {
    id: typeof e.id === "string" ? e.id : `${e.timestamp ?? 0}`,
    from: e.from,
    to: e.to,
    amount: e.amount,
    result: e.result,
    timestamp: typeof e.timestamp === "number" ? e.timestamp : 0,
  };
}

/**
 * Valide un contenu stocké et complète ce qui manque.
 *
 * Exporté séparément de la lecture disque pour être testable sans AsyncStorage.
 */
export function sanitizeConverterPrefs(raw: unknown): ConverterPrefs {
  if (!raw || typeof raw !== "object") return DEFAULT_CONVERTER_PREFS;
  const p = raw as Record<string, unknown>;
  // Une devise retirée du référentiel entre deux versions ne doit pas bloquer
  // l'écran : on retombe sur la valeur par défaut pour ce champ seulement.
  const from = isKnownCurrency(p.from) ? p.from : DEFAULT_CONVERTER_PREFS.from;
  const to = isKnownCurrency(p.to) ? p.to : DEFAULT_CONVERTER_PREFS.to;
  const amount =
    typeof p.amount === "string" && p.amount.trim() !== ""
      ? p.amount
      : DEFAULT_CONVERTER_PREFS.amount;
  const history = Array.isArray(p.history)
    ? p.history
        .map(sanitizeEntry)
        .filter((e): e is ConverterHistoryEntry => e !== null)
        .slice(0, HISTORY_MAX)
    : [];
  return { from, to, amount, history };
}

export async function loadConverterPrefs(): Promise<ConverterPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_CONVERTER_PREFS;
    return sanitizeConverterPrefs(JSON.parse(raw));
  } catch {
    return DEFAULT_CONVERTER_PREFS;
  }
}

export async function saveConverterPrefs(prefs: ConverterPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ ...prefs, history: prefs.history.slice(0, HISTORY_MAX) }),
    );
  } catch {}
}
