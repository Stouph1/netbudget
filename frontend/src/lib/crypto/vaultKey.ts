// Clé de chiffrement des données, et sa phrase de récupération.
//
// LE MODÈLE, en une phrase : une clé aléatoire de 256 bits chiffre tes données ;
// douze mots permettent de la reconstituer. Nous ne voyons jamais ni la clé ni
// les mots.
//
// CE QUE ÇA IMPLIQUE, et il faut le dire à l'utilisateur AVANT qu'il continue :
// perdre à la fois son téléphone et sa phrase, c'est perdre les données
// synchronisées. Il n'y a pas de porte de service — c'est précisément ce qui
// fait la valeur du chiffrement de bout en bout. Un fournisseur capable de
// « réinitialiser » tes données chiffrées est un fournisseur capable de les lire.
//
// TROIS CHOIX TECHNIQUES ET LEUR RAISON :
//
// 1. La liste de mots est la même dans les huit langues de l'app. Ce n'est pas
//    un oubli de traduction : la phrase doit rester valide si l'utilisateur
//    change la langue entre le moment où il la note et celui où il la
//    ressaisit. Une phrase traduite deviendrait illisible après un changement
//    de langue — c'est-à-dire une perte de données.
//
//    ⚠️ La liste vient de BIP-39 mais la SOMME DE CONTRÔLE est calculée avec
//    BLAKE2b, pas SHA-256. Une phrase NETbudget n'est donc pas une phrase de
//    portefeuille crypto et ne doit jamais être saisie dans l'un d'eux. C'est
//    délibéré : ça évite qu'on la confonde avec un secret qui protège de
//    l'argent.
//
// 2. Douze mots, soit 128 bits d'entropie. Il en faudrait 24 pour en porter 256,
//    mais 128 bits sont hors de portée d'une attaque par force brute et une
//    phrase deux fois plus longue est deux fois moins souvent notée correctement.
//    La clé de chiffrement fait bien 256 bits : elle est dérivée de l'entropie
//    par BLAKE2b.
//
// 3. La dérivation est un simple hachage, sans étirement de mot de passe. C'est
//    volontaire : l'entrée est déjà aléatoire à 128 bits. Argon2 sert à
//    compenser la faiblesse d'un mot de passe humain, pas à renforcer du hasard.

import { sodium } from "./sodium";
import { WORDLIST } from "./wordlist";

/** Longueur de la clé de chiffrement, en octets. */
export const KEY_BYTES = 32;

/** Entropie d'une phrase de douze mots, en octets. */
const ENTROPY_BYTES = 16;

export const PHRASE_WORDS = 12;

/**
 * Contexte de dérivation. Il garantit que si l'app dérive un jour une seconde
 * clé du même secret — par exemple une paire de clés pour les espaces
 * partagés — les deux ne seront pas identiques.
 */
const KEY_CONTEXT = "netbudget-vault-key-v1";

/** Nombre de bits de somme de contrôle : 12 mots x 11 bits - 128 bits. */
const CHECKSUM_BITS = PHRASE_WORDS * 11 - ENTROPY_BYTES * 8;

/**
 * Bits de contrôle dérivés de l'entropie.
 *
 * Ils ne renforcent pas le secret — ils servent à repérer une phrase mal
 * recopiée AVANT de dériver une clé fausse et d'afficher « données
 * illisibles » à quelqu'un qui a pourtant la bonne phrase à un mot près.
 */
function checksumBits(entropy: Uint8Array): number {
  const digest = sodium.hash(1, entropy, "netbudget-phrase-checksum");
  // On garde les bits de poids fort, comme le fait BIP-39 avec SHA-256.
  return digest[0] >> (8 - CHECKSUM_BITS);
}

/** Entropie + contrôle -> indices de mots. */
function entropyToWords(entropy: Uint8Array): string[] {
  let bits = "";
  for (const byte of entropy) bits += byte.toString(2).padStart(8, "0");
  bits += checksumBits(entropy).toString(2).padStart(CHECKSUM_BITS, "0");

  const words: string[] = [];
  for (let i = 0; i < PHRASE_WORDS; i++) {
    words.push(WORDLIST[parseInt(bits.slice(i * 11, i * 11 + 11), 2)]);
  }
  return words;
}

/** Indices de mots -> entropie, ou null si le contrôle échoue. */
function wordsToEntropy(words: string[]): Uint8Array | null {
  let bits = "";
  for (const w of words) {
    const idx = WORDLIST.indexOf(w);
    if (idx < 0) return null;
    bits += idx.toString(2).padStart(11, "0");
  }

  const entropy = new Uint8Array(ENTROPY_BYTES);
  for (let i = 0; i < ENTROPY_BYTES; i++) {
    entropy[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }

  const given = parseInt(bits.slice(ENTROPY_BYTES * 8), 2);
  return given === checksumBits(entropy) ? entropy : null;
}

/** Génère une phrase neuve. Le hasard vient du système, pas de Math.random. */
export async function generatePhrase(): Promise<string> {
  await sodium.ready();
  return entropyToWords(sodium.randombytes(ENTROPY_BYTES)).join(" ");
}

/**
 * Normalise une phrase saisie à la main.
 *
 * Les espaces multiples, les majuscules d'auto-correction et les espaces
 * insécables collés par un copier-coller sont la première cause d'échec d'une
 * ressaisie. Les corriger silencieusement évite un « phrase invalide »
 * incompréhensible alors que les mots sont bons.
 */
export function normalizePhrase(input: string): string {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\s  ]+/g, " ")
    .trim();
}

export type PhraseCheck =
  | { ok: true; phrase: string }
  | { ok: false; reason: "wordCount" | "unknownWord" | "checksum"; badWords?: string[] };

/**
 * Valide une phrase et explique précisément ce qui cloche.
 *
 * On distingue trois échecs parce qu'ils n'appellent pas la même action :
 * compter les mots, corriger un mot inconnu, ou vérifier l'ordre. Un message
 * unique « phrase invalide » laisse l'utilisateur sans issue.
 */
export function checkPhrase(input: string): PhraseCheck {
  const phrase = normalizePhrase(input);
  const words = phrase ? phrase.split(" ") : [];

  if (words.length !== PHRASE_WORDS) {
    return { ok: false, reason: "wordCount" };
  }

  const known = new Set(WORDLIST);
  const badWords = words.filter((w) => !known.has(w));
  if (badWords.length > 0) {
    return { ok: false, reason: "unknownWord", badWords };
  }

  // Tous les mots existent mais la somme de contrôle échoue : ils sont dans le
  // mauvais ordre, ou l'un d'eux a été confondu avec un autre mot valide.
  if (wordsToEntropy(words) === null) {
    return { ok: false, reason: "checksum" };
  }

  return { ok: true, phrase };
}

/**
 * Reconstitue la clé de chiffrement à partir de la phrase.
 *
 * Déterministe : la même phrase donne toujours la même clé, sur n'importe quel
 * appareil. C'est ce qui permet de retrouver ses données après un changement de
 * téléphone.
 */
export async function keyFromPhrase(input: string): Promise<Uint8Array> {
  const checked = checkPhrase(input);
  if (!checked.ok) {
    throw new Error(`phrase-invalide:${checked.reason}`);
  }
  await sodium.ready();
  const entropy = wordsToEntropy(checked.phrase.split(" "));
  if (!entropy) throw new Error("phrase-invalide:checksum");
  return sodium.hash(KEY_BYTES, entropy, KEY_CONTEXT);
}

/**
 * Empreinte courte de la clé, affichable.
 *
 * Sert à vérifier que deux appareils partagent bien la même clé sans jamais
 * montrer la clé. Sur six caractères la collision est possible, mais on ne
 * cherche pas à prouver l'identité — seulement à repérer une phrase erronée.
 */
export async function keyFingerprint(key: Uint8Array): Promise<string> {
  await sodium.ready();
  const digest = sodium.hash(8, key, "netbudget-fingerprint");
  return [...digest]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 6)
    .toUpperCase();
}

/** Découpe la phrase pour l'affichage numéroté — on ne fait pas ça dans la vue. */
export function phraseWords(phrase: string): { index: number; word: string }[] {
  return normalizePhrase(phrase)
    .split(" ")
    .map((word, i) => ({ index: i + 1, word }));
}
