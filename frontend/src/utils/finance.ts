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
