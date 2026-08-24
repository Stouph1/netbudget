// Chiffrement de bout en bout : clé, phrase de récupération, enveloppe.
//
// C'est le module où un bug ne se voit pas et ne se pardonne pas. Ce qui est
// verrouillé ici :
//   - la même phrase redonne TOUJOURS la même clé, sinon un changement de
//     téléphone perd les données ;
//   - une phrase fausse ne déchiffre RIEN, et ne renvoie surtout pas des
//     données à moitié lisibles ;
//   - un octet modifié en base fait échouer le déchiffrement au lieu de
//     produire un budget faux ;
//   - les données écrites AVANT le chiffrement restent lisibles, sinon la mise
//     à jour efface l'historique de tous les comptes existants.

import {
  base64ToBytes,
  bytesToBase64,
  decryptPayload,
  encryptPayload,
  PAYLOAD_VERSION,
  wrapPlaintext,
} from "../src/lib/crypto/payload";
import { sodium } from "../src/lib/crypto/sodium";
import {
  checkPhrase,
  generatePhrase,
  KEY_BYTES,
  keyFingerprint,
  keyFromPhrase,
  normalizePhrase,
  PHRASE_WORDS,
  phraseWords,
} from "../src/lib/crypto/vaultKey";

// Phrase valide et FIGÉE : les tests ne doivent pas dépendre du hasard.
// Générée avec notre propre encodage — attention, une phrase valide au sens de
// BIP-39 ne l'est PAS ici, la somme de contrôle utilise BLAKE2b.
const PHRASE =
  "legend window pudding dash broccoli offer plate vehicle aspect sand come rich";

describe("génération de la phrase", () => {
  it("produit douze mots valides", async () => {
    const p = await generatePhrase();
    expect(p.split(" ")).toHaveLength(PHRASE_WORDS);
    expect(checkPhrase(p).ok).toBe(true);
  });

  it("ne produit jamais deux fois la même", async () => {
    const set = new Set(await Promise.all([1, 2, 3, 4, 5].map(() => generatePhrase())));
    expect(set.size).toBe(5);
  });
});

describe("validation de la phrase", () => {
  it("accepte une phrase correcte", () => {
    expect(checkPhrase(PHRASE)).toEqual({ ok: true, phrase: PHRASE });
  });

  it("pardonne majuscules, espaces multiples et espaces insécables", () => {
    // Ce sont les trois dégâts classiques d'un copier-coller ou d'une
    // correction automatique. Refuser la phrase ici serait cruel.
    const sale = "  Legend   WINDOW pudding dash broccoli offer plate vehicle aspect sand come\u00a0rich ";
    const out = checkPhrase(sale);
    expect(out.ok).toBe(true);
    expect(out.ok && out.phrase).toBe(PHRASE);
  });

  it("distingue un mauvais nombre de mots", () => {
    const out = checkPhrase("legend window pudding");
    expect(out).toEqual({ ok: false, reason: "wordCount" });
  });

  it("nomme les mots inconnus au lieu d'un refus opaque", () => {
    const out = checkPhrase(
      "zzzz window pudding dash broccoli offer plate vehicle aspect sand come rich",
    );
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.reason).toBe("unknownWord");
    expect(out.ok === false && out.badWords).toEqual(["zzzz"]);
  });

  it("détecte un ordre faux par la somme de contrôle", () => {
    // Tous les mots existent, mais deux sont échangés : seule la somme de
    // contrôle peut le voir.
    const words = PHRASE.split(" ");
    [words[0], words[1]] = [words[1], words[0]];
    const out = checkPhrase(words.join(" "));
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.reason).toBe("checksum");
  });

  it("refuse une phrase vide", () => {
    expect(checkPhrase("   ").ok).toBe(false);
  });
});

describe("dérivation de la clé", () => {
  it("donne une clé de 256 bits", async () => {
    const key = await keyFromPhrase(PHRASE);
    expect(key).toHaveLength(KEY_BYTES);
  });

  it("est déterministe — c'est ce qui permet de changer de téléphone", async () => {
    const a = await keyFromPhrase(PHRASE);
    const b = await keyFromPhrase(normalizePhrase(`  ${PHRASE.toUpperCase()}  `));
    expect([...a]).toEqual([...b]);
  });

  it("donne des clés différentes pour des phrases différentes", async () => {
    const a = await keyFromPhrase(PHRASE);
    const b = await keyFromPhrase(await generatePhrase());
    expect([...a]).not.toEqual([...b]);
  });

  it("refuse de dériver depuis une phrase invalide", async () => {
    await expect(keyFromPhrase("trois petits mots")).rejects.toThrow(/phrase-invalide/);
  });

  it("produit une empreinte courte et stable", async () => {
    const key = await keyFromPhrase(PHRASE);
    const f1 = await keyFingerprint(key);
    const f2 = await keyFingerprint(key);
    expect(f1).toBe(f2);
    expect(f1).toMatch(/^[0-9A-F]{6}$/);
  });

  it("donne des empreintes différentes pour des clés différentes", async () => {
    await sodium.ready();
    const a = await keyFingerprint(await keyFromPhrase(PHRASE));
    const b = await keyFingerprint(await keyFromPhrase(await generatePhrase()));
    expect(a).not.toBe(b);
  });
});

describe("base64", () => {
  it("fait l'aller-retour sur des octets quelconques", () => {
    for (const len of [0, 1, 2, 3, 16, 24, 255, 1000]) {
      const bytes = new Uint8Array(len).map((_, i) => (i * 37) % 256);
      expect([...base64ToBytes(bytesToBase64(bytes))]).toEqual([...bytes]);
    }
  });

  it("supporte les octets extrêmes", () => {
    const bytes = new Uint8Array([0, 255, 0, 255, 128, 127]);
    expect([...base64ToBytes(bytesToBase64(bytes))]).toEqual([...bytes]);
  });
});

describe("chiffrement d'un payload", () => {
  const DATA = {
    version: 1,
    goals: [{ id: "g1", label: "Japon", targetAmount: 4200.5, currentAmount: 1337 }],
  };

  it("chiffre puis déchiffre à l'identique", async () => {
    const key = await keyFromPhrase(PHRASE);
    const rec = await encryptPayload(DATA, key);
    const out = await decryptPayload<typeof DATA>(rec, key);
    expect(out.ok).toBe(true);
    expect(out.ok && out.data).toEqual(DATA);
    expect(out.ok && out.wasPlaintext).toBe(false);
  });

  it("ne laisse pas fuiter le contenu en clair", async () => {
    const key = await keyFromPhrase(PHRASE);
    const rec = await encryptPayload(DATA, key);
    // Le libellé « Japon » ne doit apparaître nulle part dans ce qui est stocké.
    expect(JSON.stringify(rec)).not.toContain("Japon");
    expect(JSON.stringify(rec)).not.toContain("4200");
  });

  it("utilise un nonce différent à chaque chiffrement", async () => {
    const key = await keyFromPhrase(PHRASE);
    const a = await encryptPayload(DATA, key);
    const b = await encryptPayload(DATA, key);
    // Réutiliser un nonce avec la même clé casse la confidentialité, et
    // l'erreur est silencieuse : ce test est le seul garde-fou.
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("porte le numéro de version du format", async () => {
    const key = await keyFromPhrase(PHRASE);
    expect((await encryptPayload(DATA, key)).v).toBe(PAYLOAD_VERSION);
  });
});

describe("refus de déchiffrer", () => {
  it("refuse avec une autre clé, sans rien révéler", async () => {
    const rec = await encryptPayload({ secret: 42 }, await keyFromPhrase(PHRASE));
    const autre = await keyFromPhrase(await generatePhrase());
    const out = await decryptPayload(rec, autre);
    expect(out).toEqual({ ok: false, reason: "wrongKey" });
  });

  it("refuse sans clé du tout", async () => {
    const rec = await encryptPayload({ secret: 42 }, await keyFromPhrase(PHRASE));
    expect(await decryptPayload(rec, null)).toEqual({ ok: false, reason: "wrongKey" });
  });

  it("détecte un octet modifié en base", async () => {
    const key = await keyFromPhrase(PHRASE);
    const rec = await encryptPayload({ montant: 1000 }, key);
    // On altère un caractère du chiffré : sans authentification, on
    // obtiendrait des données silencieusement fausses.
    const abime = {
      ...rec,
      ciphertext: rec.ciphertext.slice(0, 8) + (rec.ciphertext[8] === "A" ? "B" : "A") + rec.ciphertext.slice(9),
    };
    const out = await decryptPayload(abime, key);
    expect(out.ok).toBe(false);
  });

  it("détecte un nonce modifié", async () => {
    const key = await keyFromPhrase(PHRASE);
    const rec = await encryptPayload({ montant: 1000 }, key);
    const abime = { ...rec, nonce: bytesToBase64(new Uint8Array(24)) };
    expect((await decryptPayload(abime, key)).ok).toBe(false);
  });

  it("signale une version de format inconnue plutôt que de deviner", async () => {
    const key = await keyFromPhrase(PHRASE);
    const rec = { ...(await encryptPayload({ a: 1 }, key)), v: 99 };
    expect(await decryptPayload(rec, key)).toEqual({ ok: false, reason: "unknownVersion" });
  });

  it("signale un enregistrement inexploitable", async () => {
    expect(await decryptPayload(null, null)).toEqual({ ok: false, reason: "corrupt" });
    expect(await decryptPayload("pas un objet", null)).toEqual({ ok: false, reason: "corrupt" });
    expect(await decryptPayload({ v: 1 }, new Uint8Array(32))).toEqual({
      ok: false,
      reason: "corrupt",
    });
  });
});

describe("compatibilité avec les données d'avant le chiffrement", () => {
  it("lit un enregistrement en clair, même sans clé", async () => {
    // Sans ça, la mise à jour de l'app effacerait l'historique de tous les
    // comptes deja existants.
    const legacy = wrapPlaintext({ version: 1, goals: [] });
    const out = await decryptPayload<{ version: number }>(legacy, null);
    expect(out.ok).toBe(true);
    expect(out.ok && out.wasPlaintext).toBe(true);
    expect(out.ok && out.data.version).toBe(1);
  });

  it("lit un enregistrement sans numéro de version du tout", async () => {
    const out = await decryptPayload({ plaintext: { a: 1 } }, null);
    expect(out.ok).toBe(true);
    expect(out.ok && out.wasPlaintext).toBe(true);
  });
});

describe("affichage de la phrase", () => {
  it("numérote les mots à partir de 1", () => {
    const words = phraseWords(PHRASE);
    expect(words).toHaveLength(PHRASE_WORDS);
    expect(words[0]).toEqual({ index: 1, word: "legend" });
    expect(words[11].index).toBe(12);
  });
});
