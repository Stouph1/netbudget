// Période d'une dépense : les mois (0-11) où elle s'applique.
//
// LE PROBLÈME QU'ON RÈGLE. Un revenu peut ne commencer qu'en septembre
// (`activeMonths` sur IncomeSource), mais une dépense s'appliquait toujours
// aux douze mois : de janvier à août, le tableau affichait un mois « dans le
// rouge » alors que la personne n'avait simplement pas renseigné cette période.
// Une dépense a maintenant la même option qu'un revenu : absent = toute
// l'année, sinon la liste des mois.
import type { ExpenseItem } from "./types";

export const ALL_MONTHS: number[] = Array.from({ length: 12 }, (_, i) => i);

/** La dépense s'applique-t-elle ce mois-là ? Sans période : toujours. */
export function isExpenseActive(it: Pick<ExpenseItem, "activeMonths">, month: number): boolean {
  return !it.activeMonths || it.activeMonths.includes(month);
}

/** `undefined` quand tous les mois sont cochés : c'est la valeur « toute l'année ». */
export function normalizeMonths(months: number[] | null | undefined): number[] | undefined {
  if (!months) return undefined;
  const clean = [...new Set(months.filter((m) => Number.isInteger(m) && m >= 0 && m < 12))].sort((a, b) => a - b);
  return clean.length === 0 || clean.length === 12 ? undefined : clean;
}

/** Montant d'un poste pour un mois, ou 0 s'il ne s'applique pas. */
export function amountForMonth(it: ExpenseItem, month: number, parse: (v: string) => number): number {
  return isExpenseActive(it, month) ? parse(it.amount) : 0;
}

/** Les douze totaux mensuels : loyer et prêts chaque mois, postes selon leur période. */
export function expenseSeries(
  items: ExpenseItem[],
  fixedMonthly: number,
  parse: (v: string) => number,
): number[] {
  return ALL_MONTHS.map((m) => fixedMonthly + items.reduce((s, it) => s + amountForMonth(it, m, parse), 0));
}

/**
 * Libellé court d'une période : « toute l'année », « sept. → déc. » pour une
 * suite de mois, « janv., mars, juin » sinon.
 */
export function periodLabel(
  months: number[] | undefined,
  shortMonth: (i: number) => string,
  allLabel: string,
): string {
  const norm = normalizeMonths(months);
  if (!norm) return allLabel;
  const contiguous = norm.every((m, i) => i === 0 || m === norm[i - 1] + 1);
  if (contiguous && norm.length > 1) return `${shortMonth(norm[0])} → ${shortMonth(norm[norm.length - 1])}`;
  return norm.map(shortMonth).join(", ");
}
