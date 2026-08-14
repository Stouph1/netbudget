// Recherche de localisation : filtrage des pays, suggestions de villes et
// résolution de la ville « de référence » depuis le profil.
//
// Fonctions PURES (aucun hook, aucun react-native) : elles sont testées
// directement dans citySearch.test.ts.
import {
  CITIES,
  City,
  Country,
  COUNTRIES,
  citiesByCountry,
} from "../../src/constants/cities";
import { levenshtein, normalizeText } from "../../src/utils/finance";

export function filterCountries(citySearch: string): Country[] {
  const q = normalizeText(citySearch);
  if (!q) return COUNTRIES;
  return COUNTRIES.filter((c) => normalizeText(c.name).includes(q));
}

// Suggestions GLOBALES de villes affichées sur l'étape "pays" :
// si le user tape "argenteuil" sans avoir sélectionné un pays, on lui montre
// quand même les villes correspondantes (avec fuzzy match en bonus).
export function suggestCitiesGlobally(citySearch: string): City[] {
  const q = normalizeText(citySearch);
  if (q.length < 2) return [] as City[];
  // 1) Substring match exact sur nom OU région
  const exact = CITIES.filter((c) =>
    normalizeText(`${c.name} ${c.region}`).includes(q),
  );
  if (exact.length > 0) return exact.slice(0, 12);
  // 2) Sinon : fuzzy Levenshtein sur le nom seul, tolérance proportionnelle.
  const tolerance = Math.max(1, Math.floor(q.length / 4));
  const scored = CITIES.map((c) => ({
    c,
    d: levenshtein(normalizeText(c.name), q),
  })).filter((x) => x.d <= tolerance);
  scored.sort((a, b) => a.d - b.d);
  return scored.slice(0, 8).map((x) => x.c);
}

export function filterCitiesInCountry(
  citySearch: string,
  pickerCountry: string | null,
): City[] {
  if (!pickerCountry) return [];
  const list = citiesByCountry(pickerCountry);
  const q = normalizeText(citySearch);
  if (!q) return list;
  // 1) Substring match exact (comportement original)
  const exact = list.filter((c) => {
    const haystack = normalizeText(`${c.name} ${c.region}`);
    return haystack.includes(q);
  });
  if (exact.length > 0) return exact;
  // 2) Aucun match exact dans ce pays → on suggère via Levenshtein.
  const tolerance = Math.max(1, Math.floor(q.length / 4));
  return list
    .map((c) => ({ c, d: levenshtein(normalizeText(c.name), q) }))
    .filter((x) => x.d <= tolerance)
    .sort((a, b) => a.d - b.d)
    .slice(0, 8)
    .map((x) => x.c);
}

// Localisation : le PROFIL est la source de vérité dès qu'un compte existe.
//
// Avant, le réglage local « localisation par défaut » gagnait dès qu'on y
// avait touché : on pouvait déclarer Rouen dans son profil et continuer de
// voir Boston dans le dashboard. Deux endroits pour la même information,
// l'un écrasant l'autre en silence — mauvaise conception. Désormais :
//   - connecté    → la ville vient du profil (ville, sinon région, sinon pays)
//   - sans compte → le réglage local des Réglages, comme avant
export function resolveProfileCity(
  hasAccount: boolean,
  profileCity: string | null,
  region: string | undefined,
  country: string | undefined,
): City | null {
  if (!hasAccount) return null;
  const norm = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");

  // 1. La ville saisie dans le profil — donnée la plus précise.
  const wanted = profileCity?.trim() ? norm(profileCity) : "";
  if (wanted) {
    const exact = CITIES.find((c) => norm(c.name) === wanted);
    const partial =
      exact ??
      (wanted.length >= 4
        ? CITIES.find((c) => norm(c.name).startsWith(wanted))
        : undefined);
    if (partial) return partial;
  }

  // 2. Sinon la région, 3. sinon le pays : ville d'indice MÉDIAN de la zone,
  //    pour ne surestimer (capitale) ni sous-estimer (village) le coût de la vie.
  const pool = region
    ? CITIES.filter((c) => c.region === region)
    : country
      ? CITIES.filter((c) => c.countryCode === country)
      : [];
  if (!pool.length) return null;
  const sorted = [...pool].sort((a, b) => a.index - b.index);
  return sorted[Math.floor(sorted.length / 2)];
}
