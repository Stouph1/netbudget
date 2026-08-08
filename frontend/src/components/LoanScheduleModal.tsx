// Échéancier détaillé d'un prêt — la vue que la banque fournit sur papier,
// consultable directement dans l'app.
//
// Deux niveaux : synthèse par année (repliée), puis détail mois par mois quand
// on déplie. Les années déjà passées sont grisées, l'année en cours est mise
// en avant — l'utilisateur se repère immédiatement.

import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  amortizationSchedule,
  humanRemaining,
  loanProgress,
} from "../utils/loanSchedule";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const CAPITAL = "#4ADE80";
const INTEREST = "#F87171";
const BORDER = "rgba(255,255,255,0.08)";

const MONTHS = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

type Props = {
  visible: boolean;
  onClose: () => void;
  loanName: string;
  principal: number;
  ratePercent: number;
  years: number;
  startIso?: string;
  monthlyPayment: number;
  /** Formateur de montant fourni par l'appelant (devise de l'app). */
  format: (n: number) => string;
};

export default function LoanScheduleModal({
  visible,
  onClose,
  loanName,
  principal,
  ratePercent,
  years,
  startIso,
  monthlyPayment,
  format,
}: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const schedule = useMemo(
    () => amortizationSchedule(principal, ratePercent, years, startIso, monthlyPayment),
    [principal, ratePercent, years, startIso, monthlyPayment],
  );
  const progress = useMemo(
    () => loanProgress(principal, ratePercent, years, startIso, monthlyPayment),
    [principal, ratePercent, years, startIso, monthlyPayment],
  );

  const totalInterest = useMemo(
    () => schedule.reduce((s, y) => s + y.interest, 0),
    [schedule],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {loanName}
              </Text>
              <Text style={styles.subtitle}>
                {format(principal)} · {ratePercent} % · {years} ans
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Fermer l'échéancier"
            >
              <Feather name="x" size={22} color={TEXT_2} />
            </TouchableOpacity>
          </View>

          {schedule.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="calendar" size={26} color={TEXT_3} />
              <Text style={styles.emptyText}>
                Ajoute la date de ta première échéance pour voir l'échéancier
                complet, mois par mois.
              </Text>
            </View>
          ) : (
            <>
              {/* Synthèse */}
              <View style={styles.summary}>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryLabel}>Mensualité</Text>
                  <Text style={styles.summaryValue}>{format(monthlyPayment)}</Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryLabel}>Coût du crédit</Text>
                  <Text style={[styles.summaryValue, { color: INTEREST }]}>
                    {format(totalInterest)}
                  </Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryLabel}>Reste</Text>
                  <Text style={styles.summaryValue}>
                    {progress ? humanRemaining(progress) : "—"}
                  </Text>
                </View>
              </View>

              <Text style={styles.legend}>
                <Text style={{ color: CAPITAL }}>■</Text> capital ·{" "}
                <Text style={{ color: INTEREST }}>■</Text> intérêts — appuie sur
                une année pour voir chaque mois
              </Text>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 28 }}
                showsVerticalScrollIndicator={false}
              >
                {schedule.map((y) => {
                  const isOpen = expanded === y.year;
                  const yearTotal = y.principal + y.interest;
                  const capRatio = yearTotal > 0 ? (y.principal / yearTotal) * 100 : 0;
                  return (
                    <View key={y.year}>
                      <TouchableOpacity
                        style={[
                          styles.yearRow,
                          y.past && styles.yearRowPast,
                          y.current && styles.yearRowCurrent,
                        ]}
                        onPress={() => setExpanded(isOpen ? null : y.year)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isOpen }}
                        accessibilityLabel={`Année ${y.year}, ${Math.round(capRatio)} pour cent de capital`}
                      >
                        <Text
                          style={[
                            styles.yearLabel,
                            y.past && styles.mutedText,
                            y.current && { color: GOLD },
                          ]}
                        >
                          {y.year}
                          {y.current ? " · en cours" : ""}
                        </Text>

                        <View style={{ flex: 1, gap: 4 }}>
                          {/* Barre capital / intérêts de l'année */}
                          <View style={styles.splitBar}>
                            <View
                              style={{
                                width: `${capRatio}%`,
                                backgroundColor: CAPITAL,
                                opacity: y.past ? 0.4 : 1,
                              }}
                            />
                            <View
                              style={{
                                width: `${100 - capRatio}%`,
                                backgroundColor: INTEREST,
                                opacity: y.past ? 0.4 : 1,
                              }}
                            />
                          </View>
                          <Text style={styles.yearDetail}>
                            {format(y.principal)} de capital ·{" "}
                            {format(y.interest)} d'intérêts
                          </Text>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={[styles.yearBalance, y.past && styles.mutedText]}>
                            {format(y.balance)}
                          </Text>
                          <Text style={styles.yearBalanceLabel}>restant</Text>
                        </View>
                        <Feather
                          name={isOpen ? "chevron-up" : "chevron-down"}
                          size={16}
                          color={TEXT_3}
                        />
                      </TouchableOpacity>

                      {isOpen ? (
                        <View style={styles.monthsBox}>
                          <View style={styles.monthHead}>
                            <Text style={[styles.monthCell, styles.monthHeadText, { flex: 1.1 }]}>
                              Mois
                            </Text>
                            <Text style={[styles.monthCell, styles.monthHeadText]}>Capital</Text>
                            <Text style={[styles.monthCell, styles.monthHeadText]}>Intérêts</Text>
                            <Text style={[styles.monthCell, styles.monthHeadText, { flex: 1.2 }]}>
                              Restant
                            </Text>
                          </View>
                          {y.rows.map((r) => (
                            <View key={r.index} style={styles.monthRow}>
                              <Text style={[styles.monthCell, styles.monthText, { flex: 1.1 }]}>
                                {MONTHS[r.date.getMonth()]}
                              </Text>
                              <Text style={[styles.monthCell, styles.monthText, { color: CAPITAL }]}>
                                {format(r.principal)}
                              </Text>
                              <Text style={[styles.monthCell, styles.monthText, { color: INTEREST }]}>
                                {format(r.interest)}
                              </Text>
                              <Text style={[styles.monthCell, styles.monthText, { flex: 1.2 }]}>
                                {format(r.balance)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}

                <Text style={styles.footnote}>
                  La mensualité reste constante toute la durée du prêt. Ce qui
                  change, c'est sa composition : les intérêts diminuent à mesure
                  que le capital restant baisse. Échéancier théorique — il peut
                  différer de celui de ta banque (assurance emprunteur, frais,
                  arrondis).
                </Text>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: MIDNIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "88%",
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 14,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "700" },
  subtitle: { color: TEXT_3, fontSize: 12.5, marginTop: 2 },
  empty: { alignItems: "center", gap: 12, paddingVertical: 40, paddingHorizontal: 24 },
  emptyText: { color: TEXT_2, fontSize: 13.5, lineHeight: 20, textAlign: "center" },
  summary: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 13,
    marginBottom: 12,
  },
  summaryCell: { flex: 1, alignItems: "center", gap: 3 },
  summaryLabel: { color: TEXT_3, fontSize: 11 },
  summaryValue: { color: TEXT_1, fontSize: 14.5, fontWeight: "700" },
  legend: { color: TEXT_3, fontSize: 11.5, marginBottom: 12, lineHeight: 16 },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  yearRowPast: { opacity: 0.55 },
  yearRowCurrent: { borderColor: "rgba(74,222,128,0.45)" },
  yearLabel: { color: TEXT_1, fontSize: 13, fontWeight: "700", width: 82 },
  mutedText: { color: TEXT_3 },
  splitBar: {
    flexDirection: "row",
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  yearDetail: { color: TEXT_3, fontSize: 10.5 },
  yearBalance: { color: TEXT_1, fontSize: 12.5, fontWeight: "700" },
  yearBalanceLabel: { color: TEXT_3, fontSize: 9.5 },
  monthsBox: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 10,
    marginTop: -2,
  },
  monthHead: {
    flexDirection: "row",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 4,
  },
  monthHeadText: { color: TEXT_3, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  monthRow: { flexDirection: "row", paddingVertical: 4 },
  monthCell: { flex: 1, fontSize: 11, textAlign: "right" },
  monthText: { color: TEXT_2, fontVariant: ["tabular-nums"] },
  footnote: {
    color: TEXT_3,
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 14,
    fontStyle: "italic",
  },
});
