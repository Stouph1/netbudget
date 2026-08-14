// Feuille de sélection d'une devise.
//
// Partagée par les DEUX points d'entrée (Réglages et Convertisseur) : même
// liste, même rendu ; seuls le titre et les testID changent.
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
import { CURRENCIES, CurrencyCode } from "../../../src/utils/currency";
import { GOLD, TEXT_2 } from "../constants";
import { styles } from "../styles";

export default function CurrencySheetModal({
  visible,
  title,
  selected,
  sheetHeight,
  closeTestID,
  optionTestIDPrefix,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  selected: CurrencyCode;
  sheetHeight: number;
  closeTestID: string;
  optionTestIDPrefix: string;
  onSelect: (code: CurrencyCode) => void;
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
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} testID={closeTestID}>
              <Feather name="x" size={22} color={TEXT_2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {CURRENCIES.map((c) => {
              const active = c.code === selected;
              return (
                <TouchableOpacity
                  key={c.code}
                  style={[styles.currencyRow, active && styles.currencyRowActive]}
                  onPress={() => onSelect(c.code)}
                  testID={`${optionTestIDPrefix}${c.code}`}
                  activeOpacity={0.85}
                >
                  <View style={[styles.currencySymbolBig, { marginRight: 12 }]}>
                    <Text style={styles.currencySymbolBigText}>{c.symbol}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currencyName}>{c.name}</Text>
                    <Text style={styles.currencyMeta}>{c.flag} {c.code}</Text>
                  </View>
                  {active && (
                    <Feather name="check" size={18} color={GOLD} style={{ marginLeft: 10 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
