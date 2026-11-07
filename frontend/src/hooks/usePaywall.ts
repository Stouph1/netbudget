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
import {
  canCreateEvent,
  canCreateGoal,
  canCreateSharedGoal,
  limitsFor,
  type Tier,
  canAddIncomeSource,
  canCreateWorkspace,
} from "../lib/entitlements";
import { cachedTier, lastKnownTier, loadPlan, loadTier, onTierChange, type PlanInfo } from "../lib/tier";

export type Gate =
  /** Conseils personnalisés : n'importe quelle formule payante. */
  | { feature: "advice" }
  /** Espaces partagés : formules à plusieurs seulement. */
  /**
   * CRÉER un espace : sur la formule payée par la personne, et dans la limite
   * d'espaces qu'elle possède déjà (`ownedCount`).
   */
  | { feature: "sharedSpace"; ownedCount?: number }
  /** Synchronisation entre appareils. */
  | { feature: "sync" }
  /** Anniversaires du foyer : fête du jour J et cartes liées à l'âge. */
  | { feature: "birthdays" }
  /** Créer un événement d'un type donné, en tenant compte du quota. */
  | { feature: "event"; type: string; currentCount: number }
  /**
   * Créer un objectif d'épargne de plus.
   *
   * `shared` change la règle du tout au tout : dans un espace partagé, on ne
   * compte pas — on demande simplement un abonnement. Voir
   * canCreateSharedGoal().
   */
  | { feature: "goal"; currentCount: number; shared?: boolean }
  /** Ajouter une source de revenus de plus (deux sans abonnement). */
  | { feature: "income"; currentCount: number };

export function usePaywall() {
  const { user } = useSession();
  // On part du dernier palier connu, pas de « free » : voir lastKnownTier().
  const [tier, setTier] = useState<Tier>(() => (user?.id ? lastKnownTier() ?? "free" : "free"));
  const [reason, setReason] = useState<PaywallReason | null>(null);
  const [loading, setLoading] = useState(true);
  // Qui paie : moi, ou le propriétaire d'un espace dont je suis membre.
  const [plan, setPlan] = useState<PlanInfo | null>(null);

  useEffect(() => {
    let alive = true;
    // Le serveur a parlé : le cache, plus lent à arriver par malchance, ne
    // doit jamais le contredire (abonnement expiré entre-temps).
    let settled = false;
    // Démarrage à froid : le cache local répond en quelques millisecondes,
    // bien avant le serveur. Il ne sert qu'à l'affichage d'attente.
    if (user?.id && lastKnownTier() === null) {
      void cachedTier().then((c) => {
        if (alive && !settled && c) setTier(c);
      });
    }
    loadTier()
      .then((t) => {
        settled = true;
        if (!alive) return;
        // Sans compte, aucun abonnement n'est possible : on reste en free, et
        // les écrans premium renverront vers la connexion.
        setTier(user?.id ? t : "free");
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    const readPlan = () => {
      if (!user?.id) {
        setPlan(null);
        return;
      }
      void loadPlan().then((p) => {
        if (alive) setPlan(p);
      });
    };
    readPlan();
    // Un achat qui vient d'aboutir doit ouvrir l'accès SANS relancer l'app.
    const off = onTierChange((next) => {
      settled = true;
      if (alive) setTier(next);
      readPlan();
    });

    return () => {
      alive = false;
      off();
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
        case "birthdays":
          return limits.birthdays;
        case "sharedSpace":
          // CRÉER un espace. Le rejoindre sur invitation reste ouvert à tous —
          // voir canJoinWorkspace().
          return canCreateWorkspace(plan?.ownTier ?? tier, gate.ownedCount ?? 0).allowed;
        case "event":
          return canCreateEvent(tier, gate.currentCount, gate.type).allowed;
        case "goal":
          return gate.shared
            ? canCreateSharedGoal(tier).allowed
            : canCreateGoal(tier, gate.currentCount).allowed;
        case "income":
          return canAddIncomeSource(tier, gate.currentCount).allowed;
      }
    },
    [tier, plan],
  );

  /**
   * Vérifie l'accès. Si c'est fermé, ouvre la fenêtre des offres et renvoie
   * false — l'appelant n'a qu'à sortir.
   */
  const require = useCallback(
    (gate: Gate): boolean => {
      if (allows(gate)) return true;

      if (gate.feature === "goal") {
        if (gate.shared) {
          // Dans un espace partagé, l'invité gratuit LIT tout et n'écrit rien.
          // Le message le dit sans le rendre coupable d'avoir été invité.
          setReason({
            kind: "needsSubscription",
            featureKey: "paywall.feature.sharedGoal",
          });
          return false;
        }
        const verdict = canCreateGoal(tier, gate.currentCount);
        // Deux refus, deux réponses : sans abonnement on propose de s'abonner,
        // avec Solo on a atteint SON quota — la formule au-dessus n'en a pas.
        setReason(
          !verdict.allowed && verdict.reason === "goalLimit"
            ? { kind: "quota", featureKey: "paywall.feature.goalQuota" }
            : {
                kind: "needsSubscription",
                featureKey: "paywall.feature.goals",
              },
        );
        return false;
      }

      if (gate.feature === "sharedSpace") {
        const verdict = canCreateWorkspace(plan?.ownTier ?? tier, gate.ownedCount ?? 0);
        if (!verdict.allowed && verdict.reason === "spaceLimit") {
          setReason(
            verdict.upgradeTo
              ? { kind: "locked", featureKey: "paywall.feature.spaceQuota", requires: verdict.upgradeTo }
              : { kind: "quota", featureKey: "paywall.feature.spaceQuotaMax" },
          );
          return false;
        }
        setReason({
          kind: "needsSubscription",
          // Un membre profite déjà d'une formule : on lui explique pourquoi
          // celle-ci ne suffit pas pour créer, au lieu de lui vendre ce qu'il a.
          featureKey: plan?.sharedTier ? "paywall.feature.sharedOwn" : "paywall.feature.shared",
        });
        return false;
      }

      if (gate.feature === "income") {
        setReason({ kind: "needsSubscription", featureKey: "paywall.feature.incomes" });
        return false;
      }
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
          setReason({
            kind: "quota",
            featureKey: "paywall.feature.eventQuota",
          });
          return false;
        }
        setReason({
          kind: "needsSubscription",
          featureKey: "paywall.feature.events",
        });
        return false;
      }

      setReason({
        kind: "needsSubscription",
        featureKey:
          gate.feature === "advice"
            ? "paywall.feature.advice"
            : gate.feature === "birthdays"
              ? "paywall.feature.birthdays"
              : "paywall.feature.sync",
      });
      return false;
    },
    [allows, tier, plan],
  );

  const close = useCallback(() => setReason(null), []);

  return {
    tier,
    /** Formule payée par la personne. Retombe sur `tier` tant qu'on ne sait pas. */
    ownTier: plan?.ownTier ?? tier,
    /** Détail de la formule (propre ou partagée), null tant que non chargé. */
    plan,
    loading,
    allows,
    require,
    reason,
    close,
    visible: reason !== null,
  };
}
