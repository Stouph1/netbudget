// Applique les limites de formule, et ouvre la fenêtre des offres au refus.
//
// UN SEUL ENDROIT décide, et c'est voulu. Une limite recopiée dans chaque écran
// finit toujours par diverger : un écran laisse passer ce qu'un autre refuse,
// et le défaut ne se voit qu'en production, chez un client qui a payé.
//
// Le palier vient du serveur (voir tier.ts) ; ici on ne fait que le lire et
// répondre oui ou non.

import { useCallback, useEffect, useState } from "react";
import type { PaywallReason } from "../components/PaywallSheet";
import { useSession } from "../contexts/SessionContext";
import { canCreateEvent, limitsFor, type Tier } from "../lib/entitlements";
import { loadTier } from "../lib/tier";

export type Gate =
  /** Conseils personnalisés : n'importe quelle formule payante. */
  | { feature: "advice" }
  /** Espaces partagés : formules à plusieurs seulement. */
  | { feature: "sharedSpace" }
  /** Synchronisation entre appareils. */
  | { feature: "sync" }
  /** Créer un événement d'un type donné, en tenant compte du quota. */
  | { feature: "event"; type: string; currentCount: number };

export function usePaywall() {
  const { user } = useSession();
  const [tier, setTier] = useState<Tier>("free");
  const [reason, setReason] = useState<PaywallReason | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadTier()
      .then((t) => {
        if (!alive) return;
        // Sans compte, aucun abonnement n'est possible : on reste en free, et
        // les écrans premium renverront vers la connexion.
        setTier(user?.id ? t : "free");
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  /** L'accès est-il ouvert ? Ne déclenche rien. */
  const allows = useCallback(
    (gate: Gate): boolean => {
      const limits = limitsFor(tier);
      switch (gate.feature) {
        case "advice":
        case "sync":
          // Toute formule payante les inclut. `maxEvents !== 0` distingue le
          // palier gratuit sans avoir à l'énumérer ici.
          return limits.maxEvents !== 0;
        case "sharedSpace":
          return limits.maxWorkspaces > 0;
        case "event":
          return canCreateEvent(tier, gate.currentCount, gate.type).allowed;
      }
    },
    [tier],
  );

  /**
   * Vérifie l'accès. Si c'est fermé, ouvre la fenêtre des offres et renvoie
   * false — l'appelant n'a qu'à sortir.
   */
  const require = useCallback(
    (gate: Gate): boolean => {
      if (allows(gate)) return true;

      if (gate.feature === "event") {
        const verdict = canCreateEvent(tier, gate.currentCount, gate.type);
        if (!verdict.allowed && verdict.reason === "typeLocked") {
          setReason({
            kind: "locked",
            featureKey: "paywall.feature.eventType",
            requires: verdict.upgradeTo ?? "duo",
          });
          return false;
        }
        if (!verdict.allowed && verdict.reason === "eventLimit") {
          setReason({ kind: "quota", featureKey: "paywall.feature.eventQuota" });
          return false;
        }
        setReason({ kind: "needsSubscription", featureKey: "paywall.feature.events" });
        return false;
      }

      setReason({
        kind: "needsSubscription",
        featureKey:
          gate.feature === "advice"
            ? "paywall.feature.advice"
            : gate.feature === "sharedSpace"
              ? "paywall.feature.shared"
              : "paywall.feature.sync",
      });
      return false;
    },
    [allows, tier],
  );

  const close = useCallback(() => setReason(null), []);

  return { tier, loading, allows, require, reason, close, visible: reason !== null };
}
