// Un mois, ses revenus : ce que l'on touche vraiment CE mois-là.
//
// Le budget étalait chaque revenu à l'identique sur douze mois. Or un mois
// n'est pas l'autre : une prime en juin, une mission qui saute en août, une
// bourse qui s'arrête en juillet. Ici, on tape sur un mois et l'on ajuste
// chaque source pour lui seul — le reste de l'année ne bouge pas. Le montant
// saisi est un BRUT (avant charges), comme dans le formulaire du revenu ; la
// ligne du bas montre le net qui en résulte.
import React from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { InfoTip } from "../../../src/components/InfoTip";
import { interpolate } from "../../../src/utils/advice";
import { CurrencyCode, formatCurrency, getCurrency } from "../../../src/utils/currency";
import {
  defaultGrossForMonth,
  isMonthActive,
  monthlyNetForSource,
  type IncomeSource,
} from "../../../src/utils/income";
import { BORDER, MONTH_KEYS_LONG, TEXT_2, TEXT_3 } from "../constants";
import { useBudgetTheme } from "../useBudgetTheme";
import type { Translate } from "../types";
import { switchStyle } from "../../../src/theme/controls";

export default function MonthEditorModal({
  monthIndex,
  incomes,
  tithePercent,
  currency,
  sheetHeight,
  keyboardVerticalOffset,
  t,
  onChange,
  onClose,
}: {
  /** null = fermé. */
  monthIndex: number | null;
  incomes: IncomeSource[];
  tithePercent: number;
  currency: CurrencyCode;
  sheetHeight: number;
  keyboardVerticalOffset: number;
  t: Translate;
  onChange: (next: IncomeSource[]) => void;
  onClose: () => void;
}) {
  const { styles, GOLD, sheetBottom, sheetTop } = useBudgetTheme();
  const visible = monthIndex !== null;
  const m = monthIndex ?? 0;
  const fmt = (v: number) => formatCurrency(v, currency);
  const symbol = getCurrency(currency).symbol;

  const update = (id: string, patch: (s: IncomeSource) => IncomeSource) =>
    onChange(incomes.map((s) => (s.id === id ? patch(s) : s)));

  const setOverride = (s: IncomeSource, raw: string) =>
    update(s.id, (src) => {
      const next = { ...(src.monthOverrides ?? {}) };
      if (raw.trim() === "") delete next[String(m)];
      else next[String(m)] = raw;
      return { ...src, monthOverrides: Object.keys(next).length ? next : undefined };
    });

  const setReceived = (s: IncomeSource, on: boolean) =>
    update(s.id, (src) => {
      const all = Array.from({ length: 12 }, (_, k) => k);
      const cur = src.activeMonths ?? all;
      const next = on ? [...new Set([...cur, m])].sort((a, b) => a - b) : cur.filter((k) => k !== m);
      if (next.length === 0) return src; // jamais perçu : refusé, voir IncomeModal
      return { ...src, activeMonths: next.length === 12 ? undefined : next };
    });

  const netTotal = incomes.reduce((sum, s) => sum + monthlyNetForSource(s, m, tithePercent), 0);
  const monthName = t(MONTH_KEYS_LONG[m]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={keyboardVerticalOffset}
          style={{ flex: 1, justifyContent: "flex-end", paddingTop: sheetTop }}
          pointerEvents="box-none"
        >
          <View style={[styles.sheet, { height: sheetHeight, paddingBottom: sheetBottom }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={[styles.labelRow, { flex: 1 }]}>
                <Text style={[styles.sheetTitle, { flexShrink: 1 }]}>
                  {interpolate(t("month.editor.title"), { month: monthName })}
                </Text>
                <InfoTip title={t("help.monthEditor.title")} body={t("help.monthEditor.body")} />
              </View>
              <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }} testID="close-month-editor" hitSlop={10}>
                <Feather name="x" size={22} color={TEXT_2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldHint}>{t("month.editor.hint")}</Text>
              {incomes.map((s) => {
                const received = isMonthActive(s, m);
                const once = s.frequency === "monthOnce";
                const override = s.monthOverrides?.[String(m)] ?? "";
                const suggested = defaultGrossForMonth(s, m);
                return (
                  <View key={s.id} style={[styles.toggleRow, { flexDirection: "column", alignItems: "stretch", marginTop: 10 }]} testID={`month-editor-${s.id}`}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.toggleLabel}>{s.label || t(`incomeType.${s.type}`)}</Text>
                        <Text style={{ color: TEXT_3, fontSize: 12, marginTop: 2 }}>
                          {received
                            ? interpolate(t("month.editor.net"), { amount: fmt(monthlyNetForSource(s, m, tithePercent)) })
                            : t("month.editor.notReceived")}
                        </Text>
                      </View>
                      {once ? null : (
                        <Switch
                          value={received}
                          onValueChange={(v) => setReceived(s, v)}
                          trackColor={{ false: BORDER, true: GOLD }}
                          thumbColor="#fff"
                          ios_backgroundColor={BORDER}
                          accessibilityLabel={t("month.editor.received")}
                          testID={`month-editor-received-${s.id}`}
                          style={switchStyle}
                        />
                      )}
                    </View>
                    {received ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                        <Text style={[styles.inputLabel, { flex: 1, marginBottom: 0 }]}>{t("month.editor.override")}</Text>
                        <TextInput
                          value={override}
                          onChangeText={(v) => setOverride(s, v)}
                          keyboardType="decimal-pad"
                          placeholder={String(Math.round(suggested * 100) / 100)}
                          placeholderTextColor={TEXT_3}
                          returnKeyType="done"
                          style={{
                            minWidth: 110, textAlign: "right", color: "#FFFFFF", fontSize: 16, fontWeight: "700",
                            paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1,
                            borderColor: override ? GOLD : BORDER,
                          }}
                          testID={`month-editor-amount-${s.id}`}
                        />
                        <Text style={styles.toggleLabel}>{symbol}</Text>
                        {override ? (
                          <TouchableOpacity onPress={() => setOverride(s, "")} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("month.editor.reset")}>
                            <Feather name="rotate-ccw" size={16} color={GOLD} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
            <View style={[styles.sheetFooter, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
              <Text style={styles.toggleLabel}>{t("month.editor.total")}</Text>
              <Text style={[styles.toggleLabel, { color: GOLD, fontSize: 18, fontWeight: "800" }]} testID="month-editor-total">{fmt(netTotal)}</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
