// Ajout d'une catégorie de dépense personnalisée dans une famille.
import React from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { CurrencyCode, getCurrency } from "../../../src/utils/currency";
import { GOLD, TEXT_2 } from "../constants";
import { styles } from "../styles";
import { Field } from "../ui";
import type { ExpenseFamily, Translate } from "../types";

export default function AddItemModal({
  family,
  newItemLabel,
  newItemAmount,
  currency,
  sheetHeight,
  keyboardVerticalOffset,
  t,
  onLabelChange,
  onAmountChange,
  onSave,
  onClose,
}: {
  /** Famille visée — `null` ferme la modale (c'est l'état d'ouverture). */
  family: ExpenseFamily | null;
  newItemLabel: string;
  newItemAmount: string;
  currency: CurrencyCode;
  sheetHeight: number;
  keyboardVerticalOffset: number;
  t: Translate;
  onLabelChange: (next: string) => void;
  onAmountChange: (next: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={family !== null}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => { Keyboard.dismiss(); onClose(); }}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
          style={{ width: "100%" }}
        >
          <View style={[styles.sheet, { height: sheetHeight }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {t("btn.add")} ·{" "}
                {family === "epargne"
                  ? t("family.epargne.short")
                  : family
                    ? t(`family.${family}.label`)
                    : ""}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                testID="close-add-item"
              >
                <Feather name="x" size={22} color={TEXT_2} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Field
                label={t("income.name")}
                icon={<Feather name="tag" size={18} color={GOLD} />}
                value={newItemLabel}
                onChangeText={onLabelChange}
                placeholder={t("newCategoryName")}
                testID="new-item-label"
              />
              <Field
                label={`${t("converter.amount")} · ${t("freq.monthly")}`}
                icon={<Text style={styles.euroIcon}>{getCurrency(currency).symbol}</Text>}
                right={getCurrency(currency).symbol}
                value={newItemAmount}
                onChangeText={onAmountChange}
                keyboardType="decimal-pad"
                placeholder="0"
                testID="new-item-amount"
              />
            </ScrollView>
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                onPress={onSave}
                style={styles.primaryBtn}
                testID="save-new-item"
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>{t("btn.add")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
