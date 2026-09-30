// Choisir l'emoji d'un poste. Une grille, un geste.
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { TEXT_2 } from "../constants";
import { useBudgetTheme } from "../useBudgetTheme";
import type { Translate } from "../types";
import { EMOJI_CHOICES } from "../../../src/lib/expenseEmoji";

export default function EmojiPicker({
  visible,
  current,
  t,
  onPick,
  onClose,
}: {
  visible: boolean;
  current?: string;
  t: Translate;
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const { styles, GOLD, sheetBottom } = useBudgetTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: sheetBottom, maxHeight: "70%" }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t("emoji.title")}</Text>
            <TouchableOpacity onPress={onClose} testID="close-emoji" accessibilityRole="button">
              <Feather name="x" size={22} color={TEXT_2} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.emojiGrid} showsVerticalScrollIndicator={false}>
            {EMOJI_CHOICES.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => {
                  onPick(e);
                  onClose();
                }}
                style={[styles.emojiCell, e === current && { borderColor: GOLD, backgroundColor: "rgba(255,255,255,0.06)" }]}
                accessibilityRole="button"
                accessibilityLabel={e}
                testID={`emoji-${e}`}
              >
                <Text style={styles.emojiCellText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
