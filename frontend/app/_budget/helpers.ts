// Helpers PURS de l'écran Budget (ex-app/index.tsx).
//
// Aucune dépendance à react-native ni à React : ce module est testable hors
// bundler Metro (voir helpers.test.ts).
import { computeLoanMonthlyPayment, parseNumber } from "../../src/utils/finance";
import { convert } from "../../src/utils/exchangeRates";
import type { CurrencyCode } from "../../src/utils/currency";
import { DEFAULT_ITEMS } from "./constants";
import type { ExpenseItem, Loan, Translate } from "./types";

// La date de 1re échéance se saisit en MM/AAAA (le jour n'a pas d'importance
// pour un échéancier mensuel) et se stocke en ISO.
// Saisie de la date : on ne garde que les chiffres et on formate en MM/AAAA
// au fur et à mesure. Le clavier numérique n'a pas de touche "/" — l'utilisateur
// tape 092023, l'app affiche 09/2023.
export function formatMonthInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function monthInputToIso(input: string): string | undefined {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 6) return undefined;
  const month = parseInt(digits.slice(0, 2), 10);
  const year = parseInt(digits.slice(2), 10);
  if (month < 1 || month > 12) return undefined;
  if (year < 1950 || year > 2100) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function isoToMonthInput(iso: string | undefined): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[2]}/${m[1]}` : "";
}

export function loanMonthlyPayment(l: Loan): number {
  if (l.mode === "direct") return parseNumber(l.directMonthly || "0");
  return computeLoanMonthlyPayment(
    parseNumber(l.principal),
    parseNumber(l.ratePercent),
    parseNumber(l.years)
  );
}

// Renvoie le label affiche pour un item : prefere la traduction si labelKey existe,
// sauf si l'utilisateur a renomme l'item (label != labelKey FR par defaut).
export function displayItemLabel(item: ExpenseItem, tt: Translate): string {
  if (item.labelKey) return tt(item.labelKey);
  return item.label;
}

// Backfill labelKey pour les items par défaut sauvegardés avant l'i18n des
// labels — utilisé à l'hydratation ET au switch de scope budget.
export function backfillItemLabels(items: ExpenseItem[]): ExpenseItem[] {
  return items.map((it) => {
    if (it.labelKey) return it;
    const def = DEFAULT_ITEMS.find((d) => d.id === it.id);
    if (def && def.labelKey && it.label === def.label) {
      return { ...it, labelKey: def.labelKey };
    }
    return it;
  });
}

export function sumAmounts(items: ExpenseItem[]): number {
  return items.reduce((s: number, it: ExpenseItem) => s + parseNumber(it.amount), 0);
}

// Convertit un champ texte de montant d'une devise à l'autre.
export function convertOne(
  raw: string,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Parameters<typeof convert>[3],
  decimals: number,
): string {
  const n = parseNumber(raw);
  if (!n) return raw;
  const c = convert(n, from, to, rates);
  if (!isFinite(c) || c === 0) return raw;
  return decimals === 0 ? String(Math.round(c)) : c.toFixed(2);
}

/**
 * Ancienneté d'un horodatage, décomposée SANS être formatée : la phrase
 * (« il y a 3 h », « 3 h ago », « 3時間前 ») dépend de la langue et appartient
 * donc à l'appelant. Renvoyait du français en dur, visible dans les 8 langues.
 */
export function relativeAgoParts(
  ts: number,
  now: number = Date.now(),
): { unit: "now" | "min" | "hour" | "day"; value: number } {
  const diffMin = Math.round((now - ts) / 60000);
  if (diffMin < 1) return { unit: "now", value: 0 };
  if (diffMin < 60) return { unit: "min", value: diffMin };
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return { unit: "hour", value: diffH };
  return { unit: "day", value: Math.round(diffH / 24) };
}
