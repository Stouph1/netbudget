// Les accents : lisibles partout, et fidèles à ce qu'on a enregistré.
import {
  ACCENTS,
  DEFAULT_ACCENT_ID,
  accentById,
  alpha,
  rgbTriplet,
  contrastRatio,
  parseAccentMap,
  resolveAccent,
} from "./accents";

const BG = "#0A0F1A"; // fond de l'écran Budget
const MIDNIGHT = "#0F172A"; // fond des écrans premium

describe("accents", () => {
  it("garde la menthe historique par défaut", () => {
    expect(accentById(undefined).main).toBe("#4ADE80");
    expect(accentById("zzz").id).toBe(DEFAULT_ACCENT_ID);
  });

  it("a des identifiants uniques", () => {
    expect(new Set(ACCENTS.map((a) => a.id)).size).toBe(ACCENTS.length);
  });

  // Texte noir sur bouton d'accent : 4,5:1 ; accent sur fond sombre : 3:1
  // (icônes, textes gras). C'est ce qui rend toute couleur proposable.
  it("reste lisible sur les deux fonds et sous du texte noir", () => {
    for (const a of ACCENTS) {
      expect(contrastRatio(a.main, "#000000")).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(a.main, BG)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(a.main, MIDNIGHT)).toBeGreaterThanOrEqual(3);
    }
  });

  it("résout l'accent par espace, perso compris", () => {
    const map = { perso: "yellow", "ws-1": "blue" } as const;
    expect(resolveAccent(map, null).id).toBe("yellow");
    expect(resolveAccent(map, "ws-1").id).toBe("blue");
    expect(resolveAccent(map, "ws-inconnu").id).toBe("mint");
  });

  it("ignore un stockage abîmé ou une couleur qui n'existe plus", () => {
    expect(parseAccentMap(null)).toEqual({});
    expect(parseAccentMap("{pas du json")).toEqual({});
    expect(parseAccentMap(JSON.stringify({ perso: "yellow", x: "fuchsia", y: 3 }))).toEqual({ perso: "yellow" });
  });

  it("convertit un hex en rgba", () => {
    expect(alpha("#4ADE80", 0.12)).toBe("rgba(74,222,128,0.12)");
    expect(alpha("#fff", 1)).toBe("rgba(255,255,255,1)");
    expect(rgbTriplet("#FACC15")).toBe("250,204,21");
  });
});
