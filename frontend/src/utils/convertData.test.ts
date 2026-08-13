// Conversion de devise des données enregistrées.
//
// Deux bugs réels sont couverts ici :
//  - `monthlyPlan` au lieu de `monthlyContribution` : le versement mensuel des
//    objectifs n'était pas converti (champ inexistant, silencieux).
//  - Espaces partagés : les montants doivent pouvoir aller-retour entre deux
//    devises sans dériver, puisque chaque membre lit dans la sienne.

import {
  convertBudgetState,
  convertEvents,
  convertGoals,
  convertHistory,
} from "./convertData";
import type { RatesPayload } from "./exchangeRates";

// Taux fixes : 1 USD = 0,92 EUR = 155 JPY = 600 XOF.
const rates: RatesPayload = {
  rates: { EUR: 0.92, JPY: 155, USD: 1, XOF: 600 },
  base: "USD",
  fetchedAt: Date.now(),
} as RatesPayload;

describe("convertBudgetState", () => {
  const state = {
    rent: "1200",
    incomes: [{ amount: "3510", rate: "22" }],
    loans: [
      { principal: "119999", ratePercent: "3.4", years: "25", directMonthly: "0" },
    ],
    expenseItems: [{ amount: "400" }, { amount: "0" }],
  };

  it("convertit le loyer", () => {
    const out = convertBudgetState(state, "EUR", "JPY", rates, 0);
    // 1200 EUR ÷ 0,92 × 155 ≈ 202 174 JPY
    expect(Number(out.rent)).toBeCloseTo(202_174, -2);
  });

  it("NE convertit PAS le taux ni la durée d'un prêt", () => {
    const out = convertBudgetState(state, "EUR", "JPY", rates, 0) as typeof state;
    expect(out.loans[0].ratePercent).toBe("3.4");
    expect(out.loans[0].years).toBe("25");
  });

  it("laisse les montants nuls intacts", () => {
    const out = convertBudgetState(state, "EUR", "JPY", rates, 0) as typeof state;
    expect(out.expenseItems[1].amount).toBe("0");
  });

  it("revient à la valeur d'origine après un aller-retour", () => {
    const there = convertBudgetState(state, "EUR", "JPY", rates, 0);
    const back = convertBudgetState(there, "JPY", "EUR", rates, 2);
    expect(Number(back.rent)).toBeCloseTo(1200, 0);
  });

  it("respecte les devises sans décimale", () => {
    const out = convertBudgetState(state, "EUR", "XOF", rates, 0);
    expect(String(out.rent)).not.toContain(".");
  });
});

describe("convertGoals", () => {
  const payload = {
    goals: [{ targetAmount: 10_000, currentAmount: 2500, monthlyContribution: 300 }],
  };

  it("convertit la cible et le montant acquis", () => {
    const out = convertGoals(payload, "EUR", "JPY", rates);
    expect(out.goals[0].targetAmount).toBeCloseTo(1_684_783, -2);
    expect(out.goals[0].currentAmount).toBeCloseTo(421_196, -2);
  });

  it("convertit monthlyContribution (le champ visé était mal nommé)", () => {
    // Régression : le code convertissait `monthlyPlan`, qui n'existe pas.
    const out = convertGoals(payload, "EUR", "JPY", rates);
    expect(out.goals[0].monthlyContribution).toBeCloseTo(50_543, -2);
  });

  it("préserve un versement mensuel absent", () => {
    const sansVersement: { goals: { targetAmount: number; monthlyContribution?: number }[] } =
      { goals: [{ targetAmount: 100 }] };
    const out = convertGoals(sansVersement, "EUR", "USD", rates);
    expect(out.goals[0].monthlyContribution).toBeUndefined();
  });
});

describe("convertEvents", () => {
  const events = [
    {
      saved: 5000,
      items: [
        { estimated: 10_000, actual: null },
        { estimated: 2000, actual: 1800 },
      ],
      quotes: [{ price: 480 }],
    },
  ];

  it("convertit l'épargne, les postes et les relevés de prix", () => {
    const out = convertEvents(events, "EUR", "USD", rates);
    expect(out[0].saved).toBeCloseTo(5434.78, 1);
    expect(out[0].items[0].estimated).toBeCloseTo(10_869.57, 1);
    expect(out[0].quotes[0].price).toBeCloseTo(521.74, 1);
  });

  it("distingue « pas encore dépensé » (null) de zéro", () => {
    const out = convertEvents(events, "EUR", "USD", rates);
    expect(out[0].items[0].actual).toBeNull();
    expect(out[0].items[1].actual).toBeCloseTo(1956.52, 1);
  });
});

describe("convertHistory", () => {
  const points = [
    {
      net: 3510,
      expenses: 633,
      breakdown: {
        rent: 1200,
        familyTotals: { besoins: 400, loisirs: 200, epargne: 33 },
        items: [{ amount: 50 }],
      },
    },
  ];

  it("convertit les totaux mensuels et toute la ventilation", () => {
    const out = convertHistory(points, "EUR", "USD", rates);
    expect(out[0].net).toBeCloseTo(3815.22, 1);
    expect(out[0].breakdown.rent).toBeCloseTo(1304.35, 1);
    expect(out[0].breakdown.familyTotals.besoins).toBeCloseTo(434.78, 1);
    expect(out[0].breakdown.items[0].amount).toBeCloseTo(54.35, 1);
  });
});

describe("scénario espace partagé (Ramy en EUR, Stivie en JPY)", () => {
  // Le payload est stocké en EUR (devise de son créateur). Chacun le lit dans
  // sa devise ; les nombres en base ne bougent pas.
  const stored = {
    goals: [{ targetAmount: 10_000, currentAmount: 2500, monthlyContribution: 300 }],
  };

  it("chacun voit le même objectif dans sa monnaie", () => {
    const vuRamy = stored; // même devise que le stockage
    const vuStivie = convertGoals(stored, "EUR", "JPY", rates);
    expect(vuRamy.goals[0].targetAmount).toBe(10_000);
    expect(vuStivie.goals[0].targetAmount).toBeCloseTo(1_684_783, -2);
  });

  it("une modification de Stivie revient en EUR sans altérer le reste", () => {
    const vuStivie = convertGoals(stored, "EUR", "JPY", rates);
    const modifie = {
      goals: [{ ...vuStivie.goals[0], currentAmount: 500_000 }],
    };
    const reStocke = convertGoals(modifie, "JPY", "EUR", rates);
    // La cible n'a pas dérivé…
    expect(reStocke.goals[0].targetAmount).toBeCloseTo(10_000, 0);
    // …et sa saisie arrive bien en euros.
    expect(reStocke.goals[0].currentAmount).toBeCloseTo(2967.74, 1);
  });
});

describe("robustesse", () => {
  it("laisse les données intactes si un taux manque", () => {
    const incomplet = { rates: { EUR: 0.92 }, base: "USD" } as unknown as RatesPayload;
    const out = convertBudgetState({ rent: "1200" }, "EUR", "JPY", incomplet, 2);
    expect(out.rent).toBe("1200");
  });

  it("ne casse pas sur une valeur non numérique", () => {
    const out = convertBudgetState({ rent: "abc" }, "EUR", "USD", rates, 2);
    expect(out.rent).toBe("abc");
  });

  it("ne fait rien quand les devises sont identiques", () => {
    const out = convertGoals({ goals: [{ targetAmount: 777 }] }, "EUR", "EUR", rates);
    expect(out.goals[0].targetAmount).toBe(777);
  });
});
