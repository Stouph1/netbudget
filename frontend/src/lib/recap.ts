// Le bilan du mois : ce qui a changé depuis le dernier point.
//
// POURQUOI CE MODULE EXISTE. La série demandait un geste et ne rendait qu'un
// compteur. Un compteur ne récompense rien — au bout de trois mois, cocher une
// case pour voir « 3 » ne vaut plus le déplacement, et l'habitude meurt.
//
// Ce que le bilan rend, en revanche, n'existe QUE parce que la personne est
// revenue : la comparaison avec le mois précédent. On ne peut pas la fabriquer
// après coup, on ne peut pas la deviner, et aucun écran ne peut la montrer à
// quelqu'un qui vient pour la première fois. C'est la seule forme
// d'encouragement qui soit aussi une information.
//
// CE QU'ON NE FAIT PAS. On ne félicite pas une baisse de dépenses et on ne
// gronde pas une hausse. Un mois avec un déménagement ou un dentiste coûte
// plus cher, et ce n'est ni un échec ni une rechute. Le bilan CONSTATE, avec
// le signe et le montant, et laisse l'interprétation à qui connaît sa vie.

/** Photographie des chiffres au moment d'un point mensuel. */
export type Snapshot = {
  /** "AAAA-MM" du point. */
  month: string;
  /** Revenu net mensuel. */
  net: number;
  /** Total des dépenses mensuelles, loyer et prêts compris. */
  expenses: number;
  /** Ce qu'il reste une fois tout payé. */
  remaining: number;
};

export type RecapLine = {
  /** Champ comparé, pour choisir le libellé traduit. */
  key: "net" | "expenses" | "remaining";
  /** Écart signé par rapport au mois précédent. */
  delta: number;
  /**
   * Une hausse est-elle une bonne nouvelle pour ce champ ? Des dépenses qui
   * montent et un reste à vivre qui monte ne se lisent pas de la même façon.
   */
  upIsGood: boolean;
};

export type Recap = {
  /** Mois du point précédent auquel on se compare. */
  since: string;
  lines: RecapLine[];
};

/**
 * Sous ce seuil, on considère que rien n'a bougé.
 *
 * Un écart de trois euros vient d'un arrondi ou d'une correction de saisie, pas
 * d'un changement de situation. L'afficher apprendrait aux gens que le bilan
 * dit n'importe quoi, et le mois suivant ils ne le liraient plus.
 */
export const NOISE_FLOOR = 5;

const FIELDS: { key: RecapLine["key"]; upIsGood: boolean }[] = [
  { key: "remaining", upIsGood: true },
  { key: "net", upIsGood: true },
  { key: "expenses", upIsGood: false },
];

/**
 * Compare deux instantanés. Rend `null` s'il n'y a rien à dire — premier point,
 * ou mois sans changement notable.
 */
export function buildRecap(
  previous: Snapshot | null,
  current: Snapshot,
): Recap | null {
  if (!previous || previous.month === current.month) return null;

  const lines = FIELDS.map(({ key, upIsGood }) => ({
    key,
    delta: round(current[key] - previous[key]),
    upIsGood,
  })).filter((l) => Math.abs(l.delta) >= NOISE_FLOOR);

  if (!lines.length) return null;

  // Le plus gros écart en premier : c'est celui qui explique les autres.
  lines.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return { since: previous.month, lines };
}

/** Instantané le plus récent d'un mois DIFFÉRENT du mois en cours. */
export function previousSnapshot(
  history: readonly Snapshot[],
  currentMonth: string,
): Snapshot | null {
  const older = history.filter((s) => s.month < currentMonth).sort((a, b) => a.month.localeCompare(b.month));
  return older.length ? older[older.length - 1] : null;
}

/**
 * Ajoute un instantané, en remplaçant celui du même mois.
 *
 * Remplacer et non empiler : quelqu'un qui corrige son loyer une heure après
 * son point doit voir la valeur corrigée le mois prochain, pas la première
 * saisie.
 */
export function addSnapshot(
  history: readonly Snapshot[],
  snapshot: Snapshot,
  keep = 24,
): Snapshot[] {
  const others = history.filter((s) => s.month !== snapshot.month);
  return [...others, snapshot].sort((a, b) => a.month.localeCompare(b.month)).slice(-keep);
}

const round = (n: number) => Math.round(n * 100) / 100;
