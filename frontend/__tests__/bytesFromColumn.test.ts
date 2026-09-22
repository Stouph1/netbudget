import { base64ToBytes, bytesFromColumn, bytesToBase64 } from "../src/lib/crypto/payload";

const hexOfAscii = (s: string) =>
  "\\x" + Array.from(s).map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");

describe("bytesFromColumn : octets d'une colonne bytea", () => {
  it("relit le base64 rangé en bytea (ce que PostgREST renvoie en hexadécimal)", () => {
    // Échantillon réel : le nonce d'un budget partagé tel que renvoyé par le serveur.
    const raw = "\\x734a444f58684458786e2b6b2f6f2b6333317674" + "6b433079" + "6e614966" + "3931" + "3d3d";
    // = hex de la chaîne base64 "sJDOXhDXxn+k/o+c31vtkC0ynaIf91==" (32 caractères -> 22 octets)
    const out = bytesFromColumn(raw);
    expect(out).toEqual(base64ToBytes("sJDOXhDXxn+k/o+c31vtkC0ynaIf91=="));
  });

  it("aller-retour complet : octets -> base64 envoyé -> bytea -> hex -> octets", () => {
    const bytes = new Uint8Array(24).map((_, i) => (i * 37 + 11) & 255);
    const stored = hexOfAscii(bytesToBase64(bytes));
    expect(bytesFromColumn(stored)).toEqual(bytes);
  });

  it("accepte du base64 brut", () => {
    const bytes = new Uint8Array([1, 2, 3, 250, 251, 252]);
    expect(bytesFromColumn(bytesToBase64(bytes))).toEqual(bytes);
  });

  it("laisse intact un binaire réellement hexadécimal", () => {
    // 0xff n'est pas un caractère base64 : pas de seconde couche à ôter.
    expect(bytesFromColumn("\\xff00ab12")).toEqual(new Uint8Array([0xff, 0x00, 0xab, 0x12]));
  });

  it("rend vide sur une valeur absente", () => {
    expect(bytesFromColumn(null)).toEqual(new Uint8Array(0));
  });
});
