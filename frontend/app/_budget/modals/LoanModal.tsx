// Ajout / édition d'un prêt : mensualité calculée (capital, taux, durée) ou
// saisie directement, avec aperçu de l'échéancier.
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
import { parseNumber } from "../../../src/utils/finance";
import { loanProgress, remainingParts } from "../../../src/utils/loanSchedule";
import { interpolate } from "../../../src/utils/advice";
import { GOLD, TEXT_2 } from "../constants";
import { formatMonthInput, loanMonthlyPayment, monthInputToIso } from "../helpers";
import { styles } from "../styles";
import { Dropdown, Field } from "../ui";
import type { Loan, LoanMode, Translate } from "../types";

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
                    icon={<Feather name="percent" size={18} color={GOLD} />}
                    right="%"
                    value={form.ratePercent}
                    onChangeText={(v) => setForm({ ...form, ratePercent: v })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    testID="loan-rate-input"
                  />
                  <Field
                    label={t("label.loanDuration")}
                    icon={<Feather name="calendar" size={18} color={GOLD} />}
                    right={t("label.years")}
                    value={form.years}
                    onChangeText={(v) => setForm({ ...form, years: v })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    testID="loan-years-input"
                  />
                  <Field
                    label={t("loan.startLabel")}
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
                        parseNumber(form.years),
                        form.startDate,
                        loanMonthlyPayment(form),
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
