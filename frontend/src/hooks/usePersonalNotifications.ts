// Branchement des notifications personnalisées sur le cycle de vie de l'app.
//
// Deux moments comptent :
//   - à l'ouverture : on note la visite (c'est ce qui mesure une absence) et on
//     recalcule le plan, car le contexte a pu bouger depuis la dernière fois ;
//   - au retour de l'arrière-plan : idem, mais seulement si un délai s'est
//     écoulé — recalculer à chaque bascule d'app ferait travailler le téléphone
//     pour rien.
//
// La synchronisation est volontairement silencieuse : elle ne demande JAMAIS la
// permission d'elle-même. Réclamer l'autorisation de notifier au démarrage,
// avant d'avoir rendu le moindre service, est le meilleur moyen de se la faire
// refuser définitivement. La demande se fait depuis l'écran de réglages, quand
// l'utilisateur a vu ce qu'il allait recevoir.

import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useCurrency } from "../contexts/CurrencyContext";
import { useLang } from "../contexts/LangContext";
import { useActiveScope } from "../contexts/ScopeContext";
import { useSession } from "../contexts/SessionContext";
import { loadAdviceProfile } from "../lib/premiumStore";
import {
  markAppOpened,
  syncPersonalNotifications,
} from "../utils/notificationScheduler";
import { buildSyncInput } from "../utils/notificationSources";

/** En dessous, un retour au premier plan ne justifie pas de tout recalculer. */
const RESYNC_AFTER_MS = 30 * 60 * 1000;

export function usePersonalNotifications(): void {
  const { t, tp } = useLang();
  const { user } = useSession();
  const { workspaceId } = useActiveScope();
  const { currency } = useCurrency();
  const lastSyncRef = useRef(0);

  const sync = useCallback(async () => {
    try {
      await markAppOpened();
      const profile = user?.id
        ? await loadAdviceProfile(user.id, workspaceId).catch(() => null)
        : null;
      const input = await buildSyncInput({
        userId: user?.id,
        workspaceId,
        displayCurrency: currency,
        profile,
      });
      await syncPersonalNotifications(input, (key, params) =>
        params ? tp(key, params) : t(key),
      );
      lastSyncRef.current = Date.now();
    } catch {
      // Une notification non planifiée ne doit jamais empêcher l'app de tourner.
    }
  }, [user?.id, workspaceId, currency, t, tp]);

  useEffect(() => {
    void sync();
  }, [sync]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state !== "active") return;
      if (Date.now() - lastSyncRef.current < RESYNC_AFTER_MS) return;
      void sync();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [sync]);
}
