// Conversion des montants ENREGISTRÉS quand l'utilisateur change de devise.
//
// Le problème résolu : changer la devise ne changeait que le symbole. Un
// budget de 12 000 € devenait « 12 000 ¥ » — soit environ 70 € réels. Absurde
// pour un mariage, et dangereux pour n'importe quelle décision financière.
//
// Choix d'architecture : on convertit les VALEURS une bonne fois, plutôt que
// de garder une devise de référence et de convertir à l'affichage. Deux
// raisons : les saisies restent cohérentes (l'utilisateur tape dans la devise
// qu'il voit), et il n'y a jamais deux devises en circulation dans les mêmes
// données — donc aucun risque d'additionner des euros et des yens.
//
// Les taux viennent de exchangeRates.ts (open.er-api.com, mis en cache).

import { convert, type RatesPayload } from "./exchangeRates";
import type { CurrencyCode } from "./currency";

/** Convertit une chaîne de montant en gardant le format « champ texte ». */
function convertField(
  raw: string | undefined,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: RatesPayload,
  decimals: number,
): string | undefined {
  if (raw === undefined || raw === null) return raw;
  const n = parseFloat(String(raw).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n === 0) return raw;
  const converted = convert(n, from, to, rates);
  if (!Number.isFinite(converted) || converted === 0) return raw;
  return decimals === 0 ? String(Math.round(converted)) : converted.toFixed(2);
}

function convertNumber(
  n: number | undefined | null,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: RatesPayload,
): number {
  if (typeof n !== "number" || !Number.isFinite(n) || n === 0) return n ?? 0;
  const c = convert(n, from, to, rates);
  return Number.isFinite(c) && c !== 0 ? Math.round(c * 100) / 100 : n;
}

/**
 * Budget du tab principal (revenus, loyer, prêts, dépenses).
 * Les montants y sont des CHAÎNES (champs de saisie).
 *
 * Note : le TAUX d'un prêt et sa DURÉE ne se convertissent pas — seuls les
 * montants. Même chose pour les pourcentages de charges des revenus.
 */
export function convertBudgetState(
  state: Record<string, unknown>,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: RatesPayload,
  decimals = 2,
): Record<string, unknown> {
  const next = { ...state };

  if (typeof next.rent === "string") {
    next.rent = convertField(next.rent, from, to, rates, decimals);
  }

  if (Array.isArray(next.incomes)) {
    next.incomes = (next.incomes as Record<string, unknown>[]).map((inc) => ({
      ...inc,
      amount: convertField(inc.amount as string, from, to, rates, decimals),
    }));
  }

  if (Array.isArray(next.loans)) {
    next.loans = (next.loans as Record<string, unknown>[]).map((l) => ({
      ...l,
      principal: convertField(l.principal as string, from, to, rates, decimals),
      directMonthly: convertField(l.directMonthly as string, from, to, rates, decimals),
      // ratePercent et years restent intacts : ce ne sont pas des montants.
    }));
  }

  if (Array.isArray(next.expenseItems)) {
    next.expenseItems = (next.expenseItems as Record<string, unknown>[]).map((it) => ({
      ...it,
      amount: convertField(it.amount as string, from, to, rates, decimals),
    }));
  }

  return next;
}

/** Objectifs d'épargne (payload S1) : montants numériques. */
export function convertGoals<T extends Record<string, unknown>>(
  payload: T,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: RatesPayload,
): T {
  const next: Record<string, unknown> = { ...payload };
  if (Array.isArray(next.goals)) {
    next.goals = (next.goals as Record<string, unknown>[]).map((g) => ({
      ...g,
      targetAmount: convertNumber(g.targetAmount as number, from, to, rates),
      currentAmount: convertNumber(g.currentAmount as number, from, to, rates),
      // Le champ s'appelle monthlyContribution — « monthlyPlan » n'existait pas,
      // d'où des objectifs partiellement convertis.
      monthlyContribution:
        g.monthlyContribution === undefined
          ? undefined
          : convertNumber(g.monthlyContribution as number, from, to, rates),
    }));
  }
  return next as T;
}

/** Budgets d'événements : postes, épargne mise de côté, relevés de prix. */
export function convertEvents<T extends Record<string, unknown>>(
  events: T[],
  from: CurrencyCode,
  to: CurrencyCode,
  rates: RatesPayload,
): T[] {
  return events.map((ev) => {
    const next: Record<string, unknown> = { ...ev };
    next.saved = convertNumber(next.saved as number, from, to, rates);
    if (Array.isArray(next.items)) {
      next.items = (next.items as Record<string, unknown>[]).map((it) => ({
        ...it,
        estimated: convertNumber(it.estimated as number, from, to, rates),
        actual:
          it.actual === null || it.actual === undefined
            ? it.actual
            : convertNumber(it.actual as number, from, to, rates),
      }));
    }
    if (Array.isArray(next.quotes)) {
      next.quotes = (next.quotes as Record<string, unknown>[]).map((q) => ({
        ...q,
        price: convertNumber(q.price as number, from, to, rates),
      }));
    }
    return next as T;
  });
}

/** Historique de budget : chaque point mensuel et sa ventilation. */
export function convertHistory<T extends Record<string, unknown>>(
  points: T[],
  from: CurrencyCode,
  to: CurrencyCode,
  rates: RatesPayload,
): T[] {
  const cv = (n: unknown) => convertNumber(n as number, from, to, rates);
  return points.map((pt) => {
    const next: Record<string, unknown> = { ...pt };
    for (const k of ["net", "expenses", "remaining", "besoins", "loisirs", "epargne"]) {
      if (typeof next[k] === "number") next[k] = cv(next[k]);
    }
    const b = next.breakdown as Record<string, unknown> | undefined;
    if (b) {
      const nb: Record<string, unknown> = { ...b };
      for (const k of ["rent", "loans"]) {
        if (typeof nb[k] === "number") nb[k] = cv(nb[k]);
      }
      if (nb.familyTotals && typeof nb.familyTotals === "object") {
        const ft = nb.familyTotals as Record<string, unknown>;
        nb.familyTotals = Object.fromEntries(
          Object.entries(ft).map(([k, v]) => [k, cv(v)]),
        );
      }
      if (Array.isArray(nb.items)) {
        nb.items = (nb.items as Record<string, unknown>[]).map((it) => ({
          ...it,
          amount: cv(it.amount),
        }));
      }
      next.breakdown = nb;
    }
    return next as T;
  });
}
