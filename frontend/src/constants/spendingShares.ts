// Structure des dépenses des ménages par pays : part de la consommation
// consacrée à chaque grande fonction (nomenclature COICOP), en %.
//
// SOURCES OFFICIELLES UNIQUEMENT. Chaque ligne cite sa source et son année.
// Un pays absent d'ici n'a pas de repère dans l'app : on préfère ne rien
// montrer plutôt qu'un chiffre inventé.
//
//  - Union européenne, Suisse, Norvège, Turquie : Eurostat, « Household final
//    consumption expenditure by purpose (COICOP 1999) », nama_10_co3_p3,
//    unité PC_TOT, dernière année disponible par pays (lu le 30/09/2026).
//    https://ec.europa.eu/eurostat/databrowser/view/nama_10_co3_p3
//    housing = CP04 (logement, eau, électricité, gaz), food = CP01,
//    transport = CP07, health = CP06, recreation = CP09, restaurants = CP11.
//  - États-Unis : BLS, Consumer Expenditures 2024 (parts des dépenses
//    annuelles moyennes). https://www.bls.gov/news.release/cesan.nr0.htm
//  - Royaume-Uni : ONS, Family spending in the UK, FYE 2025.
//    https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/bulletins/familyspendingintheuk/latest
//    (santé et restaurants non détaillés dans le bulletin : absents ici.)
//  - Canada : Statistique Canada, Enquête sur les dépenses des ménages 2021.
//    https://www150.statcan.gc.ca/n1/daily-quotidien/231018/dq231018a-eng.htm
//    (restaurants = part calculée : 2 189 $ sur 67 126 $.)
//  - Australie : ABS, Household Expenditure Survey 2015-16.
//    https://www.abs.gov.au/statistics/economy/finance/household-expenditure-survey-australia-summary-results/latest-release
//
// Ces parts sont NATIONALES. L'app ne prétend pas connaître la structure
// des dépenses de chaque ville : elle rappelle seulement l'indice de coût de
// la ville à côté, pour situer.

import type { SpendingBucket } from "../lib/expenseEmoji";

export type CountryShares = {
  year: number;
  source: string;
  url: string;
  shares: Partial<Record<SpendingBucket, number>>;
};

const eurostat = (year: number, s: Partial<Record<SpendingBucket, number>>): CountryShares => ({
  year,
  source: "Eurostat",
  url: "https://ec.europa.eu/eurostat/databrowser/view/nama_10_co3_p3",
  shares: s,
});

export const SPENDING_SHARES: Record<string, CountryShares> = {
  FR: eurostat(2022, { food: 13.3, housing: 26.2, health: 4.0, transport: 13.6, recreation: 8.0, restaurants: 8.1 }),
  DE: eurostat(2022, { food: 11.5, housing: 24.6, health: 5.3, transport: 13.5, recreation: 10.0, restaurants: 5.4 }),
  ES: eurostat(2022, { food: 13.0, housing: 22.3, health: 4.0, transport: 11.9, recreation: 8.0, restaurants: 14.9 }),
  IT: eurostat(2023, { food: 14.7, housing: 22.8, health: 3.4, transport: 12.7, recreation: 6.8, restaurants: 9.8 }),
  PT: eurostat(2022, { food: 17.3, housing: 17.3, health: 5.6, transport: 12.1, recreation: 5.0, restaurants: 15.1 }),
  BE: eurostat(2022, { food: 12.2, housing: 25.7, health: 6.7, transport: 9.6, recreation: 7.7, restaurants: 6.8 }),
  CH: eurostat(2022, { food: 8.8, housing: 25.8, health: 17.7, transport: 9.4, recreation: 6.3, restaurants: 8.5 }),
  NL: eurostat(2022, { food: 11.7, housing: 23.4, health: 3.3, transport: 12.1, recreation: 9.6, restaurants: 9.2 }),
  AT: eurostat(2022, { food: 10.0, housing: 24.1, health: 3.7, transport: 11.8, recreation: 9.9, restaurants: 13.1 }),
  IE: eurostat(2023, { food: 8.6, housing: 26.3, health: 4.6, transport: 9.6, recreation: 7.3, restaurants: 16.1 }),
  SE: eurostat(2022, { food: 12.8, housing: 25.3, health: 2.9, transport: 12.7, recreation: 11.5, restaurants: 7.0 }),
  PL: eurostat(2023, { food: 18.8, housing: 20.8, health: 6.2, transport: 12.9, recreation: 6.1, restaurants: 4.2 }),
  LU: eurostat(2024, { food: 9.3, housing: 19.9, health: 4.4, transport: 13.9, recreation: 6.6, restaurants: 6.8 }),
  DK: eurostat(2022, { food: 11.8, housing: 29.1, health: 2.8, transport: 10.8, recreation: 11.3, restaurants: 6.7 }),
  NO: eurostat(2023, { food: 11.7, housing: 23.1, health: 3.2, transport: 14.6, recreation: 12.0, restaurants: 7.9 }),
  CZ: eurostat(2022, { food: 15.8, housing: 26.0, health: 2.7, transport: 10.0, recreation: 9.1, restaurants: 7.4 }),
  FI: eurostat(2024, { food: 12.7, housing: 29.5, health: 4.2, transport: 11.0, recreation: 8.8, restaurants: 6.9 }),
  HU: eurostat(2022, { food: 16.7, housing: 22.6, health: 3.7, transport: 11.8, recreation: 7.5, restaurants: 9.3 }),
  RO: eurostat(2022, { food: 25.0, housing: 18.4, health: 6.9, transport: 11.1, recreation: 6.0, restaurants: 3.6 }),
  TR: eurostat(2023, { food: 22.8, housing: 11.1, health: 2.2, transport: 19.7, recreation: 7.2, restaurants: 9.5 }),
  US: {
    year: 2024,
    source: "BLS",
    url: "https://www.bls.gov/news.release/cesan.nr0.htm",
    shares: { housing: 33.4, food: 12.9, transport: 17.0, health: 7.9, recreation: 4.6 },
  },
  GB: {
    year: 2025,
    source: "ONS",
    url: "https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/bulletins/familyspendingintheuk/latest",
    shares: { housing: 18, transport: 14, recreation: 9, food: 12 },
  },
  CA: {
    year: 2021,
    source: "Statistique Canada",
    url: "https://www150.statcan.gc.ca/n1/daily-quotidien/231018/dq231018a-eng.htm",
    shares: { housing: 31.4, food: 15.4, transport: 15.0, restaurants: 3.3, recreation: 6.3 },
  },
  AU: {
    year: 2016,
    source: "ABS",
    url: "https://www.abs.gov.au/statistics/economy/finance/household-expenditure-survey-australia-summary-results/latest-release",
    shares: { housing: 19.6, food: 16.6, transport: 14.5, health: 5.8, recreation: 12.1 },
  },
};
