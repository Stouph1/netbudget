// Les anciennes lignes par défaut à 0 € disparaissent ; le reste est intouchable.
import { DEFAULT_ITEMS, LEGACY_DEFAULT_ITEMS } from "../app/_budget/constants";
import { pruneUntouchedDefaults } from "../app/_budget/helpers";

describe("pruneUntouchedDefaults", () => {
  it("ne garde d'un budget jamais rempli que la ligne par défaut de chaque famille", () => {
    const out = pruneUntouchedDefaults(LEGACY_DEFAULT_ITEMS.map((d) => ({ ...d })));
    // Le loyer n'existait pas dans l'ancienne liste : il n'est pas ajouté ici,
    // c'est la migration du champ « loyer » qui s'en charge.
    expect(out.map((i) => i.id).sort()).toEqual(["alimentation", "epargne", "sorties"]);
  });
  it("garde tout ce qui a un montant ou un libellé changé", () => {
    const items = LEGACY_DEFAULT_ITEMS.map((d) => ({ ...d }));
    items.find((i) => i.id === "transport")!.amount = "80";
    items.find((i) => i.id === "eau")!.label = "Eau + gaz";
    items.find((i) => i.id === "eau")!.labelKey = undefined;
    const out = pruneUntouchedDefaults(items);
    expect(out.map((i) => i.id)).toEqual(expect.arrayContaining(["transport", "eau", "alimentation", "sorties"]));
    expect(out.some((i) => i.id === "sante")).toBe(false);
  });
  it("une famille vidée retrouve sa ligne par défaut", () => {
    const out = pruneUntouchedDefaults([{ ...LEGACY_DEFAULT_ITEMS.find((d) => d.id === "pea")! }]);
    expect(out.map((i) => i.family).sort()).toEqual(["besoins", "epargne", "loisirs"]);
  });
  it("laisse un poste personnalisé à 0 €, il n'est pas d'origine", () => {
    const custom = { ...DEFAULT_ITEMS[0], id: "custom-1", label: "Cantine", labelKey: undefined, amount: "0" };
    expect(pruneUntouchedDefaults([custom]).some((i) => i.id === "custom-1")).toBe(true);
  });
});

describe("mergeRentIntoItems", () => {
  const { mergeRentIntoItems, backfillEmojis } = require("../app/_budget/helpers") as typeof import("../app/_budget/helpers");
  it("verse l'ancien loyer dans le poste Loyer et remet le champ à zéro", () => {
    const out = mergeRentIntoItems([{ ...DEFAULT_ITEMS[1] }], "850");
    expect(out.rent).toBe("0");
    const rent = out.items.find((i) => i.id === "loyer")!;
    expect(rent.amount).toBe("850");
    expect(rent.family).toBe("besoins");
  });
  it("ne double pas un loyer déjà saisi dans le poste", () => {
    const out = mergeRentIntoItems([{ ...DEFAULT_ITEMS[0], amount: "900" }], "850");
    expect(out.items.filter((i) => i.id === "loyer")).toHaveLength(1);
    expect(out.items[0].amount).toBe("900");
  });
  it("devine l'emoji des postes anciens depuis leur nom", () => {
    const out = backfillEmojis([{ ...DEFAULT_ITEMS[1], id: "custom-1", label: "Essence", labelKey: undefined, emoji: undefined }]);
    expect(out[0].emoji).toBe("⛽");
  });
});
