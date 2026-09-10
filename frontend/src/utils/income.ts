// Modèle multi-sources de revenu avec règles de calcul net/brut par type.
// Chaque source porte SON propre taux de charges et SA propre fréquence.

import { parseNumber } from "./finance";

export type IncomeType =
  | "salaire"
  | "freelance"
  | "locatif"
  | "dividendes"
  | "autre";

// `daily` : un taux journalier (TJM) multiplié par un nombre de jours facturés
// par mois. C'est ainsi qu'un indépendant raisonne — jamais en annuel, rarement
// en mensuel fixe. Le forcer à convertir lui-même fausse tout le budget.
export type IncomeFrequency = "monthly" | "annual" | "monthOnce" | "daily";

export type ProStatus = "non-cadre" | "cadre" | "fonctionnaire" | "liberal";

export type IncomeSource = {
  id: string;
  label: string;
  type: IncomeType;
  amount: string; // saisi par l'utilisateur
  frequency: IncomeFrequency;
  chargesPercent: string; // 0 = brut = net (ex: revenus déjà nets)
  variableMonth?: number; // utilisé quand frequency === "monthOnce"
  daysPerMonth?: number; // utilisé quand frequency === "daily" (jours facturés / mois)
  // Spécifique aux salaires
  proStatus?: ProStatus;
  timeMode?: "plein" | "partiel";
  // Dîme (utilisateurs chrétiens, Premium) : si true, le pourcentage de dîme
  // du profil est déduit du net de CETTE source. Optionnel — rétrocompatible.
  titheApplied?: boolean;
};

// Estimations de charges par type — sources : service-public.fr, urssaf.fr.
export const STATUS_LABEL: Record<ProStatus, string> = {
  "non-cadre": "Non-cadre",
  cadre: "Cadre",
  fonctionnaire: "Fonctionnaire",
  liberal: "Libéral",
};

export const STATUS_DEFAULT_CHARGES: Record<ProStatus, number> = {
  "non-cadre": 22,
  cadre: 25,
  fonctionnaire: 15,
  liberal: 25,
};

export const TYPE_LABEL: Record<IncomeType, string> = {
  salaire: "Salaire",
  freelance: "Freelance / BNC",
  locatif: "Revenus locatifs",
  dividendes: "Dividendes / Capital",
  autre: "Autre",
};

export const TYPE_ICON: Record<IncomeType, string> = {
  salaire: "briefcase",
  freelance: "edit-3",
  locatif: "home",
  dividendes: "bar-chart-2",
  autre: "plus-circle",
};

// Charges par défaut quand on crée une nouvelle source.
// Pour les dividendes : flat tax 30 % (PFU). Pour les locatifs : ~30 %
// (revenus fonciers + prélèvements sociaux 17,2 %, hors charges déductibles).
export const TYPE_DEFAULT_CHARGES: Record<IncomeType, number> = {
  salaire: 22,
  freelance: 27,
  locatif: 30,
  dividendes: 30,
  autre: 0,
};

// Texte d'aide affiché sous le champ "Taux de charges" par type
export const TYPE_HINT: Record<IncomeType, string> = {
  salaire:
    "Cotisations salariales (Sécu, retraite, chômage, CSG, prévoyance). Défaut ≈ 22 % non-cadre / 25 % cadre.",
  freelance:
    "BNC : URSSAF + cotisations sociales. Très variable, défaut ≈ 27 %. Vérifie ton avis URSSAF.",
  locatif:
    "Revenus fonciers : prélèvements sociaux 17,2 % + IR au TMI. Défaut ≈ 30 % (estimation).",
  dividendes:
    "Flat tax (PFU) à 30 % par défaut. Option barème progressif possible selon TMI.",
  autre: "Pas de charges appliquées — saisis directement le montant net.",
};

// Fréquence → multiplicateur vers une base mensuelle
function frequencyFactorMonthly(
  s: IncomeSource,
  monthIndex: number
): number {
  switch (s.frequency) {
    case "monthly":
      return 1;
    case "annual":
      return 1 / 12;
    case "monthOnce":
      // versé une seule fois dans l'année, sur un mois précis
      return s.variableMonth === monthIndex ? 1 : 0;
    case "daily":
      // TJM × jours facturés dans le mois. Sans nombre de jours, rien : on ne
      // suppose pas un mois plein à la place de l'utilisateur.
      return Math.max(0, s.daysPerMonth ?? 0);
    default:
      return 0;
  }
}

// Net mensuel attendu pour une source à un mois donné (0–11).
// `tithePercent` : pourcentage de dîme du profil (0 si non applicable) —
// déduit du net UNIQUEMENT si la source a titheApplied.
export function monthlyNetForSource(
  s: IncomeSource,
  monthIndex: number,
  tithePercent: number = 0,
): number {
  const amount = parseNumber(s.amount);
  if (amount <= 0) return 0;
  const charges = Math.max(0, Math.min(60, parseNumber(s.chargesPercent)));
  let net = amount * (1 - charges / 100);
  if (s.titheApplied && tithePercent > 0) {
    net = net * (1 - Math.min(100, tithePercent) / 100);
  }
  return net * frequencyFactorMonthly(s, monthIndex);
}

// Montant mensuel moyen de la dîme (pour affichage récap).
export function averageMonthlyTithe(
  sources: IncomeSource[],
  tithePercent: number,
): number {
  if (tithePercent <= 0) return 0;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    for (const s of sources) {
      if (!s.titheApplied) continue;
      // net avant dîme − net après dîme
      const before = monthlyNetForSource({ ...s, titheApplied: false }, i, 0);
      sum += before * (Math.min(100, tithePercent) / 100);
    }
  }
  return sum / 12;
}

// Moyenne sur 12 mois (utile pour les widgets « net mensuel »).
export function averageMonthlyNet(
  sources: IncomeSource[],
  tithePercent: number = 0,
): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    for (const s of sources) sum += monthlyNetForSource(s, i, tithePercent);
  }
  return sum / 12;
}

// Brut annuel total (avant charges) — utile pour l'affichage récap.
export function annualGross(sources: IncomeSource[]): number {
  let sum = 0;
  for (const s of sources) {
    const amount = parseNumber(s.amount);
    if (amount <= 0) continue;
    switch (s.frequency) {
      case "monthly":
        sum += amount * 12;
        break;
      case "annual":
      case "monthOnce":
        sum += amount;
        break;
      case "daily":
        sum += amount * Math.max(0, s.daysPerMonth ?? 0) * 12;
        break;
    }
  }
  return sum;
}

// Net annuel total (après charges).
export function annualNet(
  sources: IncomeSource[],
  tithePercent: number = 0,
): number {
  return averageMonthlyNet(sources, tithePercent) * 12;
}

// Net mensuel par mois (tableau 12)
export function monthlyNetSeries(
  sources: IncomeSource[],
  tithePercent: number = 0,
): number[] {
  return Array.from({ length: 12 }, (_, i) =>
    sources.reduce((s, src) => s + monthlyNetForSource(src, i, tithePercent), 0)
  );
}

// Source par défaut au premier lancement
export function defaultIncomeSource(): IncomeSource {
  return {
    id: `salary-${Date.now()}`,
    label: "",
    type: "salaire",
    amount: "0",
    frequency: "annual",
    chargesPercent: String(STATUS_DEFAULT_CHARGES["non-cadre"]),
    proStatus: "non-cadre",
    timeMode: "plein",
  };
}
