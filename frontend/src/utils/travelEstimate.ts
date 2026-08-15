// Estimation d'un voyage à partir de ce que l'app sait déjà.
//
// Le module travelCost.ts porte les données sourcées ; celui-ci fait la
// jonction avec le profil utilisateur et l'assistant de création d'événement :
// il résout la destination saisie, calcule la distance depuis le pays de
// départ, et renvoie de quoi ajuster le budget ET l'expliquer à l'écran.
//
// Expliquer compte autant que calculer. Un budget qui passe de 1 200 € à
// 2 900 € sans un mot donne l'impression d'un bug ; la même chose avec
// « Bangkok, 9 450 km, vol AR estimé 690 € par personne » se comprend et se
// discute.

import { CITIES } from "../constants/cities";
import {
  adjustTravelItems,
  destinationCostIndex,
  estimateFlightPrice,
  gatewayFor,
  resolveDestination,
  type PetKind,
} from "../constants/travelCost";
import type { Pet } from "../types/advice";
import { convert as convertAmount } from "./exchangeRates";
import { groundTravelPlausible, haversineKm } from "./geoDistance";

/**
 * Ramène les six espèces du profil aux trois barèmes de garde connus.
 *
 * On ne dispose de tarifs sourcés que pour chien, chat et « autre petit
 * animal ». Plutôt que d'inventer un prix par espèce, tout le reste tombe dans
 * la catégorie générique — c'est moins précis, mais ce n'est pas faux.
 */
export function toPetKind(species: Pet["species"]): PetKind {
  if (species === "dog") return "dog";
  if (species === "cat") return "cat";
  return "other";
}

export type TravelEstimate = {
  /** Pays d'arrivée résolu (code ISO). */
  country: string;
  /** Libellé retenu, tel qu'il sera montré à l'utilisateur. */
  matched: string;
  /** Distance orthodromique depuis le pays de départ, en km. */
  km: number;
  /** Aller-retour économique estimé, par personne. */
  flightPerPerson: number;
  /** Indice de coût de la vie sur place, base France = 1,00. */
  costIndex: number;
  /** Le train ou la voiture sont une alternative crédible sur cette distance. */
  groundAlternative: boolean;
};

/**
 * Résout une destination saisie librement et chiffre le trajet.
 *
 * Renvoie null quand la destination n'est pas reconnue : l'app garde alors les
 * montants du barème générique plutôt que d'appliquer un ajustement au hasard.
 */
export function estimateTrip(
  input: string,
  origin: string | undefined,
  cities: { name: string; countryCode: string }[] = CITIES,
): TravelEstimate | null {
  const resolved = resolveDestination(input, cities);
  if (!resolved) return null;

  const from = gatewayFor(origin);
  const to = gatewayFor(resolved.country);
  // Sans point de départ connu, on peut encore donner le coût de la vie sur
  // place — mais pas un prix de billet. Mieux vaut une moitié d'information
  // juste qu'une estimation de vol inventée.
  const km = from && to ? Math.round(haversineKm(from, to)) : 0;

  return {
    country: resolved.country,
    matched: resolved.matched,
    km,
    flightPerPerson: km > 0 ? estimateFlightPrice(km) : 0,
    costIndex: destinationCostIndex(resolved.country),
    groundAlternative: groundTravelPlausible(km),
  };
}

/**
 * Prend la destination la plus lointaine d'un itinéraire à plusieurs étapes.
 *
 * C'est elle qui dimensionne le billet : un Paris–Bangkok–Singapour se paie au
 * prix de l'Asie du Sud-Est, pas au prix de la première escale. Le coût de la
 * vie retenu suit la même étape, ce qui est prudent sans être absurde.
 */
export function dominantDestination(
  inputs: string[],
  origin: string | undefined,
  cities: { name: string; countryCode: string }[] = CITIES,
): TravelEstimate | null {
  const estimates = inputs
    .map((d) => estimateTrip(d, origin, cities))
    .filter((e): e is TravelEstimate => e !== null);
  if (estimates.length === 0) return null;
  return estimates.reduce((far, e) => (e.km > far.km ? e : far));
}

export type TripBudgetInput = {
  items: { label: string; estimated: number; emoji?: string }[];
  estimate: TravelEstimate | null;
  origin?: string;
  travelers: number;
  /** Durée du séjour en jours — sert la garde des animaux. */
  days?: number;
  pets?: Pet[];
};

/**
 * Applique l'estimation aux postes du budget.
 *
 * Sans destination reconnue, les postes ressortent inchangés : l'assistant a
 * déjà proposé un barème par gamme, et le remplacer par du vide serait pire.
 */
export function applyTripToItems(
  input: TripBudgetInput,
): { label: string; estimated: number; emoji?: string }[] {
  if (!input.estimate) return input.items;
  return adjustTravelItems(input.items, {
    origin: input.origin,
    destination: input.estimate.country,
    km: input.estimate.km,
    travelers: Math.max(1, input.travelers),
    days: input.days,
    pets: (input.pets ?? [])
      .filter((p) => p.count > 0)
      .map((p) => ({ species: toPetKind(p.species), count: p.count })),
  });
}

/**
 * Convertit des montants EXPRIMÉS EN EUROS vers la devise d'affichage.
 *
 * Tous les barèmes de l'app — gammes des modèles d'événement, prix de vol,
 * garde des animaux — sont en euros, parce que c'est la devise des sources.
 * Sans cette conversion, un utilisateur affichant en yens voyait « 690 ¥ »
 * pour un vol qui en vaut cent mille : le nombre était juste, l'unité fausse.
 *
 * Hors ligne, sans taux disponible, on renvoie les montants inchangés — mieux
 * vaut une devise incertaine qu'un budget à zéro.
 */
export function toDisplayCurrency<T extends { estimated: number }>(
  items: T[],
  display: string,
  rates: Parameters<typeof convertAmount>[3],
): T[] {
  if (display === "EUR" || !rates) return items;
  return items.map((it) => {
    const v = convertAmount(it.estimated, "EUR", display as never, rates);
    // convert() renvoie 0 quand un taux manque : dans ce cas on garde la
    // valeur d'origine plutôt que d'afficher un poste vide.
    return v > 0 ? { ...it, estimated: Math.round(v) } : it;
  });
}

/** Nombre de jours entre deux dates ISO, ou undefined si l'une manque. */
export function stayDays(startIso?: string, endIso?: string): number | undefined {
  if (!startIso || !endIso) return undefined;
  const a = new Date(startIso + "T12:00:00").getTime();
  const b = new Date(endIso + "T12:00:00").getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return undefined;
  return Math.round((b - a) / 86_400_000);
}
