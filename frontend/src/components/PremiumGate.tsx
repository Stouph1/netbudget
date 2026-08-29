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
import { PlanCards } from "./PlanCards";

const MIDNIGHT = "#0F172A";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";

export function PremiumGate({
  titleKey,
  bodyKey,
  icon = "lock",
}: {
  titleKey: string;
  bodyKey: string;
  icon?: keyof typeof Feather.glyphMap;
}) {
  const { t } = useLang();

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

        <PlanCards
          featuresPerCard={3}
          onPick={(tier) =>
            router.push({ pathname: "/plans", params: { tier } } as never)
          }
        />

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
  trial: { color: TEXT_3, fontSize: 11.5, lineHeight: 16, marginTop: 6, marginBottom: 14 },
  cta: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  ctaText: { color: "#000", fontSize: 15, fontWeight: "800" },
});
