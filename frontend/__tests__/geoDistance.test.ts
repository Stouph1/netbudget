// Distance géographique et estimation de vol.
//
// Les distances de référence sont vérifiables : ce sont des faits
// géographiques, pas des estimations.

import {
  estimateReturnFlight,
  flightTier,
  groundTravelPlausible,
  haversineKm,
  type FlightTier,
} from "../src/utils/geoDistance";

const PARIS = { lat: 48.86, lon: 2.35 };
const BARCELONE = { lat: 41.39, lon: 2.17 };
const BANGKOK = { lat: 13.76, lon: 100.5 };
const NEW_YORK = { lat: 40.71, lon: -74.01 };
const SYDNEY = { lat: -33.87, lon: 151.21 };
const DAKAR = { lat: 14.72, lon: -17.47 };

describe("haversineKm", () => {
  it("mesure Paris-Barcelone (~830 km)", () => {
    expect(haversineKm(PARIS, BARCELONE)).toBeCloseTo(830, -2);
  });

  it("mesure Paris-New York (~5 840 km)", () => {
    expect(haversineKm(PARIS, NEW_YORK)).toBeCloseTo(5840, -2);
  });

  it("mesure Paris-Bangkok (~9 450 km)", () => {
    expect(haversineKm(PARIS, BANGKOK)).toBeCloseTo(9450, -2);
  });

  it("mesure Paris-Sydney (~16 960 km)", () => {
    expect(haversineKm(PARIS, SYDNEY)).toBeCloseTo(16_960, -2);
  });

  it("mesure Paris-Dakar (~4 200 km)", () => {
    expect(haversineKm(PARIS, DAKAR)).toBeCloseTo(4200, -2);
  });

  it("renvoie zéro pour deux points identiques", () => {
    expect(haversineKm(PARIS, PARIS)).toBeCloseTo(0, 5);
  });

  it("est symétrique", () => {
    expect(haversineKm(PARIS, BANGKOK)).toBeCloseTo(haversineKm(BANGKOK, PARIS), 6);
  });

  it("gère le passage de l'antiméridien", () => {
    const fidji = { lat: -18.14, lon: 178.44 };
    const samoa = { lat: -13.83, lon: -171.77 };
    // ~1 160 km réels : sans traitement correct, on obtiendrait ~38 000 km.
    expect(haversineKm(fidji, samoa)).toBeLessThan(1500);
  });

  it("gère les pôles", () => {
    const nord = { lat: 90, lon: 0 };
    const sud = { lat: -90, lon: 0 };
    // Demi-circonférence terrestre ≈ 20 015 km.
    expect(haversineKm(nord, sud)).toBeCloseTo(20_015, -2);
  });
});

describe("flightTier", () => {
  it("classe chaque distance dans la bonne catégorie", () => {
    expect(flightTier(200)).toBe("domestic");
    expect(flightTier(830)).toBe("short");
    expect(flightTier(2500)).toBe("medium");
    expect(flightTier(5840)).toBe("long");
    expect(flightTier(16_960)).toBe("ultraLong");
  });

  it("respecte les bornes", () => {
    expect(flightTier(499)).toBe("domestic");
    expect(flightTier(500)).toBe("short");
    expect(flightTier(1499)).toBe("short");
    expect(flightTier(1500)).toBe("medium");
  });
});

describe("estimateReturnFlight", () => {
  // Barème factice : la vraie table vit dans travelCost.ts, sourcée.
  const tiers: Record<FlightTier, { base: number; perKm: number }> = {
    domestic: { base: 80, perKm: 0.12 },
    short: { base: 90, perKm: 0.1 },
    medium: { base: 120, perKm: 0.08 },
    long: { base: 200, perKm: 0.06 },
    ultraLong: { base: 300, perKm: 0.05 },
  };

  it("augmente avec la distance", () => {
    const proche = estimateReturnFlight(830, tiers);
    const moyen = estimateReturnFlight(4000, tiers);
    const loin = estimateReturnFlight(16_960, tiers);
    expect(proche).toBeLessThan(moyen);
    expect(moyen).toBeLessThan(loin);
  });

  it("fait baisser le coût AU KILOMÈTRE avec la distance", () => {
    // C'est le point du modèle : un vol court est cher au km à cause des
    // coûts fixes.
    const parKm = (km: number) => estimateReturnFlight(km, tiers) / km;
    expect(parKm(830)).toBeGreaterThan(parKm(5840));
    expect(parKm(5840)).toBeGreaterThan(parKm(16_960));
  });

  it("renvoie zéro pour une distance nulle ou absurde", () => {
    expect(estimateReturnFlight(0, tiers)).toBe(0);
    expect(estimateReturnFlight(-100, tiers)).toBe(0);
  });

  it("renvoie un entier (un prix affiché n'a pas de centimes ici)", () => {
    expect(Number.isInteger(estimateReturnFlight(2500, tiers))).toBe(true);
  });
});

describe("groundTravelPlausible", () => {
  it("suggère le sol sous 800 km", () => {
    expect(groundTravelPlausible(300)).toBe(true);
    expect(groundTravelPlausible(790)).toBe(true);
  });

  it("ne le suggère pas au-delà", () => {
    expect(groundTravelPlausible(1200)).toBe(false);
    expect(groundTravelPlausible(0)).toBe(false);
  });
});
