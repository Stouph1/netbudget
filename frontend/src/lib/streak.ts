// La série de points mensuels.
//
// CE QU'ON CHERCHE À OBTENIR. Un budget ne sert à rien s'il est rempli une
// fois et jamais rouvert. Le geste utile est court et rare : une fois par
// mois, vérifier que les chiffres correspondent encore à la réalité. La série
// rend ce geste visible, et c'est tout ce qu'elle fait.
//
// CE QU'ELLE NE FAIT PAS, ET POURQUOI C'EST DÉLIBÉRÉ :
//
// 1. ELLE NE SE PERD PAS PENDANT LE MOIS EN COURS. Tant que le point du mois
//    précédent est fait, la série tient — on ne la casse pas le 1er du mois à
//    minuit. Une série qui tombe avant même que le mois ait commencé
//    fabriquerait de l'angoisse pour rien, et l'angoisse fait désinstaller.
//
// 2. ELLE NE MENACE PAS. Aucun compte à rebours, aucune notification qui
//    prévient qu'on va « tout perdre ». Le meilleur score est conservé pour
//    toujours : ce qui a été fait reste acquis.
//
// 3. ELLE N'OUVRE AUCUNE FONCTION ET N'EN FERME AUCUNE. Elle ne se troque
//    contre rien. Une série qui déverrouille des fonctions transformerait une
//    habitude en devoir, et un oubli de vacances en punition payante.
//
// Le module est pur : il ne lit ni n'écrit rien. Le stockage vit dans
// `streakStore.ts`, ce qui rend tout ce fichier testable.

/** Mois au format "AAAA-MM", le seul manipulé ici. */
export type Month = string;

export function monthKey(d: Date): Month {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Mois précédant celui donné, passage d'année compris. */
export function previousMonth(m: Month): Month {
  const [y, mo] = m.split("-").map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
}

export type Streak = {
  /** Mois consécutifs en cours. 0 si la série est retombée. */
  current: number;
  /** Plus longue série jamais atteinte. Ne redescend jamais. */
  best: number;
  /** Le point de ce mois-ci est-il fait ? */
  doneThisMonth: boolean;
  /** Nombre total de points, tous mois confondus. */
  total: number;
};

/**
 * Enregistre le point du mois. Idempotent : deux passages le même mois ne
 * comptent qu'une fois — sinon ouvrir l'app dix fois en janvier vaudrait dix
 * mois, et le chiffre ne voudrait plus rien dire.
 */
export function markCheckIn(months: readonly Month[], now: Date = new Date()): Month[] {
  const key = monthKey(now);
  if (months.includes(key)) return [...months];
  return [...months, key].sort();
}

/**
 * Longueur de la série.
 *
 * On remonte le temps depuis le mois en cours. Si le point de ce mois n'est
 * pas encore fait, on repart du mois précédent : c'est la tolérance décrite en
 * tête de fichier, celle qui évite de casser une série de neuf mois le 1er à
 * 00 h 01.
 */
export function computeStreak(months: readonly Month[], now: Date = new Date()): Streak {
  const seen = new Set(months);
  const thisMonth = monthKey(now);
  const doneThisMonth = seen.has(thisMonth);

  let cursor = doneThisMonth ? thisMonth : previousMonth(thisMonth);
  let current = 0;
  while (seen.has(cursor)) {
    current++;
    cursor = previousMonth(cursor);
  }

  return {
    current,
    best: Math.max(current, longestRun(months)),
    doneThisMonth,
    total: seen.size,
  };
}

/** Plus longue suite de mois consécutifs de tout l'historique. */
function longestRun(months: readonly Month[]): number {
  const sorted = [...new Set(months)].sort();
  let best = 0;
  let run = 0;
  let previous: Month | null = null;

  for (const m of sorted) {
    run = previous !== null && previousMonth(m) === previous ? run + 1 : 1;
    previous = m;
    if (run > best) best = run;
  }
  return best;
}

/**
 * Paliers qui déclenchent une célébration.
 *
 * Espacés exprès : trois mois, c'est le moment où une habitude tient ; un an,
 * c'est un cycle complet — impôts, rentrée, fêtes. Entre les deux, se
 * manifester tous les mois transformerait la félicitation en bruit.
 */
export const MILESTONES = [3, 6, 12, 24] as const;

/** Le palier atteint EXACTEMENT ce mois-ci, s'il y en a un. */
export function milestoneReached(streak: Streak): number | null {
  if (!streak.doneThisMonth) return null;
  return MILESTONES.find((m) => m === streak.current) ?? null;
}
