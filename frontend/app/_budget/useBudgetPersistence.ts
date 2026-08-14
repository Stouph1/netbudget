// Persistance du budget : scope actif, sauvegarde et historique mensuel.
//
// Trois responsabilités, dans cet ordre (l'ordre des effets est significatif) :
//  1. charger le budget du scope cible avant de réactiver la sauvegarde ;
//  2. sauvegarder à chaque changement, une fois l'hydratation faite ;
//  3. enregistrer un point d'historique par mois et par scope (débounce 2,5 s).
//
// Le chargement initial (hydratation depuis AsyncStorage) reste dans
// app/index.tsx : il doit se déclencher avant ces effets.
import { useCallback, useEffect, useState } from "react";
import { CurrencyCode } from "../../src/utils/currency";
import { Lang } from "../../src/i18n/translations";
import { City } from "../../src/constants/cities";
import { parseNumber } from "../../src/utils/finance";
import { defaultIncomeSource, IncomeSource } from "../../src/utils/income";
import { loadState, saveState } from "../../src/utils/storage";
import {
  loadBudget,
  recordBudgetHistoryPoint,
  saveBudget,
} from "../../src/lib/premiumStore";
import { DEFAULT_ITEMS } from "./constants";
import { backfillItemLabels, displayItemLabel } from "./helpers";
import type { ExpenseFamily, ExpenseItem, Loan, Translate } from "./types";

export function useBudgetPersistence({
  hydrated,
  userId,
  activeWorkspaceId,
  incomes,
  setIncomes,
  rent,
  setRent,
  expenseItems,
  setExpenseItems,
  loans,
  setLoans,
  city,
  currency,
  lang,
  netMensuel,
  monthlyExpenses,
  remaining,
  rentNum,
  loansMonthly,
  familyTotals,
  t,
}: {
  hydrated: boolean;
  /** `premiumUser?.id` — absent = free tier, tout reste local. */
  userId: string | undefined;
  activeWorkspaceId: string | null;
  incomes: IncomeSource[];
  setIncomes: React.Dispatch<React.SetStateAction<IncomeSource[]>>;
  rent: string;
  setRent: React.Dispatch<React.SetStateAction<string>>;
  expenseItems: ExpenseItem[];
  setExpenseItems: React.Dispatch<React.SetStateAction<ExpenseItem[]>>;
  loans: Loan[];
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  city: City;
  currency: CurrencyCode;
  lang: Lang;
  netMensuel: number;
  monthlyExpenses: number;
  remaining: number;
  rentNum: number;
  loansMonthly: number;
  familyTotals: Record<ExpenseFamily, number>;
  t: Translate;
}) {
  // ----- Budget scopé par workspace (Premium) -----
  // Les données budget en mémoire appartiennent à `budgetScope` (null = perso).
  // Perso / free tier : AsyncStorage local, strictement comme avant.
  // Workspace : cloud partagé entre membres (encrypted_payloads "budget")
  // + cache local par scope pour l'offline.
  const budgetScopeTarget = userId ? activeWorkspaceId : null;
  const [budgetScope, setBudgetScope] = useState<string | null>(null);
  const [budgetSwitcherOpen, setBudgetSwitcherOpen] = useState(false);

  const applyBudgetSnapshot = useCallback(
    (d: {
      incomes?: unknown[];
      rent?: string;
      expenseItems?: unknown[];
      loans?: unknown[];
    } | null) => {
      setIncomes(
        Array.isArray(d?.incomes) && d.incomes.length > 0
          ? (d.incomes as IncomeSource[])
          : [defaultIncomeSource()],
      );
      setRent(typeof d?.rent === "string" ? d.rent : "0");
      setExpenseItems(
        Array.isArray(d?.expenseItems) && d.expenseItems.length > 0
          ? backfillItemLabels(d.expenseItems as ExpenseItem[])
          : DEFAULT_ITEMS,
      );
      setLoans(Array.isArray(d?.loans) ? (d.loans as Loan[]) : []);
    },
    [],
  );

  // Changement de scope → charge le budget du scope cible avant de réactiver
  // la sauvegarde (sinon on écrirait les données d'un scope dans l'autre).
  useEffect(() => {
    if (!hydrated) return;
    if (budgetScopeTarget === budgetScope) return;
    let cancelled = false;
    (async () => {
      if (budgetScopeTarget && userId) {
        const b = await loadBudget(userId, budgetScopeTarget);
        if (cancelled) return;
        applyBudgetSnapshot(b);
      } else {
        const stored = await loadState();
        if (cancelled) return;
        applyBudgetSnapshot(stored ?? null);
      }
      if (!cancelled) setBudgetScope(budgetScopeTarget);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, budgetScopeTarget, budgetScope, userId, applyBudgetSnapshot]);

  // ----- Persistance : sauvegarde à chaque changement (après hydratation) -----
  useEffect(() => {
    if (!hydrated) return;
    // Switch de scope en cours : suspend la sauvegarde jusqu'au chargement.
    if (budgetScope !== budgetScopeTarget) return;
    if (budgetScope === null) {
      saveState({
        incomes,
        rent,
        expenseItems,
        loans,
        cityId: city.id,
        currency,
        lang,
      });
    } else if (userId) {
      saveBudget(
        userId,
        { incomes, rent, expenseItems, loans },
        budgetScope,
      );
      // Devise / langue / ville restent des réglages device : on les merge
      // dans le stockage local SANS toucher au budget perso qui y vit.
      (async () => {
        const stored = await loadState();
        await saveState({ ...(stored ?? {}), cityId: city.id, currency, lang });
      })();
    }
  }, [
    hydrated,
    budgetScope,
    budgetScopeTarget,
    incomes,
    rent,
    expenseItems,
    loans,
    city,
    currency,
    lang,
    userId,
  ]);

  // ----- Historique budget (Premium) : un point agrégé par mois et par scope,
  // pour la carte "Évolution du budget" de l'onglet Profil. Débounce 2,5 s
  // pour ne pas écrire à chaque frappe. -----
  useEffect(() => {
    if (!hydrated || !userId) return;
    if (budgetScope !== budgetScopeTarget) return;
    if (netMensuel <= 0 && monthlyExpenses <= 0) return; // budget vide → pas de bruit
    const scope = budgetScope;
    const timer = setTimeout(() => {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      recordBudgetHistoryPoint(userId, scope, {
        month,
        net: Math.round(netMensuel),
        expenses: Math.round(monthlyExpenses),
        remaining: Math.round(remaining),
        // Détail du mois — alimente la fiche mois + la comparaison dans le Profil
        breakdown: {
          rent: Math.round(rentNum),
          loans: Math.round(loansMonthly),
          besoins: Math.round(familyTotals.besoins),
          loisirs: Math.round(familyTotals.loisirs),
          epargne: Math.round(familyTotals.epargne),
          items: expenseItems
            .map((it) => ({
              id: it.id,
              label: displayItemLabel(it, t),
              family: it.family,
              amount: Math.round(parseNumber(it.amount)),
            }))
            .filter((it) => it.amount > 0),
        },
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    userId,
    budgetScope,
    budgetScopeTarget,
    netMensuel,
    monthlyExpenses,
    remaining,
    rentNum,
    loansMonthly,
    expenseItems,
    lang,
  ]);

  return { budgetScope, budgetScopeTarget, budgetSwitcherOpen, setBudgetSwitcherOpen };
}
