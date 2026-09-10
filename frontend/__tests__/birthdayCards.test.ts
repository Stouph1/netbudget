import { buildBirthdayCards } from "../src/constants/ageFacts";
import type { AdviceI18n } from "../src/types/advice";

// Traducteur minimal : la clé sert de texte. Suffit pour compter et comparer.
const i18n: AdviceI18n = {
  t: (k) => k,
  tp: (k, p) => `${k}:${JSON.stringify(p)}`,
};

describe("cartes d'anniversaire — les âges creux", () => {
  // CE QUE CE BLOC PROTÈGE. Les faits par âge n'existent que pour une quinzaine
  // d'anniversaires précis. Aux autres, la fête n'avait que l'ouverture et la
  // clôture — et les testeurs demandaient si c'était vraiment personnalisé.
  it("complète un âge sans fait avec des conseils du catalogue", () => {
    const cards = buildBirthdayCards(23, "Lina", { country: "FR", age: "18-25" }, i18n);
    expect(cards.length).toBeGreaterThanOrEqual(5);
    // Les conseils du catalogue portent leurs sources officielles.
    const sourced = cards.filter((c) => (c.sources?.length ?? 0) > 0);
    expect(sourced.length).toBeGreaterThan(0);
  });

  it("garde l'ouverture en premier et la clôture en dernier", () => {
    const cards = buildBirthdayCards(41, "Sam", { country: "FR" }, i18n);
    expect(cards[0].title).toContain("bdayCard.open.title");
    expect(cards[cards.length - 1].title).toBe("bdayCard.close.title");
  });

  it("ne dépasse jamais huit cartes, même à un âge riche", () => {
    expect(buildBirthdayCards(18, "Noé", { country: "FR", region: "Bretagne" }, i18n).length)
      .toBeLessThanOrEqual(8);
  });

  // Un fait par âge existe : on n'empile pas des conseils par-dessus au point
  // de noyer ce qui est propre à cet anniversaire-là.
  it("complète seulement jusqu'à trois faits", () => {
    const cards = buildBirthdayCards(30, "Ava", { country: "FR" }, i18n);
    const catalog = cards.filter((c) => c.emoji === "💡");
    expect(catalog.length).toBeLessThanOrEqual(2);
  });
});
