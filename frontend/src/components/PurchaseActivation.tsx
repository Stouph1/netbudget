// Les secondes entre le paiement et la formule active.
//
// POURQUOI CET ÉCRAN. La boutique encaisse, puis RevenueCat vérifie le reçu et
// notre serveur l'enregistre : il s'écoule de une à quinze secondes. On
// affichait une alerte « C'est actif » pendant ce temps — sur iOS, présentée
// juste après la feuille de paiement, elle était parfois avalée, et l'abonné
// restait devant l'écran des formules sans rien qui bouge. Il venait de payer
// et ne savait pas si ça avait marché.
//
// Ici, l'état est toujours visible : le paiement est reçu, l'activation est en
// cours, puis la fête prend le relais. Si le serveur tarde, on le DIT, avec ce
// qui va se passer et un bouton pour vérifier — jamais un écran muet.

import { Feather } from "@expo/vector-icons";
import { useMemo, type ReactNode } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Reanimated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useAccent } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { alpha } from "../theme/accents";

const MIDNIGHT = "#0B1220";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";

/** `done` : la formule est active, la fête (enfant) couvre l'écran. */
export type ActivationState = "activating" | "delayed" | "checking" | "done";

export function PurchaseActivation({
  state,
  onRetry,
  onLater,
  children,
}: {
  state: ActivationState | null;
  onRetry: () => void;
  onLater: () => void;
  /**
   * La fête, rendue DEDANS. Sur iOS, fermer une modale et en ouvrir une autre
   * dans la même seconde perd souvent la seconde ; imbriquée, elle s'ouvre
   * par-dessus sans transition ratée.
   */
  children?: ReactNode;
}) {
  const GOLD = useAccent().main;
  const s = useMemo(() => makeS(GOLD), [GOLD]);
  const { t } = useLang();
  const waiting = state === "activating" || state === "checking";

  return (
    <Modal visible={state !== null} animationType="fade" transparent={false} onRequestClose={onLater}>
      <View style={s.root}>
        <Reanimated.View entering={ZoomIn.springify().damping(12)} style={s.badge}>
          <Feather name="check" size={40} color={GOLD} />
        </Reanimated.View>

        <Reanimated.Text entering={FadeIn.delay(150)} style={s.title}>
          {t(state === "delayed" ? "plan.delayed.title" : "plan.activating.title")}
        </Reanimated.Text>
        <Reanimated.Text entering={FadeIn.delay(250)} style={s.body}>
          {t(state === "delayed" ? "plan.delayed.body" : "plan.activating.body")}
        </Reanimated.Text>

        {state === "done" ? null : waiting ? (
          <ActivityIndicator color={GOLD} style={{ marginTop: 26 }} />
        ) : (
          <View style={s.actions}>
            <TouchableOpacity style={s.cta} onPress={onRetry} activeOpacity={0.85} accessibilityRole="button">
              <Text style={s.ctaText}>{t("plan.delayed.retry")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.later} onPress={onLater} hitSlop={8} accessibilityRole="button">
              <Text style={s.laterText}>{t("plan.delayed.later")}</Text>
            </TouchableOpacity>
          </View>
        )}
        {children}
      </View>
    </Modal>
  );
}

const makeS = (GOLD: string) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: MIDNIGHT,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
    },
    badge: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: alpha(GOLD, 0.14),
      borderWidth: 1,
      borderColor: alpha(GOLD, 0.4),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    title: { color: TEXT_1, fontSize: 25, fontWeight: "900", textAlign: "center", marginBottom: 10 },
    body: { color: TEXT_2, fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 330 },
    actions: { width: "100%", maxWidth: 330, marginTop: 28 },
    cta: { backgroundColor: GOLD, borderRadius: 15, paddingVertical: 16, alignItems: "center" },
    ctaText: { color: "#04140B", fontSize: 15.5, fontWeight: "900" },
    later: { alignItems: "center", paddingVertical: 14 },
    laterText: { color: TEXT_2, fontSize: 14, fontWeight: "600" },
  });
