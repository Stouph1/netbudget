// Coût d'un voyage selon la destination, la distance et les animaux.
//
// Les valeurs de référence viennent de la recherche sourcée (Eurostat, Numbeo,
// GeoNames, relevés de prix Algofly). Ces tests vérifient qu'on les applique
// correctement — pas qu'elles sont justes, ce qui relève des sources.

import {
  adjustTravelItems,
  COUNTRY_GATEWAY,
  DESTINATION_COST,
  destinationCostIndex,
  estimateFlightPrice,
  gatewayFor,
  petCareCost,
  petFlightCost,
  resolveDestination,
} from "../src/constants/travelCost";
import { haversineKm } from "../src/utils/geoDistance";

describe("cohérence des données", () => {
  it("couvre les mêmes pays en coût et en coordonnées", () => {
    const cost = Object.keys(DESTINATION_COST).sort();
    const geo = Object.keys(COUNTRY_GATEWAY).sort();
    expect(cost).toEqual(geo);
  });

  it("garde tous les indices dans une plage plausible", () => {
    for (const [code, { index }] of Object.entries(DESTINATION_COST)) {
      expect(index).toBeGreaterThan(0.1);
      expect(index).toBeLessThan(3);
      expect(Number.isFinite(index)).toBe(true);
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("place la France à 1,00 — c'est la base de l'échelle", () => {
    expect(destinationCostIndex("FR")).toBe(1);
  });

  it("a des coordonnées valides partout", () => {
    for (const gw of Object.values(COUNTRY_GATEWAY)) {
      expect(gw.lat).toBeGreaterThanOrEqual(-90);
      expect(gw.lat).toBeLessThanOrEqual(90);
      expect(gw.lon).toBeGreaterThanOrEqual(-180);
      expect(gw.lon).toBeLessThanOrEqual(180);
    }
  });
});

describe("destinationCostIndex", () => {
  it("classe correctement le cher et le bon marché", () => {
    // La Suisse coûte plus cher que la France, la Thaïlande beaucoup moins.
    expect(destinationCostIndex("CH")).toBeGreaterThan(1);
    expect(destinationCostIndex("NO")).toBeGreaterThan(1);
    expect(destinationCostIndex("TH")).toBeLessThan(0.6);
    expect(destinationCostIndex("IN")).toBeLessThan(0.4);
  });

  it("retombe sur 1,00 pour un pays inconnu", () => {
    expect(destinationCostIndex("XX")).toBe(1);
    expect(destinationCostIndex(undefined)).toBe(1);
  });
});

describe("estimateFlightPrice", () => {
  // Prix de référence relevés (Algofly, 2026-08) — tolérance large : le modèle
  // vise l'ordre de grandeur, pas le tarif du jour.
  it("approche les prix observés au départ de Paris", () => {
    expect(estimateFlightPrice(830)).toBeGreaterThan(60); // Barcelone ~88 €
    expect(estimateFlightPrice(830)).toBeLessThan(130);
    expect(estimateFlightPrice(5837)).toBeGreaterThan(280); // New York ~380 €
    expect(estimateFlightPrice(5837)).toBeLessThan(520);
    expect(estimateFlightPrice(9444)).toBeGreaterThan(450); // Bangkok ~588 €
    expect(estimateFlightPrice(9444)).toBeLessThan(800);
    expect(estimateFlightPrice(16961)).toBeGreaterThan(750); // Sydney ~970 €
    expect(estimateFlightPrice(16961)).toBeLessThan(1300);
  });

  it("croît avec la distance", () => {
    expect(estimateFlightPrice(5000)).toBeGreaterThan(estimateFlightPrice(1000));
    expect(estimateFlightPrice(15000)).toBeGreaterThan(estimateFlightPrice(5000));
  });

  it("fait décroître le prix AU KILOMÈTRE — c'est le cœur du modèle", () => {
    const parKm = (km: number) => estimateFlightPrice(km) / km;
    expect(parKm(830)).toBeGreaterThan(parKm(5837));
    expect(parKm(5837)).toBeGreaterThan(parKm(16961));
  });

  it("renvoie zéro sur une distance nulle", () => {
    expect(estimateFlightPrice(0)).toBe(0);
    expect(estimateFlightPrice(-5)).toBe(0);
  });
});

describe("distance réelle entre passerelles", () => {
  it("calcule Paris-Bangkok (~9 450 km)", () => {
    const d = haversineKm(gatewayFor("FR")!, gatewayFor("TH")!);
    expect(d).toBeCloseTo(9450, -2);
  });

  it("calcule Paris-Dakar (~4 200 km)", () => {
    const d = haversineKm(gatewayFor("FR")!, gatewayFor("SN")!);
    expect(d).toBeCloseTo(4200, -2);
  });

  it("renvoie null pour un pays sans passerelle", () => {
    expect(gatewayFor("XX")).toBeNull();
    expect(gatewayFor(undefined)).toBeNull();
  });
});

describe("resolveDestination", () => {
  const cities = [
    { name: "Barcelone", countryCode: "ES" },
    { name: "Marrakech", countryCode: "MA" },
    { name: "Saint-Étienne", countryCode: "FR" },
  ];

  it("reconnaît une porte d'entrée connue", () => {
    expect(resolveDestination("Bangkok", cities)?.country).toBe("TH");
    expect(resolveDestination("Tokyo", cities)?.country).toBe("JP");
  });

  it("reconnaît une ville du référentiel", () => {
    expect(resolveDestination("Barcelone", cities)?.country).toBe("ES");
    expect(resolveDestination("Marrakech", cities)?.country).toBe("MA");
  });

  it("ignore la casse et les accents", () => {
    expect(resolveDestination("BANGKOK", cities)?.country).toBe("TH");
    expect(resolveDestination("  bangkok  ", cities)?.country).toBe("TH");
    expect(resolveDestination("saint etienne", cities)?.country).toBe("FR");
  });

  it("accepte un code pays", () => {
    expect(resolveDestination("TH", cities)?.country).toBe("TH");
  });

  it("renvoie null sur une destination inconnue", () => {
    expect(resolveDestination("Zzzville", cities)).toBeNull();
    expect(resolveDestination("", cities)).toBeNull();
  });
});

describe("petCareCost", () => {
  it("chiffre la garde d'un chien pendant 8 jours", () => {
    // Référence Animaute : ~116 € entre particuliers, ~168 € en pension.
    const sitter = petCareCost([{ species: "dog", count: 1 }], 8, "sitter");
    const pension = petCareCost([{ species: "dog", count: 1 }], 8, "pension");
    expect(sitter).toBeGreaterThan(90);
    expect(sitter).toBeLessThan(150);
    expect(pension).toBeGreaterThan(sitter);
  });

  it("multiplie par le nombre d'animaux", () => {
    const un = petCareCost([{ species: "cat", count: 1 }], 14);
    const deux = petCareCost([{ species: "cat", count: 2 }], 14);
    expect(deux).toBe(un * 2);
  });

  it("additionne des espèces différentes", () => {
    const mixte = petCareCost(
      [
        { species: "dog", count: 1 },
        { species: "cat", count: 2 },
      ],
      7,
    );
    expect(mixte).toBe(
      petCareCost([{ species: "dog", count: 1 }], 7) +
        petCareCost([{ species: "cat", count: 2 }], 7),
    );
  });

  it("coûte plus cher pour un chien que pour un chat", () => {
    expect(petCareCost([{ species: "dog", count: 1 }], 10)).toBeGreaterThan(
      petCareCost([{ species: "cat", count: 1 }], 10),
    );
  });

  it("renvoie zéro sans animal ou sans durée", () => {
    expect(petCareCost([], 10)).toBe(0);
    expect(petCareCost([{ species: "dog", count: 1 }], 0)).toBe(0);
    expect(petCareCost([{ species: "dog", count: 0 }], 10)).toBe(0);
  });
});

describe("petFlightCost", () => {
  it("facture l'aller ET le retour", () => {
    // Barème Air France : 200 € par trajet en cabine à l'international.
    expect(petFlightCost(9000, 1, true)).toBe(400);
  });

  it("coûte plus cher en soute qu'en cabine", () => {
    expect(petFlightCost(9000, 1, false)).toBeGreaterThan(
      petFlightCost(9000, 1, true),
    );
  });

  it("augmente avec la zone géographique", () => {
    const local = petFlightCost(500, 1, true);
    const europe = petFlightCost(2000, 1, true);
    const intl = petFlightCost(9000, 1, true);
    expect(local).toBeLessThan(europe);
    expect(europe).toBeLessThan(intl);
  });

  it("renvoie zéro sans animal", () => {
    expect(petFlightCost(9000, 0, true)).toBe(0);
  });
});

describe("adjustTravelItems", () => {
  const items = [
    { label: "evt.travel.item.transport", estimated: 800 },
    { label: "evt.travel.item.lodging", estimated: 1000 },
    { label: "evt.travel.item.food", estimated: 700 },
    { label: "evt.travel.item.activities", estimated: 300 },
    { label: "evt.travel.item.insurance", estimated: 80 },
    { label: "evt.travel.item.buffer", estimated: 0 },
  ];
  const get = (list: typeof items, suffix: string) =>
    list.find((i) => i.label.endsWith(suffix))!.estimated;

  it("remplace le transport par le prix lié à la DISTANCE", () => {
    const paris_bangkok = adjustTravelItems(items, {
      destination: "TH", km: 9450, travelers: 2,
    });
    const paris_barcelone = adjustTravelItems(items, {
      destination: "ES", km: 830, travelers: 2,
    });
    // Bangkok coûte bien plus cher à atteindre que Barcelone.
    expect(get(paris_bangkok, ".transport")).toBeGreaterThan(
      get(paris_barcelone, ".transport") * 3,
    );
  });

  it("multiplie le transport par le nombre de voyageurs", () => {
    const solo = adjustTravelItems(items, { destination: "TH", km: 9450, travelers: 1 });
    const duo = adjustTravelItems(items, { destination: "TH", km: 9450, travelers: 2 });
    expect(get(duo, ".transport")).toBe(get(solo, ".transport") * 2);
  });

  it("ajuste les dépenses SUR PLACE au coût de la vie local", () => {
    const thailande = adjustTravelItems(items, { destination: "TH", km: 9450, travelers: 2 });
    const norvege = adjustTravelItems(items, { destination: "NO", km: 1350, travelers: 2 });
    // 2 semaines en Norvège coûtent bien plus sur place qu'en Thaïlande.
    expect(get(norvege, ".lodging")).toBeGreaterThan(get(thailande, ".lodging") * 2);
    expect(get(norvege, ".food")).toBeGreaterThan(get(thailande, ".food") * 2);
  });

  it("NE mélange PAS coût de la vie et prix du billet", () => {
    // Piège : un vol vers la Norvège ne doit pas être majoré du coût de la vie
    // norvégien — le billet dépend de la distance, pas du prix des hôtels.
    const norvege = adjustTravelItems(items, { destination: "NO", km: 1350, travelers: 1 });
    expect(get(norvege, ".transport")).toBe(estimateFlightPrice(1350));
  });

  it("laisse l'assurance et les imprévus intacts", () => {
    const out = adjustTravelItems(items, { destination: "TH", km: 9450, travelers: 2 });
    expect(get(out, ".insurance")).toBe(80);
    expect(get(out, ".buffer")).toBe(0);
  });

  it("ajoute la garde des animaux quand le foyer en a", () => {
    const out = adjustTravelItems(items, {
      destination: "TH", km: 9450, travelers: 2, days: 14,
      pets: [{ species: "cat", count: 2 }],
    });
    const petCare = out.find((i) => i.label.endsWith(".petCare"));
    expect(petCare).toBeDefined();
    expect(petCare!.estimated).toBeGreaterThan(200); // 2 chats × 14 j
  });

  it("n'ajoute AUCUNE ligne animaux sans animal", () => {
    const out = adjustTravelItems(items, {
      destination: "TH", km: 9450, travelers: 2, days: 14, pets: [],
    });
    expect(out.some((i) => i.label.endsWith(".petCare"))).toBe(false);
  });

  it("ne casse pas quand la destination est inconnue", () => {
    const out = adjustTravelItems(items, { travelers: 2 });
    expect(get(out, ".lodging")).toBe(1000); // inchangé
    expect(get(out, ".transport")).toBe(800);
  });
});
