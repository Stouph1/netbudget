// Dérivations chiffrées du budget : revenus nets, totaux par famille, reste à
// vivre, conseils, camembert et projection mois par mois.
//
// Que des calculs mémoïsés à partir de l'état — aucun effet de bord, aucune
// écriture. Les seuils des conseils suivent le mix personnalisé (`budgetRatio`).
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
import { displayItemLabel, loanMonthlyPayment, sumAmounts } from "./helpers";
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

  const familyTotals: Record<ExpenseFamily, number> = {
    besoins: sumAmounts(itemsByFamily.besoins),
    loisirs: sumAmounts(itemsByFamily.loisirs),
    epargne: sumAmounts(itemsByFamily.epargne),
  };

  const totalExpenses = familyTotals.besoins + familyTotals.loisirs + familyTotals.epargne;

  const monthlyExpenses = rentNum + loansMonthly + totalExpenses;
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
      const v = parseNumber(it.amount);
      if (v > 0) segs.push({ label: displayItemLabel(it, t), value: v, color: it.color });
    }
    segs.push({ label: t("donut.remaining"), value: remaining > 0 ? remaining : 0, color: GOLD });
    return segs;
  }, [rentNum, loansMonthly, expenseItems, remaining, lang]);

  // Projection mensuelle : utilise directement la série de nets calculée par income.ts
  const months: MonthRow[] = useMemo(
    () =>
      netSeries.map((income, i) => ({
        index: i,
        name: t(MONTH_KEYS_LONG[i]),
        shortName: t(MONTH_KEYS_SHORT[i]),
        income,
        expenses: monthlyExpenses,
        remaining: income - monthlyExpenses,
      })),
    [netSeries, monthlyExpenses, lang]
  );
  const annualIncome = months.reduce((s, m) => s + m.income, 0);
  const annualExpenses = monthlyExpenses * 12;
  const annualRemaining = annualIncome - annualExpenses;
  const currentMonthIndex = new Date().getMonth();

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
