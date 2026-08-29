// Décide si l'écran des nouveautés s'ouvre à ce lancement.
//
// DEUX MARQUEURS, et il en faut bien deux :
//
//   « version vue »  — la dernière version dont on a montré les nouveautés ;
//   « déjà installé » — posé au tout premier lancement.
//
// Sans le second, impossible de distinguer une INSTALLATION NEUVE d'une mise à
// jour venue d'une version antérieure au suivi : les deux n'ont aucune version
// vue. Or l'une doit se taire et l'autre doit parler.

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import { shouldShowWhatsNew } from "../lib/whatsNew";

const SEEN_KEY = "netbudget:whatsnew:seen";
const INSTALLED_KEY = "netbudget:installed";

/** Version déclarée dans app.json. Chaîne vide si introuvable. */
export function appVersion(): string {
  return Constants.expoConfig?.version ?? "";
}

export function useWhatsNew({ blocked }: { blocked: boolean }) {
  const [visible, setVisible] = useState(false);
  const version = appVersion();

  useEffect(() => {
    // Un autre plein-écran occupe la place : on repassera.
    if (blocked || !version) return;
    let alive = true;

    void (async () => {
      let seen: string | null = null;
      let firstInstall = false;
      try {
        seen = await AsyncStorage.getItem(SEEN_KEY);
        firstInstall = (await AsyncStorage.getItem(INSTALLED_KEY)) === null;
        if (firstInstall) {
          // Posé tout de suite : la prochaine mise à jour majeure devra, elle,
          // s'annoncer.
          await AsyncStorage.multiSet([
            [INSTALLED_KEY, "1"],
            [SEEN_KEY, version],
          ]);
        }
      } catch {
        // Stockage indisponible : on se tait. Un écran qui revient à chaque
        // lancement est bien pire qu'un écran manqué.
        return;
      }
      if (alive && shouldShowWhatsNew(seen, version, { firstInstall })) {
        setVisible(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [blocked, version]);

  const dismiss = useCallback(async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(SEEN_KEY, version);
    } catch {}
  }, [version]);

  return { visible, version, dismiss };
}
