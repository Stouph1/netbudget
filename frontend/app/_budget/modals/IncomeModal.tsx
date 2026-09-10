// Ajout / édition d'une source de revenu.
import React from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  IncomeFrequency,
  IncomeSource,
  IncomeType,
  ProStatus,
  STATUS_DEFAULT_CHARGES,
  STATUS_LABEL,
  TYPE_HINT,
  TYPE_ICON,
  TYPE_LABEL,
} from "../../../src/utils/income";
import { CurrencyCode, getCurrency } from "../../../src/utils/currency";
import { BORDER, GOLD, MONTH_KEYS_SHORT, TEXT_2, TEXT_3 } from "../constants";
import { styles } from "../styles";
import { Dropdown, Field } from "../ui";
import type { Translate } from "../types";

export default function IncomeModal({
  visible,
  editingIncome,
  incomeForm,
  setIncomeForm,
  currency,
  tithePercent,
  sheetHeight,
  keyboardVerticalOffset,
  t,
  onChangeType,
  onChangeProStatus,
  onSave,
  onClose,
}: {
  visible: boolean;
  editingIncome: IncomeSource | null;
  incomeForm: IncomeSource;
  setIncomeForm: React.Dispatch<React.SetStateAction<IncomeSource>>;
  currency: CurrencyCode;
  tithePercent: number;
  sheetHeight: number;
  keyboardVerticalOffset: number;
  t: Translate;
  onChangeType: (next: IncomeType) => void;
  onChangeProStatus: (next: ProStatus) => void;
  onSave: () => void;
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
                {editingIncome ? t("modal.editIncome") : t("modal.newIncome")}
              </Text>
              <TouchableOpacity
                onPress={() => { Keyboard.dismiss(); onClose(); }}
                testID="close-income-modal"
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
              <Dropdown<IncomeType>
                label={t("income.type")}
                icon={
                  <Feather
                    name={TYPE_ICON[incomeForm.type] as keyof typeof Feather.glyphMap}
                    size={18}
                    color={GOLD}
                  />
                }
                value={incomeForm.type}
                options={(Object.keys(TYPE_LABEL) as IncomeType[]).map((code) => ({
                  value: code,
                  label: t(`incomeType.${code}`),
                  hint: t(`incomeType.${code}Hint`),
                }))}
                onChange={onChangeType}
                testID="income-type-dropdown"
              />

              <Field
                label={t("income.name")}
                icon={<Feather name="tag" size={18} color={GOLD} />}
                value={incomeForm.label}
                onChangeText={(v) => setIncomeForm((f) => ({ ...f, label: v }))}
                placeholder={t(`incomeType.${incomeForm.type}`)}
                testID="income-label"
              />

              <Field
                label={t("income.amount")}
                icon={<Text style={styles.euroIcon}>{getCurrency(currency).symbol}</Text>}
                right={getCurrency(currency).symbol}
                value={incomeForm.amount}
                onChangeText={(v) => setIncomeForm((f) => ({ ...f, amount: v }))}
                keyboardType="decimal-pad"
                placeholder="0"
                testID="income-amount"
              />

              <Dropdown<IncomeFrequency>
                label={t("income.frequency")}
                icon={<Feather name="calendar" size={18} color={GOLD} />}
                value={incomeForm.frequency}
                options={[
                  { value: "monthly", label: t("freq.monthly"), hint: t("freq.monthlyHint") },
                  { value: "annual", label: t("freq.annual"), hint: t("freq.annualHint") },
                  { value: "monthOnce", label: t("freq.monthOnce"), hint: t("freq.monthOnceHint") },
                  { value: "daily", label: t("freq.daily"), hint: t("freq.dailyHint") },
                ]}
                onChange={(next) =>
                  setIncomeForm((f) => ({
                    ...f,
                    frequency: next,
                    variableMonth: next === "monthOnce" ? f.variableMonth ?? 11 : f.variableMonth,
                  }))
                }
                testID="income-freq-dropdown"
              />
              {incomeForm.frequency === "daily" && (
                <Field
                  label={t("income.daysPerMonth")}
                  icon={<Feather name="briefcase" size={18} color={GOLD} />}
                  value={incomeForm.daysPerMonth ? String(incomeForm.daysPerMonth) : ""}
                  onChangeText={(v) => {
                    const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
                    setIncomeForm((f) => ({ ...f, daysPerMonth: Number.isFinite(n) ? Math.min(31, n) : 0 }));
                  }}
                  keyboardType="number-pad"
                  placeholder="18"
                  hintText={t("income.daysPerMonthHint")}
                  testID="income-days"
                />
              )}
              {incomeForm.frequency === "monthOnce" && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingVertical: 8, paddingHorizontal: 4 }}
                >
                  {MONTH_KEYS_SHORT.map((key, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setIncomeForm((f) => ({ ...f, variableMonth: i }))}
                      style={[styles.distribPill, incomeForm.variableMonth === i && styles.distribPillActive]}
                      testID={`income-month-${i}`}
                    >
                      <Text style={[styles.distribPillText, incomeForm.variableMonth === i && styles.distribPillTextActive]}>
                        {t(key)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {incomeForm.type === "salaire" && (
                <>
                  <Dropdown<ProStatus>
                    label={t("income.status")}
                    icon={<Feather name="briefcase" size={18} color={GOLD} />}
                    value={incomeForm.proStatus ?? "non-cadre"}
                    options={(Object.keys(STATUS_LABEL) as ProStatus[]).map((s) => ({
                      value: s,
                      label: t(`status.${s}`),
                      hint: `≈ ${STATUS_DEFAULT_CHARGES[s]} %`,
                    }))}
                    onChange={onChangeProStatus}
                    testID="income-status-dropdown"
                  />
                  <Dropdown<"plein" | "partiel">
                    label={t("income.timeMode")}
                    icon={<Feather name="clock" size={18} color={GOLD} />}
                    value={incomeForm.timeMode ?? "plein"}
                    options={[
                      { value: "plein", label: t("time.full") },
                      { value: "partiel", label: t("time.part") },
                    ]}
                    onChange={(next) => setIncomeForm((f) => ({ ...f, timeMode: next }))}
                    testID="income-time-dropdown"
                  />
                </>
              )}

              <Field
                label={t("income.charges")}
                icon={<Feather name="percent" size={18} color={GOLD} />}
                right="%"
                value={incomeForm.chargesPercent}
                onChangeText={(v) => setIncomeForm((f) => ({ ...f, chargesPercent: v }))}
                keyboardType="decimal-pad"
                placeholder="0"
                hintText={TYPE_HINT[incomeForm.type]}
                testID="income-charges"
              />

              {/* Dîme — visible seulement si activée dans le profil (Premium) */}
              {tithePercent > 0 ? (
                <View style={styles.toggleRow}>
                  <Feather
                    name="heart"
                    size={20}
                    color={incomeForm.titheApplied ? GOLD : TEXT_3}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleLabel}>
                      Réserver {tithePercent} % pour les dons
                    </Text>
                    <Text style={{ color: TEXT_3, fontSize: 12, marginTop: 2 }}>
                      Déduite du net de ce revenu.
                    </Text>
                  </View>
                  <Switch
                    value={incomeForm.titheApplied ?? false}
                    onValueChange={(v) =>
                      setIncomeForm((f) => ({ ...f, titheApplied: v }))
                    }
                    trackColor={{ false: BORDER, true: GOLD }}
                    thumbColor="#fff"
                    ios_backgroundColor={BORDER}
                  />
                </View>
              ) : null}
            </ScrollView>
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                onPress={onSave}
                style={styles.primaryBtn}
                testID="save-income"
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>
                  {editingIncome ? t("btn.save") : t("btn.add")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
