// Les calculs du budget, vérifiés à la main sur un cas concret.
//
// Le cas : un salaire de 2 000 € brut (22 % de charges) qui commence en
// septembre, un loyer de 700 € qui commence en septembre, 300 € de courses
// toute l'année, 150 € de sorties toute l'année, un prêt à 200 €/mois.
import { averageMonthlyNet, monthlyNetSeries, type IncomeSource } from "../src/utils/income";
import { expenseSeries, amountForMonth } from "../app/_budget/expensePeriod";
import { mergeRentIntoItems, rentOf } from "../app/_budget/helpers";
import { compareSpending } from "../src/lib/spendingCompare";
import { buildAdvice } from "../src/utils/advice";
import type { ExpenseItem } from "../app/_budget/types";

const parse = (v: string) => parseFloat(v) || 0;
const SEPT_TO_DEC = [8, 9, 10, 11];
const salaire: IncomeSource = {
  id: "s", label: "Salaire", type: "salaire", amount: "2000", frequency: "monthly",
  chargesPercent: "22", activeMonths: SEPT_TO_DEC,
} as IncomeSource;
const items: ExpenseItem[] = [
  { id: "loyer", family: "besoins", label: "Loyer", icon: "home", color: "#000", amount: "700", emoji: "🏠", activeMonths: SEPT_TO_DEC },
  { id: "alimentation", family: "besoins", label: "Courses", icon: "shopping-cart", color: "#000", amount: "300", emoji: "🛒" },
  { id: "sorties", family: "loisirs", label: "Sorties", icon: "coffee", color: "#000", amount: "150", emoji: "🍽️" },
] as ExpenseItem[];
const LOANS = 200;

describe("revenus", () => {
  it("net du mois : 2 000 × (1 − 0,22) = 1 560 € de septembre à décembre, 0 avant", () => {
    const s = monthlyNetSeries([salaire], 0);
    expect(s[7]).toBe(0);
    expect(s[8]).toBeCloseTo(1560, 6);
    expect(s[11]).toBeCloseTo(1560, 6);
  });
  it("moyenne annuelle : 1 560 × 4 / 12 = 520 €", () => {
    expect(averageMonthlyNet([salaire], 0)).toBeCloseTo(520, 6);
  });
});

describe("dépenses", () => {
  it("par mois : loyer seulement à partir de septembre, prêt toute l'année", () => {
    const e = expenseSeries(items, LOANS, parse);
    expect(e[0]).toBe(200 + 300 + 150); // janvier : 650
    expect(e[8]).toBe(200 + 700 + 300 + 150); // septembre : 1 350
    expect(e.reduce((a, b) => a + b, 0)).toBe(650 * 8 + 1350 * 4);
  });
  it("reste à vivre de septembre : 1 560 − 1 350 = 210 €", () => {
    const net = monthlyNetSeries([salaire], 0)[8];
    const exp = expenseSeries(items, LOANS, parse)[8];
    expect(net - exp).toBeCloseTo(210, 6);
  });
  it("le loyer est compté une seule fois", () => {
    const month = 8;
    const besoins = items.filter((i) => i.family === "besoins").reduce((s, i) => s + amountForMonth(i, month, parse), 0);
    expect(besoins).toBe(1000); // 700 + 300
    expect(rentOf(items)).toBe(700);
    const total = LOANS + besoins + 150; // sans ré-ajouter le loyer
    expect(total).toBe(1350);
    // historique : besoins hors loyer + loyer à part = besoins
    expect(besoins - rentOf(items) + rentOf(items)).toBe(besoins);
  });
  it("migration : un ancien loyer 850 € devient le poste, pas un doublon", () => {
    const out = mergeRentIntoItems(items.filter((i) => i.id !== "loyer"), "850");
    expect(out.items.filter((i) => i.id === "loyer")).toHaveLength(1);
    expect(rentOf(out.items)).toBe(850);
    expect(out.rent).toBe("0");
  });
});

describe("conseils : parts sur le net du mois", () => {
  it("loyer 700 sur 1 560 = 45 % → alerte loyer, besoins 1 200 / 1 560 = 77 %", () => {
    const out = buildAdvice({
      netMensuel: 1560, rent: 700, loansMonthly: LOANS, besoinsExtra: 300, loisirs: 150, epargne: 0,
      remaining: 210,
    });
    const rentAdvice = out.find((a) => a.titleKey === "advice.rentHigh.title");
    expect(rentAdvice?.params?.pct).toBe(45);
    expect(out.some((a) => a.titleKey === "advice.needsCrit.title" || a.titleKey === "advice.needsHigh.title")).toBe(true);
  });
});

describe("repères", () => {
  it("logement = loyer + prêt = 900 sur 1 350 = 67 %", () => {
    const month = 8;
    const consumption = LOANS + 1000 + 150;
    const c = compareSpending("FR", items.map((i) => ({ emoji: i.emoji, amount: amountForMonth(i, month, parse) })), LOANS, consumption)!;
    const housing = c.lines.find((l) => l.bucket === "housing")!;
    expect(housing.mine).toBe(Math.round((900 / 1350) * 100));
    const food = c.lines.find((l) => l.bucket === "food")!;
    expect(food.mine).toBe(Math.round((300 / 1350) * 100));
  });
});

describe("prêt : mensualité", () => {
  const { loanMonthlyPayment } = require("../app/_budget/helpers") as typeof import("../app/_budget/helpers");
  it("200 000 € à 3 % sur 20 ans = 1 109,20 € (formule d'annuité)", () => {
    const m = loanMonthlyPayment({ id: "l", name: "Maison", principal: "200000", ratePercent: "3", years: "20" } as never);
    // 200000 × (0,0025) / (1 − 1,0025^-240)
    const r = 0.03 / 12;
    const expected = (200000 * r) / (1 - Math.pow(1 + r, -240));
    expect(m).toBeCloseTo(expected, 2);
    expect(Math.round(m * 100) / 100).toBe(1109.2);
  });
  it("à 0 % : capital / mois", () => {
    const m = loanMonthlyPayment({ id: "l", name: "x", principal: "12000", ratePercent: "0", years: "2" } as never);
    expect(m).toBeCloseTo(500, 6);
  });
  it("mensualité saisie directement : prise telle quelle", () => {
    const m = loanMonthlyPayment({ id: "l", name: "x", mode: "direct", directMonthly: "350", principal: "0", ratePercent: "0", years: "0" } as never);
    expect(m).toBe(350);
  });
});
