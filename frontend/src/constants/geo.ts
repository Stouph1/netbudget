// Constantes géographiques partagées (inscription + Coach).
// Les codes pays correspondent au type Country du moteur de conseils.

import type { Country } from "../types/advice";

export const COUNTRY_OPTIONS: { value: Country; label: string }[] = [
  { value: "FR", label: "France" },
  { value: "BE", label: "Belgique" },
  { value: "CH", label: "Suisse" },
  { value: "LU", label: "Luxembourg" },
  { value: "CA", label: "Canada" },
  { value: "DE", label: "Allemagne" },
  { value: "GB", label: "Royaume-Uni" },
  { value: "US", label: "États-Unis" },
  { value: "ES", label: "Espagne" },
  { value: "IT", label: "Italie" },
  { value: "PT", label: "Portugal" },
  { value: "MA", label: "Maroc" },
  { value: "DZ", label: "Algérie" },
  { value: "TN", label: "Tunisie" },
  { value: "SN", label: "Sénégal" },
  { value: "CI", label: "Côte d'Ivoire" },
  { value: "CM", label: "Cameroun" },
  { value: "OTHER", label: "Autre pays" },
];

// Régions françaises — les aides locales (transport jeunes, cartes région,
// bourses) varient fortement d'une région à l'autre.
export const FR_REGIONS: string[] = [
  "Île-de-France",
  "Auvergne-Rhône-Alpes",
  "Bourgogne-Franche-Comté",
  "Bretagne",
  "Centre-Val de Loire",
  "Corse",
  "Grand Est",
  "Hauts-de-France",
  "Normandie",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Pays de la Loire",
  "Provence-Alpes-Côte d'Azur",
  "Outre-mer",
];
