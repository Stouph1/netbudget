import { budgetTotalOf, diffWorkspace, isBigBudgetChange } from "./workspaceActivity";

const ws = { id: "w1", name: "Famille" };
const me = "me";

describe("activité d'un espace", () => {
  it("ne dit rien à la première lecture", () => {
    expect(diffWorkspace(undefined, { members: { a: "Anna" }, budgetTotal: 100 }, ws, me)).toEqual([]);
  });

  it("signale une arrivée et un départ, jamais les miens", () => {
    const prev = { members: { me: "Moi", a: "Anna" } };
    const next = { members: { me: "Moi", b: "Bob" } };
    expect(diffWorkspace(prev, next, ws, me)).toEqual([
      { kind: "joined", workspaceId: "w1", workspaceName: "Famille", who: "Bob" },
      { kind: "left", workspaceId: "w1", workspaceName: "Famille", who: "Anna" },
    ]);
    // Je rejoins moi-même : ce n'est pas une nouvelle pour moi.
    expect(diffWorkspace({ members: {} }, { members: { me: "Moi" } }, ws, me)).toEqual([]);
  });

  // Une retouche de dix euros n'est pas une nouvelle ; un budget qui bouge
  // d'un cinquième, si.
  it("ne signale que les gros changements de budget", () => {
    expect(isBigBudgetChange(1000, 1010)).toBe(false);
    expect(isBigBudgetChange(1000, 1140)).toBe(false);
    expect(isBigBudgetChange(1000, 1200)).toBe(true);
    expect(isBigBudgetChange(0, 40)).toBe(false);
    expect(isBigBudgetChange(0, 300)).toBe(true);
    const got = diffWorkspace({ members: {}, budgetTotal: 1000 }, { members: {}, budgetTotal: 1300 }, ws, me);
    expect(got).toEqual([{ kind: "budget", workspaceId: "w1", workspaceName: "Famille", from: 1000, to: 1300 }]);
  });

  it("signale un objectif ajouté ou retiré", () => {
    expect(diffWorkspace({ members: {}, goalsCount: 2 }, { members: {}, goalsCount: 3 }, ws, me)).toHaveLength(1);
    expect(diffWorkspace({ members: {}, goalsCount: 2 }, { members: {}, goalsCount: 2 }, ws, me)).toHaveLength(0);
  });

  it("totalise un budget d'espace, prêts compris", () => {
    expect(budgetTotalOf(null)).toBe(0);
    expect(
      budgetTotalOf({
        expenseItems: [{ amount: "400" }, { amount: "100,50" }],
        loans: [
          { mode: "direct", directMonthly: "200" },
          { principal: "1200", ratePercent: "0", years: "1" },
          { principal: "1200", ratePercent: "0", years: "24", durationUnit: "months" },
        ],
      }),
    ).toBe(400 + 100.5 + 200 + 100 + 50);
  });
});
