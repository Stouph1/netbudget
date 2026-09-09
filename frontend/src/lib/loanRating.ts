// Un prêt vaut-il ce qu'il coûte, une fois les prix pris en compte ?
//
// L'IDÉE, ET ELLE SURPREND. Pour un EMPRUNTEUR, l'inflation joue dans le bon
// sens : on rembourse demain, avec de la monnaie qui vaut moins, une somme
// fixée hier. Un prêt à taux fixe de 1,5 % quand les prix montent de 2,7 %
// coûte en réalité moins que rien — l'inflation en rembourse une partie à la
// place de l'emprunteur. C'est l'exact inverse de l'épargne, où le même écart
// fait perdre du pouvoir d'achat.
//
// Personne ne fait ce calcul spontanément, et beaucoup renégocient ou
// remboursent par anticipation un crédit qui était en fait une bonne affaire.
//
// CE QUE CETTE NOTE NE DIT PAS, et qui doit rester visible à l'écran :
//
// 1. UN BON TAUX N'EST PAS UN PRÊT SUPPORTABLE. Le taux le plus avantageux du
//    monde reste insoutenable si la mensualité dépasse les moyens. La note
//    porte sur le COÛT du crédit, jamais sur l'opportunité de l'emprunter, et
//    ne doit jamais se lire comme une incitation.
//
// 2. ELLE SUPPOSE UN TAUX FIXE. À taux variable, le raisonnement tombe : le
//    taux suit justement l'inflation, et l'avantage disparaît.
//
// 3. ELLE COMPARE UN CRÉDIT DE VINGT ANS À L'INFLATION D'UN MOIS. C'est un
//    éclairage sur aujourd'hui, pas une prévision sur la durée du prêt. Le
//    texte affiché le dit, parce que taire cette limite serait malhonnête.

import type { InflationRow } from "./inflationData";

export type LoanGrade = "excellent" | "good" | "fair" | "costly";

/**
 * Coût réel du crédit, en pourcentage annuel.
 *
 * Fisher, comme pour l'épargne : (1+n)/(1+i)−1. Négatif quand l'inflation
 * dépasse le taux — l'emprunteur est alors payé pour emprunter.
 */
export function realLoanRate(nominalPct: number, row: InflationRow): number {
  return ((1 + nominalPct / 100) / (1 + row.rate / 100) - 1) * 100;
}

/**
 * Seuils de note, exprimés en coût RÉEL.
 *
 * Ils ne sortent pas d'un barème officiel — il n'en existe pas — mais d'une
 * lecture simple : sous zéro l'inflation travaille pour l'emprunteur ; au-delà
 * de trois points et demi au-dessus des prix, le crédit coûte réellement cher
 * quel que soit le contexte. Entre les deux, c'est ordinaire.
 */
const THRESHOLDS: { max: number; grade: LoanGrade }[] = [
  { max: 0, grade: "excellent" },
  { max: 1.5, grade: "good" },
  { max: 3.5, grade: "fair" },
  { max: Infinity, grade: "costly" },
];

export type LoanRating = {
  grade: LoanGrade;
  /** Coût réel annuel, arrondi au centième. */
  realRate: number;
};

/**
 * Note un prêt, ou `null` si on ne peut rien en dire.
 *
 * Un taux à zéro n'est pas noté : c'est presque toujours un champ non rempli,
 * et afficher « excellent » sur une saisie vide donnerait une note flatteuse à
 * quelqu'un qui n'a rien renseigné.
 */
export function rateLoan(
  nominalPct: number,
  row: InflationRow | null,
): LoanRating | null {
  if (!row) return null;
  if (!Number.isFinite(nominalPct) || nominalPct <= 0) return null;

  const real = realLoanRate(nominalPct, row);
  const grade = THRESHOLDS.find((t) => real < t.max)!.grade;
  return { grade, realRate: Math.round(real * 100) / 100 };
}
