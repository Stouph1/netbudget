// Ce qu'on montre quand quelqu'un veut supprimer son compte.
//
// MÊMES RÈGLES que la résiliation (voir CancelSheet) : un seul écran, la
// sortie visible dès l'ouverture, le motif facultatif. Supprimer son compte
// est un droit (RGPD art. 17), pas une faveur qu'on négocie.
//
// CE QUI CHANGE : il n'y a rien à « proposer en retour ». On ne vend pas de
// formule à quelqu'un qui part. On dit trois choses, et c'est tout :
//  - qu'on est triste, sincèrement, et sans en faire une scène ;
//  - exactement ce qui sera effacé, et ce qui restera sur le téléphone ;
//  - que le motif nous aide, s'il veut bien le donner.
//
// La confirmation finale (irréversible) reste dans la modale de confirmation
// classique, ouverte par l'écran parent : c'est elle qui supprime.

import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useLang } from "../contexts/LangContext";
import { useAccent } from "../contexts/ThemeContext";
import { useKeyboardLift, useSheetBottom } from "../hooks/useSheetBottom";
import { DELETE_REASONS, DETAILS_MAX, type DepartureReason } from "../lib/departure";
import { alpha } from "../theme/accents";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const DANGER = "#F87171";
const BORDER = "rgba(255,255,255,0.10)";

const ICONS: Record<DepartureReason, keyof typeof Feather.glyphMap> = {
  price: "credit-card",
  unused: "moon",
  missing: "search",
  bug: "alert-triangle",
  privacy: "shield",
  other: "more-horizontal",
};

export function DeleteAccountSheet({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  /** La personne a choisi de continuer. Le parent affiche la confirmation finale. */
  onConfirm: (feedback: { reason: DepartureReason | null; details: string }) => void;
}) {
  const GOLD = useAccent().main;
  const s = useMemo(() => makeS(GOLD), [GOLD]);
  const { t } = useLang();
  const sheetBottom = useSheetBottom(28);
  const lift = useKeyboardLift();
  const [reason, setReason] = useState<DepartureReason | null>(null);
  const [details, setDetails] = useState("");

  function close() {
    setReason(null);
    setDetails("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={s.backdrop} onPress={close}>
        <Pressable
          style={[s.sheet, { paddingBottom: Math.max(sheetBottom, lift) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={s.grabber} />

          <Text style={s.title}>{t("leave.title")}</Text>
          <Text style={s.sub}>{t("leave.sad")}</Text>

          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Ce qui part, ce qui reste : dit avant, pas après. */}
            <View style={s.facts}>
              <Fact icon="trash-2" color={DANGER} text={t("leave.fact.cloud")} />
              <Fact icon="users" color={DANGER} text={t("leave.fact.spaces")} />
              <Fact icon="smartphone" color={GOLD} text={t("leave.fact.local")} />
              <Fact icon="repeat" color={GOLD} text={t("leave.fact.subscription")} />
            </View>

            <Text style={s.ask}>{t("leave.ask")}</Text>
            {DELETE_REASONS.map((r) => {
              const active = reason === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[s.reason, active && s.reasonOn]}
                  onPress={() => setReason(active ? null : r)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  testID={`leave-reason-${r}`}
                >
                  <Feather name={ICONS[r]} size={16} color={active ? GOLD : TEXT_3} />
                  <Text style={[s.reasonText, active && { color: TEXT_1 }]}>{t(`leave.reason.${r}`)}</Text>
                </TouchableOpacity>
              );
            })}

            <TextInput
              value={details}
              onChangeText={(v) => setDetails(v.slice(0, DETAILS_MAX))}
              placeholder={t("leave.details.placeholder")}
              placeholderTextColor={TEXT_3}
              multiline
              maxLength={DETAILS_MAX}
              style={s.details}
              accessibilityLabel={t("leave.details.placeholder")}
              testID="leave-details"
            />
            <Text style={s.counter}>
              {details.length}/{DETAILS_MAX}
            </Text>
          </ScrollView>

          {/* LA SORTIE. Toujours visible, sans condition. */}
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => onConfirm({ reason, details })}
            activeOpacity={0.8}
            accessibilityRole="button"
            testID="leave-continue"
          >
            <Text style={s.deleteText}>{t("leave.continue")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.stayBtn}
            onPress={close}
            activeOpacity={0.8}
            accessibilityRole="button"
            testID="leave-stay"
          >
            <Text style={s.stayText}>{t("leave.stay")}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Fact({ icon, color, text }: { icon: keyof typeof Feather.glyphMap; color: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
      <Feather name={icon} size={15} color={color} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, color: TEXT_2, fontSize: 13, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

const makeS = (GOLD: string) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
    sheet: {
      maxHeight: "90%",
      backgroundColor: MIDNIGHT,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 10,
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
    sub: { color: TEXT_2, fontSize: 13.5, lineHeight: 19, marginTop: 6, marginBottom: 14 },
    facts: {
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: SURFACE,
      marginBottom: 16,
    },
    ask: { color: TEXT_1, fontSize: 14, fontWeight: "700", marginBottom: 10 },
    reason: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      paddingVertical: 12,
      paddingHorizontal: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: SURFACE,
      marginBottom: 8,
    },
    reasonOn: { borderColor: alpha(GOLD, 0.45) },
    reasonText: { flex: 1, color: TEXT_2, fontSize: 13.5 },
    details: {
      minHeight: 72,
      textAlignVertical: "top",
      color: TEXT_1,
      fontSize: 13.5,
      lineHeight: 19,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: SURFACE,
      marginTop: 4,
    },
    counter: { color: TEXT_3, fontSize: 11, textAlign: "right", marginTop: 4, marginBottom: 4 },
    deleteBtn: {
      alignItems: "center",
      paddingVertical: 14,
      marginTop: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: alpha(DANGER, 0.5),
    },
    deleteText: { color: DANGER, fontSize: 14.5, fontWeight: "800" },
    stayBtn: { alignItems: "center", paddingVertical: 14, marginTop: 6, borderRadius: 14, backgroundColor: GOLD },
    stayText: { color: "#04140B", fontSize: 14.5, fontWeight: "800" },
  });
