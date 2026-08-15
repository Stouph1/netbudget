// Jonction profil ↔ destination ↔ budget.
//
// Ce qui est verrouillé ici : on n'invente jamais un prix de billet quand le
// point de départ est inconnu, on ne bricole pas le budget quand la
// destination n'est pas reconnue, et sur un itinéraire à plusieurs étapes
// c'est bien la plus lointaine qui dimensionne le vol.

import type { Pet } from "../src/types/advice";
import {
  applyTripToItems,
  dominantDestination,
  estimateTrip,
  stayDays,
  toDisplayCurrency,
  toPetKind,
} from "../src/utils/travelEstimate";

const ITEMS = [
  { label: "evt.travel.item.transport", emoji: "✈️", estimated: 400 },
  { label: "evt.travel.item.lodging", emoji: "🏨", estimated: 500 },
  { label: "evt.travel.item.food", emoji: "🍜", estimated: 350 },
  { label: "evt.travel.item.insurance", emoji: "🛡️", estimated: 80 },
];

describe("estimateTrip", () => {
  it("reconnaît une porte d'entrée et chiffre le vol", () => {
    const e = estimateTrip("Bangkok", "FR")!;
    expect(e.country).toBe("TH");
    expect(e.km).toBeGreaterThan(8000);
    expect(e.flightPerPerson).toBeGreaterThan(0);
    expect(e.costIndex).toBeLessThan(1); // la Thaïlande coûte moins cher que la France
  });

  it("reconnaît un nom de pays écrit en toutes lettres", () => {
    expect(estimateTrip("JP", "FR")?.country).toBe("JP");
  });

  it("ne chiffre AUCUN vol sans pays de départ", () => {
    const e = estimateTrip("Bangkok", undefined)!;
    expect(e.km).toBe(0);
    expect(e.flightPerPerson).toBe(0);
    // Le coût de la vie reste connu : c'est une information de destination,
    // pas de trajet.
    expect(e.costIndex).toBeLessThan(1);
  });

  it("renvoie null sur une destination inconnue", () => {
    expect(estimateTrip("Zzzzz", "FR")).toBeNull();
  });

  it("signale l'alternative terrestre sur courte distance", () => {
    expect(estimateTrip("Bruxelles", "FR")?.groundAlternative).toBe(true);
    expect(estimateTrip("Bangkok", "FR")?.groundAlternative).toBe(false);
  });
});

describe("dominantDestination", () => {
  it("retient l'étape la plus lointaine", () => {
    const e = dominantDestination(["Barcelone", "Bangkok", "Rome"], "FR")!;
    expect(e.country).toBe("TH");
  });

  it("ignore les étapes non reconnues", () => {
    expect(dominantDestination(["Zzzzz", "Lisbonne"], "FR")?.country).toBe("PT");
  });

  it("renvoie null quand rien n'est reconnu", () => {
    expect(dominantDestination(["Zzzzz", "Yyyyy"], "FR")).toBeNull();
  });

  it("renvoie null sur un itinéraire vide", () => {
    expect(dominantDestination([], "FR")).toBeNull();
  });
});

describe("applyTripToItems", () => {
  it("laisse le budget intact sans destination reconnue", () => {
    const out = applyTripToItems({ items: ITEMS, estimate: null, travelers: 2 });
    expect(out).toEqual(ITEMS);
  });

  it("remplace le transport par le prix du vol, par voyageur", () => {
    const estimate = estimateTrip("Bangkok", "FR")!;
    const out = applyTripToItems({ items: ITEMS, estimate, origin: "FR", travelers: 2 });
    const transport = out.find((i) => i.label.endsWith(".transport"))!;
    expect(transport.estimated).toBe(estimate.flightPerPerson * 2);
  });

  it("met les dépenses sur place à l'échelle du pays, pas le vol", () => {
    const estimate = estimateTrip("Bangkok", "FR")!;
    const out = applyTripToItems({ items: ITEMS, estimate, origin: "FR", travelers: 1 });
    const lodging = out.find((i) => i.label.endsWith(".lodging"))!;
    expect(lodging.estimated).toBe(Math.round(500 * estimate.costIndex));
  });

  it("ne touche pas à l'assurance — elle ne dépend pas de la destination", () => {
    const estimate = estimateTrip("Bangkok", "FR")!;
    const out = applyTripToItems({ items: ITEMS, estimate, origin: "FR", travelers: 1 });
    expect(out.find((i) => i.label.endsWith(".insurance"))!.estimated).toBe(80);
  });

  it("ajoute la garde des animaux quand le foyer en a", () => {
    const estimate = estimateTrip("Bangkok", "FR")!;
    const pets: Pet[] = [{ species: "dog", count: 1 }, { species: "cat", count: 2 }];
    const out = applyTripToItems({
      items: ITEMS,
      estimate,
      origin: "FR",
      travelers: 2,
      days: 14,
      pets,
    });
    const care = out.find((i) => i.label === "evt.travel.item.petCare")!;
    expect(care).toBeDefined();
    expect(care.estimated).toBeGreaterThan(0);
  });

  it("n'ajoute rien sans animal", () => {
    const estimate = estimateTrip("Bangkok", "FR")!;
    const out = applyTripToItems({
      items: ITEMS,
      estimate,
      origin: "FR",
      travelers: 2,
      days: 14,
      pets: [],
    });
    expect(out.some((i) => i.label === "evt.travel.item.petCare")).toBe(false);
  });

  it("n'ajoute rien si la durée du séjour est inconnue", () => {
    const estimate = estimateTrip("Bangkok", "FR")!;
    const out = applyTripToItems({
      items: ITEMS,
      estimate,
      origin: "FR",
      travelers: 2,
      pets: [{ species: "dog", count: 1 }],
    });
    expect(out.some((i) => i.label === "evt.travel.item.petCare")).toBe(false);
  });

  it("ignore une espèce déclarée à zéro", () => {
    const estimate = estimateTrip("Bangkok", "FR")!;
    const out = applyTripToItems({
      items: ITEMS,
      estimate,
      origin: "FR",
      travelers: 1,
      days: 10,
      pets: [{ species: "fish", count: 0 }],
    });
    expect(out.some((i) => i.label === "evt.travel.item.petCare")).toBe(false);
  });
});

describe("toPetKind", () => {
  it("garde chien et chat", () => {
    expect(toPetKind("dog")).toBe("dog");
    expect(toPetKind("cat")).toBe("cat");
  });

  it("range le reste dans le barème générique", () => {
    // Aucun tarif sourcé par espèce au-delà de chien/chat : on assume le
    // regroupement plutôt que d'inventer un prix au reptile.
    for (const sp of ["small_mammal", "bird", "fish", "reptile"] as const) {
      expect(toPetKind(sp)).toBe("other");
    }
  });
});

describe("toDisplayCurrency", () => {
  // USD = 1 par construction dans exchangeRates.convert.
  const rates = {
    base: "USD",
    rates: { EUR: 0.9, JPY: 150 },
    fetchedAt: "2026-08-15T00:00:00.000Z",
  } as never;

  it("convertit les barèmes euro vers la devise affichée", () => {
    const out = toDisplayCurrency([{ estimated: 90 }], "JPY", rates);
    // 90 € → 100 USD → 15 000 ¥
    expect(out[0].estimated).toBe(15_000);
  });

  it("ne touche à rien quand l'affichage est déjà en euros", () => {
    const items = [{ estimated: 690 }];
    expect(toDisplayCurrency(items, "EUR", rates)).toBe(items);
  });

  it("garde les montants d'origine hors ligne", () => {
    // Sans taux, convertir donnerait 0 : un budget vide est pire qu'un budget
    // dans la mauvaise devise.
    expect(toDisplayCurrency([{ estimated: 690 }], "JPY", null)[0].estimated).toBe(690);
  });

  it("garde le montant quand la devise cible est inconnue du barème", () => {
    expect(toDisplayCurrency([{ estimated: 690 }], "XOF", rates)[0].estimated).toBe(690);
  });

  it("préserve les autres champs de la ligne", () => {
    const out = toDisplayCurrency(
      [{ label: "evt.travel.item.transport", emoji: "✈️", estimated: 90 }],
      "JPY",
      rates,
    );
    expect(out[0].label).toBe("evt.travel.item.transport");
    expect(out[0].emoji).toBe("✈️");
  });
});

describe("stayDays", () => {
  it("compte les jours entre deux dates", () => {
    expect(stayDays("2026-08-01", "2026-08-15")).toBe(14);
  });

  it("refuse un retour avant le départ", () => {
    expect(stayDays("2026-08-15", "2026-08-01")).toBeUndefined();
  });

  it("renvoie undefined si une date manque", () => {
    expect(stayDays("2026-08-01", undefined)).toBeUndefined();
    expect(stayDays(undefined, "2026-08-15")).toBeUndefined();
  });
});
