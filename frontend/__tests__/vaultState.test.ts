// État du coffre et droit d'écrire.
//
// LA RÈGLE QUI JUSTIFIE CE FICHIER : quand un compte est chiffré mais que la
// clé n'est pas sur l'appareil, l'app ne doit RIEN écrire. Écrire en clair « en
// attendant » remettrait les données à nu sans que personne ne le voie, et la
// lecture suivante les accepterait sans broncher puisque le format en clair
// reste valide. Un test vaut mieux qu'un commentaire là-dessus.

import {
  canWrite,
  needsMigration,
  shouldEncrypt,
  vaultMessageKey,
  vaultState,
} from "../src/lib/crypto/vaultState";

const FP = "A1B2C3";
const OTHER = "D4E5F6";

describe("vaultState", () => {
  it("sans compte : rien à chiffrer", () => {
    expect(vaultState(false, { fingerprint: null }, { fingerprint: null })).toEqual({
      status: "noAccount",
    });
  });

  it("sans compte, même si le serveur connaissait une empreinte", () => {
    // Cas réel : déconnexion. On ne doit pas rester bloqué sur « verrouillé ».
    expect(vaultState(false, { fingerprint: FP }, { fingerprint: null })).toEqual({
      status: "noAccount",
    });
  });

  it("compte sans chiffrement : on peut le proposer", () => {
    expect(vaultState(true, { fingerprint: null }, { fingerprint: null })).toEqual({
      status: "notSetUp",
    });
  });

  it("ignore une clé locale orpheline quand le compte n'est pas chiffré", () => {
    // Reste d'un compte supprimé puis recréé avec la même adresse. Sans cette
    // règle, l'app se croirait déverrouillée et chiffrerait avec une clé dont
    // le serveur n'a pas l'empreinte : plus personne ne pourrait relire.
    expect(vaultState(true, { fingerprint: null }, { fingerprint: OTHER })).toEqual({
      status: "notSetUp",
    });
  });

  it("chiffré sans clé locale : verrouillé", () => {
    expect(vaultState(true, { fingerprint: FP }, { fingerprint: null })).toEqual({
      status: "locked",
    });
  });

  it("clé locale d'un autre compte : distinct de verrouillé", () => {
    const s = vaultState(true, { fingerprint: FP }, { fingerprint: OTHER });
    expect(s).toEqual({ status: "wrongKey", expected: FP, found: OTHER });
  });

  it("empreintes concordantes : déverrouillé", () => {
    expect(vaultState(true, { fingerprint: FP }, { fingerprint: FP })).toEqual({
      status: "unlocked",
    });
  });
});

describe("droit d'écrire", () => {
  it("autorise sans compte et sans chiffrement", () => {
    expect(canWrite({ status: "noAccount" })).toBe(true);
    expect(canWrite({ status: "notSetUp" })).toBe(true);
  });

  it("autorise quand c'est déverrouillé", () => {
    expect(canWrite({ status: "unlocked" })).toBe(true);
  });

  it("REFUSE quand c'est verrouillé", () => {
    // Le test le plus important du fichier.
    expect(canWrite({ status: "locked" })).toBe(false);
  });

  it("REFUSE avec la clé d'un autre compte", () => {
    expect(canWrite({ status: "wrongKey", expected: FP, found: OTHER })).toBe(false);
  });
});

describe("faut-il chiffrer", () => {
  it("seulement quand c'est déverrouillé", () => {
    expect(shouldEncrypt({ status: "unlocked" })).toBe(true);
    expect(shouldEncrypt({ status: "notSetUp" })).toBe(false);
    expect(shouldEncrypt({ status: "noAccount" })).toBe(false);
    expect(shouldEncrypt({ status: "locked" })).toBe(false);
  });

  it("laisse en clair tant que l'utilisateur n'a pas activé le chiffrement", () => {
    // Le forcer sans son accord lui ferait perdre ses données s'il ne note pas
    // la phrase. C'est son choix, pas le nôtre.
    expect(shouldEncrypt({ status: "notSetUp" })).toBe(false);
  });
});

describe("migration à la lecture", () => {
  it("réécrit une donnée en clair une fois déverrouillé", () => {
    expect(needsMigration({ status: "unlocked" }, true)).toBe(true);
  });

  it("ne touche pas une donnée déjà chiffrée", () => {
    expect(needsMigration({ status: "unlocked" }, false)).toBe(false);
  });

  it("ne migre rien tant que le chiffrement n'est pas activé", () => {
    expect(needsMigration({ status: "notSetUp" }, true)).toBe(false);
  });

  it("ne migre rien quand c'est verrouillé", () => {
    // Sinon on tenterait de chiffrer sans clé.
    expect(needsMigration({ status: "locked" }, true)).toBe(false);
  });
});

describe("message affiché", () => {
  it("parle seulement quand il y a une action à faire", () => {
    expect(vaultMessageKey({ status: "locked" })).toBe("vault.locked.message");
    expect(vaultMessageKey({ status: "wrongKey", expected: FP, found: OTHER })).toBe(
      "vault.wrongKey.message",
    );
  });

  it("se taît quand tout va bien", () => {
    expect(vaultMessageKey({ status: "unlocked" })).toBeNull();
    expect(vaultMessageKey({ status: "noAccount" })).toBeNull();
  });

  it("ne dit rien pendant l'activation automatique", () => {
    // notSetUp ne dure que le temps du premier appel reseau : annoncer une
    // protection absente pendant une seconde inquiete sans rien permettre.
    expect(vaultMessageKey({ status: "notSetUp" })).toBeNull();
  });
});
