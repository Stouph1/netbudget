// Chiffrement des espaces partagés.
//
// LE PROBLÈME. Chaque utilisateur a sa propre clé, dérivée de sa phrase. Deux
// membres d'un espace commun ne peuvent donc pas lire la même donnée : ce qui
// est chiffré pour l'un est illisible pour l'autre.
//
// LA SOLUTION RETENUE. Chaque espace a SA clé, tirée au hasard. Chaque membre
// en conserve une copie chiffrée avec sa propre clé personnelle. Le serveur
// stocke autant de copies que de membres, et n'en ouvre aucune.
//
// COMMENT LA CLÉ ATTEINT UN NOUVEAU MEMBRE — c'est la vraie difficulté, et la
// réponse évite un piège classique. L'approche habituelle consiste à publier
// une clé publique par utilisateur et à demander à un membre existant de
// sceller la clé pour le nouvel arrivant. Conséquence : l'invité ne peut RIEN
// lire jusqu'à ce que quelqu'un d'autre rouvre l'application. Sur une app de
// budget familial, cela veut dire « attends que ton conjoint se connecte » —
// inacceptable.
//
// Ici, la clé de l'espace voyage DANS l'invitation, chiffrée avec une clé
// dérivée du code d'invitation lui-même. L'invité tape le code, donc il peut
// dériver la même clé et ouvrir le paquet, seul et immédiatement. Il range
// ensuite sa propre copie, chiffrée avec sa clé personnelle.
//
// CE QUE ÇA IMPLIQUE, à dire clairement à l'utilisateur : quiconque voit le
// code d'invitation peut obtenir la clé de l'espace. Ce n'est pas une
// régression — le code donne déjà accès à l'espace — mais ça veut dire qu'un
// code se transmet par un canal de confiance. Usage unique, 14 jours,
// révocable : les trois limites qui rendent cette fuite temporaire.

import { sodium } from "./sodium";
import { KEY_BYTES } from "./vaultKey";

/** Contexte de dérivation depuis le code d'invitation. */
const INVITE_CONTEXT = "netbudget-invite-wrap-v1";

export type Sealed = { ciphertext: Uint8Array; nonce: Uint8Array };

/** Nouvelle clé d'espace. Tirée au hasard, jamais dérivée de quoi que ce soit. */
export async function generateWorkspaceKey(): Promise<Uint8Array> {
  await sodium.ready();
  return sodium.randombytes(KEY_BYTES);
}

/**
 * Emballe la clé de l'espace avec la clé personnelle d'un membre.
 * C'est ce que le serveur conserve, une ligne par membre.
 */
export async function sealForMember(
  workspaceKey: Uint8Array,
  memberKey: Uint8Array,
): Promise<Sealed> {
  await sodium.ready();
  return sodium.seal(workspaceKey, memberKey);
}

/** Ouvre sa propre copie. Null si la clé personnelle n'est pas la bonne. */
export async function openForMember(
  sealed: Sealed,
  memberKey: Uint8Array,
): Promise<Uint8Array | null> {
  await sodium.ready();
  const opened = sodium.open(sealed.ciphertext, sealed.nonce, memberKey);
  // Une clé d'espace de mauvaise longueur signe un stockage abîmé : mieux vaut
  // refuser que déchiffrer des budgets avec n'importe quoi.
  if (!opened || opened.length !== KEY_BYTES) return null;
  return opened;
}

/**
 * Clé d'emballage dérivée du code d'invitation.
 *
 * Le code fait 256 bits d'aléa : un simple hachage suffit, il n'y a pas de
 * faiblesse humaine à compenser. Le contexte garantit que cette clé ne
 * coïncide avec aucune autre dérivée du même code.
 */
export async function keyFromInviteToken(token: string): Promise<Uint8Array> {
  await sodium.ready();
  return sodium.hash(KEY_BYTES, new TextEncoder().encode(token.trim()), INVITE_CONTEXT);
}

/** Emballe la clé de l'espace pour la déposer dans l'invitation. */
export async function sealForInvite(
  workspaceKey: Uint8Array,
  token: string,
): Promise<Sealed> {
  return sealForMember(workspaceKey, await keyFromInviteToken(token));
}

/**
 * Ouvre le paquet déposé dans l'invitation, à partir du code saisi.
 * Null si le code ne correspond pas — donc si l'utilisateur s'est trompé.
 */
export async function openFromInvite(
  sealed: Sealed,
  token: string,
): Promise<Uint8Array | null> {
  return openForMember(sealed, await keyFromInviteToken(token));
}
