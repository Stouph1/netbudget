// Suivi d'un prêt dans le TEMPS : à partir de la date de première échéance,
// on sait où l'emprunteur en est aujourd'hui — combien d'années restent, ce
// qui a déjà été remboursé, et surtout comment la mensualité se décompose.
//
// Point pédagogique important : sur un prêt amortissable classique, la
// mensualité NE BAISSE PAS (elle est constante). Ce qui change, c'est sa
// composition : au début on paie surtout des intérêts, à la fin surtout du
// capital. C'est ça qu'on montre — le vrai « je vois les choses nettement ».

/**
 * Comment le capital se rembourse.
 *
 * - annuity : mensualités constantes — le cas courant (immobilier, conso).
 *   Les intérêts pèsent lourd au début, le capital à la fin.
 * - linear : amortissement constant — même part de capital chaque mois, donc
 *   des mensualités qui baissent. Fréquent en prêt professionnel.
 * - bullet : in fine — on ne paie que les intérêts, le capital d'un coup à la
 *   dernière échéance. Investissement locatif, prêt relais.
 *
 * Absent = annuity, le comportement d'origine de l'app.
 */
export type LoanRepayment = "annuity" | "linear" | "bullet";

/** Mensualité de la PREMIÈRE échéance : la seule constante pour les trois types. */
export function firstPayment(
  principal: number,
  annualRatePercent: number,
  totalMonths: number,
  repayment: LoanRepayment = "annuity",
): number {
  if (!(principal > 0) || !(totalMonths > 0)) return 0;
  const i = annualRatePercent / 100 / 12;
  switch (repayment) {
    case "linear":
      return principal / totalMonths + principal * i;
    case "bullet":
      return principal * i;
    default:
      if (i === 0) return principal / totalMonths;
      return (principal * i) / (1 - Math.pow(1 + i, -totalMonths));
  }
}

/** Part de capital de l'échéance n (1-based), selon le type de remboursement. */
function principalPartAt(
  n: number,
  totalMonths: number,
  balance: number,
  interest: number,
  monthlyPayment: number,
  principal: number,
  repayment: LoanRepayment,
): number {
  if (n === totalMonths) return balance; // dernière : on solde, quoi qu'il arrive
  let part: number;
  switch (repayment) {
    case "linear":
      part = principal / totalMonths;
      break;
    case "bullet":
      part = 0;
      break;
    default:
      part = monthlyPayment - interest;
  }
  return Math.min(balance, Math.max(0, part));
}

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
  repayment: LoanRepayment = "annuity",
): LoanProgress | null {
  // In fine à taux nul : rien à payer avant la fin, la mensualité vaut 0 et
  // c'est légitime. Pour les autres types, une mensualité nulle est une saisie
  // incomplète.
  const paymentOk = repayment === "bullet" ? monthlyPayment >= 0 : monthlyPayment > 0;
  if (!startIso || !(principal > 0) || !(years > 0) || !paymentOk) return null;
  const start = new Date(startIso + "T12:00:00");
  if (Number.isNaN(start.getTime())) return null;

  const totalMonths = Math.round(years * 12);
  const elapsed = Math.max(0, monthsBetween(start, now));
  const paidMonths = Math.min(elapsed, totalMonths);
  const remainingMonths = Math.max(0, totalMonths - paidMonths);

  const i = annualRatePercent / 100 / 12; // taux mensuel

  if (repayment !== "annuity") {
    // Pas de forme fermée simple : on déroule l'échéancier (≤ 480 lignes).
    const rows = amortizationSchedule(principal, annualRatePercent, years, startIso, monthlyPayment, now, repayment)
      .flatMap((y) => y.rows);
    const paid = rows.slice(0, paidMonths);
    const next = rows[paidMonths];
    const remainingPrincipal = paidMonths === 0 ? principal : paid[paid.length - 1].balance;
    const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
    const interestPaid = paid.reduce((s, r) => s + r.interest, 0);
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + totalMonths);
    return {
      paidMonths,
      remainingMonths,
      totalMonths,
      percentElapsed: totalMonths > 0 ? (paidMonths / totalMonths) * 100 : 0,
      remainingPrincipal,
      repaidPrincipal: Math.max(0, principal - remainingPrincipal),
      nextInterest: next?.interest ?? 0,
      nextPrincipal: next?.principal ?? 0,
      interestPaid,
      interestRemaining: Math.max(0, totalInterest - interestPaid),
      totalInterest,
      endDate,
      finished: remainingMonths === 0,
    };
  }

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

/**
 * Décompose le temps restant SANS le formater : la composition de la phrase
 * (« 18 ans et 4 mois », « 4 months left »…) dépend de la langue et appartient
 * donc à l'appelant, qui a accès au catalogue de traductions.
 */
export function remainingParts(p: LoanProgress): {
  finished: boolean;
  years: number;
  months: number;
} {
  return {
    finished: p.finished,
    years: Math.floor(p.remainingMonths / 12),
    months: p.remainingMonths % 12,
  };
}

// ============================================================================
// Échéancier détaillé — la vue que les banques fournissent, dans l'app.
// ============================================================================

export type ScheduleRow = {
  /** Numéro de mensualité (1 = première échéance). */
  index: number;
  date: Date;
  /** Part de capital de cette échéance. */
  principal: number;
  /** Part d'intérêts de cette échéance. */
  interest: number;
  /** Capital restant dû APRÈS cette échéance. */
  balance: number;
  /** Cumul des intérêts versés jusqu'ici. */
  cumulativeInterest: number;
  /** Ce qu'on paie ce mois-là : capital + intérêts. */
  payment: number;
};

export type ScheduleYear = {
  year: number;
  principal: number;
  interest: number;
  /** Capital restant dû à la fin de l'année. */
  balance: number;
  /** Année déjà entièrement passée. */
  past: boolean;
  /** Année en cours. */
  current: boolean;
  rows: ScheduleRow[];
};

/**
 * Échéancier mois par mois, regroupé par année civile.
 * La dernière échéance est ajustée pour solder exactement le capital (sinon
 * les arrondis laissent quelques centimes).
 */
export function amortizationSchedule(
  principal: number,
  annualRatePercent: number,
  years: number,
  startIso: string | undefined,
  monthlyPayment: number,
  now: Date = new Date(),
  repayment: LoanRepayment = "annuity",
): ScheduleYear[] {
  const paymentOk = repayment === "bullet" ? monthlyPayment >= 0 : monthlyPayment > 0;
  if (!startIso || !(principal > 0) || !(years > 0) || !paymentOk) return [];
  const start = new Date(startIso + "T12:00:00");
  if (Number.isNaN(start.getTime())) return [];

  const totalMonths = Math.round(years * 12);
  const i = annualRatePercent / 100 / 12;
  let balance = principal;
  let cumulativeInterest = 0;
  const byYear = new Map<number, ScheduleYear>();

  for (let n = 1; n <= totalMonths; n++) {
    const date = new Date(start);
    date.setMonth(date.getMonth() + (n - 1));

    const interest = balance * i;
    const principalPart = principalPartAt(n, totalMonths, balance, interest, monthlyPayment, principal, repayment);

    balance = Math.max(0, balance - principalPart);
    cumulativeInterest += interest;

    const y = date.getFullYear();
    if (!byYear.has(y)) {
      byYear.set(y, {
        year: y,
        principal: 0,
        interest: 0,
        balance: 0,
        past: false,
        current: false,
        rows: [],
      });
    }
    const entry = byYear.get(y)!;
    entry.principal += principalPart;
    entry.interest += interest;
    entry.balance = balance;
    entry.rows.push({
      index: n,
      date,
      principal: principalPart,
      interest,
      balance,
      cumulativeInterest,
      payment: principalPart + interest,
    });
  }

  const currentYear = now.getFullYear();
  return [...byYear.values()]
    .sort((a, b) => a.year - b.year)
    .map((y) => ({
      ...y,
      past: y.year < currentYear,
      current: y.year === currentYear,
    }));
}
