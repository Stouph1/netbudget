// Mensualité d'un prêt à taux fixe
// P = capital emprunté, annualRate en pourcentage (ex: 3.2), years = durée
export function computeLoanMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  years: number
): number {
  if (!principal || principal <= 0 || !years || years <= 0) return 0;
  const n = years * 12;
  if (!annualRatePercent || annualRatePercent === 0) {
    return principal / n;
  }
  const r = annualRatePercent / 100 / 12;
  const m = (principal * r) / (1 - Math.pow(1 + r, -n));
  return m;
}

// @deprecated — kept for backwards compatibility. Préfère `formatCurrency` (utils/currency).
export function formatEuro(value: number): string {
  if (!isFinite(value)) return "0 €";
  const rounded = Math.round(value);
  return rounded.toLocaleString("fr-FR") + " €";
}

export function parseNumber(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// Distance de Levenshtein — utile pour suggérer la ville la plus proche en cas
// de faute de frappe : "marsille" → "Marseille" (distance 1).
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  // Tableau roulant pour économiser la mémoire.
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // suppression
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// Strip diacritics, lowercase, collapse hyphens/spaces — for fuzzy text search
// "Saint-Étienne" → "saint etienne" so it matches "saint etienne", "Saint Etienne", etc.
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
