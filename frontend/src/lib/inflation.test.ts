import {
  ADVICE_CATALOG_FR,
  effectivePriority,
  inflationPenalty,
  matchAdvice,
} from "./adviceEngine";
import {
  beatsInflation,
  formatRate,
  inflationFor,
  isStale,
  monthsOld,
  periodLabel,
  realRate,
  sourceUrl,
} from "./inflation";
import { INFLATION, type InflationRow } from "./inflationData";

const monthly = (rate: number, period = "2026-08"): InflationRow => ({
  rate,
  period,
  source: "eurostat",
});

describe("inflationFor", () => {
  it("rend le chiffre du pays", () => {
    const fr = inflationFor("FR");
    expect(fr).not.toBeNull();
    expect(typeof fr!.rate).toBe("number");
  });

  // Un pays sans source officielle ne doit RIEN renvoyer : c'est ce qui
  // empêche l'app d'afficher un chiffre inventé.
  it("rend null pour un pays non couvert et pour un pays absent", () => {
    expect(inflationFor("OTHER")).toBeNull();
    expect(inflationFor(undefined)).toBeNull();
    expect(inflationFor(null)).toBeNull();
  });
});

describe("realRate", () => {
  // Fisher : (1,02 / 1,027) − 1 = −0,68 %. La soustraction naïve dirait
  // −0,70 % ; on vérifie qu'on applique bien la formule exacte.
  it("applique Fisher et non la soustraction", () => {
    expect(realRate(2, monthly(2.7))).toBeCloseTo(-0.6816, 3);
    expect(realRate(2, monthly(2.7))).not.toBeCloseTo(-0.7, 4);
  });

  it("rend un réel positif quand le placement dépasse les prix", () => {
    expect(realRate(4, monthly(2.7))).toBeGreaterThan(0);
    expect(beatsInflation(4, monthly(2.7))).toBe(true);
    expect(beatsInflation(1.5, monthly(2.7))).toBe(false);
  });

  // Cas limite : à taux égal le pouvoir d'achat est exactement conservé, et
  // `beatsInflation` doit dire non — « faire jeu égal » n'est pas « battre ».
  it("rend zéro à taux égal", () => {
    expect(realRate(2.7, monthly(2.7))).toBeCloseTo(0, 10);
    expect(beatsInflation(2.7, monthly(2.7))).toBe(false);
  });
});

describe("monthsOld / isStale", () => {
  const now = new Date(2026, 8, 9); // septembre 2026

  it("compte les mois pour une publication mensuelle", () => {
    expect(monthsOld(monthly(2.7, "2026-08"), now)).toBe(1);
    expect(monthsOld(monthly(2.7, "2025-09"), now)).toBe(12);
  });

  // Une période annuelle décrit l'année ENTIÈRE : elle se date de décembre.
  // La dater de janvier la vieillirait de onze mois pour rien, et ferait
  // passer pour périmés des chiffres parfaitement à jour pour leur source.
  it("date une période annuelle de sa fin", () => {
    expect(monthsOld({ rate: 1, period: "2025", source: "worldbank" }, now)).toBe(9);
  });

  it("ne signale comme daté qu'au-delà de 18 mois", () => {
    expect(isStale(monthly(1, "2025-09"), now)).toBe(false);
    // 18 mois pile : encore accepté. 19 : signalé.
    expect(isStale(monthly(1, "2025-03"), now)).toBe(false);
    expect(isStale(monthly(1, "2025-02"), now)).toBe(true);
  });
});

describe("affichage", () => {
  it("nomme le mois dans la langue demandée", () => {
    expect(periodLabel(monthly(2.7, "2026-08"), "fr")).toMatch(/2026/);
    expect(periodLabel({ rate: 1, period: "2025", source: "worldbank" }, "fr")).toBe("2025");
  });

  it("montre le signe d'un rendement réel", () => {
    expect(formatRate(-0.68, "en", true)).toBe("-0.7");
    expect(formatRate(1.2, "en", true)).toBe("+1.2");
    expect(formatRate(1.2, "en")).toBe("1.2");
  });

  it("donne une source consultable pour chaque ligne", () => {
    for (const row of Object.values(INFLATION)) {
      expect(sourceUrl(row)).toMatch(/^https:\/\//);
    }
  });
});

// ---------------------------------------------------------------------------

describe("cohérence du catalogue", () => {
  // `nominalRatePct` duplique un chiffre déjà affiché dans `figures`. Si l'un
  // est mis à jour et pas l'autre, la carte affiche un taux et en compare un
  // autre — un mensonge silencieux sur une décision d'épargne. Ce test est le
  // seul garde-fou contre ça.
  it("aligne nominalRatePct sur le pourcentage affiché", () => {
    const tagged = ADVICE_CATALOG_FR.filter((c) => c.nominalRatePct !== undefined);
    expect(tagged.length).toBeGreaterThan(0);

    for (const card of tagged) {
      const figures = Array.isArray(card.figures) ? card.figures : [];
      const shown = figures
        .map((f) => /^(\d+),(\d+)\s*%$/.exec(f.value.trim()))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => Number(`${m[1]}.${m[2]}`));

      expect(shown).toContain(card.nominalRatePct);
    }
  });

  // Le champ décrit une rémunération d'épargne. Une valeur absurde signale
  // qu'on y a rangé autre chose — le taux d'un prêt, un plafond, un montant.
  it("garde des taux plausibles", () => {
    for (const card of ADVICE_CATALOG_FR) {
      if (card.nominalRatePct === undefined) continue;
      expect(card.nominalRatePct).toBeGreaterThan(0);
      expect(card.nominalRatePct).toBeLessThan(15);
    }
  });
});

// ---------------------------------------------------------------------------

describe("classement des conseils selon l'inflation", () => {
  const loser = ADVICE_CATALOG_FR.find((c) => c.nominalRatePct === 1.5)!;
  const neutral = ADVICE_CATALOG_FR.find((c) => c.nominalRatePct === undefined)!;

  it("ne change rien quand l'inflation est inconnue", () => {
    expect(inflationPenalty(loser, undefined)).toBe(0);
    expect(effectivePriority(loser, undefined)).toBe(loser.priority);
  });

  it("ne touche pas aux conseils sans taux", () => {
    expect(inflationPenalty(neutral, 2.7)).toBe(0);
  });

  it("ne pénalise pas un placement qui bat les prix", () => {
    expect(inflationPenalty(loser, 1.0)).toBe(0);
    expect(inflationPenalty(loser, 1.5)).toBe(0);
  });

  it("pénalise proportionnellement à l'écart", () => {
    expect(inflationPenalty(loser, 2.5)).toBe(8);
    expect(inflationPenalty(loser, 3.5)).toBe(16);
  });

  // Plafonné : au-delà, on classerait un conseil correct derrière des
  // banalités, alors qu'un livret reste le bon endroit pour un fonds d'urgence.
  it("plafonne le recul", () => {
    expect(inflationPenalty(loser, 50)).toBe(25);
  });

  // Jamais de bonus : l'urgence d'un conseil ne se mesure pas à son rendement.
  it("ne remonte jamais un conseil", () => {
    for (const card of ADVICE_CATALOG_FR) {
      expect(effectivePriority(card, 2.7)).toBeLessThanOrEqual(card.priority);
    }
  });

  it("fait bien descendre le conseil dans le classement rendu", () => {
    const profile = { country: "FR", age: "26-35" } as const;
    const before = matchAdvice(profile).findIndex((c) => c.id === loser.id);
    const after = matchAdvice(profile, undefined, 6).findIndex((c) => c.id === loser.id);
    if (before >= 0) expect(after).toBeGreaterThan(before);
  });
});
