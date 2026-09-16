import { buildBirthdayCards, buildChildBirthdayCards, buildPetBirthdayCards } from "../src/constants/ageFacts";
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

// Les anniversaires d'enfant et d'animal : les testeurs les trouvaient
// « pauvres » — trois cartes, dont l'ouverture et la clôture. Chaque âge a
// maintenant ses repères, plus le catalogue sourcé.
describe("cartes d'anniversaire d'un enfant", () => {
  const i18n: AdviceI18n = { t: (k) => k, tp: (k) => k };

  it("donne au moins six cartes à tout âge, ouverture en tête, clôture en queue", () => {
    for (const age of [1, 3, 8, 13, 17, 22]) {
      const cards = buildChildBirthdayCards(age, "Natan", { country: "FR", family: "couple_with_kids" }, i18n);
      expect(cards.length).toBeGreaterThanOrEqual(6);
      expect(cards.length).toBeLessThanOrEqual(10);
      expect(cards[0].title).toBe("bdayCard.child.open.title");
      expect(cards[cards.length - 1].title).toBe("bdayCard.child.close.title");
    }
  });

  it("apporte des conseils sourcés du catalogue « enfants »", () => {
    const cards = buildChildBirthdayCards(3, "Natan", { country: "FR", family: "couple_with_kids" }, i18n);
    expect(cards.some((c: { sources?: string[] }) => (c.sources?.length ?? 0) > 0)).toBe(true);
  });

  it("étoffe aussi l'anniversaire d'un animal", () => {
    const young = buildPetBirthdayCards("Lio", "dog", i18n, { country: "FR" }, 1);
    expect(young.length).toBeGreaterThanOrEqual(6);
    expect(young.some((c: { title: string }) => c.title === "bdayCard.pet.senior.title")).toBe(false);
    const old = buildPetBirthdayCards("Lio", "cat", i18n, { country: "FR" }, 9);
    expect(old.some((c: { title: string }) => c.title === "bdayCard.pet.senior.title")).toBe(true);
    // Sans profil ni âge : l'ancien appel marche encore.
    expect(buildPetBirthdayCards("Lio", "other", i18n).length).toBeGreaterThanOrEqual(5);
  });
});
