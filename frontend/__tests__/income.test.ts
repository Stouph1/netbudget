import { annualGross, averageMonthlyNet, averageMonthlyTithe, defaultIncomeSource, monthlyNetForSource, type IncomeSource } from "../src/utils/income";

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
