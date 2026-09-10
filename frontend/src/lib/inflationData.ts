// FICHIER GÉNÉRÉ — ne pas modifier à la main.
// Régénérer avec : npm run fetch:inflation
//
// Taux d'inflation annuel officiel, par pays. Chaque ligne porte la période
// exacte à laquelle elle se rapporte, parce que l'app l'affiche : un taux sans
// date laisserait croire qu'il est d'aujourd'hui.
//
// Généré le 2026-09-10.

import type { Country } from "../types/advice";

/** Institution d'où sort le chiffre. Aucune autre source n'est acceptée. */
export type InflationSource = "eurostat" | "oecd" | "worldbank";

export type InflationRow = {
  /** Variation annuelle des prix à la consommation, en pourcentage. */
  rate: number;
  /** "AAAA-MM" pour une publication mensuelle, "AAAA" pour une annuelle. */
  period: string;
  source: InflationSource;
};

export const INFLATION_GENERATED_AT = "2026-09-10";

export const SOURCE_URLS: Record<InflationSource, string> = {
  eurostat:
    "https://ec.europa.eu/eurostat/databrowser/view/ei_cphi_m/default/table",
  oecd: "https://data-explorer.oecd.org/vis?df[ds]=dsDisseminateFinalDMZ&df[id]=DSD_PRICES%40DF_PRICES_ALL",
  worldbank: "https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG",
};

/**
 * Un pays absent de cette table n'a pas de chiffre officiel récupérable — l'app
 * n'affiche alors aucun indicateur plutôt qu'une approximation.
 */
export const INFLATION: Partial<Record<Country, InflationRow>> = {
  BE: { rate: 4.2, period: "2026-08", source: "eurostat" },
  CA: { rate: 3.03, period: "2026-07", source: "oecd" },
  CH: { rate: 0.06, period: "2025-12", source: "oecd" },
  CI: { rate: 0.13, period: "2025", source: "worldbank" },
  CM: { rate: 3.4, period: "2025", source: "worldbank" },
  DE: { rate: 2.9, period: "2026-08", source: "eurostat" },
  DZ: { rate: 1.42, period: "2025", source: "worldbank" },
  ES: { rate: 4.5, period: "2026-08", source: "eurostat" },
  FR: { rate: 2.7, period: "2026-08", source: "eurostat" },
  GB: { rate: 3.1, period: "2026-07", source: "oecd" },
  IT: { rate: 3.2, period: "2026-08", source: "eurostat" },
  LU: { rate: 4, period: "2026-08", source: "eurostat" },
  MA: { rate: 0.7, period: "2025", source: "worldbank" },
  PT: { rate: 3.6, period: "2026-08", source: "eurostat" },
  SN: { rate: 1.46, period: "2025", source: "worldbank" },
  TN: { rate: 5.15, period: "2025", source: "worldbank" },
  US: { rate: 3.36, period: "2026-07", source: "oecd" },
};
