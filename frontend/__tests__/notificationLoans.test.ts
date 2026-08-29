// Le pourcentage de capital remboursé, tel qu'il part en notification.
//
// La subtilité qui rend ce cap intéressant : sur un prêt amortissable, à
// MI-PARCOURS DANS LE TEMPS on est loin d'avoir remboursé la moitié du
// capital, parce que les premières années paient surtout des intérêts.
// Annoncer « 50 % remboursés » à la moitié du calendrier serait faux, et
// détruirait la confiance dans toutes les autres notifications.

import { toNotifLoans } from "../src/utils/notificationContext";
import { loanProgress } from "../src/utils/loanSchedule";

// 200 000 € sur 20 ans à 3,5 % — une mensualité réaliste.
const LOAN = {
  id: "l1",
  name: "Maison",
  principal: 200_000,
  ratePercent: 3.5,
  years: 20,
  startDate: "2020-01-01",
  monthlyPayment: 1159.92,
};

describe("capital remboursé", () => {
  it("part de zéro le premier mois", () => {
    const [l] = toNotifLoans([LOAN], new Date("2020-01-15T12:00:00"));
    expect(l.repaidPercent).toBeLessThan(1);
  });

  it("reste EN DESSOUS de 50 % à la moitié du prêt", () => {
    // Dix ans sur vingt. C'est tout l'intérêt du cap : il ne suit pas le
    // calendrier, il suit la dette.
    const [l] = toNotifLoans([LOAN], new Date("2030-01-15T12:00:00"));
    expect(l.repaidPercent).toBeGreaterThan(30);
    expect(l.repaidPercent).toBeLessThan(50);
  });

  it("croît sans jamais reculer", () => {
    let previous = -1;
    for (const year of [2021, 2024, 2027, 2030, 2033, 2036]) {
      const [l] = toNotifLoans([LOAN], new Date(`${year}-06-15T12:00:00`));
      expect(l.repaidPercent).toBeGreaterThan(previous);
      previous = l.repaidPercent;
    }
  });

  it("colle au capital restant calculé par l'échéancier", () => {
    const now = new Date("2029-03-15T12:00:00");
    const [l] = toNotifLoans([LOAN], now);
    const p = loanProgress(
      LOAN.principal,
      LOAN.ratePercent,
      LOAN.years,
      LOAN.startDate,
      LOAN.monthlyPayment,
      now,
    )!;
    // Les deux vues d'une même dette doivent se répondre exactement, sinon
    // l'écran et la notification se contrediraient.
    expect(l.repaidPercent + (p.remainingPrincipal / LOAN.principal) * 100).toBeCloseTo(100, 6);
    expect(l.remainingPrincipal).toBe(Math.round(p.remainingPrincipal));
  });

  it("écarte un prêt terminé plutôt que d'annoncer 100 %", () => {
    // Le prêt est soldé : il n'y a plus de cap à franchir, et « bravo » sur
    // quelque chose de fini depuis trois ans sonne faux.
    expect(toNotifLoans([LOAN], new Date("2045-01-15T12:00:00"))).toEqual([]);
  });

  it("écarte un prêt sans date de première échéance", () => {
    // Deviner une date produirait un pourcentage inventé.
    expect(toNotifLoans([{ ...LOAN, startDate: undefined }], new Date("2030-01-01"))).toEqual([]);
  });

  it("ne divise pas par zéro sur un capital absent", () => {
    expect(toNotifLoans([{ ...LOAN, principal: 0 }], new Date("2030-01-01"))).toEqual([]);
  });
});
