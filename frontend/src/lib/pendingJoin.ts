// Code d'invitation « en attente » : un lien cliqué avant d'être connecté.
//
// Le lien ouvre l'écran des espaces ; sans session, cet écran ne peut rien en
// faire. On garde le code ici, et on le ressort dès qu'une session existe —
// un lien cliqué ne doit jamais se perdre dans un écran de connexion.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "netbudget:pendingJoin";

export async function setPendingJoin(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, token.trim());
  } catch {}
}

export async function takePendingJoin(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v) await AsyncStorage.removeItem(KEY);
    return v ? v.trim() || null : null;
  } catch {
    return null;
  }
}

export async function hasPendingJoin(): Promise<boolean> {
  try {
    return !!(await AsyncStorage.getItem(KEY));
  } catch {
    return false;
  }
}
