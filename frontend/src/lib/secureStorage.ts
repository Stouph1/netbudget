// Stockage des jetons de session Supabase dans le Keychain (iOS) /
// EncryptedSharedPreferences (Android) plutôt qu'AsyncStorage en clair.
//
// Pourquoi : le refresh_token est de longue durée et n'est pas invalidé par un
// changement de mot de passe. Dans AsyncStorage (SQLite non chiffrée), il est
// récupérable via une sauvegarde ADB, un appareil rooté ou un malware ayant
// obtenu une élévation de privilèges.
//
// SecureStore plafonne à ~2048 octets par entrée : on découpe donc en tranches
// (`<clé>` porte le nombre de tranches, `<clé>.0`, `<clé>.1`… le contenu).
// Sur le web, SecureStore n'existe pas → repli sur AsyncStorage.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const CHUNK = 1800; // marge sous la limite de 2048 octets
const COUNT_PREFIX = "__chunks__:";

const useSecureStore = Platform.OS === "ios" || Platform.OS === "android";

async function getChunked(key: string): Promise<string | null> {
  const head = await SecureStore.getItemAsync(key);
  if (head === null) return null;
  if (!head.startsWith(COUNT_PREFIX)) return head; // valeur courte, non découpée
  const n = parseInt(head.slice(COUNT_PREFIX.length), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const part = await SecureStore.getItemAsync(`${key}.${i}`);
    if (part === null) return null; // tranche manquante : valeur inutilisable
    parts.push(part);
  }
  return parts.join("");
}

async function setChunked(key: string, value: string): Promise<void> {
  await removeChunked(key);
  if (value.length <= CHUNK) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  const n = Math.ceil(value.length / CHUNK);
  for (let i = 0; i < n; i++) {
    await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
  }
  await SecureStore.setItemAsync(key, `${COUNT_PREFIX}${n}`);
}

async function removeChunked(key: string): Promise<void> {
  const head = await SecureStore.getItemAsync(key).catch(() => null);
  if (head?.startsWith(COUNT_PREFIX)) {
    const n = parseInt(head.slice(COUNT_PREFIX.length), 10);
    for (let i = 0; i < n; i++) {
      await SecureStore.deleteItemAsync(`${key}.${i}`).catch(() => {});
    }
  }
  await SecureStore.deleteItemAsync(key).catch(() => {});
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!useSecureStore) return AsyncStorage.getItem(key);
    try {
      const value = await getChunked(key);
      if (value !== null) return value;
      // Migration : session écrite par une version antérieure (AsyncStorage).
      const legacy = await AsyncStorage.getItem(key);
      if (legacy !== null) {
        await setChunked(key, legacy).catch(() => {});
        await AsyncStorage.removeItem(key).catch(() => {});
      }
      return legacy;
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!useSecureStore) return AsyncStorage.setItem(key, value);
    try {
      await setChunked(key, value);
    } catch {
      // Ne jamais casser la connexion si le Keychain est indisponible.
      await AsyncStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (!useSecureStore) return AsyncStorage.removeItem(key);
    try {
      await removeChunked(key);
    } catch {}
    await AsyncStorage.removeItem(key).catch(() => {});
  },
};
