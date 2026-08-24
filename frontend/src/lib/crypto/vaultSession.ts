// État du coffre pour la session en cours, lisible SANS await.
//
// POURQUOI CE MODULE EXISTE : chaque écriture de données doit savoir si le
// compte est chiffré, verrouillé, ou pas encore configuré. Aller le demander au
// serveur à chaque écriture coûterait un aller-retour réseau par sauvegarde —
// l'app en fait des dizaines. Et le rendre asynchrone obligerait à propager des
// `await` dans toute la couche de stockage pour une information qui ne change
// que trois fois dans la vie d'une session : à la connexion, à l'activation du
// chiffrement, au déverrouillage.
//
// L'état est donc publié une fois puis lu de façon synchrone. La seule règle à
// respecter : `publishVaultSession` doit être appelé à chaque changement, sinon
// la couche de stockage travaille sur une information périmée. C'est le rôle du
// hook useVault.

import type { VaultState } from "./vaultState";

type Session = {
  userId: string | null;
  state: VaultState;
  key: Uint8Array | null;
};

/**
 * Par défaut : aucun compte. C'est l'état le plus permissif pour l'écriture
 * locale et le plus restrictif pour le chiffrement — donc le bon défaut, celui
 * qui ne chiffre rien avec une clé qu'on n'a pas.
 */
let session: Session = { userId: null, state: { status: "noAccount" }, key: null };

export function publishVaultSession(
  userId: string | null,
  state: VaultState,
  key: Uint8Array | null,
): void {
  session = { userId, state, key };
}

export function currentVaultSession(): Session {
  return session;
}

/**
 * Clé utilisable pour le compte demandé.
 *
 * Le contrôle de `userId` n'est pas décoratif : sans lui, une session publiée
 * pour un compte pourrait servir à chiffrer les données d'un autre après un
 * changement de compte mal séquencé — et le serveur n'aurait pas l'empreinte
 * correspondante, rendant les données définitivement illisibles.
 */
export function keyForUser(userId: string): Uint8Array | null {
  if (session.userId !== userId) return null;
  return session.key;
}

export function stateForUser(userId: string | null): VaultState {
  if (!userId) return { status: "noAccount" };
  if (session.userId !== userId) {
    // On ne sait rien de ce compte : on refuse d'écrire plutôt que de risquer
    // une écriture en clair sur un compte peut-être chiffré.
    return { status: "locked" };
  }
  return session.state;
}
