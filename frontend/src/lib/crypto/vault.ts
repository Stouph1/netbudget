// Orchestration du coffre : activer, déverrouiller, connaître l'état.
//
// C'est la seule couche que les écrans appellent. Les décisions vivent dans
// vaultState.ts (pur, testé), la cryptographie dans vaultKey.ts et payload.ts,
// le stockage local dans keystore.ts. Ici on ne fait que coudre, et on garde
// ce fichier court exprès : ce qui est cousu ne se teste que par l'usage.

import { supabase } from "../supabase";
import { forgetKey, loadKey, loadPhrase, rememberKey, rememberPhrase } from "./keystore";
import { generatePhrase, keyFingerprint, keyFromPhrase } from "./vaultKey";
import { vaultState, type VaultState } from "./vaultState";

/** Empreinte enregistrée côté serveur, ou null si le chiffrement est inactif. */
export async function remoteFingerprint(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("vault_fingerprint")
    .eq("id", userId)
    .maybeSingle();
  return (data?.vault_fingerprint as string | null) ?? null;
}

/** État courant, en interrogeant serveur et appareil. */
export async function readVaultState(userId: string | null): Promise<VaultState> {
  if (!userId) return vaultState(false, { fingerprint: null }, { fingerprint: null });

  const [remote, key] = await Promise.all([
    remoteFingerprint(userId).catch(() => null),
    loadKey(userId),
  ]);
  const local = key ? await keyFingerprint(key) : null;
  return vaultState(true, { fingerprint: remote }, { fingerprint: local });
}

export type SetupResult =
  | { ok: true; phrase: string; fingerprint: string }
  | { ok: false; error: string };

/**
 * Active le chiffrement : génère une phrase, dérive la clé, publie l'empreinte.
 *
 * ORDRE DES OPÉRATIONS, et il compte : l'empreinte est écrite côté serveur
 * AVANT que la clé ne soit gardée localement. Si l'écriture échoue, l'appareil
 * ne garde rien et l'utilisateur peut réessayer proprement. Dans l'autre sens,
 * on obtiendrait un appareil qui se croit déverrouillé pour un compte que le
 * serveur juge non chiffré — l'état incohérent que vaultState traite en
 * `notSetUp`, mais autant ne pas le créer.
 */
export async function setUpVault(userId: string): Promise<SetupResult> {
  try {
    const phrase = await generatePhrase();
    const key = await keyFromPhrase(phrase);
    const fingerprint = await keyFingerprint(key);

    const { error } = await supabase
      .from("profiles")
      .update({ vault_fingerprint: fingerprint })
      .eq("id", userId)
      // Ne jamais écraser une empreinte existante : ce serait rendre
      // définitivement illisibles les données déjà chiffrées du compte.
      .is("vault_fingerprint", null);
    if (error) return { ok: false, error: error.message };

    // On relit pour être sûr que l'écriture a bien pris. Un update filtré qui
    // ne touche aucune ligne ne renvoie PAS d'erreur — c'est le piège qui
    // rendait la suppression d'espace silencieuse.
    const confirmed = await remoteFingerprint(userId);
    if (confirmed !== fingerprint) {
      return { ok: false, error: "vault-already-set" };
    }

    await rememberKey(userId, key);
    // La phrase est rangée à côté de la clé : c'est ce qui permettra de la
    // réafficher plus tard, si l'utilisateur veut sauvegarder son accès.
    await rememberPhrase(userId, phrase);
    return { ok: true, phrase, fingerprint };
  } catch (e: unknown) {
    return { ok: false, error: (e as { message?: string }).message ?? "unknown" };
  }
}

/**
 * Active le chiffrement si ce n'est pas déjà fait, sans rien demander.
 *
 * LE CHOIX DE CONCEPTION : le chiffrement n'est pas une option qu'on propose,
 * c'est le comportement par défaut. Demander l'autorisation de protéger les
 * données de quelqu'un est une question sans bonne réponse — la plupart des
 * gens répondront « plus tard » et resteront moins protégés sans l'avoir voulu.
 *
 * Silencieux jusque dans l'échec : si le réseau manque, on n'affiche rien et on
 * réessaie au prochain lancement. Les données partent alors en clair, comme
 * avant, ce qui reste un comportement valide et lisible.
 *
 * Renvoie true si le coffre est actif à la sortie.
 */
export async function ensureVault(userId: string): Promise<boolean> {
  const state = await readVaultState(userId);
  if (state.status === "unlocked") return true;

  // `locked` ou `wrongKey` : le compte est déjà chiffré et la clé de cet
  // appareil ne convient pas. Ce n'est pas à cette fonction de le résoudre —
  // il faut la phrase, donc l'utilisateur.
  if (state.status !== "notSetUp") return false;

  const result = await setUpVault(userId);
  return result.ok;
}

export type UnlockResult =
  | { ok: true }
  | { ok: false; reason: "invalidPhrase" | "wrongAccount" | "notSetUp" | "error" };

/**
 * Déverrouille avec une phrase saisie.
 *
 * On compare l'empreinte AVANT de garder la clé. Sans cette vérification,
 * une phrase valide mais appartenant à un autre compte serait acceptée, et
 * l'utilisateur ne découvrirait le problème qu'en voyant ses données illisibles
 * — sans comprendre que le problème vient de la phrase.
 */
export async function unlockVault(
  userId: string,
  phrase: string,
): Promise<UnlockResult> {
  let key: Uint8Array;
  try {
    key = await keyFromPhrase(phrase);
  } catch {
    return { ok: false, reason: "invalidPhrase" };
  }

  try {
    const remote = await remoteFingerprint(userId);
    if (!remote) return { ok: false, reason: "notSetUp" };
    if ((await keyFingerprint(key)) !== remote) {
      return { ok: false, reason: "wrongAccount" };
    }
    await rememberKey(userId, key);
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Retire la clé de cet appareil.
 *
 * À appeler à la déconnexion. Ce n'est PAS une désactivation du chiffrement :
 * les données restent chiffrées et la phrase reste la seule façon d'y revenir.
 */
export async function lockVault(userId: string): Promise<void> {
  await forgetKey(userId);
}

/** Phrase de cet appareil, pour l'écran de sauvegarde. Null s'il n'y en a pas. */
export async function backupPhrase(userId: string): Promise<string | null> {
  return loadPhrase(userId);
}

/** Clé prête à l'emploi, ou null s'il faut déverrouiller. */
export async function currentKey(userId: string | null): Promise<Uint8Array | null> {
  if (!userId) return null;
  return loadKey(userId);
}
