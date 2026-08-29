// Décide QUAND lancer la visite guidée, et mémorise qu'elle a eu lieu.
//
// LE MOMENT COMPTE AUTANT QUE LE CONTENU. On attend que l'écran soit posé
// (les cibles doivent exister pour être mesurées) et surtout que l'écran de
// déverrouillage soit passé : deux plein-écrans qui s'empilent, c'est une
// personne qui ferme les deux sans lire.
//
// MÉMORISÉ PAR PALIER, comme la fête de déverrouillage : une montée de formule
// rejoue la visite, mais réduite à ce qui vient d'être acheté. Voir
// tourSteps.ts.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { useTour } from "../components/tour/TourContext";
import { useSession } from "../contexts/SessionContext";
import { parseTier, type Tier } from "../lib/entitlements";
import { loadTier } from "../lib/tier";
import { stepsFor } from "../lib/tourSteps";

const KEY_PREFIX = "netbudget:tour:seen:";

/** Le temps que la barre d'onglets soit posée et mesurable. */
const SETTLE_MS = 900;

/** Efface la mémoire de la visite. */
async function resetTour(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_PREFIX + userId);
  } catch {}
}

export function useTourRunner({ blocked }: { blocked: boolean }) {
  const { user } = useSession();
  const { start } = useTour();
  const [ran, setRan] = useState(false);

  const remember = useCallback(async (userId: string, tier: Tier) => {
    try {
      await AsyncStorage.setItem(KEY_PREFIX + userId, tier);
    } catch {
      // Stockage indisponible : tant pis pour la mémoire. Mieux vaut une
      // visite rejouée qu'une visite jamais montrée.
    }
  }, []);

  useEffect(() => {
    const userId = user?.id;
    // `blocked` : un autre plein-écran est en cours. On repassera au prochain
    // rendu, sans consommer la visite.
    if (!userId || ran || blocked) return;

    let alive = true;
    const timer = setTimeout(() => {
      void (async () => {
        let seen: Tier | null = null;
        try {
          seen = parseTier(await AsyncStorage.getItem(KEY_PREFIX + userId));
        } catch {
          seen = null;
        }
        const tier = await loadTier();
        const steps = stepsFor(tier, seen);
        if (!alive) return;
        setRan(true);
        if (steps.length === 0) return;
        start(steps, () => void remember(userId, tier));
      })();
    }, SETTLE_MS);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [user?.id, ran, blocked, start, remember]);

  /**
   * Rejoue la visite depuis le début.
   *
   * On efface la mémoire ET on rouvre la porte du lanceur. Passer par une
   * navigation ne suffirait pas : rejouer « / » alors qu'on y est déjà ne
   * remonte pas l'écran, donc l'état interne resterait sur « déjà fait ».
   */
  const replay = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;
    await resetTour(userId);
    setRan(false);
  }, [user?.id]);

  return { replay };
}
