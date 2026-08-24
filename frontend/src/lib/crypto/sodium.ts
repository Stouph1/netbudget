// Primitives cryptographiques, derrière une surface minuscule.
//
// POURQUOI TWEETNACL ET NON LIBSODIUM. J'ai d'abord pris `libsodium-wrappers`,
// la version WebAssembly. Les tests passaient — Node accepte les modules ES —
// mais l'APPLICATION ne se compilait plus : ce paquet utilise `import.meta`,
// que le bundler de React Native ne sait pas transformer. Un chiffrement qui
// empêche l'app de démarrer ne chiffre rien.
//
// tweetnacl est du JavaScript pur, audité, sans WebAssembly et sans module
// natif. Il fonctionne donc partout où l'app fonctionne : navigateur, Expo Go,
// build compilé, et tests. C'est la leçon déjà apprise avec Google Sign-In —
// une dépendance qui ne marche que dans un environnement se paie plus tard.
//
// LA SURFACE EST VOLONTAIREMENT ÉTROITE : quatre opérations. Sur du
// chiffrement, ce qui n'est pas relu n'est pas sûr.

import nacl from "tweetnacl";

/** Longueur du nonce de secretbox, en octets. */
export const NONCE_BYTES = nacl.secretbox.nonceLength;

/**
 * Octets aléatoires de qualité cryptographique.
 *
 * Trois sources tentées dans l'ordre, et AUCUN repli sur Math.random : un
 * générateur prévisible ne produirait pas une erreur mais un chiffrement
 * cassable, sans que rien ne le signale. Mieux vaut échouer bruyamment.
 */
function secureRandom(length: number): Uint8Array {
  // expo-crypto : source native, disponible jusque dans Expo Go où
  // globalThis.crypto est absent.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto = require("expo-crypto") as {
      getRandomBytes?: (n: number) => Uint8Array;
    };
    if (typeof Crypto.getRandomBytes === "function") {
      return Crypto.getRandomBytes(length);
    }
  } catch {
    // Module absent (tests Node) : on passe à la source suivante.
  }

  const webCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (webCrypto?.getRandomValues) {
    return webCrypto.getRandomValues(new Uint8Array(length));
  }

  throw new Error("aucune-source-aleatoire-sure");
}

export const sodium = {
  /**
   * Conservé pour ne rien changer aux appelants.
   *
   * tweetnacl n'a rien à initialiser, contrairement à un module WebAssembly.
   * Garder ce point d'entrée permet de revenir à une implémentation qui, elle,
   * demanderait une initialisation, sans toucher au reste du code.
   */
  async ready(): Promise<void> {
    return;
  },

  randombytes(length: number): Uint8Array {
    return secureRandom(length);
  },

  /**
   * Dérivation par hachage, séparée par contexte.
   *
   * SHA-512 tronqué à la longueur demandée. Le `context` est préfixé pour que
   * deux dérivations du même secret avec des contextes différents donnent des
   * résultats indépendants : sans lui, réutiliser le secret ailleurs
   * exposerait les deux usages d'un coup.
   *
   * Pas d'étirement de mot de passe, et c'est voulu : les entrées ici sont
   * déjà aléatoires (128 bits pour une phrase, 256 pour une clé). Argon2 sert
   * à compenser la faiblesse d'un mot de passe humain, pas à renforcer du
   * hasard.
   */
  hash(outLength: number, input: Uint8Array, context: string): Uint8Array {
    if (outLength > 64) throw new Error("hash-trop-long");
    const prefix = new TextEncoder().encode(context);
    const buf = new Uint8Array(prefix.length + 1 + input.length);
    buf.set(prefix, 0);
    // Séparateur explicite : sans lui, ("ab", "c") et ("a", "bc") donneraient
    // le même haché — une confusion de domaines classique.
    buf[prefix.length] = 0x1f;
    buf.set(input, prefix.length + 1);
    return nacl.hash(buf).subarray(0, outLength);
  },

  /** Chiffre et authentifie. Le nonce est renvoyé : il n'est pas secret. */
  seal(plaintext: Uint8Array, key: Uint8Array): { ciphertext: Uint8Array; nonce: Uint8Array } {
    // Un nonce ALÉATOIRE par message. Le réutiliser avec la même clé casse la
    // confidentialité de XSalsa20 — c'est l'erreur classique, et elle est
    // silencieuse. 24 octets rendent la collision aléatoire hors de portée.
    const nonce = secureRandom(NONCE_BYTES);
    return { ciphertext: nacl.secretbox(plaintext, nonce, key), nonce };
  },

  /**
   * Déchiffre et vérifie l'authenticité.
   * Renvoie null si la clé est fausse ou le contenu altéré — jamais des
   * données douteuses. Sur des montants, une valeur fausse est pire qu'une
   * valeur absente.
   */
  open(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array | null {
    try {
      return nacl.secretbox.open(ciphertext, nonce, key);
    } catch {
      return null;
    }
  },
};
