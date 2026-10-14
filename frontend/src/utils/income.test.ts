import {
  monthlyNetForSource,
  averageMonthlyTithe,
  averageMonthlyNet,
  annualGross,
  type IncomeSource,
} from "./income";

const salary = (extra: Partial<IncomeSource> = {}): IncomeSource => ({
  id: "s",
  label: "Salaire",
  type: "salaire",
  amount: "3400",
  frequency: "monthly",
  chargesPercent: "12",
  withholdingPercent: "15",
  ...extra,
});

describe("net d'une source", () => {
  it("charges puis impôt à la source", () => {
    // 3400 × 0,88 = 2992 ; × 0,85 = 2543,20
    expect(monthlyNetForSource(salary(), 0)).toBeCloseTo(2543.2, 2);
  });
  it("sans dîme si la source ne l'applique pas, même avec un pourcentage de profil", () => {
    expect(monthlyNetForSource(salary(), 0, 10)).toBeCloseTo(2543.2, 2);
  });
  it("dîme sur le net : 10 % de ce qui arrive sur le compte", () => {
    const s = salary({ titheApplied: true, titheBase: "net" });
    expect(monthlyNetForSource(s, 0, 10)).toBeCloseTo(2543.2 - 254.32, 2);
  });
  it("dîme sur le brut : 10 % du brut, retirée du net", () => {
    const s = salary({ titheApplied: true, titheBase: "gross" });
    expect(monthlyNetForSource(s, 0, 10)).toBeCloseTo(2543.2 - 340, 2);
  });
  it("base absente = net", () => {
    const s = salary({ titheApplied: true });
    expect(monthlyNetForSource(s, 0, 10)).toBeCloseTo(monthlyNetForSource(salary({ titheApplied: true, titheBase: "net" }), 0, 10), 6);
  });
});

describe("récap mensuel", () => {
  it("le montant des dons affiché vaut net avant − net après, sur chaque base", () => {
    const net = salary({ titheApplied: true, titheBase: "net" });
    const gross = salary({ titheApplied: true, titheBase: "gross" });
    expect(averageMonthlyTithe([net], 10)).toBeCloseTo(254.32, 2);
    expect(averageMonthlyTithe([gross], 10)).toBeCloseTo(340, 2);
    expect(averageMonthlyTithe([net, salary({ id: "x" })], 10)).toBeCloseTo(254.32, 2);
  });
  it("net moyen = somme des nets, dons déduits", () => {
    const net = salary({ titheApplied: true, titheBase: "net" });
    const free: IncomeSource = { id: "f", label: "Free", type: "freelance", amount: "400", frequency: "monthly", chargesPercent: "9" };
    expect(averageMonthlyNet([net, free], 10)).toBeCloseTo(2543.2 - 254.32 + 364, 2);
  });
  it("un annuel sur dix mois se répartit sur dix mois", () => {
    const s = salary({ amount: "12000", frequency: "annual", chargesPercent: "0", withholdingPercent: "0", activeMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
    expect(monthlyNetForSource(s, 0)).toBeCloseTo(1200, 6);
    expect(monthlyNetForSource(s, 11)).toBe(0);
    expect(annualGross([s])).toBeCloseTo(12000, 6);
    expect(averageMonthlyNet([s])).toBeCloseTo(1000, 6);
  });
  it("TJM × jours", () => {
    const s = salary({ type: "freelance", amount: "500", frequency: "daily", daysPerMonth: 15, chargesPercent: "27", withholdingPercent: "0" });
    expect(monthlyNetForSource(s, 3)).toBeCloseTo(500 * 15 * 0.73, 6);
  });
  it("retouche d'un mois", () => {
    const s = salary({ monthOverrides: { "5": "5000" }, chargesPercent: "0", withholdingPercent: "0" });
    expect(monthlyNetForSource(s, 5)).toBe(5000);
    expect(monthlyNetForSource(s, 4)).toBe(3400);
  });
});
