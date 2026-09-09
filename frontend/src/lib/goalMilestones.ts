// Les caps franchis sur un objectif d'épargne.
//
// POURQUOI CE N'EST PAS QU'UNE BARRE DE PROGRESSION. Une barre qui avance de
// 2 % ne marque rien : on la regarde, on ne la voit pas bouger, et on referme.
// Ce dont on se souvient, c'est d'un seuil — « la moitié est faite ». Épargner
// est long, souvent des années ; sans repère intermédiaire, il ne se passe
// rien entre le premier versement et le dernier.
//
// TROIS RÈGLES QUI ÉVITENT QUE ÇA DEVIENNE MALHONNÊTE :
//
// 1. ON NE FÊTE QU'EN MONTANT. Retirer de l'argent d'un objectif arrive pour
//    de bonnes raisons — une urgence, un changement de projet. Le cap reste
//    acquis, et repasser dessus plus tard ne redéclenche rien : personne ne
//    doit se sentir surveillé par son application d'épargne.
//
// 2. ON NE FÊTE JAMAIS PLUSIEURS FOIS LE MÊME CAP. Sans mémoire, la
//    félicitation reviendrait à chaque ouverture de l'écran et ne voudrait
//    plus rien dire au bout de deux jours.
//
// 3. AUCUN CAP N'OUVRE QUOI QUE CE SOIT. Ni fonction, ni réduction. Une
//    récompense conditionnée à l'épargne pousserait à déclarer de l'épargne
//    qu'on n'a pas, ce qui ruinerait la seule chose qui compte ici : que les
//    chiffres soient vrais.

/** Caps marqués. Le dernier est l'objectif atteint. */
export const GOAL_MILESTONES = [25, 50, 75, 100] as const;

export type GoalMilestone = (typeof GOAL_MILESTONES)[number];

/** Avancement en pourcentage, borné à 100 et robuste aux cibles absurdes. */
export function goalPct(current: number, target: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.min(100, (current / target) * 100));
}

/**
 * Caps franchis depuis la dernière fois, du plus petit au plus grand.
 *
 * `highestSeen` est le plus haut cap déjà fêté pour cet objectif. Un versement
 * important peut en franchir plusieurs d'un coup — on les rend tous, à charge
 * de l'écran de n'annoncer que le plus élevé.
 */
export function newMilestones(pct: number, highestSeen = 0): GoalMilestone[] {
  return GOAL_MILESTONES.filter((m) => pct >= m && m > highestSeen);
}

/** Cap le plus élevé atteint à ce niveau d'avancement. */
export function highestMilestone(pct: number): number {
  let best = 0;
  for (const m of GOAL_MILESTONES) if (pct >= m) best = m;
  return best;
}
