import type { InflationRow } from "./inflationData";
import { rateLoan, realLoanRate } from "./loanRating";

const inflation = (rate: number): InflationRow => ({
  rate,
  period: "2026-08",
  source: "eurostat",
});

describe("realLoanRate", () => {
  it("applique Fisher", () => {
    expect(realLoanRate(1.5, inflation(2.7))).toBeCloseTo(-1.1685, 3);
  });

  // Le point qui surprend : l'emprunteur gagne à l'inflation.
  it("rend un coût négatif quand les prix montent plus vite que le taux", () => {
    expect(realLoanRate(1, inflation(3))).toBeLessThan(0);
  });

  it("rend zéro à taux égal", () => {
    expect(realLoanRate(2.7, inflation(2.7))).toBeCloseTo(0, 10);
  });
});

describe("rateLoan", () => {
  const i = inflation(2.7);

  it("note excellent un prêt sous l'inflation", () => {
    expect(rateLoan(1.5, i)!.grade).toBe("excellent");
  });

  it("note les paliers intermédiaires", () => {
    expect(rateLoan(3.5, i)!.grade).toBe("good");
    expect(rateLoan(5, i)!.grade).toBe("fair");
  });

  it("note coûteux un crédit très au-dessus des prix", () => {
    expect(rateLoan(9, i)!.grade).toBe("costly");
  });

  // Un champ vide ne doit pas récolter la meilleure note.
  it("ne note pas un taux absent ou nul", () => {
    expect(rateLoan(0, i)).toBeNull();
    expect(rateLoan(Number.NaN, i)).toBeNull();
    expect(rateLoan(-1, i)).toBeNull();
  });

  it("ne note rien sans chiffre d'inflation pour le pays", () => {
    expect(rateLoan(3, null)).toBeNull();
  });

  it("rend le coût réel arrondi", () => {
    const r = rateLoan(4, i)!;
    expect(r.realRate).toBeCloseTo(1.27, 2);
  });

  // Le même taux ne vaut pas la même note selon le pays.
  it("dépend du pays", () => {
    // Suisse, prix quasi stables : 2 % coûte vraiment 1,94 %.
    expect(rateLoan(2, inflation(0.06))!.grade).toBe("fair");
    // Tunisie, prix à 5,15 % : le même 2 % revient à −3 % réel.
    expect(rateLoan(2, inflation(5.15))!.grade).toBe("excellent");
  });
});
