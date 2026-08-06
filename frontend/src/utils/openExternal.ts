// Ouverture de liens externes — point de passage UNIQUE.
//
// Pourquoi : les schémas javascript:, file:, content:// et intent:// sont
// exploitables si une URL vient un jour d'une source non maîtrisée (corpus de
// conseils distant, contenu saisi dans un workspace partagé). On valide donc
// le protocole ici plutôt que de compter sur un startsWith("http") répété.

import { Linking } from "react-native";

const ALLOWED = new Set(["https:", "http:", "mailto:"]);

export async function openExternal(url: string | undefined | null): Promise<boolean> {
  if (!url) return false;
  let protocol: string;
  try {
    protocol = new URL(url).protocol.toLowerCase();
  } catch {
    return false; // URL non parsable : on n'ouvre pas
  }
  if (!ALLOWED.has(protocol)) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
