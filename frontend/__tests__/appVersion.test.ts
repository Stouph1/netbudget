import { shortId, versionClipboard, versionLabel, versionMeta, type VersionInfo } from "../src/lib/appVersion";

const words = { dev: "développement", embedded: "d'origine", update: "mise à jour {id}" };
const base: VersionInfo = { version: "2.0.0", build: "19", platform: "android", channel: "production", updateId: null, embedded: true };

describe("ligne de version", () => {
  it("affiche version et build entre parenthèses", () => {
    expect(versionLabel(base)).toBe("2.0.0 (19)");
    expect(versionLabel({ ...base, build: null })).toBe("2.0.0");
  });

  it("build EAS d'origine : plateforme, canal, origine", () => {
    expect(versionMeta(base, words)).toBe("android · production · d'origine");
  });

  it("mise à jour EAS : l'identifiant court remplace « d'origine »", () => {
    const v = { ...base, embedded: false, updateId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" };
    expect(versionMeta(v, words)).toBe("android · production · mise à jour a1b2c3d4");
  });

  it("hors build EAS : développement, sans canal", () => {
    expect(versionMeta({ ...base, channel: null }, words)).toBe("android · développement");
  });

  it("identifiant court : 8 caractères sans tirets, null si vide", () => {
    expect(shortId("a1b2c3d4-e5f6")).toBe("a1b2c3d4");
    expect(shortId("")).toBeNull();
    expect(shortId(null)).toBeNull();
  });

  it("presse-papier : tout sur une ligne, préfixé du nom", () => {
    expect(versionClipboard(base, words)).toBe("NETbudget 2.0.0 (19) · android · production · d'origine");
  });
});
