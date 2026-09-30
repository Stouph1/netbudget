// Modifier la période d'une dépense déjà saisie.
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { TEXT_2 } from "../constants";
import { useBudgetTheme } from "../useBudgetTheme";
import type { ExpenseItem, Translate } from "../types";
import { MonthChips } from "./MonthChips";

export default function PeriodModal({
  item,
  t,
  onSave,
  onClose,
}: {
  /** Poste en cours d'édition ; `null` ferme la modale. */
  item: ExpenseItem | null;
  t: Translate;
  onSave: (id: string, months: number[] | undefined) => void;
  onClose: () => void;
}) {
  const { styles, sheetBottom } = useBudgetTheme();
  const [months, setMonths] = useState<number[] | undefined>(undefined);
  useEffect(() => {
    if (item) setMonths(item.activeMonths);
  }, [item]);
  return (
    <Modal visible={item !== null} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: sheetBottom }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {t("period.title")} · {item?.label ?? ""}
            </Text>
            <TouchableOpacity onPress={onClose} testID="close-period" accessibilityRole="button">
              <Feather name="x" size={22} color={TEXT_2} />
            </TouchableOpacity>
          </View>
          <MonthChips months={months} onChange={setMonths} t={t} />
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              onPress={() => {
                if (item) onSave(item.id, months);
                onClose();
              }}
              style={styles.primaryBtn}
              testID="save-period"
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{t("btn.save")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
