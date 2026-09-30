// Période d'une dépense : un poste qui commence en septembre ne compte pas en janvier.
import { amountForMonth, expenseSeries, isExpenseActive, normalizeMonths, periodLabel } from "../app/_budget/expensePeriod";
import type { ExpenseItem } from "../app/_budget/types";

const parse = (v: string) => parseFloat(v) || 0;
const item = (amount: string, activeMonths?: number[]): ExpenseItem =>
  ({ id: "x", family: "besoins", label: "Loyer", icon: "home", color: "#000", amount, activeMonths }) as ExpenseItem;

describe("normalizeMonths", () => {
  it("tous les mois, ou aucun, vaut « toute l'année »", () => {
    expect(normalizeMonths(undefined)).toBeUndefined();
    expect(normalizeMonths([])).toBeUndefined();
    expect(normalizeMonths([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toBeUndefined();
  });
  it("trie, dédoublonne et ignore l'invalide", () => {
    expect(normalizeMonths([11, 8, 8, 13, -1, 9])).toEqual([8, 9, 11]);
  });
});

describe("expenseSeries", () => {
  it("loyer et prêts chaque mois, postes selon leur période", () => {
    const s = expenseSeries([item("100", [8, 9, 10, 11]), item("50")], 700, parse);
    expect(s[0]).toBe(750); // janvier : pas le poste de septembre
    expect(s[8]).toBe(850); // septembre
    expect(s).toHaveLength(12);
    expect(s.reduce((a, b) => a + b, 0)).toBe(750 * 8 + 850 * 4);
  });
  it("isExpenseActive / amountForMonth", () => {
    expect(isExpenseActive(item("1"), 3)).toBe(true);
    expect(isExpenseActive(item("1", [8]), 3)).toBe(false);
    expect(amountForMonth(item("40", [8]), 8, parse)).toBe(40);
    expect(amountForMonth(item("40", [8]), 7, parse)).toBe(0);
  });
});

describe("periodLabel", () => {
  const short = (i: number) => ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."][i];
  it("toute l'année, une suite, ou une liste", () => {
    expect(periodLabel(undefined, short, "Toute l'année")).toBe("Toute l'année");
    expect(periodLabel([8, 9, 10, 11], short, "x")).toBe("sept. → déc.");
    expect(periodLabel([0, 2, 5], short, "x")).toBe("janv., mars, juin");
  });
});
