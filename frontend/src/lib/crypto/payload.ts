// Chiffrement d'un objet JSON pour la base, et retour.
//
// C'est la frontière exacte entre le clair et le chiffré : au-dessus de cette
// ligne on manipule des objets, en dessous des octets illisibles. Tout ce qui
// part vers Supabase passe par `encryptPayload`, tout ce qui en revient par
// `decryptPayload`.
//
// FORMAT VERSIONNÉ. Chaque enregistrement porte le numéro de son format.
// Aujourd'hui il n'y en a qu'un, mais le jour où il faudra changer d'algorithme
// ou de dérivation, les anciennes données devront rester lisibles : sans
// numéro, on ne saurait pas comment les interpréter et on les perdrait.
// La version 0 désigne les données écrites AVANT le chiffrement — elles
// existent en base et doivent continuer de se lire.

import { sodium } from "./sodium";

/** Version du format chiffré courant. */
export const PAYLOAD_VERSION = 1;

/** Marqueur des données antérieures au chiffrement : du JSON en clair. */
export const PLAINTEXT_VERSION = 0;

export type EncryptedRecord = {
  /** Version du format, pour rester capable de lire le passé. */
  v: number;
  /** Chiffré, encodé en base64 pour tenir dans une colonne texte. */
  ciphertext: string;
  /** Nonce, encodé en base64. Public par nature. */
  nonce: string;
};

// ---------------------------------------------------------------------------
// Base64 sans dépendance : `Buffer` n'existe pas dans Hermes, et `btoa` ne
// gère pas les octets bruts au-delà de 0xFF de façon fiable selon les moteurs.
// ---------------------------------------------------------------------------

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : B64[b2 & 63];
  }
  return out;
}

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n0 = B64.indexOf(clean[i]);
    const n1 = B64.indexOf(clean[i + 1]);
    const n2 = B64.indexOf(clean[i + 2]);
    const n3 = B64.indexOf(clean[i + 3]);
    if (n1 >= 0) out[o++] = (n0 << 2) | (n1 >> 4);
    if (n2 >= 0) out[o++] = ((n1 & 15) << 4) | (n2 >> 2);
    if (n3 >= 0) out[o++] = ((n2 & 3) << 6) | n3;
  }
  return out.subarray(0, o);
}

/** Chiffre un objet. Le résultat est prêt à être écrit en base. */
export async function encryptPayload(
  data: unknown,
  key: Uint8Array,
): Promise<EncryptedRecord> {
  await sodium.ready();
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const { ciphertext, nonce } = sodium.seal(plaintext, key);
  return {
    v: PAYLOAD_VERSION,
    ciphertext: bytesToBase64(ciphertext),
    nonce: bytesToBase64(nonce),
  };
}

export type DecryptResult<T> =
  | { ok: true; data: T; wasPlaintext: boolean }
  | { ok: false; reason: "wrongKey" | "corrupt" | "unknownVersion" };

/**
 * Déchiffre un enregistrement.
 *
 * Trois échecs distincts, parce qu'ils appellent trois réponses différentes :
 * demander la phrase de récupération, signaler une donnée abîmée, ou dire à
 * l'utilisateur de mettre l'app à jour. Un « erreur de déchiffrement » unique
 * ne permet aucune de ces trois réponses.
 */
export async function decryptPayload<T>(
  record: EncryptedRecord | unknown,
  key: Uint8Array | null,
): Promise<DecryptResult<T>> {
  if (!record || typeof record !== "object") {
    return { ok: false, reason: "corrupt" };
  }
  const r = record as Partial<EncryptedRecord> & { plaintext?: unknown };

  // Données d'avant le chiffrement : lisibles telles quelles, et il FAUT
  // continuer de les lire — sinon la mise à jour de l'app efface l'historique
  // de tous les comptes existants.
  if (r.v === PLAINTEXT_VERSION || r.v === undefined) {
    if (r.plaintext !== undefined) {
      return { ok: true, data: r.plaintext as T, wasPlaintext: true };
    }
    return { ok: false, reason: "corrupt" };
  }

  if (r.v !== PAYLOAD_VERSION) {
    // Écrit par une version plus récente de l'app : on ne devine pas.
    return { ok: false, reason: "unknownVersion" };
  }

  if (!key) return { ok: false, reason: "wrongKey" };
  if (typeof r.ciphertext !== "string" || typeof r.nonce !== "string") {
    return { ok: false, reason: "corrupt" };
  }

  await sodium.ready();
  const opened = sodium.open(base64ToBytes(r.ciphertext), base64ToBytes(r.nonce), key);
  // Poly1305 a rejeté : soit la clé n'est pas la bonne, soit les octets ont
  // été altérés. On ne peut pas distinguer les deux, et c'est voulu — un
  // attaquant ne doit pas apprendre laquelle de ses hypothèses était juste.
  if (!opened) return { ok: false, reason: "wrongKey" };

  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(opened)) as T, wasPlaintext: false };
  } catch {
    // Déchiffré et authentifié, mais ce n'est pas du JSON valide : la donnée
    // a été écrite corrompue, le chiffrement n'y est pour rien.
    return { ok: false, reason: "corrupt" };
  }
}

/** Emballe des données non chiffrées au format versionné (migration douce). */
export function wrapPlaintext(data: unknown): { v: number; plaintext: unknown } {
  return { v: PLAINTEXT_VERSION, plaintext: data };
}
