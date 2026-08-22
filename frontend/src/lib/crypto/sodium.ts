// Accès à libsodium, derrière une surface minuscule.
//
// POURQUOI CETTE COUCHE plutôt que d'importer libsodium partout :
//
// 1. `libsodium-wrappers` est une bibliothèque WebAssembly qui doit être
//    INITIALISÉE avant tout appel. Oublier un `await ready()` ne provoque pas
//    une erreur claire mais un plantage dans le module WASM. En passant par ce
//    module, l'oubli est impossible ailleurs.
//
// 2. On n'expose que les quatre opérations dont l'app a besoin. Une surface
//    réduite est une surface qu'on peut relire — et sur du chiffrement, ce qui
//    n'est pas relu n'est pas sûr.
//
// 3. Le choix WebAssembly plutôt qu'un module natif est délibéré : il fonctionne
//    dans le navigateur, dans Expo Go et dans un build compilé. Un module natif
//    aurait rendu le chiffrement intestable hors build signé — exactement le
//    piège dans lequel Google Sign-In nous a fait tomber.

import _sodium from "libsodium-wrappers";

let readyPromise: Promise<void> | null = null;

/** Longueur du nonce de `crypto_secretbox`, en octets. */
export const NONCE_BYTES = 24;

/**
 * Chiffrement authentifié symétrique.
 *
 * `crypto_secretbox` = XSalsa20 pour le chiffre, Poly1305 pour
 * l'authentification. Authentifié veut dire qu'un octet modifié dans la base
 * fait échouer le déchiffrement au lieu de renvoyer des données corrompues :
 * sur des montants, c'est la différence entre une erreur et un budget faux.
 */
export const sodium = {
  /** Idempotent : on peut l'appeler à chaque opération sans coût. */
  async ready(): Promise<void> {
    if (!readyPromise) {
      readyPromise = _sodium.ready.then(() => undefined);
    }
    return readyPromise;
  },

  /** Octets aléatoires issus du générateur du système d'exploitation. */
  randombytes(length: number): Uint8Array {
    return _sodium.randombytes_buf(length);
  },

  /**
   * BLAKE2b avec clé de personnalisation.
   *
   * Le `context` sépare les usages : deux dérivations du même secret avec des
   * contextes différents donnent des clés indépendantes. Sans lui, réutiliser
   * le secret ailleurs exposerait les deux usages d'un coup.
   */
  hash(outLength: number, input: Uint8Array, context: string): Uint8Array {
    // La clé de BLAKE2b doit faire au moins 16 octets : on étale le contexte
    // sur 32 octets plutôt que de passer une chaîne de longueur arbitraire.
    const key = new Uint8Array(32);
    key.set(new TextEncoder().encode(context).slice(0, 32));
    return _sodium.crypto_generichash(outLength, input, key);
  },

  /** Chiffre et authentifie. Le nonce est renvoyé : il n'est pas secret. */
  seal(plaintext: Uint8Array, key: Uint8Array): { ciphertext: Uint8Array; nonce: Uint8Array } {
    // Un nonce ALÉATOIRE par message. Le réutiliser avec la même clé casse la
    // confidentialité de XSalsa20 — c'est l'erreur classique, et elle est
    // silencieuse. 24 octets rendent la collision aléatoire hors de portée.
    const nonce = _sodium.randombytes_buf(NONCE_BYTES);
    const ciphertext = _sodium.crypto_secretbox_easy(plaintext, nonce, key);
    return { ciphertext, nonce };
  },

  /**
   * Déchiffre et vérifie l'authenticité.
   * Renvoie null si la clé est fausse ou le contenu altéré — jamais des
   * données douteuses.
   */
  open(ciphertext: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array | null {
    try {
      return _sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
    } catch {
      return null;
    }
  },
};
