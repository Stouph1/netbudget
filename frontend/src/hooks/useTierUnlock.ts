// Décide QUAND montrer l'écran de déverrouillage.
//
// LA RÈGLE : une fois par palier atteint, et jamais deux fois. Un écran plein
// qui se rejoue à chaque lancement passe d'une récompense à une porte, et c'est
// une des plaintes les plus fréquentes sur les apps par abonnement.
//
// ON MÉMORISE LE PALIER, PAS UN BOOLÉEN. Quelqu'un qui passe de Solo à Famille
// doit revoir la fête — il vient de payer davantage, et c'est le moment de lui
// montrer ce qu'il a gagné. Un simple « déjà vu » l'en priverait.
//
// LA MÉMOIRE EST LOCALE ET PAR COMPTE. Locale, parce que ça n'a aucune valeur
// pour le serveur et qu'un aller-retour réseau retarderait l'affichage. Par
// compte, parce que deux personnes sur un même téléphone ne se partagent pas
// une fête. Si l'écriture échoue, on préfère NE PAS montrer : revoir la fête
// deux fois est plus agaçant que de la manquer.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "../contexts/SessionContext";
import { parseTier, type Tier } from "../lib/entitlements";
import { loadTier, onTierChange } from "../lib/tier";
import { shouldCelebrate } from "../lib/tierUnlockRule";

const KEY_PREFIX = "netbudget:unlock:seen:";

function keyFor(userId: string): string {
  return KEY_PREFIX + userId;
}

export function useTierUnlock() {
  const { user } = useSession();
  const [pending, setPending] = useState<Exclude<Tier, "free"> | null>(null);

  const check = useCallback(async (userId: string, tier: Tier) => {
    let seen: Tier | null = null;
    try {
      seen = parseTier(await AsyncStorage.getItem(keyFor(userId)));
    } catch {
      // Stockage indisponible : on se tait. Une fête qui revient à chaque
      // lancement serait pire que pas de fête du tout.
      return;
    }
    if (!shouldCelebrate(seen, tier)) return;
    setPending(tier as Exclude<Tier, "free">);
  }, []);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setPending(null);
      return;
    }
    let alive = true;

    void loadTier().then((tier) => {
      if (alive) void check(userId, tier);
    });

    // Un achat qui vient d'aboutir passe par ici : la fête suit l'achat sans
    // attendre le prochain lancement.
    const off = onTierChange((tier) => {
      if (alive) void check(userId, tier);
    });

    return () => {
      alive = false;
      off();
    };
  }, [user?.id, check]);

  /** À appeler quand l'utilisateur ferme l'écran. */
  const dismiss = useCallback(async () => {
    const userId = user?.id;
    const tier = pending;
    setPending(null);
    if (!userId || !tier) return;
    try {
      await AsyncStorage.setItem(keyFor(userId), tier);
    } catch {}
  }, [user?.id, pending]);

  return { tier: pending, visible: pending !== null, dismiss };
}
