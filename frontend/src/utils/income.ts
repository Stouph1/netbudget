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
  /**
   * Base du don : sur le brut (avant charges) ou sur le net (après). Absent =
   * net, le comportement d'origine. Beaucoup de donateurs raisonnent sur le
   * brut : c'est une conviction, pas une erreur, et l'app doit suivre.
   */
  titheBase?: "gross" | "net";
  /**
   * Mois (0-11) où ce revenu est perçu. Absent = les douze. Une bourse sur dix
   * mois, un salaire saisonnier, un loyer d'été : le montant n'arrive pas
   * chaque mois, et le budget doit le voir.
   */
  activeMonths?: number[];
  /**
   * Brut d'un mois précis, saisi à la main (clé = index du mois, valeur =
   * montant brut). Remplace le montant calculé pour ce mois seulement : un
   * mois avec prime, un mois à mi-temps, un mois sans mission.
   */
  monthOverrides?: Record<string, string>;
};

/** Ce revenu est-il perçu ce mois-là ? */
export function isMonthActive(s: IncomeSource, monthIndex: number): boolean {
  if (s.frequency === "monthOnce") return s.variableMonth === monthIndex;
  return !s.activeMonths || s.activeMonths.includes(monthIndex);
}

/** Nombre de mois perçus (12 par défaut, 1 pour un versement unique). */
export function activeMonthCount(s: IncomeSource): number {
  if (s.frequency === "monthOnce") return 1;
  return s.activeMonths ? s.activeMonths.length : 12;
}

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
      return isMonthActive(s, monthIndex) ? 1 : 0;
    case "annual": {
      // Un montant annuel se répartit sur les mois où il tombe : dix mois de
      // bourse, c'est le total divisé par dix, pas par douze.
      if (!isMonthActive(s, monthIndex)) return 0;
      return 1 / Math.max(1, activeMonthCount(s));
    }
    case "monthOnce":
      // versé une seule fois dans l'année, sur un mois précis
      return s.variableMonth === monthIndex ? 1 : 0;
    case "daily":
      // TJM × jours facturés dans le mois. Sans nombre de jours, rien : on ne
      // suppose pas un mois plein à la place de l'utilisateur.
      return isMonthActive(s, monthIndex) ? Math.max(0, s.daysPerMonth ?? 0) : 0;
    default:
      return 0;
  }
}

// Net mensuel attendu pour une source à un mois donné (0–11).
// `tithePercent` : pourcentage de dîme du profil (0 si non applicable) —
// déduit du net UNIQUEMENT si la source a titheApplied.
/**
 * Brut d'un mois donné, tel que le budget le calcule : le montant saisi × la
 * part du mois, ou le montant du mois si la personne l'a fixé à la main.
 */
export function grossForMonth(s: IncomeSource, monthIndex: number): number {
  const override = s.monthOverrides?.[String(monthIndex)];
  if (override !== undefined && override !== "") return Math.max(0, parseNumber(override));
  const amount = parseNumber(s.amount);
  if (amount <= 0) return 0;
  return amount * frequencyFactorMonthly(s, monthIndex);
}

/** Brut du mois AVANT toute retouche manuelle — ce que le formulaire propose. */
export function defaultGrossForMonth(s: IncomeSource, monthIndex: number): number {
  return grossForMonth({ ...s, monthOverrides: undefined }, monthIndex);
}

export function monthlyNetForSource(
  s: IncomeSource,
  monthIndex: number,
  tithePercent: number = 0,
): number {
  const gross = grossForMonth(s, monthIndex);
  if (gross <= 0) return 0;
  const charges = Math.max(0, Math.min(60, parseNumber(s.chargesPercent)));
  let net = gross * (1 - charges / 100);
  if (s.titheApplied && tithePercent > 0) {
    const base = s.titheBase === "gross" ? gross : net;
    net = Math.max(0, net - base * (Math.min(100, tithePercent) / 100));
  }
  return net;
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
      // net avant dîme − net après dîme : vaut pour une base brute comme nette.
      sum += monthlyNetForSource(s, i, 0) - monthlyNetForSource(s, i, tithePercent);
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

// Brut annuel total (avant charges) — la somme des douze bruts mensuels, mois
// perçus et retouches comprises.
export function annualGross(sources: IncomeSource[]): number {
  let sum = 0;
  for (const s of sources) for (let i = 0; i < 12; i++) sum += grossForMonth(s, i);
  return sum;
}

/** Mois où au moins une source a été retouchée à la main ou coupée. */
export function editedMonths(sources: IncomeSource[]): number[] {
  const out = new Set<number>();
  for (const s of sources) {
    for (const k of Object.keys(s.monthOverrides ?? {})) {
      if (s.monthOverrides?.[k] !== "") out.add(Number(k));
    }
    if (s.activeMonths && s.frequency !== "monthOnce") {
      for (let i = 0; i < 12; i++) if (!s.activeMonths.includes(i)) out.add(i);
    }
  }
  return [...out].sort((a, b) => a - b);
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
    // Mensuel : c'est le chiffre que les gens ont en tête. En annuel par défaut,
    // beaucoup saisissaient leur salaire mensuel et voyaient un budget divisé
    // par douze.
    frequency: "monthly",
    chargesPercent: String(STATUS_DEFAULT_CHARGES["non-cadre"]),
    proStatus: "non-cadre",
    timeMode: "plein",
  };
}
