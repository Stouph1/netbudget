// Où vit la clé de chiffrement sur l'appareil.
//
// UNE DIFFÉRENCE ASSUMÉE ENTRE MOBILE ET NAVIGATEUR :
//
// Sur iOS et Android, la clé va dans le trousseau du système (Keychain,
// EncryptedSharedPreferences). C'est le seul endroit protégé par le matériel :
// ni une sauvegarde, ni un appareil rooté n'en sortent la valeur facilement.
//
// Sur le web, il n'existe aucun équivalent. Le stockage du navigateur est
// lisible par n'importe quel script injecté sur la page — y compris par une
// extension. Y déposer une clé de chiffrement de bout en bout annulerait la
// garantie qu'on vend. La clé n'est donc gardée QU'EN MÉMOIRE : elle disparaît
// à la fermeture de l'onglet, et la phrase est redemandée à la session
// suivante. C'est plus contraignant, et c'est le prix de la promesse.
//
// La clé est aussi tenue en mémoire sur mobile, pour ne pas solliciter le
// trousseau à chaque lecture de données — un appel Keychain coûte quelques
// millisecondes, et l'app en fait des dizaines au démarrage.

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { bytesToBase64, base64ToBytes } from "./payload";
import { KEY_BYTES } from "./vaultKey";

/** Une clé par utilisateur : deux comptes sur le même téléphone ne se mélangent pas. */
const storeKey = (userId: string) => `netbudget.vaultKey.${userId}`;

const persistent = Platform.OS === "ios" || Platform.OS === "android";

/**
 * Clé chargée pour la session en cours.
 *
 * Volontairement au niveau du module : elle doit survivre aux remontages de
 * composants mais disparaître à la fermeture de l'app. Aucun `AsyncStorage`,
 * aucun contexte React persistant.
 */
let memoryKey: { userId: string; key: Uint8Array } | null = null;

/** La clé est-elle disponible tout de suite, sans redemander la phrase ? */
export function hasKeyInMemory(userId: string): boolean {
  return memoryKey !== null && memoryKey.userId === userId;
}

/** Dépose la clé pour la session, et sur le trousseau si la plateforme en a un. */
export async function rememberKey(userId: string, key: Uint8Array): Promise<void> {
  memoryKey = { userId, key };
  if (!persistent) return;
  try {
    await SecureStore.setItemAsync(storeKey(userId), bytesToBase64(key), {
      // La clé reste lisible après un redémarrage sans déverrouillage : sans
      // ça, une notification ou une synchro en arrière-plan au boot échouerait.
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  } catch {
    // Trousseau indisponible : on continue avec la clé en mémoire. L'app
    // fonctionne, la phrase sera simplement redemandée au prochain lancement.
  }
}

/**
 * Récupère la clé : mémoire d'abord, trousseau ensuite.
 * Renvoie null quand il faut demander la phrase à l'utilisateur.
 */
export async function loadKey(userId: string): Promise<Uint8Array | null> {
  if (memoryKey && memoryKey.userId === userId) return memoryKey.key;
  if (!persistent) return null;
  try {
    const stored = await SecureStore.getItemAsync(storeKey(userId));
    if (!stored) return null;
    const key = base64ToBytes(stored);
    // Une valeur de mauvaise longueur signe un stockage abîmé : mieux vaut
    // redemander la phrase que tenter de déchiffrer avec n'importe quoi.
    if (key.length !== KEY_BYTES) return null;
    memoryKey = { userId, key };
    return key;
  } catch {
    return null;
  }
}

/**
 * Oublie la clé.
 *
 * Appelé à la déconnexion : laisser la clé d'un compte sur un téléphone qu'on
 * vient de quitter est exactement ce qu'on cherche à éviter.
 */
export async function forgetKey(userId: string): Promise<void> {
  if (memoryKey?.userId === userId) memoryKey = null;
  if (!persistent) return;
  try {
    await SecureStore.deleteItemAsync(storeKey(userId));
  } catch {}
}

/** Vide la mémoire sans toucher au trousseau — utilisé par les tests. */
export function clearMemoryKey(): void {
  memoryKey = null;
}

/**
 * La plateforme sait-elle garder la clé entre deux lancements ?
 *
 * L'interface s'en sert pour dire la vérité à l'utilisateur : sur navigateur,
 * il devra ressaisir sa phrase à chaque session, et il vaut mieux l'annoncer
 * que le laisser le découvrir.
 */
export const keyPersistsOnThisDevice = persistent;
