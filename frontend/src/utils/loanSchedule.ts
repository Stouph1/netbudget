// Suivi d'un prêt dans le TEMPS : à partir de la date de première échéance,
// on sait où l'emprunteur en est aujourd'hui — combien d'années restent, ce
// qui a déjà été remboursé, et surtout comment la mensualité se décompose.
//
// Point pédagogique important : sur un prêt amortissable classique, la
// mensualité NE BAISSE PAS (elle est constante). Ce qui change, c'est sa
// composition : au début on paie surtout des intérêts, à la fin surtout du
// capital. C'est ça qu'on montre — le vrai « je vois les choses nettement ».

export type LoanProgress = {
  /** Mensualités déjà payées (bornées à la durée totale). */
  paidMonths: number;
  /** Mensualités restantes. */
  remainingMonths: number;
  totalMonths: number;
  /** 0-100 : avancement dans le temps. */
  percentElapsed: number;
  /** Capital restant dû aujourd'hui. */
  remainingPrincipal: number;
  /** Capital déjà remboursé. */
  repaidPrincipal: number;
  /** Part d'intérêts dans la PROCHAINE mensualité. */
  nextInterest: number;
  /** Part de capital dans la prochaine mensualité. */
  nextPrincipal: number;
  /** Intérêts déjà versés depuis le début. */
  interestPaid: number;
  /** Intérêts restant à verser jusqu'à la fin. */
  interestRemaining: number;
  /** Coût total du crédit (intérêts sur toute la durée). */
  totalInterest: number;
  /** Date de la dernière échéance. */
  endDate: Date;
  /** Prêt arrivé à terme. */
  finished: boolean;
};

/** Nombre de mois entiers écoulés entre deux dates. */
export function monthsBetween(from: Date, to: Date): number {
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  return m;
}

/**
 * Échéancier d'un prêt amortissable à mensualités constantes.
 * `startIso` = "AAAA-MM-JJ" (première échéance). Renvoie null si les données
 * sont insuffisantes ou incohérentes.
 */
export function loanProgress(
  principal: number,
  annualRatePercent: number,
  years: number,
  startIso: string | undefined,
  monthlyPayment: number,
  now: Date = new Date(),
): LoanProgress | null {
  if (!startIso || !(principal > 0) || !(years > 0) || !(monthlyPayment > 0)) return null;
  const start = new Date(startIso + "T12:00:00");
  if (Number.isNaN(start.getTime())) return null;

  const totalMonths = Math.round(years * 12);
  const elapsed = Math.max(0, monthsBetween(start, now));
  const paidMonths = Math.min(elapsed, totalMonths);
  const remainingMonths = Math.max(0, totalMonths - paidMonths);

  const i = annualRatePercent / 100 / 12; // taux mensuel

  // Capital restant dû après n mensualités.
  // Taux nul : amortissement linéaire.
  const balanceAfter = (n: number): number => {
    if (i === 0) return Math.max(0, principal - monthlyPayment * n);
    const growth = Math.pow(1 + i, n);
    return Math.max(0, principal * growth - monthlyPayment * ((growth - 1) / i));
  };

  const remainingPrincipal = balanceAfter(paidMonths);
  const repaidPrincipal = Math.max(0, principal - remainingPrincipal);

  // Prochaine échéance : les intérêts portent sur le capital restant dû.
  const nextInterest = remainingMonths > 0 ? remainingPrincipal * i : 0;
  const nextPrincipal = remainingMonths > 0 ? Math.max(0, monthlyPayment - nextInterest) : 0;

  const totalInterest = Math.max(0, monthlyPayment * totalMonths - principal);
  const interestPaid = Math.max(0, monthlyPayment * paidMonths - repaidPrincipal);
  const interestRemaining = Math.max(0, totalInterest - interestPaid);

  const endDate = new Date(start);
  endDate.setMonth(endDate.getMonth() + totalMonths);

  return {
    paidMonths,
    remainingMonths,
    totalMonths,
    percentElapsed: totalMonths > 0 ? (paidMonths / totalMonths) * 100 : 0,
    remainingPrincipal,
    repaidPrincipal,
    nextInterest,
    nextPrincipal,
    interestPaid,
    interestRemaining,
    totalInterest,
    endDate,
    finished: remainingMonths === 0,
  };
}

/** « 18 ans et 4 mois », « 7 mois », « terminé » */
export function humanRemaining(p: LoanProgress): string {
  if (p.finished) return "terminé";
  const y = Math.floor(p.remainingMonths / 12);
  const m = p.remainingMonths % 12;
  if (y === 0) return `${m} mois`;
  if (m === 0) return `${y} an${y > 1 ? "s" : ""}`;
  return `${y} an${y > 1 ? "s" : ""} et ${m} mois`;
}
