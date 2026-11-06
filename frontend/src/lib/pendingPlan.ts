// Formule choisie avant d'avoir un compte.
//
// Un achat doit être rattaché à un compte : sans lui, le serveur reçoit un
// identifiant anonyme et n'accorde rien. On garde donc la formule visée
// pendant la connexion, et on ramène la personne à l'écran des formules juste
// après. Même principe que pendingJoin.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "netbudget:pendingPlan";

export async function setPendingPlan(tier: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, tier);
  } catch {}
}

/** Rend la formule en attente et l'efface. Valeur brute : l'écran la valide. */
export async function takePendingPlan(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v) await AsyncStorage.removeItem(KEY);
    return v || null;
  } catch {
    return null;
  }
}
