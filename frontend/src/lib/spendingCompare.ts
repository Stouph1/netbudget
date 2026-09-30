// Comparer la structure du budget saisi aux moyennes nationales officielles.
//
// Les gens aiment se situer : « 35 % pour le logement, c'est beaucoup ? ».
// On répond avec un chiffre publié (voir constants/spendingShares.ts), jamais
// avec une impression. La part de la personne est calculée sur sa
// CONSOMMATION du mois (dépenses hors épargne, prêts inclus), comme dans les
// statistiques : l'épargne n'est pas une consommation.
//
// Un poste est rattaché à une famille par son emoji (voir expenseEmoji.ts) :
// un poste sans emoji connu ne compte dans aucune famille, il n'invente rien.
import { SPENDING_SHARES, type CountryShares } from "../constants/spendingShares";
import { bucketOfEmoji, type SpendingBucket } from "./expenseEmoji";

export type CompareItem = { emoji?: string; amount: number };

export type CompareLine = {
  bucket: SpendingBucket;
  /** Ta part, en % de ta consommation. */
  mine: number;
  /** La part nationale, en %. */
  national: number;
  /** au-dessus / dans la moyenne / en dessous, à ±3 points. */
  verdict: "above" | "same" | "below";
};

export type Comparison = {
  country: string;
  year: number;
  source: string;
  url: string;
  lines: CompareLine[];
};

export const BUCKET_ORDER: SpendingBucket[] = ["housing", "food", "transport", "restaurants", "recreation", "health"];
const SAME_TOLERANCE = 3;

/** Total par famille, d'après l'emoji de chaque poste. */
export function bucketTotals(items: CompareItem[], loansMonthly = 0): Record<SpendingBucket, number> {
  const out: Record<SpendingBucket, number> = { housing: 0, food: 0, transport: 0, health: 0, recreation: 0, restaurants: 0 };
  for (const it of items) {
    const b = bucketOfEmoji(it.emoji);
    if (b && it.amount > 0) out[b] += it.amount;
  }
  // Un prêt immobilier est un coût de logement au sens où on le vit ; les
  // statistiques comptent les loyers imputés des propriétaires. On l'ajoute.
  if (loansMonthly > 0) out.housing += loansMonthly;
  return out;
}

export function compareSpending(
  countryCode: string,
  items: CompareItem[],
  loansMonthly: number,
  consumption: number,
): Comparison | null {
  const ref: CountryShares | undefined = SPENDING_SHARES[countryCode];
  if (!ref || consumption <= 0) return null;
  const totals = bucketTotals(items, loansMonthly);
  const lines: CompareLine[] = [];
  for (const b of BUCKET_ORDER) {
    const national = ref.shares[b];
    if (national === undefined || totals[b] <= 0) continue;
    const mine = (totals[b] / consumption) * 100;
    const diff = mine - national;
    lines.push({
      bucket: b,
      mine: Math.round(mine),
      national: Math.round(national),
      verdict: diff > SAME_TOLERANCE ? "above" : diff < -SAME_TOLERANCE ? "below" : "same",
    });
  }
  if (lines.length === 0) return null;
  return { country: countryCode, year: ref.year, source: ref.source, url: ref.url, lines };
}
