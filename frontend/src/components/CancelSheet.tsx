// Ce qu'on montre quand quelqu'un veut résilier.
//
// LA LIGNE À NE PAS FRANCHIR. Une page de rétention est légitime : demander
// pourquoi, et proposer une réponse au problème. Retenir quelqu'un en rendant
// la sortie pénible ne l'est pas — c'est un « dark pattern », c'est interdit
// en Europe (directive Omnibus, DSA), et Apple comme Google le sanctionnent.
//
// D'où trois règles, tenues par le code et pas par la bonne volonté :
//
// 1. UN SEUL ÉCRAN. Pas d'enchaînement, pas de « es-tu sûr » répété. On
//    demande une fois, on propose une fois.
//
// 2. LA SORTIE EST TOUJOURS VISIBLE, dès l'ouverture, sans avoir à répondre à
//    quoi que ce soit. Le motif est facultatif : on n'échange pas une
//    résiliation contre une réponse à un questionnaire.
//
// 3. ON NE RÉSILIE PAS À SA PLACE, et on ne peut pas. La boutique détient
//    l'abonnement ; on ouvre sa page. Prétendre le faire ici laisserait des
//    gens convaincus d'avoir résilié alors qu'ils seraient prélevés.
//
// CE QU'ON PROPOSE EN RETOUR n'est pas une remise arrachée. C'est une réponse
// au motif : trop cher → une formule moins chère existe ; je ne m'en sers pas
// → voici ce que tu n'as peut-être pas vu. Si la réponse ne convient pas, la
// sortie est juste en dessous.

import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLang } from "../contexts/LangContext";
import type { Tier } from "../lib/entitlements";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const DANGER = "#F87171";
const BORDER = "rgba(255,255,255,0.10)";

/** Motifs proposés. `other` n'attend aucune saisie : on ne retient pas pour ça. */
export type CancelReason = "price" | "unused" | "missing" | "bug" | "other";

const REASONS: { id: CancelReason; icon: keyof typeof Feather.glyphMap }[] = [
  { id: "price", icon: "credit-card" },
  { id: "unused", icon: "moon" },
  { id: "missing", icon: "search" },
  { id: "bug", icon: "alert-triangle" },
  { id: "other", icon: "more-horizontal" },
];

/**
 * Réponse proposée pour chaque motif.
 *
 * `downgrade` n'est proposé que s'il existe une formule moins chère : suggérer
 * de « passer à moins cher » à quelqu'un déjà au minimum est une insulte à son
 * intelligence, et ça décrédibilise tout le reste de l'écran.
 */
function offerFor(reason: CancelReason, tier: Tier): "downgrade" | "help" | "write" | null {
  if (reason === "price") return tier === "solo" ? null : "downgrade";
  if (reason === "unused") return "help";
  if (reason === "bug" || reason === "missing") return "write";
  return null;
}

export function CancelSheet({
  visible,
  tier,
  onClose,
  onDowngrade,
  onContinue,
  onWrite,
}: {
  visible: boolean;
  tier: Tier;
  onClose: () => void;
  /** Emmène vers l'écran des formules, sur une formule moins chère. */
  onDowngrade: () => void;
  /** Ouvre la page de gestion de la boutique. La vraie sortie. */
  onContinue: () => void;
  /** Ouvre un message vers le support. */
  onWrite: () => void;
}) {
  const { t } = useLang();
  const [reason, setReason] = useState<CancelReason | null>(null);

  const offer = reason ? offerFor(reason, tier) : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.grabber} />

          <Text style={s.title}>{t("cancel.title")}</Text>
          <Text style={s.sub}>{t("cancel.sub")}</Text>

          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
            {REASONS.map((r) => {
              const active = reason === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[s.reason, active && s.reasonOn]}
                  onPress={() => setReason(active ? null : r.id)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  testID={`cancel-reason-${r.id}`}
                >
                  <Feather name={r.icon} size={16} color={active ? GOLD : TEXT_3} />
                  <Text style={[s.reasonText, active && { color: TEXT_1 }]}>
                    {t(`cancel.reason.${r.id}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {offer ? (
              <View style={s.offer}>
                <Text style={s.offerTitle}>{t(`cancel.offer.${offer}.title`)}</Text>
                <Text style={s.offerBody}>{t(`cancel.offer.${offer}.body`)}</Text>
                <TouchableOpacity
                  style={s.offerBtn}
                  onPress={offer === "downgrade" ? onDowngrade : offer === "write" ? onWrite : onClose}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  testID={`cancel-offer-${offer}`}
                >
                  <Text style={s.offerBtnText}>{t(`cancel.offer.${offer}.cta`)}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>

          {/* LA SORTIE. Toujours visible, dès l'ouverture, sans condition. */}
          <TouchableOpacity
            style={s.continueBtn}
            onPress={onContinue}
            activeOpacity={0.8}
            accessibilityRole="button"
            testID="cancel-continue"
          >
            <Text style={s.continueText}>{t("cancel.continue")}</Text>
          </TouchableOpacity>

          <Text style={s.note}>{t("cancel.note")}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "88%",
    backgroundColor: MIDNIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { color: TEXT_1, fontSize: 19, fontWeight: "800" },
  sub: { color: TEXT_2, fontSize: 13.5, lineHeight: 19, marginTop: 6, marginBottom: 16 },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 13,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    marginBottom: 8,
  },
  reasonOn: { borderColor: "rgba(74,222,128,0.45)" },
  reasonText: { flex: 1, color: TEXT_2, fontSize: 13.5 },
  offer: {
    marginTop: 8,
    marginBottom: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
    backgroundColor: "rgba(74,222,128,0.06)",
  },
  offerTitle: { color: TEXT_1, fontSize: 15, fontWeight: "800", marginBottom: 5 },
  offerBody: { color: TEXT_2, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  offerBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  offerBtnText: { color: "#04140B", fontSize: 14, fontWeight: "800" },
  continueBtn: { alignItems: "center", paddingVertical: 15, marginTop: 6 },
  continueText: { color: DANGER, fontSize: 14.5, fontWeight: "700" },
  note: { color: TEXT_3, fontSize: 11, lineHeight: 16, textAlign: "center" },
});
