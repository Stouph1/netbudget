// Dérivations chiffrées du budget : revenus nets, totaux par famille, reste à
// vivre, conseils, camembert et projection mois par mois.
//
// Que des calculs mémoïsés à partir de l'état — aucun effet de bord, aucune
// écriture. Les seuils des conseils suivent le mix personnalisé (`budgetRatio`).
import { useAccent } from "../../src/contexts/ThemeContext";
import { useMemo } from "react";
import { AdviceItem, buildAdvice } from "../../src/utils/advice";
import { DonutSegment } from "../../src/components/DonutChart";
import { MonthRow } from "../../src/components/MonthlyBreakdown";
import { parseNumber } from "../../src/utils/finance";
import { Lang } from "../../src/i18n/translations";
import {
  annualGross,
  averageMonthlyNet,
  averageMonthlyTithe,
  IncomeSource,
  monthlyNetSeries,
} from "../../src/utils/income";
import {
  COLOR_LOYER,
  COLOR_PRETS,
  DANGER,
  GOLD,
  MONTH_KEYS_LONG,
  MONTH_KEYS_SHORT,
} from "./constants";
import { displayItemLabel, loanMonthlyPayment } from "./helpers";
import { amountForMonth, expenseSeries } from "./expensePeriod";
import type { ExpenseFamily, ExpenseItem, Loan, Translate } from "./types";

export function useBudgetTotals({
  incomes,
  tithePercent,
  rent,
  loans,
  expenseItems,
  budgetRatio,
  t,
  lang,
}: {
  incomes: IncomeSource[];
  tithePercent: number;
  rent: string;
  loans: Loan[];
  expenseItems: ExpenseItem[];
  budgetRatio: { besoins: number; envies: number; epargne: number; personalized: boolean };
  t: Translate;
  /** Sert de clé de recalcul aux libellés traduits (donut, mois). */
  lang: Lang;
}) {
  // L'accent de l'espace colore le « reste » du donut.
  const GOLD = useAccent().main;
  // ---- Calculs revenus (multi-sources) ----
  const netSeries = useMemo(
    () => monthlyNetSeries(incomes, tithePercent),
    [incomes, tithePercent],
  );
  const netMensuel = useMemo(
    () => averageMonthlyNet(incomes, tithePercent),
    [incomes, tithePercent],
  );
  const totalBrutAnnuel = useMemo(() => annualGross(incomes), [incomes]);
  const monthlyTithe = useMemo(
    () => averageMonthlyTithe(incomes, tithePercent),
    [incomes, tithePercent],
  );
  const netAnnuel = netMensuel * 12;
  const brutMensuel = totalBrutAnnuel / 12;

  const rentNum = parseNumber(rent);

  const loansMonthly = useMemo(
    () => loans.reduce((s, l) => s + loanMonthlyPayment(l), 0),
    [loans]
  );

  const itemsByFamily = useMemo<Record<ExpenseFamily, ExpenseItem[]>>(
    () => ({
      besoins: expenseItems.filter((it: ExpenseItem) => it.family === "besoins"),
      loisirs: expenseItems.filter((it: ExpenseItem) => it.family === "loisirs"),
      epargne: expenseItems.filter((it: ExpenseItem) => it.family === "epargne"),
    }),
    [expenseItems]
  );

  // Les totaux « du mois » sont ceux du MOIS EN COURS : un poste qui ne
  // s'applique qu'à partir de septembre ne compte pas en mars. Le tableau
  // mois par mois, lui, applique la période de chaque poste à chaque ligne.
  const currentMonthIndex = new Date().getMonth();
  const sumThisMonth = (items: ExpenseItem[]) =>
    items.reduce((s, it) => s + amountForMonth(it, currentMonthIndex, parseNumber), 0);
  const familyTotals: Record<ExpenseFamily, number> = {
    besoins: sumThisMonth(itemsByFamily.besoins),
    loisirs: sumThisMonth(itemsByFamily.loisirs),
    epargne: sumThisMonth(itemsByFamily.epargne),
  };

  const totalExpenses = familyTotals.besoins + familyTotals.loisirs + familyTotals.epargne;

  const monthlyExpenses = rentNum + loansMonthly + totalExpenses;
  const expensesByMonth = useMemo(
    () => expenseSeries(expenseItems, rentNum + loansMonthly, parseNumber),
    [expenseItems, rentNum, loansMonthly],
  );
  const remaining = netMensuel - monthlyExpenses;
  const remainingColor = remaining >= 0 ? GOLD : DANGER;

  const advice: AdviceItem[] = useMemo(
    () =>
      buildAdvice({
        netMensuel,
        rent: rentNum,
        loansMonthly,
        besoinsExtra: familyTotals.besoins,
        loisirs: familyTotals.loisirs,
        epargne: familyTotals.epargne,
        remaining,
        // Seuils basés sur le mix personnalisé si Premium loggé (sinon 50/30/20)
        targetSplit: budgetRatio.personalized
          ? {
              besoins: budgetRatio.besoins,
              envies: budgetRatio.envies,
              epargne: budgetRatio.epargne,
            }
          : undefined,
      }),
    [netMensuel, rentNum, loansMonthly, familyTotals, remaining, budgetRatio]
  );

  // Donut
  const segments: DonutSegment[] = useMemo(() => {
    const segs: DonutSegment[] = [];
    if (rentNum > 0) segs.push({ label: t("donut.rent"), value: rentNum, color: COLOR_LOYER });
    if (loansMonthly > 0) segs.push({ label: t("donut.loans"), value: loansMonthly, color: COLOR_PRETS });
    for (const it of expenseItems) {
      const v = amountForMonth(it, currentMonthIndex, parseNumber);
      if (v > 0) segs.push({ label: displayItemLabel(it, t), value: v, color: it.color });
    }
    segs.push({ label: t("donut.remaining"), value: remaining > 0 ? remaining : 0, color: GOLD });
    return segs;
  }, [rentNum, loansMonthly, expenseItems, remaining, lang, currentMonthIndex]);

  // Projection mensuelle : utilise directement la série de nets calculée par income.ts
  const months: MonthRow[] = useMemo(
    () =>
      netSeries.map((income, i) => ({
        index: i,
        name: t(MONTH_KEYS_LONG[i]),
        shortName: t(MONTH_KEYS_SHORT[i]),
        income,
        expenses: expensesByMonth[i],
        remaining: income - expensesByMonth[i],
      })),
    [netSeries, expensesByMonth, lang]
  );
  const annualIncome = months.reduce((s, m) => s + m.income, 0);
  const annualExpenses = expensesByMonth.reduce((s, v) => s + v, 0);
  const annualRemaining = annualIncome - annualExpenses;

  return {
    netMensuel,
    totalBrutAnnuel,
    monthlyTithe,
    brutMensuel,
    rentNum,
    loansMonthly,
    itemsByFamily,
    familyTotals,
    totalExpenses,
    monthlyExpenses,
    remaining,
    remainingColor,
    advice,
    segments,
    months,
    annualIncome,
    annualExpenses,
    annualRemaining,
    currentMonthIndex,
  };
}
