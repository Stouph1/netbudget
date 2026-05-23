// Taux de change temps réel via open.er-api.com (gratuit, sans clé, inclut XOF/XAF CFA).
// Mise en cache dans AsyncStorage : valide 6h pour éviter de spammer l'API.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { CurrencyCode } from "./currency";

const ENDPOINT = "https://open.er-api.com/v6/latest/USD";
const CACHE_KEY = "netbudget:exchange-rates";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 h

export type RatesPayload = {
  base: "USD"; // on stocke toujours en base USD pour la conversion
  rates: Record<string, number>;
  fetchedAt: number; // timestamp ms
};

// Fixed pegged rates (au cas où l'API ne renverrait pas XOF/XAF, ou pour valider).
// Le franc CFA est arrimé à l'Euro à 1 EUR = 655,957 F CFA depuis 1999.
const PEGGED_TO_EUR: Partial<Record<CurrencyCode, number>> = {
  XOF: 655.957,
  XAF: 655.957,
};

export async function loadCachedRates(): Promise<RatesPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RatesPayload;
  } catch {
    return null;
  }
}

async function saveCachedRates(payload: RatesPayload): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // silencieux
  }
}

/** Vrai si la dernière fetch date de moins de CACHE_TTL_MS. */
export function isFresh(p: RatesPayload | null): boolean {
  if (!p) return false;
  return Date.now() - p.fetchedAt < CACHE_TTL_MS;
}

/**
 * Récupère les taux. Si le cache est frais, le renvoie sans appel réseau.
 * Si `force === true`, force le rafraîchissement depuis l'API.
 */
export async function getRates(force = false): Promise<RatesPayload | null> {
  const cached = await loadCachedRates();
  if (!force && isFresh(cached)) return cached;

  try {
    const res = await fetch(ENDPOINT);
    if (!res.ok) return cached; // garde le cache si l'API échoue
    const data = await res.json();
    if (data?.result !== "success" || !data?.rates) return cached;
    const payload: RatesPayload = {
      base: "USD",
      rates: { ...data.rates, ...rebaseFixedPegs(data.rates) },
      fetchedAt: Date.now(),
    };
    await saveCachedRates(payload);
    return payload;
  } catch {
    return cached;
  }
}

// Si l'API renvoie un EUR/USD mais pas XOF/XAF, on calcule les pegs sur la base USD.
function rebaseFixedPegs(rates: Record<string, number>): Record<string, number> {
  const eurPerUsd = rates.EUR;
  if (!eurPerUsd) return {};
  const out: Record<string, number> = {};
  for (const [code, perEur] of Object.entries(PEGGED_TO_EUR)) {
    if (typeof perEur === "number") {
      // perEur = X CFA pour 1 EUR → X CFA pour eurPerUsd EUR (= 1 USD)
      out[code] = perEur * eurPerUsd;
    }
  }
  return out;
}

/**
 * Convertit `amount` depuis `from` vers `to` en utilisant le payload.
 * Renvoie 0 si le taux est inconnu.
 */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  payload: RatesPayload | null
): number {
  if (!payload || !isFinite(amount)) return 0;
  if (from === to) return amount;
  const fromRate = from === "USD" ? 1 : payload.rates[from];
  const toRate = to === "USD" ? 1 : payload.rates[to];
  if (!fromRate || !toRate) return 0;
  // amount en USD puis vers `to`
  const usd = amount / fromRate;
  return usd * toRate;
}
