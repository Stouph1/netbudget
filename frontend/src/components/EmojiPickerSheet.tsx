// Choisir un pictogramme : une grille, un geste. Partagé par les espaces, les
// objectifs d'épargne et les projets (le budget a sa version dans son thème).
import { Feather } from "@expo/vector-icons";
import { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLang } from "../contexts/LangContext";
import { useAccent } from "../contexts/ThemeContext";
import { useSheetBottom } from "../hooks/useSheetBottom";
import { EMOJI_CHOICES } from "../lib/expenseEmoji";

const MIDNIGHT = "#0F172A";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const BORDER = "rgba(255,255,255,0.10)";

export function EmojiPickerSheet({
  visible,
  current,
  onPick,
  onClose,
}: {
  visible: boolean;
  current?: string | null;
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const GOLD = useAccent().main;
  const s = useMemo(() => makeS(GOLD), [GOLD]);
  const { t } = useLang();
  const sheetBottom = useSheetBottom(28);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[s.sheet, { paddingBottom: sheetBottom }]}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title}>{t("emoji.title")}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("common.close")} testID="close-emoji">
              <Feather name="x" size={22} color={TEXT_2} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
            {EMOJI_CHOICES.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => {
                  onPick(e);
                  onClose();
                }}
                style={[s.cell, e === current && { borderColor: GOLD, backgroundColor: "rgba(255,255,255,0.06)" }]}
                accessibilityRole="button"
                accessibilityLabel={e}
                testID={`emoji-${e}`}
              >
                <Text style={s.cellText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Pastille cliquable qui montre le pictogramme courant, ou une icône si aucun. */
export function EmojiChip({
  emoji,
  onPress,
  size = 44,
  testID,
}: {
  emoji?: string | null;
  onPress: () => void;
  size?: number;
  testID?: string;
}) {
  const GOLD = useAccent().main;
  const { t } = useLang();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ width: size, height: size, borderRadius: size * 0.3, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.04)" }}
      accessibilityRole="button"
      accessibilityLabel={t("emoji.title")}
      testID={testID}
    >
      {emoji ? <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text> : <Feather name="smile" size={size * 0.42} color={GOLD} />}
    </TouchableOpacity>
  );
}

const makeS = (_GOLD: string) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
    sheet: { maxHeight: "72%", backgroundColor: MIDNIGHT, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: "center", marginBottom: 14 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    title: { color: TEXT_1, fontSize: 18, fontWeight: "800" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 6, paddingBottom: 12 },
    cell: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER, backgroundColor: "rgba(255,255,255,0.03)" },
    cellText: { fontSize: 26 },
  });
