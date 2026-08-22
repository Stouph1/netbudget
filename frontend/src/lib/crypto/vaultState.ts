// Dans quel état est le coffre, et qu'a-t-on le droit de faire ?
//
// POURQUOI UN MODULE À PART, ET PUR : les règles ci-dessous décident si l'app
// peut écrire des données. Se tromper ne provoque pas une erreur visible mais
// une fuite silencieuse — écrire en clair alors que le compte est censé être
// chiffré. C'est exactement le genre de règle qui doit être testable sans
// réseau, sans base et sans écran.

/** Ce que le serveur sait du chiffrement d'un compte. */
export type VaultRemote = {
  /** Empreinte enregistrée, ou null si le chiffrement n'a jamais été activé. */
  fingerprint: string | null;
};

/** Ce que l'appareil courant possède. */
export type VaultLocal = {
  /** Empreinte de la clé disponible ici, ou null s'il n'y en a pas. */
  fingerprint: string | null;
};

export type VaultState =
  /** Pas de compte : tout reste sur l'appareil, il n'y a rien à chiffrer. */
  | { status: "noAccount" }
  /** Compte sans chiffrement : on peut proposer de l'activer. */
  | { status: "notSetUp" }
  /** Chiffré, mais la clé n'est pas sur cet appareil : il faut la phrase. */
  | { status: "locked" }
  /**
   * Une clé est présente mais ce n'est PAS celle du compte. Cas réel : deux
   * comptes sur le même téléphone, ou une phrase d'un autre compte saisie par
   * erreur. Distinct de `locked` car le message doit être différent.
   */
  | { status: "wrongKey"; expected: string; found: string }
  /** Tout est en place. */
  | { status: "unlocked" };

/**
 * Détermine l'état à partir de ce que sait le serveur et de ce que possède
 * l'appareil. Aucun effet de bord, aucun accès réseau.
 */
export function vaultState(
  signedIn: boolean,
  remote: VaultRemote,
  local: VaultLocal,
): VaultState {
  if (!signedIn) return { status: "noAccount" };

  if (remote.fingerprint === null) {
    // Le serveur ne connaît aucune empreinte. Même si l'appareil a une clé en
    // cache — reste d'un compte supprimé puis recréé — le compte n'est pas
    // chiffré : on repart de la proposition d'activation.
    return { status: "notSetUp" };
  }

  if (local.fingerprint === null) return { status: "locked" };

  if (local.fingerprint !== remote.fingerprint) {
    return { status: "wrongKey", expected: remote.fingerprint, found: local.fingerprint };
  }

  return { status: "unlocked" };
}

/**
 * Peut-on écrire des données cloud maintenant ?
 *
 * La règle qui compte : quand un compte est chiffré mais verrouillé, on
 * n'écrit RIEN. Écrire en clair « en attendant » remettrait les données à nu
 * sans que personne ne s'en aperçoive, et la prochaine lecture les accepterait
 * sans broncher puisque le format en clair reste valide.
 */
export function canWrite(state: VaultState): boolean {
  return state.status === "noAccount" || state.status === "notSetUp" || state.status === "unlocked";
}

/**
 * Faut-il chiffrer ce qu'on écrit ?
 *
 * Non pendant la période où le compte n'a pas encore de phrase : on continue
 * en clair, exactement comme avant, jusqu'à ce que l'utilisateur active le
 * chiffrement. Le forcer sans son accord lui ferait perdre l'accès à ses
 * propres données s'il ne note pas la phrase.
 */
export function shouldEncrypt(state: VaultState): boolean {
  return state.status === "unlocked";
}

/**
 * Cette lecture doit-elle déclencher une réécriture chiffrée ?
 *
 * On migre à la LECTURE plutôt que par un traitement massif : chaque donnée se
 * chiffre la première fois qu'on y touche, sans interruption de service et
 * sans risque de tout casser d'un coup. Une donnée jamais relue reste en clair
 * jusqu'à ce qu'on la relise — ce n'est pas idéal, mais c'est sûr.
 */
export function needsMigration(state: VaultState, wasPlaintext: boolean): boolean {
  return wasPlaintext && shouldEncrypt(state);
}

/** Message à afficher, sous forme de clé i18n. Null quand il n'y a rien à dire. */
export function vaultMessageKey(state: VaultState): string | null {
  switch (state.status) {
    case "locked":
      return "vault.locked.message";
    case "wrongKey":
      return "vault.wrongKey.message";
    case "notSetUp":
      return "vault.notSetUp.message";
    default:
      return null;
  }
}
