// Chiffrement des espaces partagés.
//
// CE QUI EST VERROUILLÉ ICI :
//   - deux membres aux clés personnelles DIFFÉRENTES lisent bien la même
//     donnée : c'est toute la raison d'être du mécanisme ;
//   - un invité peut ouvrir la clé de l'espace SEUL, avec le code, sans
//     attendre qu'un autre membre se connecte ;
//   - un mauvais code ne donne rien, et ne donne surtout pas une clé
//     approximative qui déchiffrerait des budgets en bouillie ;
//   - retirer sa copie à un membre lui retire l'accès, sans toucher aux autres.

import { KEY_BYTES, keyFromPhrase } from "../src/lib/crypto/vaultKey";
import {
  generateWorkspaceKey,
  keyFromInviteToken,
  openForMember,
  openFromInvite,
  sealForInvite,
  sealForMember,
} from "../src/lib/crypto/workspaceKey";
import { decryptPayload, encryptPayload } from "../src/lib/crypto/payload";

const PHRASE_A =
  "legend window pudding dash broccoli offer plate vehicle aspect sand come rich";

// Deux clés personnelles distinctes, comme deux membres réels.
async function twoMembers() {
  const a = await keyFromPhrase(PHRASE_A);
  const b = await generateWorkspaceKey(); // 32 octets aléatoires : fait l'affaire
  return { a, b };
}

describe("clé d'espace", () => {
  it("fait 256 bits", async () => {
    expect(await generateWorkspaceKey()).toHaveLength(KEY_BYTES);
  });

  it("est différente à chaque espace", async () => {
    const a = await generateWorkspaceKey();
    const b = await generateWorkspaceKey();
    expect([...a]).not.toEqual([...b]);
  });
});

describe("copie par membre", () => {
  it("chaque membre ouvre sa copie avec SA clé", async () => {
    const ws = await generateWorkspaceKey();
    const { a, b } = await twoMembers();

    const copyA = await sealForMember(ws, a);
    const copyB = await sealForMember(ws, b);

    expect([...(await openForMember(copyA, a))!]).toEqual([...ws]);
    expect([...(await openForMember(copyB, b))!]).toEqual([...ws]);
  });

  it("un membre ne peut pas ouvrir la copie d'un autre", async () => {
    const ws = await generateWorkspaceKey();
    const { a, b } = await twoMembers();
    expect(await openForMember(await sealForMember(ws, a), b)).toBeNull();
  });

  it("deux copies du même espace ne se ressemblent pas", async () => {
    // Sinon le serveur pourrait deviner que deux membres partagent un espace
    // en comparant les octets stockés.
    const ws = await generateWorkspaceKey();
    const { a, b } = await twoMembers();
    const copyA = await sealForMember(ws, a);
    const copyB = await sealForMember(ws, b);
    expect([...copyA.ciphertext]).not.toEqual([...copyB.ciphertext]);
  });

  it("refuse un contenu abîmé au lieu de rendre n'importe quoi", async () => {
    const ws = await generateWorkspaceKey();
    const { a } = await twoMembers();
    const sealed = await sealForMember(ws, a);
    sealed.ciphertext[0] ^= 0xff;
    expect(await openForMember(sealed, a)).toBeNull();
  });
});

describe("transmission par l'invitation", () => {
  const TOKEN = "aW52aXRlLXRva2VuLTI1Ni1iaXRzLWV4ZW1wbGU";

  it("l'invité ouvre la clé seul, avec le code", async () => {
    // Le test qui justifie tout le mécanisme : personne d'autre n'a besoin
    // d'être en ligne.
    const ws = await generateWorkspaceKey();
    const sealed = await sealForInvite(ws, TOKEN);
    expect([...(await openFromInvite(sealed, TOKEN))!]).toEqual([...ws]);
  });

  it("un code faux ne donne rien", async () => {
    const ws = await generateWorkspaceKey();
    const sealed = await sealForInvite(ws, TOKEN);
    expect(await openFromInvite(sealed, TOKEN + "x")).toBeNull();
  });

  it("tolère les espaces autour du code collé", async () => {
    const ws = await generateWorkspaceKey();
    const sealed = await sealForInvite(ws, TOKEN);
    expect(await openFromInvite(sealed, `  ${TOKEN}\n`)).not.toBeNull();
  });

  it("la dérivation depuis le code est déterministe", async () => {
    const a = await keyFromInviteToken(TOKEN);
    const b = await keyFromInviteToken(TOKEN);
    expect([...a]).toEqual([...b]);
  });

  it("deux codes donnent deux clés d'emballage différentes", async () => {
    const a = await keyFromInviteToken(TOKEN);
    const b = await keyFromInviteToken(TOKEN.slice(0, -1) + "Z");
    expect([...a]).not.toEqual([...b]);
  });
});

describe("bout en bout : deux membres, une donnée", () => {
  it("le budget écrit par l'un est lu par l'autre", async () => {
    const ws = await generateWorkspaceKey();
    const { a, b } = await twoMembers();

    // Membre A écrit avec la clé de l'espace.
    const budget = { rent: 1200, groceries: 480 };
    const record = await encryptPayload(budget, ws);

    // Membre B récupère la clé de l'espace depuis SA copie, puis lit.
    const wsForB = (await openForMember(await sealForMember(ws, b), b))!;
    const out = await decryptPayload<typeof budget>(record, wsForB);

    expect(out.ok).toBe(true);
    expect(out.ok && out.data).toEqual(budget);
    // Et la clé personnelle de A ne doit pas suffire à lire la donnée.
    expect((await decryptPayload(record, a)).ok).toBe(false);
  });

  it("retirer sa copie a un membre lui retire l'acces", async () => {
    const ws = await generateWorkspaceKey();
    const { b } = await twoMembers();
    const record = await encryptPayload({ secret: 1 }, ws);
    // Sans copie de la cle d'espace, la cle personnelle ne sert a rien.
    expect((await decryptPayload(record, b)).ok).toBe(false);
  });
});
