// Comparaison aux moyennes nationales : chiffres officiels, calcul honnête.
import { SPENDING_SHARES } from "../src/constants/spendingShares";
import { bucketTotals, compareSpending } from "../src/lib/spendingCompare";

describe("spendingShares", () => {
  it("chaque pays cite une source, une année et des parts plausibles", () => {
    for (const [code, c] of Object.entries(SPENDING_SHARES)) {
      expect(c.source.length).toBeGreaterThan(1);
      expect(c.url.startsWith("https://")).toBe(true);
      expect(c.year).toBeGreaterThanOrEqual(2015);
      const sum = Object.values(c.shares).reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThan(30);
      expect(sum).toBeLessThan(100);
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });
});

describe("compareSpending", () => {
  const items = [
    { emoji: "🏠", amount: 700 },
    { emoji: "🛒", amount: 300 },
    { emoji: "🍽️", amount: 100 },
    { emoji: "👕", amount: 80 }, // sans famille : ne compte nulle part
  ];
  it("calcule les parts sur la consommation et compare au pays", () => {
    const c = compareSpending("FR", items, 0, 1180)!;
    expect(c.source).toBe("Eurostat");
    const housing = c.lines.find((l) => l.bucket === "housing")!;
    expect(housing.mine).toBe(59);
    expect(housing.national).toBe(26);
    expect(housing.verdict).toBe("above");
    expect(c.lines.some((l) => l.bucket === "health")).toBe(false); // rien saisi
  });
  it("les prêts comptent dans le logement", () => {
    expect(bucketTotals([{ emoji: "🏠", amount: 100 }], 400).housing).toBe(500);
  });
  it("rien pour un pays sans données ou sans consommation", () => {
    expect(compareSpending("BR", items, 0, 1180)).toBeNull();
    expect(compareSpending("FR", items, 0, 0)).toBeNull();
  });
  it("« dans la moyenne » à ±3 points", () => {
    const c = compareSpending("FR", [{ emoji: "🛒", amount: 133 }], 0, 1000)!;
    expect(c.lines[0].verdict).toBe("same");
  });
});
