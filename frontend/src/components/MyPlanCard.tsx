// « Ta formule » : en tête de l'écran des formules, ce que la personne a
// aujourd'hui, et ce qui va se passer ensuite.
//
// LE MODÈLE, CE SONT LES PAGES DE COMPTE DES SERVICES DE MUSIQUE ET DE VIDÉO.
// On y lit en une ligne : quelle formule, mensuelle ou annuelle, et la PROCHAINE
// ÉCHÉANCE dite telle qu'elle est — « renouvellement le 12 mars », « se termine
// le 12 mars », « essai gratuit jusqu'au 12 mars ». Et un membre d'une offre
// Famille lit « tu fais partie de la formule de Marie », sans bouton pour
// gérer un abonnement qu'il ne paie pas.
//
// Avant, l'écran ne disait rien de tout ça : un abonné ne savait ni quand il
// serait prélevé, ni si sa résiliation avait été prise en compte, et un invité
// se voyait proposer « Gérer l'abonnement ».

import { Feather } from "@expo/vector-icons";
import { useMemo } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAccent } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { alpha } from "../theme/accents";
import { limitsFor, type Tier } from "../lib/entitlements";
import type { PlanInfo } from "../lib/tier";
import type { StoreSubscription } from "../lib/billing/provider";
import { planStatus } from "../lib/planStatus";
import { periodFromProductId } from "../lib/billing/plans";
import { TierGlyph } from "./TierBadge";

const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const WARN = "#F59E0B";

export function MyPlanCard({
  plan,
  store,
  onManage,
  onFixPayment,
}: {
  plan: PlanInfo;
  store: StoreSubscription | null;
  /** Ouvre la feuille « Gérer l'abonnement ». */
  onManage: () => void;
  /** Ouvre la page d'abonnements de la boutique (paiement, réactivation). */
  onFixPayment: () => void;
}) {
  const GOLD = useAccent().main;
  const s = useMemo(() => makeS(GOLD), [GOLD]);
  const { t, tp, lang } = useLang();

  const fmt = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    try {
      return new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric" }).format(d);
    } catch {
      return d.toISOString().slice(0, 10);
    }
  };

  // MEMBRE D'UN ESPACE : la formule vient de quelqu'un d'autre.
  if (plan.ownTier === "free" && plan.sharedTier) {
    const name = t(`plan.${plan.sharedTier}.name`);
    return (
      <View style={s.card} testID="my-plan-shared">
        <Text style={s.eyebrow}>{t("plan.my.title")}</Text>
        <View style={s.row}>
          <TierGlyph tier={plan.sharedTier} size={22} />
          <Text style={s.tierName}>{name}</Text>
          <View style={s.pill}>
            <Text style={s.pillText}>{t("plan.my.sharedPill")}</Text>
          </View>
        </View>
        <Text style={s.status}>
          {plan.sharedBy
            ? tp("plan.my.sharedBy", { plan: name, name: plan.sharedBy })
            : tp("plan.my.shared", { plan: name })}
        </Text>
        <Text style={s.note}>{t("plan.my.sharedNote")}</Text>
      </View>
    );
  }

  if (plan.ownTier === "free") return null;
  const tier = plan.ownTier as Exclude<Tier, "free">;
  const status = planStatus(plan, store, Platform.OS);
  const period = store?.period ?? (plan.ownProductId ? periodFromProductId(plan.ownProductId) : null);
  const members = limitsFor(tier).maxMembersPerWorkspace;

  let line: string | null = null;
  let warn = false;
  let action: { label: string; onPress: () => void } | null = null;
  switch (status.kind) {
    case "billingIssue":
      line = t("plan.my.billingIssue");
      warn = true;
      action = { label: t("plan.my.fixPayment"), onPress: onFixPayment };
      break;
    case "trial": {
      const d = fmt(status.date);
      line = d
        ? tp(status.willRenew ? "plan.my.trialRenews" : "plan.my.trialEnds", { date: d })
        : t("plan.my.trial");
      break;
    }
    case "ending": {
      const d = fmt(status.date);
      line = d ? tp("plan.my.ends", { date: d }) : t("plan.my.endsSoon");
      warn = true;
      action = { label: t("plan.my.resume"), onPress: onFixPayment };
      break;
    }
    case "renews": {
      const d = fmt(status.date);
      line = d ? tp("plan.my.renews", { date: d }) : null;
      break;
    }
    case "validUntil": {
      const d = fmt(status.date);
      line = d ? tp("plan.my.validUntil", { date: d }) : null;
      break;
    }
    case "otherStore":
      line = t(status.store === "apple" ? "plan.my.otherStore.apple" : "plan.my.otherStore.google");
      break;
    case "none":
      break;
  }

  return (
    <View style={[s.card, s.cardOwn]} testID="my-plan">
      <Text style={s.eyebrow}>{t("plan.my.title")}</Text>
      <View style={s.row}>
        <TierGlyph tier={tier} size={22} />
        <Text style={s.tierName}>{t(`plan.${tier}.name`)}</Text>
        {period ? (
          <View style={s.pill}>
            <Text style={s.pillText}>{t(period === "yearly" ? "plan.period.yearly" : "plan.period.monthly")}</Text>
          </View>
        ) : null}
      </View>
      {members > 0 ? <Text style={s.note}>{tp("plan.my.members", { n: members })}</Text> : null}
      {line ? (
        <View style={[s.statusRow, warn && s.statusWarn]}>
          <Feather name={warn ? "alert-circle" : "calendar"} size={14} color={warn ? WARN : TEXT_2} />
          <Text style={[s.status, { flex: 1, marginTop: 0 }, warn && { color: TEXT_1 }]}>{line}</Text>
        </View>
      ) : null}
      {action ? (
        <TouchableOpacity style={s.cta} onPress={action.onPress} activeOpacity={0.85} accessibilityRole="button">
          <Text style={s.ctaText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        onPress={onManage}
        style={s.manage}
        activeOpacity={0.7}
        accessibilityRole="link"
        testID="plan-manage"
      >
        <Text style={s.manageText}>{t("plan.manage.cta")}</Text>
        <Feather name="chevron-right" size={15} color={GOLD} />
      </TouchableOpacity>
    </View>
  );
}

const makeS = (GOLD: string) =>
  StyleSheet.create({
    card: {
      backgroundColor: SURFACE,
      borderRadius: 18,
      padding: 18,
      marginBottom: 22,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
    },
    cardOwn: { borderColor: alpha(GOLD, 0.45), backgroundColor: alpha(GOLD, 0.07) },
    eyebrow: {
      color: TEXT_2,
      fontSize: 11.5,
      fontWeight: "800",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: 10,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    tierName: { color: TEXT_1, fontSize: 24, fontWeight: "900" },
    pill: {
      marginLeft: "auto",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: alpha(GOLD, 0.16),
    },
    pillText: { color: GOLD, fontSize: 12, fontWeight: "800" },
    note: { color: TEXT_2, fontSize: 13, lineHeight: 19, marginTop: 8 },
    status: { color: TEXT_2, fontSize: 14, lineHeight: 20, marginTop: 10 },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.04)",
    },
    statusWarn: { backgroundColor: alpha(WARN, 0.14) },
    cta: {
      marginTop: 12,
      backgroundColor: GOLD,
      borderRadius: 13,
      paddingVertical: 13,
      alignItems: "center",
    },
    ctaText: { color: "#04140B", fontSize: 14.5, fontWeight: "900" },
    manage: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingTop: 14,
    },
    manageText: { color: GOLD, fontSize: 14, fontWeight: "700" },
  });
