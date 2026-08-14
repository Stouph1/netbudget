// Feuille de sélection de la langue de l'app (Réglages).
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Lang, LANGUAGES } from "../../../src/i18n/translations";
import { GOLD, TEXT_2 } from "../constants";
import { styles } from "../styles";
import type { Translate } from "../types";

export default function LanguageSheetModal({
  visible,
  lang,
  sheetHeight,
  t,
  onSelect,
  onClose,
}: {
  visible: boolean;
  lang: Lang;
  sheetHeight: number;
  t: Translate;
  onSelect: (next: Lang) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { height: sheetHeight }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t("modal.chooseLanguage")}</Text>
            <TouchableOpacity onPress={onClose} testID="close-lang-picker">
              <Feather name="x" size={22} color={TEXT_2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {LANGUAGES.map((l) => {
              const active = l.code === lang;
              return (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.currencyRow, active && styles.currencyRowActive]}
                  onPress={() => onSelect(l.code)}
                  testID={`lang-option-${l.code}`}
                  activeOpacity={0.85}
                >
                  <Text style={styles.currencyFlag}>{l.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currencyName}>{l.label}</Text>
                    <Text style={styles.currencyMeta}>{l.code.toUpperCase()}</Text>
                  </View>
                  {active && <Feather name="check" size={18} color={GOLD} style={{ marginLeft: 10 }} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
