// Ajout / édition d'une source de revenu.
import { useBudgetTheme } from "../useBudgetTheme";
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
import { InfoTip } from "../../../src/components/InfoTip";
import { interpolate } from "../../../src/utils/advice";
import type { Translate } from "../types";
import { switchStyle } from "../../../src/theme/controls";

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
  const { styles, GOLD, sheetBottom, sheetTop } = useBudgetTheme();
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
          behavior="padding"
          keyboardVerticalOffset={keyboardVerticalOffset}
          style={{ flex: 1, justifyContent: "flex-end", paddingTop: sheetTop }}
          pointerEvents="box-none"
        >
          <View style={[styles.sheet, { height: sheetHeight, paddingBottom: sheetBottom }]}>
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
                info={{ title: t("help.incomeType.title"), body: t("help.incomeType.body") }}
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
                info={{ title: t("help.incomeAmount.title"), body: t("help.incomeAmount.body") }}
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
                info={{ title: t("help.incomeFrequency.title"), body: t("help.incomeFrequency.body") }}
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
              {incomeForm.frequency !== "monthOnce" ? (
                // Mois perçus. Une bourse court sur dix mois, un salaire saisonnier
                // sur quatre : sans ce choix, l'app étalait sur douze et le budget
                // mentait deux mois par an.
                <View style={[styles.toggleRow, { flexDirection: "column", alignItems: "stretch" }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.labelRow, { flex: 1 }]}>
                      <Text style={[styles.toggleLabel, { flexShrink: 1 }]}>{t("income.activeMonths")}</Text>
                      <InfoTip title={t("help.activeMonths.title")} body={t("help.activeMonths.body")} testID="income-months-info" />
                    </View>
                    <Text style={{ color: TEXT_2, fontSize: 13, fontWeight: "700" }}>
                      {interpolate(t("income.activeMonthsCount"), { n: incomeForm.activeMonths ? incomeForm.activeMonths.length : 12 })}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {MONTH_KEYS_SHORT.map((key, i) => {
                      const on = !incomeForm.activeMonths || incomeForm.activeMonths.includes(i);
                      return (
                        <TouchableOpacity
                          key={i}
                          onPress={() =>
                            setIncomeForm((f) => {
                              const cur = f.activeMonths ?? Array.from({ length: 12 }, (_, k) => k);
                              const next = cur.includes(i) ? cur.filter((m) => m !== i) : [...cur, i].sort((a, b) => a - b);
                              // Aucun mois coché : on refuse, un revenu jamais perçu n'existe pas.
                              if (next.length === 0) return f;
                              return { ...f, activeMonths: next.length === 12 ? undefined : next };
                            })
                          }
                          style={[styles.distribPill, on && styles.distribPillActive, { paddingHorizontal: 11 }]}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                          testID={`income-active-month-${i}`}
                        >
                          <Text style={[styles.distribPillText, on && styles.distribPillTextActive]}>{t(key)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {incomeForm.activeMonths ? (
                    <TouchableOpacity
                      onPress={() => setIncomeForm((f) => ({ ...f, activeMonths: undefined }))}
                      style={{ alignSelf: "flex-start", marginTop: 8 }}
                      accessibilityRole="button"
                    >
                      <Text style={{ color: GOLD, fontSize: 13, fontWeight: "700" }}>{t("income.activeMonthsAll")}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
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
                    info={{ title: t("help.proStatus.title"), body: t("help.proStatus.body") }}
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
                    info={{ title: t("help.timeMode.title"), body: t("help.timeMode.body") }}
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
                info={{ title: t("help.charges.title"), body: t("help.charges.body") }}
                icon={<Feather name="percent" size={18} color={GOLD} />}
                right="%"
                value={incomeForm.chargesPercent}
                onChangeText={(v) => setIncomeForm((f) => ({ ...f, chargesPercent: v }))}
                keyboardType="decimal-pad"
                placeholder="0"
                hintText={TYPE_HINT[incomeForm.type]}
                testID="income-charges"
              />

              {/* Dons — visible seulement si activé dans le profil. Une seule
                  carte : le choix du montant (interrupteur) et, dessous, la base
                  de calcul — net ou brut — en deux segments égaux. */}
              {tithePercent > 0 ? (
                <View style={[styles.toggleRow, { flexDirection: "column", alignItems: "stretch" }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Feather
                      name="heart"
                      size={20}
                      color={incomeForm.titheApplied ? GOLD : TEXT_3}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={styles.labelRow}>
                        <Text style={[styles.toggleLabel, { flexShrink: 1 }]}>
                          {interpolate(t("income.titheToggle"), { pct: tithePercent })}
                        </Text>
                        <InfoTip title={t("help.tithe.title")} body={t("help.tithe.body")} testID="income-tithe-info" />
                      </View>
                      <Text style={{ color: TEXT_3, fontSize: 12, marginTop: 2 }}>
                        {t("income.titheHint")}
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
                      style={switchStyle}
                    />
                  </View>
                  {incomeForm.titheApplied ? (
                    <View style={styles.segmentRow} accessibilityRole="radiogroup">
                      {(["net", "gross"] as const).map((b) => {
                        const on = (incomeForm.titheBase ?? "net") === b;
                        return (
                          <TouchableOpacity
                            key={b}
                            onPress={() => setIncomeForm((f) => ({ ...f, titheBase: b }))}
                            style={[styles.segment, on && styles.segmentOn]}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: on }}
                            testID={`income-tithe-base-${b}`}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                              {t(`income.titheBase.${b}Full`)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
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
