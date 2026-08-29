// Barrière d'écran : ce qui s'affiche à la place d'une fonctionnalité fermée.
//
// POURQUOI UN ÉCRAN ET NON UNE SIMPLE FENÊTRE. Sur une action ponctuelle —
// créer un événement de plus — une fenêtre suffit : l'utilisateur était en
// train de faire autre chose. Mais sur un écran ENTIER qu'il vient d'ouvrir,
// une fenêtre par-dessus une page vide donne l'impression d'un défaut. Ici il
// voit une page qui explique ce qu'il obtiendrait, et un bouton.
//
// CE QU'ON NE FAIT PAS : masquer la fonctionnalité. Une tuile qui disparaît
// pour les non-abonnés empêche de découvrir ce qui existe — et donc d'avoir
// envie de payer.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLang } from "../contexts/LangContext";
import {
  HIGHLIGHTED_TIER,
  planFeatureKeys,
  planMembers,
  SELLABLE_TIERS,
} from "../lib/billing/plans";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

export function PremiumGate({
  titleKey,
  bodyKey,
  icon = "lock",
}: {
  titleKey: string;
  bodyKey: string;
  icon?: keyof typeof Feather.glyphMap;
}) {
  const { t, tp } = useLang();

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <View style={s.hero}>
          <Feather name={icon} size={26} color={GOLD} />
        </View>

        <Text style={s.title}>{t(titleKey)}</Text>
        <Text style={s.body}>{t(bodyKey)}</Text>

        {SELLABLE_TIERS.map((tier) => {
          const members = planMembers(tier);
          const best = tier === HIGHLIGHTED_TIER;
          return (
            <View key={tier} style={[s.card, best && s.cardBest]}>
              <View style={s.cardHead}>
                <Text style={s.cardTitle}>{t(`plan.${tier}.name`)}</Text>
                {best ? (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{t("plan.popular")}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.cardFor}>
                {members ? tp("plan.forMembers", { n: members }) : t("plan.forOne")}
              </Text>
              {planFeatureKeys(tier)
                .filter((k) => k !== "plan.feature.noWedding")
                .slice(0, 3)
                .map((k) => (
                  <View key={k} style={s.featureRow}>
                    <Feather name="check" size={13} color={GOLD} />
                    <Text style={s.featureText}>{t(k)}</Text>
                  </View>
                ))}
            </View>
          );
        })}

        <Text style={s.trial}>{t("paywall.trialOnce")}</Text>

        <TouchableOpacity
          style={s.cta}
          onPress={() => router.push("/plans" as never)}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={s.ctaText}>{t("plan.choose.cta")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  header: { paddingHorizontal: 20, paddingVertical: 14 },
  hero: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(74,222,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    color: TEXT_1,
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 28,
    textAlign: "center",
    marginBottom: 10,
  },
  body: {
    color: TEXT_2,
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardBest: { borderColor: "rgba(74,222,128,0.45)" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { color: TEXT_1, fontSize: 16, fontWeight: "800" },
  badge: {
    backgroundColor: "rgba(74,222,128,0.14)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: GOLD,
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardFor: { color: TEXT_3, fontSize: 12, marginTop: 2, marginBottom: 9 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 5 },
  featureText: { flex: 1, color: TEXT_2, fontSize: 12.5, lineHeight: 17 },
  trial: { color: TEXT_3, fontSize: 11.5, lineHeight: 16, marginTop: 6, marginBottom: 14 },
  cta: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  ctaText: { color: "#000", fontSize: 15, fontWeight: "800" },
});
