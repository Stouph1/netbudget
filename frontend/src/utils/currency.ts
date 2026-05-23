// Système de devise multi-pays.
// Inclut les principales devises du monde + CFA (XOF / XAF) pour l'Afrique.

export type CurrencyCode =
  | "EUR"
  | "USD"
  | "GBP"
  | "CHF"
  | "CAD"
  | "JPY"
  | "CNY"
  | "AED"
  | "SAR"
  | "MAD"
  | "DZD"
  | "TND"
  | "XOF"
  | "XAF"
  | "AUD";

export type Currency = {
  code: CurrencyCode;
  symbol: string;
  name: string;
  /** position du symbole (avant ou après le nombre) */
  position: "before" | "after";
  /** séparateur de milliers */
  thousands: " " | "," | ".";
  /** séparateur décimal */
  decimal: "," | ".";
  /** nombre de décimales par défaut (0 pour CFA, JPY...) */
  decimals: 0 | 2;
  /** drapeau emoji pour l'UI */
  flag: string;
};

export const CURRENCIES: Currency[] = [
  { code: "EUR", symbol: "€", name: "Euro", position: "after", thousands: " ", decimal: ",", decimals: 2, flag: "🇪🇺" },
  { code: "USD", symbol: "$", name: "Dollar US", position: "before", thousands: ",", decimal: ".", decimals: 2, flag: "🇺🇸" },
  { code: "GBP", symbol: "£", name: "Livre sterling", position: "before", thousands: ",", decimal: ".", decimals: 2, flag: "🇬🇧" },
  { code: "CHF", symbol: "CHF", name: "Franc suisse", position: "after", thousands: " ", decimal: ".", decimals: 2, flag: "🇨🇭" },
  { code: "CAD", symbol: "$", name: "Dollar canadien", position: "before", thousands: ",", decimal: ".", decimals: 2, flag: "🇨🇦" },
  { code: "AUD", symbol: "$", name: "Dollar australien", position: "before", thousands: ",", decimal: ".", decimals: 2, flag: "🇦🇺" },
  { code: "JPY", symbol: "¥", name: "Yen japonais", position: "before", thousands: ",", decimal: ".", decimals: 0, flag: "🇯🇵" },
  { code: "CNY", symbol: "¥", name: "Yuan chinois", position: "before", thousands: ",", decimal: ".", decimals: 2, flag: "🇨🇳" },
  { code: "AED", symbol: "د.إ", name: "Dirham EAU", position: "after", thousands: ",", decimal: ".", decimals: 2, flag: "🇦🇪" },
  { code: "SAR", symbol: "﷼", name: "Riyal saoudien", position: "after", thousands: ",", decimal: ".", decimals: 2, flag: "🇸🇦" },
  { code: "MAD", symbol: "DH", name: "Dirham marocain", position: "after", thousands: " ", decimal: ",", decimals: 2, flag: "🇲🇦" },
  { code: "DZD", symbol: "DA", name: "Dinar algérien", position: "after", thousands: " ", decimal: ",", decimals: 2, flag: "🇩🇿" },
  { code: "TND", symbol: "DT", name: "Dinar tunisien", position: "after", thousands: " ", decimal: ",", decimals: 2, flag: "🇹🇳" },
  { code: "XOF", symbol: "F CFA", name: "Franc CFA (UEMOA)", position: "after", thousands: " ", decimal: ",", decimals: 0, flag: "🇸🇳" },
  { code: "XAF", symbol: "F CFA", name: "Franc CFA (CEMAC)", position: "after", thousands: " ", decimal: ",", decimals: 0, flag: "🇨🇲" },
];

export const DEFAULT_CURRENCY: CurrencyCode = "EUR";

export function getCurrency(code: CurrencyCode): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/**
 * Formate une valeur dans la devise donnée.
 * Ex: formatCurrency(1234.5, "EUR") → "1 235 €"
 * Ex: formatCurrency(1234.5, "XOF") → "1 235 F CFA"
 * Ex: formatCurrency(1234.5, "USD") → "$1,234.50"
 */
export function formatCurrency(value: number, code: CurrencyCode = DEFAULT_CURRENCY): string {
  if (!isFinite(value)) value = 0;
  const c = getCurrency(code);
  const rounded = c.decimals === 0 ? Math.round(value) : Math.round(value * 100) / 100;
  const isNeg = rounded < 0;
  const abs = Math.abs(rounded);

  const [intPart, decPart] = abs
    .toFixed(c.decimals)
    .split(".");
  const intWithSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, c.thousands);
  const numberStr =
    c.decimals === 0 || !decPart
      ? intWithSep
      : `${intWithSep}${c.decimal}${decPart}`;

  const sign = isNeg ? "-" : "";
  return c.position === "before"
    ? `${sign}${c.symbol}${numberStr}`
    : `${sign}${numberStr} ${c.symbol}`;
}
