// Amortissement de prêt — le calcul le plus sensible de l'app : un utilisateur
// prend des décisions financières sur ce qu'il y lit.

import {
  amortizationSchedule,
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
