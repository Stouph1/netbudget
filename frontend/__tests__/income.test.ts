import { annualGross, averageMonthlyNet, averageMonthlyTithe, defaultGrossForMonth, defaultIncomeSource, editedMonths, grossForMonth, isMonthActive, monthlyNetForSource, type IncomeSource } from "../src/utils/income";

const daily = (amount: string, daysPerMonth?: number): IncomeSource => ({
  id: "f1",
  label: "Missions",
  type: "freelance",
  amount,
  frequency: "daily",
  chargesPercent: "0",
  daysPerMonth,
});

describe("revenu au taux journalier (TJM)", () => {
  // C'est ainsi qu'un indépendant raisonne : un TJM et des jours facturés.
  // Le forcer à convertir en mensuel lui-même faussait tout le budget.
  it("multiplie le TJM par les jours facturés du mois", () => {
    expect(monthlyNetForSource(daily("500", 18), 0)).toBe(9000);
    expect(averageMonthlyNet([daily("500", 18)])).toBe(9000);
  });

  it("applique les charges sur le total mensuel", () => {
    const s = { ...daily("500", 10), chargesPercent: "22" };
    expect(monthlyNetForSource(s, 3)).toBeCloseTo(3900, 6);
  });

  // Sans nombre de jours, on ne suppose pas un mois plein à la place de
  // l'utilisateur : un revenu inventé est pire qu'un revenu à zéro.
  it("vaut zéro sans jours facturés", () => {
    expect(monthlyNetForSource(daily("500"), 0)).toBe(0);
    expect(monthlyNetForSource(daily("500", 0), 0)).toBe(0);
  });

  it("entre dans le brut annuel", () => {
    expect(annualGross([daily("400", 15)])).toBe(400 * 15 * 12);
  });
});

describe("dons sur le brut ou sur le net", () => {
  const base: IncomeSource = {
    id: "s", label: "Salaire", type: "salaire", amount: "1000", frequency: "monthly",
    chargesPercent: "20", titheApplied: true,
  };

  it("déduit du net par défaut, comme avant", () => {
    // 1000 brut, 20 % de charges = 800 net ; 10 % de 800 = 80.
    expect(monthlyNetForSource(base, 0, 10)).toBeCloseTo(720, 5);
    expect(monthlyNetForSource({ ...base, titheBase: "net" }, 0, 10)).toBeCloseTo(720, 5);
  });

  it("déduit du brut quand c'est le choix de la personne", () => {
    // 10 % de 1000 = 100, retirés des 800 net.
    expect(monthlyNetForSource({ ...base, titheBase: "gross" }, 0, 10)).toBeCloseTo(700, 5);
  });

  it("ne descend jamais sous zéro", () => {
    expect(monthlyNetForSource({ ...base, chargesPercent: "60", titheBase: "gross" }, 0, 100)).toBe(0);
  });

  it("compte le don moyen sur la bonne base", () => {
    expect(averageMonthlyTithe([{ ...base, titheBase: "gross" }], 10)).toBeCloseTo(100, 5);
    expect(averageMonthlyTithe([base], 10)).toBeCloseTo(80, 5);
  });

  it("propose le mensuel par défaut", () => {
    expect(defaultIncomeSource().frequency).toBe("monthly");
  });
});

// Un mois n'est pas l'autre : bourse sur dix mois, prime en juin, mission qui
// saute. Le budget doit voir le mois tel qu'il est, pas une moyenne.
describe("mois perçus et montant du mois", () => {
  const monthly = (over: Partial<IncomeSource> = {}): IncomeSource => ({
    id: "b", label: "Bourse", type: "autre", amount: "500", frequency: "monthly", chargesPercent: "0", ...over,
  });

  it("compte zéro les mois non perçus", () => {
    const s = monthly({ activeMonths: [0, 1, 2, 3, 4, 5, 8, 9, 10, 11] }); // pas juillet-août
    expect(monthlyNetForSource(s, 6)).toBe(0);
    expect(monthlyNetForSource(s, 7)).toBe(0);
    expect(monthlyNetForSource(s, 8)).toBe(500);
    expect(annualGross([s])).toBe(5000);
    expect(averageMonthlyNet([s])).toBeCloseTo(5000 / 12, 6);
  });

  it("répartit un montant annuel sur les seuls mois perçus", () => {
    const s = monthly({ frequency: "annual", amount: "6000", activeMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
    expect(monthlyNetForSource(s, 0)).toBe(600);
    expect(monthlyNetForSource(s, 11)).toBe(0);
    expect(annualGross([s])).toBeCloseTo(6000, 6);
  });

  it("remplace le montant d'un mois précis, et lui seul", () => {
    const s = monthly({ chargesPercent: "20", monthOverrides: { "5": "1500" } });
    expect(monthlyNetForSource(s, 5)).toBeCloseTo(1200, 6); // 1500 brut, 20 % de charges
    expect(monthlyNetForSource(s, 4)).toBeCloseTo(400, 6);
    expect(defaultGrossForMonth(s, 5)).toBe(500);
    expect(grossForMonth(s, 5)).toBe(1500);
    expect(annualGross([s])).toBe(500 * 11 + 1500);
  });

  it("une retouche vide ne compte pas", () => {
    expect(grossForMonth(monthly({ monthOverrides: { "2": "" } }), 2)).toBe(500);
  });

  it("nomme les mois retouchés ou coupés", () => {
    const a = monthly({ monthOverrides: { "5": "1500", "7": "" } });
    const b = monthly({ id: "c", activeMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
    expect(editedMonths([a, b])).toEqual([5, 10, 11]);
    expect(editedMonths([monthly()])).toEqual([]);
  });

  it("ne touche pas au versement unique", () => {
    const once = monthly({ frequency: "monthOnce", variableMonth: 11, activeMonths: [0] });
    expect(isMonthActive(once, 11)).toBe(true);
    expect(isMonthActive(once, 0)).toBe(false);
    expect(monthlyNetForSource(once, 11)).toBe(500);
  });
});
