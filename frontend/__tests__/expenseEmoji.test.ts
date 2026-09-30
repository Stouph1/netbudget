// L'emoji se devine depuis le nom, dans les huit langues, et rattache le poste
// à une famille de comparaison.
import { bucketOfEmoji, normalizeLabel, suggestEmoji } from "../src/lib/expenseEmoji";

describe("suggestEmoji", () => {
  it("reconnaît le même poste dans plusieurs langues", () => {
    for (const w of ["Essence", "petrol", "Gasolina", "Benzin", "carburante", "بنزين", "ガソリン"]) {
      expect(suggestEmoji(w)).toBe("⛽");
    }
    for (const w of ["Loyer", "Rent", "Miete", "Affitto", "家賃", "إيجار"]) expect(suggestEmoji(w)).toBe("🏠");
  });
  it("ignore accents, majuscules et mots autour", () => {
    expect(suggestEmoji("ÉLECTRICITÉ EDF")).toBe("⚡");
    expect(suggestEmoji("abonnement Netflix")).toBe("🎬");
    expect(suggestEmoji("Courses du samedi")).toBe("🛒");
  });
  it("ne devine rien sur un mot inconnu", () => {
    expect(suggestEmoji("Zorglub")).toBeNull();
    expect(suggestEmoji("")).toBeNull();
  });
  it("« bar » ne matche pas « barbecue »", () => {
    expect(suggestEmoji("barbecue")).not.toBe("🍺");
  });
  it("rattache l'emoji à une famille de comparaison", () => {
    expect(bucketOfEmoji("🏠")).toBe("housing");
    expect(bucketOfEmoji("⛽")).toBe("transport");
    expect(bucketOfEmoji("👕")).toBeNull();
    expect(normalizeLabel("Été")).toBe("ete");
  });
});
