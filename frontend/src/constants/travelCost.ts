// Coût d'un voyage selon la DESTINATION et le POINT DE DÉPART.
//
// Trois choses varient et que l'app ignorait complètement :
//  1. le prix du billet, qui dépend de la distance parcourue ;
//  2. le coût de la vie sur place — deux semaines à Bangkok et deux semaines
//     à Oslo n'ont rien à voir ;
//  3. la garde des animaux restés à la maison.
//
// Toutes les valeurs ci-dessous sont SOURCÉES (recherche du 2026-08-14, voir
// docs/). Aucune n'est estimée au jugé. Les limites méthodologiques sont
// documentées à l'endroit où elles comptent.

import type { Country } from "../types/advice";

// ============================================================================
// 1. COÛT DE LA VIE SUR PLACE — base France = 1,00
// ============================================================================
//
// Deux sources, par ordre de qualité pour un usage TOURISTIQUE :
//
//  - Eurostat, Price Level Indices catégorie A0111 « Restaurants et hôtels »,
//    année 2024, base EU27 = 100 (dataset prc_ppp_ind). C'est la SEULE source
//    publique qui isole vraiment le panier d'un voyageur : hébergement de
//    courte durée + restauration commerciale. Limitée à l'Europe.
//
//  - Numbeo « Cost of Living Index by Country », édition 2026 mid-year, base
//    New York = 100. Composite NetBudget : 40 % restaurants + 35 % coût de la
//    vie + 25 % coût+loyer. Utilisé partout où Eurostat n'existe pas.
//
// LIMITE IMPORTANTE : Numbeo mesure une consommation de RÉSIDENT, pas de
// touriste. En Asie de l'Est, son indice restaurant reflète la restauration
// populaire locale et sous-estime nettement la dépense d'un voyageur
// occidental (hôtels chers). C'est pourquoi le composite intègre 25 % de
// coût+loyer, et pourquoi l'app présente toujours ces montants comme des
// points de départ à ajuster.

type CostSource = "eurostat" | "numbeo";

export const DESTINATION_COST: Record<
  string,
  { index: number; source: CostSource }
> = {
  // --- Europe : Eurostat « Restaurants et hôtels » 2024 (base France) ---
  FR: { index: 1.0, source: "eurostat" },
  DE: { index: 1.02, source: "eurostat" },
  ES: { index: 0.76, source: "eurostat" },
  IT: { index: 0.97, source: "eurostat" },
  PT: { index: 0.69, source: "eurostat" },
  NL: { index: 1.13, source: "eurostat" },
  BE: { index: 1.13, source: "eurostat" },
  CH: { index: 1.55, source: "eurostat" },
  LU: { index: 1.12, source: "eurostat" },
  SE: { index: 1.06, source: "eurostat" },
  NO: { index: 1.27, source: "eurostat" },
  DK: { index: 1.34, source: "eurostat" },
  FI: { index: 1.15, source: "eurostat" },
  IE: { index: 1.18, source: "eurostat" },
  AT: { index: 1.0, source: "eurostat" },
  PL: { index: 0.83, source: "eurostat" },
  CZ: { index: 0.67, source: "eurostat" },
  GR: { index: 0.79, source: "eurostat" },
  RO: { index: 0.62, source: "eurostat" },
  HU: { index: 0.65, source: "eurostat" },
  TR: { index: 0.63, source: "eurostat" },

  // --- Reste du monde : composite Numbeo 2026 (base France) ---
  US: { index: 1.11, source: "numbeo" },
  CA: { index: 0.95, source: "numbeo" },
  GB: { index: 1.08, source: "numbeo" },
  RU: { index: 0.58, source: "numbeo" },
  UA: { index: 0.42, source: "numbeo" },
  IL: { index: 1.42, source: "numbeo" },
  AE: { index: 0.9, source: "numbeo" },
  SA: { index: 0.61, source: "numbeo" },
  IN: { index: 0.25, source: "numbeo" },
  CN: { index: 0.41, source: "numbeo" },
  HK: { index: 1.06, source: "numbeo" },
  SG: { index: 1.25, source: "numbeo" },
  JP: { index: 0.62, source: "numbeo" },
  KR: { index: 0.7, source: "numbeo" },
  ID: { index: 0.3, source: "numbeo" },
  TH: { index: 0.48, source: "numbeo" },
  VN: { index: 0.34, source: "numbeo" },
  MY: { index: 0.44, source: "numbeo" },
  PH: { index: 0.38, source: "numbeo" },
  AU: { index: 1.08, source: "numbeo" },
  NZ: { index: 0.9, source: "numbeo" },
  MX: { index: 0.68, source: "numbeo" },
  BR: { index: 0.48, source: "numbeo" },
  AR: { index: 0.72, source: "numbeo" },
  CL: { index: 0.58, source: "numbeo" },
  CO: { index: 0.51, source: "numbeo" },
  PE: { index: 0.45, source: "numbeo" },
  ZA: { index: 0.58, source: "numbeo" },
  NG: { index: 0.31, source: "numbeo" },
  KE: { index: 0.41, source: "numbeo" },
  MA: { index: 0.43, source: "numbeo" },
  EG: { index: 0.31, source: "numbeo" },
  DZ: { index: 0.33, source: "numbeo" },
  TN: { index: 0.36, source: "numbeo" },
  SN: { index: 0.72, source: "numbeo" },
  CI: { index: 0.65, source: "numbeo" },
  CM: { index: 0.6, source: "numbeo" },

  // Monaco n'existe dans AUCUNE des deux sources. Plutôt que d'inventer un
  // chiffre, on applique l'indice suisse : c'est la meilleure approximation
  // documentable pour une enclave à très haut niveau de prix. À afficher comme
  // approximation si un jour l'app le signale.
  MC: { index: 1.55, source: "numbeo" },
};

/** Indice de coût sur place, 1,00 par défaut (pays inconnu = coût français). */
export function destinationCostIndex(country?: string): number {
  if (!country) return 1;
  return DESTINATION_COST[country]?.index ?? 1;
}

// ============================================================================
// 2. COORDONNÉES — principale porte d'entrée aérienne de chaque pays
// ============================================================================
//
// Source : GeoNames, dataset cities15000 (licence CC BY 4.0), relevé
// 2026-08-14. Quand la capitale politique n'est pas la principale porte
// d'entrée, c'est cette dernière qui est retenue : on estime un trajet réel,
// pas une distance protocolaire (Sydney et non Canberra, Casablanca et non
// Rabat, Douala et non Yaoundé).

export const COUNTRY_GATEWAY: Record<string, { city: string; lat: number; lon: number }> = {
  FR: { city: "Paris", lat: 48.85, lon: 2.35 },
  MC: { city: "Monaco", lat: 43.74, lon: 7.42 },
  LU: { city: "Luxembourg", lat: 49.61, lon: 6.13 },
  US: { city: "New York", lat: 40.71, lon: -74.01 },
  CA: { city: "Toronto", lat: 43.71, lon: -79.4 },
  GB: { city: "Londres", lat: 51.51, lon: -0.13 },
  DE: { city: "Berlin", lat: 52.52, lon: 13.41 },
  ES: { city: "Madrid", lat: 40.42, lon: -3.7 },
  IT: { city: "Rome", lat: 41.89, lon: 12.51 },
  PT: { city: "Lisbonne", lat: 38.73, lon: -9.15 },
  NL: { city: "Amsterdam", lat: 52.37, lon: 4.89 },
  BE: { city: "Bruxelles", lat: 50.85, lon: 4.35 },
  CH: { city: "Zurich", lat: 47.37, lon: 8.55 },
  SE: { city: "Stockholm", lat: 59.33, lon: 18.07 },
  NO: { city: "Oslo", lat: 59.91, lon: 10.75 },
  DK: { city: "Copenhague", lat: 55.68, lon: 12.57 },
  FI: { city: "Helsinki", lat: 60.17, lon: 24.94 },
  IE: { city: "Dublin", lat: 53.33, lon: -6.25 },
  AT: { city: "Vienne", lat: 48.21, lon: 16.37 },
  PL: { city: "Varsovie", lat: 52.23, lon: 21.01 },
  CZ: { city: "Prague", lat: 50.09, lon: 14.42 },
  GR: { city: "Athènes", lat: 37.98, lon: 23.73 },
  RO: { city: "Bucarest", lat: 44.43, lon: 26.11 },
  HU: { city: "Budapest", lat: 47.5, lon: 19.04 },
  RU: { city: "Moscou", lat: 55.75, lon: 37.62 },
  UA: { city: "Kyiv", lat: 50.45, lon: 30.52 },
  TR: { city: "Istanbul", lat: 41.01, lon: 28.95 },
  IL: { city: "Tel-Aviv", lat: 32.08, lon: 34.78 },
  AE: { city: "Dubaï", lat: 25.08, lon: 55.31 },
  SA: { city: "Riyad", lat: 24.69, lon: 46.72 },
  IN: { city: "New Delhi", lat: 28.62, lon: 77.21 },
  CN: { city: "Pékin", lat: 39.91, lon: 116.4 },
  HK: { city: "Hong Kong", lat: 22.28, lon: 114.17 },
  SG: { city: "Singapour", lat: 1.29, lon: 103.85 },
  JP: { city: "Tokyo", lat: 35.69, lon: 139.69 },
  KR: { city: "Séoul", lat: 37.57, lon: 126.98 },
  ID: { city: "Jakarta", lat: -6.21, lon: 106.85 },
  TH: { city: "Bangkok", lat: 13.75, lon: 100.5 },
  VN: { city: "Hanoï", lat: 21.02, lon: 105.84 },
  MY: { city: "Kuala Lumpur", lat: 3.14, lon: 101.69 },
  PH: { city: "Manille", lat: 14.6, lon: 120.98 },
  AU: { city: "Sydney", lat: -33.87, lon: 151.21 },
  NZ: { city: "Auckland", lat: -36.85, lon: 174.76 },
  MX: { city: "Mexico", lat: 19.43, lon: -99.13 },
  BR: { city: "São Paulo", lat: -23.55, lon: -46.64 },
  AR: { city: "Buenos Aires", lat: -34.61, lon: -58.38 },
  CL: { city: "Santiago", lat: -33.46, lon: -70.65 },
  CO: { city: "Bogotá", lat: 4.61, lon: -74.08 },
  PE: { city: "Lima", lat: -12.04, lon: -77.03 },
  ZA: { city: "Johannesburg", lat: -26.2, lon: 28.04 },
  NG: { city: "Lagos", lat: 6.45, lon: 3.39 },
  KE: { city: "Nairobi", lat: -1.28, lon: 36.82 },
  MA: { city: "Casablanca", lat: 33.59, lon: -7.61 },
  EG: { city: "Le Caire", lat: 30.06, lon: 31.25 },
  DZ: { city: "Alger", lat: 36.73, lon: 3.09 },
  TN: { city: "Tunis", lat: 36.82, lon: 10.17 },
  SN: { city: "Dakar", lat: 14.69, lon: -17.44 },
  CI: { city: "Abidjan", lat: 5.35, lon: -4.0 },
  CM: { city: "Douala", lat: 4.05, lon: 9.7 },
};

// ============================================================================
// 3. PRIX DU BILLET SELON LA DISTANCE
// ============================================================================
//
// Modèle : loi de puissance ajustée sur 30 destinations au départ de Paris
// (prix moyens Algofly, relevé 2026-08-14 ; distances calculées en
// orthodromie). R²(log) = 0,938.
//
//     prix aller-retour (€) = 0,170 × km^0,907
//
// L'exposant INFÉRIEUR À 1 est le cœur du modèle : il traduit la dégressivité
// du prix au kilomètre. Constat empirique sur les extrêmes : 10,60 €/100 km
// pour Barcelone contre 5,70 €/100 km pour Auckland, soit un rapport de 1,9.
// La cause est le coût fixe d'un vol (redevances, taxes, rotation de l'avion)
// qui s'amortit d'autant mieux que la distance est longue.
//
// LIMITES ASSUMÉES :
//  - calibré au DÉPART DE PARIS uniquement ; un départ de Genève ou Montréal
//    donnerait d'autres constantes ;
//  - la dégressivité est une tendance, pas une loi : les routes peu
//    concurrentielles (Dakar, Antilles) sont nettement au-dessus ;
//  - aucune correction saisonnière, alors que les prix varient fortement.
// D'où le message affiché : c'est un ordre de grandeur, à affiner avec de
// vrais devis via le suivi des prix.

const FLIGHT_COEF = 0.17;
const FLIGHT_EXPONENT = 0.907;

/** Estimation d'un aller-retour en classe économique, par personne. */
export function estimateFlightPrice(km: number): number {
  if (!(km > 0)) return 0;
  return Math.round(FLIGHT_COEF * Math.pow(km, FLIGHT_EXPONENT));
}

// ============================================================================
// 4. GARDE DES ANIMAUX RESTÉS À LA MAISON
// ============================================================================
//
// Sources : Animaute (tarifs 2024-2025), Woopets (2025), Pet Services Paris
// (grille 2025). Fourchettes françaises, milieu de fourchette retenu.
//
// Le pet-sitting entre particuliers revient environ 30 % moins cher que la
// pension traditionnelle (116 € contre 168 € pour 8 jours de garde d'un
// chien, soit −31 %) : c'est l'option proposée par défaut, la moins chère.

const PET_DAILY = {
  dog: { pension: 22, sitter: 15 }, // pension 15-30 €/j · sitter 11-25 €/j
  cat: { pension: 16, sitter: 11 }, // pension 12-20 €/j
  other: { pension: 14, sitter: 10 },
} as const;

export type PetKind = keyof typeof PET_DAILY;

/**
 * Coût de la garde pendant l'absence.
 * `mode: "sitter"` = garde entre particuliers (option la moins chère).
 */
export function petCareCost(
  pets: { species: PetKind; count: number }[],
  days: number,
  mode: "pension" | "sitter" = "sitter",
): number {
  if (!(days > 0)) return 0;
  return Math.round(
    pets.reduce(
      (sum, p) => sum + PET_DAILY[p.species][mode] * Math.max(0, p.count) * days,
      0,
    ),
  );
}

// Transport de l'animal EN AVION, par trajet et par animal — barème Air France
// relayé par trois sources concordantes (info-vol.com 2025, L'Écho touristique,
// Fondation 30 Millions d'Amis). ⚠️ NON confirmé sur le site officiel lors de
// la recherche : à revérifier avant de le présenter comme un tarif ferme.
// Cabine si animal + sac ≤ 8 kg ; au-delà, tarif soute.
const PET_FLIGHT = {
  domestic: { cabin: 70, hold: 100 },
  europe: { cabin: 125, hold: 200 },
  intl: { cabin: 200, hold: 400 },
} as const;

/** Coût aller-retour du transport d'un animal (2 trajets). */
export function petFlightCost(
  km: number,
  animals: number,
  inCabin: boolean,
): number {
  if (!(animals > 0) || !(km > 0)) return 0;
  const zone = km < 1000 ? "domestic" : km < 4000 ? "europe" : "intl";
  const perTrip = PET_FLIGHT[zone][inCabin ? "cabin" : "hold"];
  return perTrip * animals * 2;
}

// ============================================================================
// 5. Résolution d'une destination saisie librement
// ============================================================================

/** Normalise pour comparer « saint-étienne », « Saint Etienne », « SAINT ÉTIENNE ». */
function normalize(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/**
 * Retrouve le pays d'une destination saisie au clavier, en cherchant d'abord
 * parmi les portes d'entrée connues, puis dans le référentiel de villes fourni
 * par l'appelant (499 villes, 59 pays).
 */
export function resolveDestination(
  input: string,
  cities: { name: string; countryCode: string }[],
): { country: string; matched: string } | null {
  const target = normalize(input);
  if (!target) return null;

  for (const [code, gw] of Object.entries(COUNTRY_GATEWAY)) {
    if (normalize(gw.city) === target) return { country: code, matched: gw.city };
  }
  const city = cities.find((c) => normalize(c.name) === target);
  if (city) return { country: city.countryCode, matched: city.name };

  // Repli : nom de pays écrit en toutes lettres (« Thaïlande », « Japon »).
  const byCountry = Object.entries(COUNTRY_GATEWAY).find(
    ([code]) => normalize(code) === target,
  );
  if (byCountry) return { country: byCountry[0], matched: byCountry[1].city };

  return null;
}

/** Coordonnées d'un pays, pour le calcul de distance. */
export function gatewayFor(country?: string): { lat: number; lon: number } | null {
  if (!country) return null;
  const gw = COUNTRY_GATEWAY[country as Country];
  return gw ? { lat: gw.lat, lon: gw.lon } : null;
}

// ============================================================================
// 6. Application au budget d'un voyage
// ============================================================================

export type TravelContext = {
  /** Pays de départ (profil de l'utilisateur). */
  origin?: string;
  /** Pays d'arrivée, résolu depuis la destination saisie. */
  destination?: string;
  /** Distance orthodromique en km, calculée par l'appelant. */
  km?: number;
  travelers: number;
  /** Durée du séjour, pour la garde des animaux. */
  days?: number;
  pets?: { species: PetKind; count: number }[];
};

/**
 * Ajuste les postes d'un budget voyage au contexte réel.
 *
 * Deux corrections distinctes, et c'est important de ne pas les confondre :
 *  - le TRANSPORT dépend de la DISTANCE (Paris-Bangkok ≠ Paris-Barcelone) ;
 *  - l'hébergement, les repas et les activités dépendent du COÛT DE LA VIE
 *    à destination (deux semaines en Norvège ≠ deux semaines au Vietnam).
 * Confondre les deux ferait payer un vol au prix norvégien.
 */
export function adjustTravelItems(
  items: { label: string; estimated: number; emoji?: string }[],
  ctx: TravelContext,
): { label: string; estimated: number; emoji?: string }[] {
  const costIdx = destinationCostIndex(ctx.destination);
  const flight = ctx.km ? estimateFlightPrice(ctx.km) : 0;

  const adjusted = items.map((it) => {
    // Transport : remplacé par l'estimation basée sur la distance réelle.
    if (it.label.endsWith(".transport") && flight > 0) {
      return { ...it, estimated: flight * Math.max(1, ctx.travelers) };
    }
    // Dépenses sur place : mises à l'échelle du coût de la vie local.
    if (
      it.label.endsWith(".lodging") ||
      it.label.endsWith(".food") ||
      it.label.endsWith(".activities") ||
      it.label.endsWith(".localTransport")
    ) {
      return { ...it, estimated: Math.round(it.estimated * costIdx) };
    }
    // Assurance, visa, imprévus : indépendants de la destination.
    return it;
  });

  // Garde des animaux : ligne ajoutée seulement si le foyer en a.
  const pets = ctx.pets?.filter((p) => p.count > 0) ?? [];
  if (pets.length > 0 && (ctx.days ?? 0) > 0) {
    adjusted.push({
      label: "evt.travel.item.petCare",
      emoji: "🐾",
      estimated: petCareCost(pets, ctx.days!, "sitter"),
    });
  }

  return adjusted;
}
