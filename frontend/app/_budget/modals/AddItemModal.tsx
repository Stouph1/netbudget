// Ajout d'une catégorie de dépense personnalisée dans une famille.
import { useBudgetTheme } from "../useBudgetTheme";
import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
import { MonthChips } from "./MonthChips";
import EmojiPicker from "./EmojiPicker";
import type { ExpenseFamily, Translate } from "../types";

export default function AddItemModal({
  family,
  newItemLabel,
  newItemAmount,
  newItemMonths,
  newItemEmoji,
  currency,
  sheetHeight,
  keyboardVerticalOffset,
  t,
  onLabelChange,
  onAmountChange,
  onMonthsChange,
  onEmojiPicked,
  onSave,
  onClose,
}: {
  /** Famille visée — `null` ferme la modale (c'est l'état d'ouverture). */
  family: ExpenseFamily | null;
  newItemLabel: string;
  newItemAmount: string;
  /** Mois où la dépense s'applique ; `undefined` = toute l'année. */
  newItemMonths: number[] | undefined;
  /** Emoji deviné depuis le nom, ou choisi. */
  newItemEmoji: string | null;
  currency: CurrencyCode;
  sheetHeight: number;
  keyboardVerticalOffset: number;
  t: Translate;
  onLabelChange: (next: string) => void;
  onAmountChange: (next: string) => void;
  onMonthsChange: (next: number[] | undefined) => void;
  /** La personne a choisi un emoji dans la grille. */
  onEmojiPicked: (emoji: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { styles, GOLD, sheetBottom, sheetTop } = useBudgetTheme();
  // La grille est rendue ICI, dans la modale : sur iOS, une modale ouverte
  // depuis l'extérieur de la modale parente reste invisible derrière elle.
  const [pickerOpen, setPickerOpen] = useState(false);
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
          behavior="padding"
          keyboardVerticalOffset={keyboardVerticalOffset}
          style={{ flex: 1, justifyContent: "flex-end", paddingTop: sheetTop }}
          pointerEvents="box-none"
        >
          <View style={[styles.sheet, { height: sheetHeight, paddingBottom: sheetBottom }]}>
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
                icon={
                  <TouchableOpacity onPress={() => setPickerOpen(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("emoji.title")} testID="new-item-emoji">
                    {newItemEmoji ? <Text style={{ fontSize: 20 }}>{newItemEmoji}</Text> : <Feather name="tag" size={18} color={GOLD} />}
                  </TouchableOpacity>
                }
                value={newItemLabel}
                onChangeText={onLabelChange}
                placeholder={t("newCategoryName")}
                testID="new-item-label"
              />
              <Text style={[styles.familySub, { marginTop: -4, marginBottom: 10 }]}>{t("emoji.hint")}</Text>
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
              <Text style={[styles.sectionSubtitle, { marginTop: 14 }]}>{t("period.title")}</Text>
              <MonthChips months={newItemMonths} onChange={onMonthsChange} t={t} testID="new-item-period" />
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
      <EmojiPicker
        visible={pickerOpen}
        current={newItemEmoji ?? undefined}
        t={t}
        onPick={onEmojiPicked}
        onClose={() => setPickerOpen(false)}
      />
    </Modal>
  );
}
