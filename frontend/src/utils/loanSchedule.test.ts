// Amortissement de prêt — le calcul le plus sensible de l'app : un utilisateur
// prend des décisions financières sur ce qu'il y lit.

import {
  amortizationSchedule,
  firstPayment,
  loanProgress,
  monthsBetween,
  remainingParts,
} from "./loanSchedule";

// Prêt réel d'un utilisateur, sert de référence à toute la suite.
const P = 119_999;
const RATE = 3.4;
const YEARS = 25;
const MONTHLY = 594.33;
const START = "2026-04-01";

describe("monthsBetween", () => {
  it("compte les mois entiers écoulés", () => {
    expect(monthsBetween(new Date("2026-01-15"), new Date("2026-04-15"))).toBe(3);
  });

  it("ne compte pas un mois entamé", () => {
    // Le 14 avril, le mois d'avril n'est pas révolu depuis le 15 janvier.
    expect(monthsBetween(new Date("2026-01-15"), new Date("2026-04-14"))).toBe(2);
  });

  it("renvoie un nombre négatif pour une date antérieure", () => {
    expect(monthsBetween(new Date("2026-04-01"), new Date("2026-01-01"))).toBe(-3);
  });
});

describe("loanProgress", () => {
  const now = new Date("2026-08-09");

  it("calcule les mensualités payées et restantes", () => {
    const p = loanProgress(P, RATE, YEARS, START, MONTHLY, now)!;
    expect(p.paidMonths).toBe(4);
    expect(p.remainingMonths).toBe(296);
    expect(p.totalMonths).toBe(300);
  });

  it("décompose la prochaine mensualité entre capital et intérêts", () => {
    const p = loanProgress(P, RATE, YEARS, START, MONTHLY, now)!;
    // Somme des deux parts = mensualité, à un centime près.
    expect(p.nextPrincipal + p.nextInterest).toBeCloseTo(MONTHLY, 2);
    // En début de prêt, les intérêts dominent : c'est LE point pédagogique.
    expect(p.nextInterest).toBeGreaterThan(p.nextPrincipal);
  });

  it("inverse la composition en fin de prêt", () => {
    const late = loanProgress(P, RATE, YEARS, "2004-04-01", MONTHLY, now)!;
    expect(late.nextPrincipal).toBeGreaterThan(late.nextInterest);
  });

  it("ne descend jamais le capital restant sous zéro", () => {
    const done = loanProgress(P, RATE, YEARS, "1990-01-01", MONTHLY, now)!;
    expect(done.finished).toBe(true);
    expect(done.remainingPrincipal).toBeCloseTo(0, 2);
    expect(done.remainingMonths).toBe(0);
  });

  it("ne compte aucune mensualité pour un prêt qui démarre plus tard", () => {
    const future = loanProgress(P, RATE, YEARS, "2027-01-01", MONTHLY, now)!;
    expect(future.paidMonths).toBe(0);
    expect(future.remainingPrincipal).toBeCloseTo(P, 0);
  });

  it("gère un taux nul par amortissement linéaire", () => {
    const p = loanProgress(12_000, 0, 1, "2026-02-01", 1000, now)!;
    expect(p.remainingPrincipal).toBe(6000); // 6 mensualités payées sur 12
    expect(p.nextInterest).toBe(0);
  });

  it("renvoie null quand les données sont insuffisantes", () => {
    expect(loanProgress(P, RATE, YEARS, undefined, MONTHLY, now)).toBeNull();
    expect(loanProgress(0, RATE, YEARS, START, MONTHLY, now)).toBeNull();
    expect(loanProgress(P, RATE, 0, START, MONTHLY, now)).toBeNull();
    expect(loanProgress(P, RATE, YEARS, START, 0, now)).toBeNull();
    expect(loanProgress(P, RATE, YEARS, "pas-une-date", MONTHLY, now)).toBeNull();
  });
});

describe("remainingParts", () => {
  it("décompose sans formater (la phrase appartient à la langue)", () => {
    const p = loanProgress(P, RATE, YEARS, START, MONTHLY, new Date("2026-08-09"))!;
    expect(remainingParts(p)).toEqual({ finished: false, years: 24, months: 8 });
  });

  it("signale un prêt terminé", () => {
    const p = loanProgress(P, RATE, YEARS, "1990-01-01", MONTHLY, new Date("2026-08-09"))!;
    expect(remainingParts(p).finished).toBe(true);
  });
});

describe("amortizationSchedule", () => {
  const sched = amortizationSchedule(P, RATE, YEARS, START, MONTHLY, new Date("2026-08-09"));
  const rows = sched.flatMap((y) => y.rows);

  it("produit une ligne par mensualité", () => {
    expect(rows).toHaveLength(300);
  });

  it("solde exactement le capital à la dernière échéance", () => {
    // Sans ajustement final, les arrondis laissent des centimes traîner.
    expect(rows[rows.length - 1].balance).toBeCloseTo(0, 2);
  });

  it("rembourse au total exactement le capital emprunté", () => {
    const totalPrincipal = rows.reduce((s, r) => s + r.principal, 0);
    expect(totalPrincipal).toBeCloseTo(P, 0);
  });

  it("fait décroître le capital restant de façon monotone", () => {
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].balance).toBeLessThanOrEqual(rows[i - 1].balance);
    }
  });

  it("cumule les intérêts de façon croissante", () => {
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].cumulativeInterest).toBeGreaterThan(rows[i - 1].cumulativeInterest);
    }
  });

  it("marque l'année en cours et les années passées", () => {
    expect(sched.find((y) => y.year === 2026)?.current).toBe(true);
    expect(sched.find((y) => y.year === 2026)?.past).toBe(false);
    expect(sched.find((y) => y.year === 2051)?.past).toBe(false);
  });

  it("renvoie un échéancier vide sans date de départ", () => {
    expect(amortizationSchedule(P, RATE, YEARS, undefined, MONTHLY)).toEqual([]);
  });
});

// Trois façons de rembourser. Le total de capital est toujours le capital
// emprunté ; ce qui change, c'est le rythme — et donc les intérêts.
describe("types de remboursement", () => {
  const now = new Date("2026-04-15T12:00:00");
  const sum = (rows: { principal: number; interest: number; payment: number }[], k: "principal" | "interest" | "payment") =>
    rows.reduce((s, r) => s + r[k], 0);

  it("amortissement constant : même capital chaque mois, mensualités qui baissent", () => {
    const first = firstPayment(12_000, 6, 12, "linear");
    expect(first).toBeCloseTo(1000 + 60, 2);
    const rows = amortizationSchedule(12_000, 6, 1, START, first, now, "linear").flatMap((y) => y.rows);
    expect(rows).toHaveLength(12);
    for (const r of rows) expect(r.principal).toBeCloseTo(1000, 2);
    expect(rows[0].payment).toBeGreaterThan(rows[11].payment);
    expect(sum(rows, "principal")).toBeCloseTo(12_000, 2);
    expect(rows[11].balance).toBeCloseTo(0, 6);
  });

  it("in fine : intérêts seuls, puis tout le capital à la dernière échéance", () => {
    const first = firstPayment(12_000, 6, 12, "bullet");
    expect(first).toBeCloseTo(60, 6);
    const rows = amortizationSchedule(12_000, 6, 1, START, first, now, "bullet").flatMap((y) => y.rows);
    for (const r of rows.slice(0, -1)) {
      expect(r.principal).toBe(0);
      expect(r.payment).toBeCloseTo(60, 6);
    }
    expect(rows[11].principal).toBeCloseTo(12_000, 6);
    expect(rows[11].payment).toBeCloseTo(12_060, 6);
    // Plus d'intérêts que l'annuité : le capital reste dû tout le temps.
    const annuity = amortizationSchedule(12_000, 6, 1, START, firstPayment(12_000, 6, 12), now).flatMap((y) => y.rows);
    expect(sum(rows, "interest")).toBeGreaterThan(sum(annuity, "interest"));
  });

  it("la colonne mensualité vaut capital + intérêts, constante pour l'annuité", () => {
    const m = firstPayment(P, RATE, YEARS * 12);
    const rows = amortizationSchedule(P, RATE, YEARS, START, m, now).flatMap((y) => y.rows);
    for (const r of rows.slice(0, -1)) expect(r.payment).toBeCloseTo(m, 6);
    expect(rows[0].payment).toBeCloseTo(rows[0].principal + rows[0].interest, 9);
  });

  it("l'avancement suit le type de remboursement", () => {
    const later = new Date("2026-10-15T12:00:00"); // 6 mensualités payées
    const lin = loanProgress(12_000, 6, 1, START, firstPayment(12_000, 6, 12, "linear"), later, "linear");
    expect(lin?.paidMonths).toBe(6);
    expect(lin?.remainingPrincipal).toBeCloseTo(6000, 2);
    expect(lin?.nextPrincipal).toBeCloseTo(1000, 2);
    const bul = loanProgress(12_000, 6, 1, START, 60, later, "bullet");
    expect(bul?.remainingPrincipal).toBeCloseTo(12_000, 6);
    expect(bul?.repaidPrincipal).toBe(0);
    // In fine à taux nul : rien à payer avant la fin, et c'est valide.
    expect(loanProgress(12_000, 0, 1, START, 0, later, "bullet")?.remainingMonths).toBe(6);
  });

  it("firstPayment retrouve l'annuité classique", () => {
    expect(firstPayment(P, RATE, YEARS * 12)).toBeCloseTo(MONTHLY, 1);
    expect(firstPayment(1200, 0, 12)).toBe(100);
    expect(firstPayment(0, 3, 12)).toBe(0);
  });
});
