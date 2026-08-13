// Moteur de conseils : ciblage et intégrité du catalogue.
//
// Le risque ici n'est pas le plantage mais le conseil INADAPTÉ : montrer le RSA
// français à un Japonais, ou les droits handicap à quelqu'un qui n'est pas
// concerné. C'est ce que cette suite verrouille.

import {
  ADVICE_CATALOG_FR,
  computeBudgetSplit,
  getBudgetMixProfile,
  matchAdvice,
  topAdvice,
} from "./adviceEngine";
import type { UserProfile } from "../types/advice";

const ids = (p: UserProfile) => matchAdvice(p).map((c) => c.id);

describe("intégrité du catalogue", () => {
  it("contient les 247 cartes attendues", () => {
    expect(ADVICE_CATALOG_FR).toHaveLength(247);
  });

  it("n'a aucun identifiant en double", () => {
    const seen = ADVICE_CATALOG_FR.map((c) => c.id);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("porte un titre et un corps sur chaque carte", () => {
    const incomplete = ADVICE_CATALOG_FR.filter(
      (c) => !(c.titleKey || c.title) || !(c.bodyKey || c.body),
    ).map((c) => c.id);
    expect(incomplete).toEqual([]);
  });

  it("déclare une priorité exploitable partout", () => {
    const bad = ADVICE_CATALOG_FR.filter(
      (c) => typeof c.priority !== "number" || c.priority < 0 || c.priority > 100,
    ).map((c) => c.id);
    expect(bad).toEqual([]);
  });

  it("date la vérification de chaque carte chiffrée", () => {
    // Une carte qui cite un montant sans date de vérification est intraçable.
    const undated = ADVICE_CATALOG_FR.filter((c) => c.figures && !c.lastVerified).map(
      (c) => c.id,
    );
    expect(undated).toEqual([]);
  });

  it("n'expose que des sources en HTTPS, sauf exceptions vérifiées", () => {
    // Certains sites gouvernementaux ne proposent tout simplement pas HTTPS.
    // Vérifié le 2026-08-13 : minas.cm ne répond qu'en HTTP (https → timeout).
    // Forcer https casserait le lien ; on documente donc l'exception plutôt
    // que de désactiver le contrôle — toute NOUVELLE URL en http échouera.
    const KNOWN_HTTP_ONLY = ["http://www.minas.cm/"];
    const insecure = ADVICE_CATALOG_FR.flatMap((c) => c.sources ?? [])
      .filter((s) => s.startsWith("http://"))
      .filter((s) => !KNOWN_HTTP_ONLY.some((allowed) => s.startsWith(allowed)))
      .slice(0, 5);
    expect(insecure).toEqual([]);
  });
});

describe("cloisonnement par pays", () => {
  it("ne sert aucune carte française à un profil hors liste", () => {
    // "OTHER" = « Autre pays » dans l'app : un Japonais, un Brésilien…
    // Le type Country ne liste que les pays ayant du contenu dédié.
    const shown = matchAdvice({ country: "OTHER", age: "26-35" });
    const leaked = shown
      .filter((c) => Array.isArray(c.countries) && c.countries.includes("FR"))
      .map((c) => c.id);
    expect(leaked).toEqual([]);
  });

  it("sert les cartes universelles à tout le monde", () => {
    const shown = ids({ country: "OTHER", age: "26-35" });
    expect(shown.length).toBeGreaterThan(0);
  });

  it("sert les cartes belges à un profil belge, et pas les françaises", () => {
    const shown = matchAdvice({ country: "BE", age: "26-35" });
    expect(shown.some((c) => c.id.startsWith("be-"))).toBe(true);
    expect(shown.some((c) => c.id.startsWith("fr-"))).toBe(false);
  });
});

describe("ciblage handicap", () => {
  it("ne montre RIEN à qui n'est pas concerné", () => {
    const shown = ids({ country: "FR", age: "36-50" });
    expect(shown.filter((k) => k.startsWith("hand-"))).toEqual([]);
  });

  it("montre les droits adultes à une personne concernée", () => {
    const shown = ids({
      country: "FR",
      age: "36-50",
      disabilitySelf: true,
      housing: "renter",
      occupation: "employee",
    });
    expect(shown).toContain("hand-aah");
    expect(shown).toContain("hand-pch");
    expect(shown).toContain("hand-cmi");
  });

  it("montre les droits ENFANT au parent, pas l'allocation adulte", () => {
    const shown = ids({ country: "FR", age: "36-50", disabilityChild: true });
    expect(shown).toContain("hand-aeeh");
    expect(shown).toContain("hand-aeeh-vs-pch");
    expect(shown).not.toContain("hand-aah");
  });

  it("montre les droits d'aidant sans les droits enfant", () => {
    const shown = ids({ country: "FR", age: "51-65", caregiver: true });
    expect(shown).toContain("hand-aidant");
    expect(shown).not.toContain("hand-aeeh");
  });
});

describe("ciblage par situation", () => {
  it("propose le PTZ à un locataire, pas à un propriétaire", () => {
    expect(ids({ country: "FR", age: "26-35", housing: "renter" })).toContain(
      "immo-ptz-primo",
    );
    expect(ids({ country: "FR", age: "26-35", housing: "owner" })).not.toContain(
      "immo-ptz-primo",
    );
  });

  it("réserve le bail mobilité aux jeunes et aux étudiants", () => {
    expect(
      ids({ country: "FR", age: "18-25", housing: "renter" }),
    ).toContain("immo-bail-mobilite");
    expect(
      ids({ country: "FR", age: "36-50", housing: "renter", occupation: "employee" }),
    ).not.toContain("immo-bail-mobilite");
  });

  it("sert les conseils micro-entrepreneur aux indépendants seulement", () => {
    expect(ids({ country: "FR", occupation: "self_employed" })).toContain("ae-acre-2026");
    expect(ids({ country: "FR", occupation: "employee" })).not.toContain("ae-acre-2026");
  });
});

describe("computeBudgetSplit", () => {
  it("produit une répartition qui totalise 100 %", () => {
    for (const p of [
      { age: "18-25", housing: "renter" },
      { age: "36-50", family: "couple_with_kids", housing: "owner" },
      { age: "66+", occupation: "retired" },
      {},
    ] as UserProfile[]) {
      const s = computeBudgetSplit(p);
      expect(s.besoins + s.envies + s.epargne).toBe(100);
    }
  });

  it("garde chaque part dans des bornes plausibles", () => {
    const s = computeBudgetSplit({ age: "18-25", housing: "renter" });
    expect(s.besoins).toBeGreaterThan(30);
    expect(s.besoins).toBeLessThan(80);
    expect(s.epargne).toBeGreaterThan(0);
  });

  it("alourdit les besoins d'une famille avec enfants", () => {
    const seul = computeBudgetSplit({ age: "36-50", family: "single" });
    const famille = computeBudgetSplit({
      age: "36-50",
      family: "couple_with_kids",
      children: ["0-6", "7-11"],
    });
    expect(famille.besoins).toBeGreaterThanOrEqual(seul.besoins);
  });
});

describe("getBudgetMixProfile", () => {
  it("renvoie toujours un archétype nommé", () => {
    for (const p of [{}, { age: "18-25", housing: "renter" }] as UserProfile[]) {
      const m = getBudgetMixProfile(p);
      expect(m.name).toBeTruthy();
      expect(m.description).toBeTruthy();
    }
  });
});

describe("topAdvice", () => {
  it("trie par priorité décroissante", () => {
    const top = topAdvice({ country: "FR", age: "26-35", housing: "renter" }, 10);
    for (let i = 1; i < top.length; i++) {
      expect(top[i].priority).toBeLessThanOrEqual(top[i - 1].priority);
    }
  });

  it("respecte la limite demandée", () => {
    expect(topAdvice({ country: "FR", age: "26-35" }, 5).length).toBeLessThanOrEqual(5);
  });
});
