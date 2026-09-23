// Ajout / édition d'un prêt : mensualité calculée (capital, taux, durée) ou
// saisie directement, avec aperçu de l'échéancier.
import { useBudgetTheme } from "../useBudgetTheme";
import React from "react";
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
import { parseNumber } from "../../../src/utils/finance";
import { loanProgress, remainingParts } from "../../../src/utils/loanSchedule";
import { interpolate } from "../../../src/utils/advice";
import { GOLD, TEXT_2 } from "../constants";
import { formatMonthInput, loanMonthlyPayment, loanTermYears, monthInputToIso } from "../helpers";
import { styles } from "../styles";
import { Dropdown, Field } from "../ui";
import type { Loan, LoanDurationUnit, LoanMode, LoanRepayment, Translate } from "../types";

export default function LoanModal({
  visible,
  editingLoan,
  form,
  setForm,
  loanStartText,
  setLoanStartText,
  currency,
  sheetHeight,
  keyboardVerticalOffset,
  t,
  fmt,
  humanRemaining,
  onSave,
  onClose,
}: {
  visible: boolean;
  editingLoan: Loan | null;
  form: Loan;
  setForm: React.Dispatch<React.SetStateAction<Loan>>;
  loanStartText: string;
  setLoanStartText: (next: string) => void;
  currency: CurrencyCode;
  sheetHeight: number;
  keyboardVerticalOffset: number;
  t: Translate;
  fmt: (v: number) => string;
  humanRemaining: (p: Parameters<typeof remainingParts>[0]) => string;
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
                {editingLoan ? t("modal.editLoan") : t("modal.newLoan")}
              </Text>
              <TouchableOpacity
                onPress={() => { Keyboard.dismiss(); onClose(); }}
                testID="close-loan-modal"
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
                label={t("label.loanName")}
                icon={<Feather name="tag" size={18} color={GOLD} />}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder={t("loan.placeholder")}
                testID="loan-name-input"
              />

              <Dropdown<LoanMode>
                label={t("label.loanMode")}
                info={{ title: t("help.loanMode.title"), body: t("help.loanMode.body") }}
                icon={<Feather name="sliders" size={18} color={GOLD} />}
                value={form.mode ?? "computed"}
                options={[
                  { value: "computed", label: t("label.loanComputed"), hint: t("label.loanComputedHint") },
                  { value: "direct", label: t("label.loanDirect"), hint: t("label.loanDirectHint") },
                ]}
                onChange={(next) => setForm({ ...form, mode: next })}
                testID="loan-mode-dropdown"
              />

              {(form.mode ?? "computed") === "direct" ? (
                <Field
                  label={t("label.loanMonthly")}
                  info={{ title: t("help.loanDirect.title"), body: t("help.loanDirect.body") }}
                  icon={<Text style={styles.euroIcon}>{getCurrency(currency).symbol}</Text>}
                  right={`${getCurrency(currency).symbol} ${t("label.perMonth")}`}
                  value={form.directMonthly ?? "0"}
                  onChangeText={(v) => setForm({ ...form, directMonthly: v })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  hintText={t("label.loanMonthlyHint")}
                  testID="loan-direct-monthly-input"
                />
              ) : (
                <>
                  <Field
                    label={t("label.loanPrincipal")}
                    info={{ title: t("help.loanPrincipal.title"), body: t("help.loanPrincipal.body") }}
                    icon={<Text style={styles.euroIcon}>{getCurrency(currency).symbol}</Text>}
                    right={getCurrency(currency).symbol}
                    value={form.principal}
                    onChangeText={(v) => setForm({ ...form, principal: v })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    testID="loan-principal-input"
                  />
                  <Field
                    label={t("label.loanRate")}
                    info={{ title: t("help.loanRate.title"), body: t("help.loanRate.body") }}
                    icon={<Feather name="percent" size={18} color={GOLD} />}
                    right="%"
                    value={form.ratePercent}
                    onChangeText={(v) => setForm({ ...form, ratePercent: v })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    testID="loan-rate-input"
                  />
                  <Dropdown<LoanRepayment>
                    label={t("label.loanRepayment")}
                    info={{ title: t("help.loanRepayment.title"), body: t("help.loanRepayment.body") }}
                    icon={<Feather name="trending-down" size={18} color={GOLD} />}
                    value={form.repayment ?? "annuity"}
                    options={[
                      { value: "annuity", label: t("label.repay.annuity"), hint: t("label.repay.annuityHint") },
                      { value: "linear", label: t("label.repay.linear"), hint: t("label.repay.linearHint") },
                      { value: "bullet", label: t("label.repay.bullet"), hint: t("label.repay.bulletHint") },
                    ]}
                    onChange={(next) => setForm({ ...form, repayment: next })}
                    testID="loan-repayment-dropdown"
                  />
                  <Field
                    label={t("label.loanDuration")}
                    info={{ title: t("help.loanDuration.title"), body: t("help.loanDuration.body") }}
                    icon={<Feather name="calendar" size={18} color={GOLD} />}
                    right={t((form.durationUnit ?? "years") === "months" ? "label.months" : "label.years")}
                    value={form.years}
                    onChangeText={(v) => setForm({ ...form, years: v })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    testID="loan-years-input"
                  />
                  {/* Beaucoup de contrats parlent en mois (« 48 mois ») : on
                      laisse saisir dans l'unité du contrat, on convertit. */}
                  <Dropdown<LoanDurationUnit>
                    label={t("label.durationUnit")}
                    icon={<Feather name="hash" size={18} color={GOLD} />}
                    value={form.durationUnit ?? "years"}
                    options={[
                      { value: "years", label: t("label.years") },
                      { value: "months", label: t("label.months") },
                    ]}
                    onChange={(next) => setForm({ ...form, durationUnit: next })}
                    testID="loan-duration-unit"
                  />
                  <Field
                    label={t("loan.startLabel")}
                    info={{ title: t("help.loanStart.title"), body: t("help.loanStart.body") }}
                    icon={<Feather name="clock" size={18} color={GOLD} />}
                    value={loanStartText}
                    onChangeText={(v) => {
                      const formatted = formatMonthInput(v);
                      setLoanStartText(formatted);
                      setForm((f) => ({
                        ...f,
                        startDate: monthInputToIso(formatted),
                      }));
                    }}
                    keyboardType="number-pad"
                    maxLength={7}
                    placeholder={t("loan.startPlaceholder")}
                    hintText={t("loan.startHint")}
                    testID="loan-start-input"
                  />
                  <View style={styles.previewBox}>
                    <Text style={styles.previewLabel}>{t("label.loanPreview")}</Text>
                    <Text style={styles.previewValue} testID="loan-preview-monthly">
                      {fmt(loanMonthlyPayment(form))}
                    </Text>
                    {(() => {
                      const pr = loanProgress(
                        parseNumber(form.principal),
                        parseNumber(form.ratePercent),
                        loanTermYears(form),
                        form.startDate,
                        loanMonthlyPayment(form),
                        new Date(),
                        form.repayment ?? "annuity",
                      );
                      if (!pr) return null;
                      return (
                        <Text style={styles.previewHint}>
                          {pr.finished
                            ? t("loan.previewFinished")
                            : interpolate(t("loan.previewRemaining"), {
                                time: humanRemaining(pr),
                                cost: fmt(pr.totalInterest),
                              })}
                        </Text>
                      );
                    })()}
                  </View>
                </>
              )}
            </ScrollView>
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={onSave}
                testID="save-loan-button"
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>
                  {editingLoan ? t("btn.save") : t("btn.add")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
