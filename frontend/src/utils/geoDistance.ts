// Distance à vol d'oiseau entre deux points, et estimation du prix d'un billet
// à partir de cette distance.
//
// Pourquoi cette approche plutôt qu'une API de prix : elle fonctionne hors
// ligne, sans clé, sans quota, et pour n'importe quel couple origine/destination.
// Un budget prévisionnel n'a pas besoin du prix exact du jour — il a besoin du
// bon ORDRE DE GRANDEUR. Paris-Bangkok ne coûte pas Paris-Barcelone, et c'est ça
// que l'app doit refléter. L'utilisateur affine ensuite avec ses vrais devis
// via le suivi des prix.

/** Rayon moyen de la Terre en kilomètres (IUGG). */
const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Distance orthodromique (formule de haversine) en kilomètres.
 * Précision suffisante ici : l'erreur due à l'aplatissement terrestre est
 * inférieure à 0,5 %, négligeable devant la variabilité des prix.
 */
export function haversineKm(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): number {
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type FlightTier = "domestic" | "short" | "medium" | "long" | "ultraLong";

/** Catégorie de vol selon la distance — les prix ne suivent pas la même pente. */
export function flightTier(km: number): FlightTier {
  if (km < 500) return "domestic";
  if (km < 1500) return "short";
  if (km < 4000) return "medium";
  if (km < 9000) return "long";
  return "ultraLong";
}

/**
 * Estimation d'un aller-retour en classe économique, par personne.
 *
 * Modèle : un coût fixe par trajet (taxes, redevances, mise en ligne de
 * l'avion) plus un coût kilométrique DÉGRESSIF — c'est pour ça qu'un vol de
 * 500 km n'est pas dix fois moins cher qu'un vol de 5 000 km.
 *
 * `tierPrices` est fourni par l'appelant depuis les données sourcées
 * (voir travelCost.ts), pour qu'aucun chiffre ne soit inventé ici.
 */
export function estimateReturnFlight(
  km: number,
  tierPrices: Record<FlightTier, { base: number; perKm: number }>,
): number {
  if (!(km > 0)) return 0;
  const { base, perKm } = tierPrices[flightTier(km)];
  // base = coût incompressible d'un aller-retour ; perKm porte sur la distance
  // aller simple (le retour est déjà dans le tarif AR de référence).
  return Math.round(base + km * perKm);
}

/**
 * Trajet terrestre plausible ? En dessous de ~800 km, le train ou la voiture
 * sont souvent choisis — l'app le signale plutôt que d'imposer l'avion.
 */
export function groundTravelPlausible(km: number): boolean {
  return km > 0 && km < 800;
}
