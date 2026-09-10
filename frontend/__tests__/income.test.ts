import { annualGross, averageMonthlyNet, monthlyNetForSource, type IncomeSource } from "../src/utils/income";

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
