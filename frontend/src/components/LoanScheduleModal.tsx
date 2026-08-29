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
import { useLang } from "../contexts/LangContext";
import { LockedOverlay } from "./LockedOverlay";
import { usePaywall } from "../hooks/usePaywall";
import { canSeeScheduleYear } from "../lib/entitlements";
import {
  amortizationSchedule,
  type ScheduleYear,
  loanProgress,
  type LoanProgress,
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
  const { lang, t, tp } = useLang();
  const [expanded, setExpanded] = useState<number | null>(null);

  // Nom de mois abrégé dans la langue de l'app (« janv. », « Jan », « 1月 »…).
  const monthShort = (d: Date) =>
    d.toLocaleDateString(lang, { month: "short" });

  // Durée restante lisible, localisée (l'utilitaire renvoie du français).
  function remainingLabel(p: LoanProgress): string {
    if (p.finished) return t("schedule.finished");
    const y = Math.floor(p.remainingMonths / 12);
    const m = p.remainingMonths % 12;
    const months = tp("schedule.rem.months", { m });
    if (y === 0) return months;
    const years =
      y === 1
        ? t("schedule.rem.years.one")
        : tp("schedule.rem.years.many", { y });
    return m === 0 ? years : tp("schedule.rem.combo", { years, months });
  }

  const schedule = useMemo(
    () =>
      amortizationSchedule(
        principal,
        ratePercent,
        years,
        startIso,
        monthlyPayment,
      ),
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

  // Ce qui répond à « où j'en suis » reste NET pour tout le monde : l'année en
  // cours, et tout le passé — ce sont des échéances déjà payées, les masquer
  // donnerait le sentiment qu'on retient son propre historique en otage.
  //
  // Ce qu'on réserve, c'est la PROJECTION : les vingt ans qui viennent, la
  // bascule intérêts/capital, le coût total du crédit. C'est aussi ce qui a le
  // plus de valeur, et ce qu'aucun relevé bancaire ne montre.
  const paywall = usePaywall();
  const currentYear =
    schedule.find((y) => y.current)?.year ?? schedule[0]?.year ?? 0;
  const firstLockedIndex = schedule.findIndex(
    (y) => !canSeeScheduleYear(paywall.tier, y.year - currentYear),
  );
  const hasLocked = firstLockedIndex >= 0;

  /**
   * Une ligne d'année de l'échéancier.
   *
   * Extraite du rendu pour dessiner les années lisibles et les années
   * réservées dans DEUX conteneurs distincts : le voile flouté doit couvrir
   * exactement les secondes, sans déborder sur l'année en cours.
   */
  function renderYear(y: ScheduleYear, locked: boolean) {
    // Une année réservée ne s'ouvre pas : le détail mois par mois se lirait au
    // travers du flou.
    const isOpen = expanded === y.year && !locked;
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
          onPress={() =>
            locked ? undefined : setExpanded(isOpen ? null : y.year)
          }
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
          accessibilityLabel={tp("schedule.a11y.year", {
            year: y.year,
            pct: Math.round(capRatio),
          })}
        >
          <Text
            style={[
              styles.yearLabel,
              y.past && styles.mutedText,
              y.current && { color: GOLD },
            ]}
          >
            {y.year}
            {y.current ? ` · ${t("schedule.current")}` : ""}
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
              {tp("schedule.yearDetail", {
                capital: format(y.principal),
                interest: format(y.interest),
              })}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.yearBalance, y.past && styles.mutedText]}>
              {format(y.balance)}
            </Text>
            <Text style={styles.yearBalanceLabel}>
              {t("schedule.balanceLabel")}
            </Text>
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
              <Text
                style={[styles.monthCell, styles.monthHeadText, { flex: 1.1 }]}
              >
                {t("schedule.col.month")}
              </Text>
              <Text style={[styles.monthCell, styles.monthHeadText]}>
                {t("schedule.col.capital")}
              </Text>
              <Text style={[styles.monthCell, styles.monthHeadText]}>
                {t("schedule.col.interest")}
              </Text>
              <Text
                style={[styles.monthCell, styles.monthHeadText, { flex: 1.2 }]}
              >
                {t("schedule.col.balance")}
              </Text>
            </View>
            {y.rows.map((r) => (
              <View key={r.index} style={styles.monthRow}>
                <Text
                  style={[styles.monthCell, styles.monthText, { flex: 1.1 }]}
                >
                  {monthShort(r.date)}
                </Text>
                <Text
                  style={[
                    styles.monthCell,
                    styles.monthText,
                    { color: CAPITAL },
                  ]}
                >
                  {format(r.principal)}
                </Text>
                <Text
                  style={[
                    styles.monthCell,
                    styles.monthText,
                    { color: INTEREST },
                  ]}
                >
                  {format(r.interest)}
                </Text>
                <Text
                  style={[styles.monthCell, styles.monthText, { flex: 1.2 }]}
                >
                  {format(r.balance)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
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
                {tp("schedule.subtitle", {
                  amount: format(principal),
                  rate: ratePercent,
                  years,
                })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("schedule.a11y.close")}
            >
              <Feather name="x" size={22} color={TEXT_2} />
            </TouchableOpacity>
          </View>

          {schedule.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="calendar" size={26} color={TEXT_3} />
              <Text style={styles.emptyText}>{t("schedule.empty")}</Text>
            </View>
          ) : (
            <>
              {/* Synthèse */}
              <View style={styles.summary}>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryLabel}>
                    {t("schedule.monthly")}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {format(monthlyPayment)}
                  </Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryLabel}>{t("schedule.cost")}</Text>
                  <Text style={[styles.summaryValue, { color: INTEREST }]}>
                    {format(totalInterest)}
                  </Text>
                </View>
                <View style={styles.summaryCell}>
                  <Text style={styles.summaryLabel}>
                    {t("schedule.remaining")}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {progress ? remainingLabel(progress) : "—"}
                  </Text>
                </View>
              </View>

              <Text style={styles.legend}>
                <Text style={{ color: CAPITAL }}>■</Text>{" "}
                {t("schedule.legend.capital")} ·{" "}
                <Text style={{ color: INTEREST }}>■</Text>{" "}
                {t("schedule.legend.interest")} {t("schedule.legend.hint")}
              </Text>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 28 }}
                showsVerticalScrollIndicator={false}
              >
                {schedule
                  .slice(0, hasLocked ? firstLockedIndex : schedule.length)
                  .map((y) => renderYear(y, false))}

                {/* La projection réservée : visible, dense, illisible. On la
                    montre plutôt que de la retirer — une liste tronquée ne
                    donne envie de rien, personne ne sait ce qu'il rate. */}
                {hasLocked ? (
                  <View style={styles.lockedBlock}>
                    {schedule
                      .slice(firstLockedIndex)
                      .map((y) => renderYear(y, true))}
                    <LockedOverlay
                      titleKey="schedule.locked.title"
                      bodyKey="schedule.locked.body"
                      icon="trending-down"
                      minHeight={210}
                    />
                  </View>
                ) : null}

                <Text style={styles.footnote}>{t("schedule.footnote")}</Text>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // `position: relative` explicite : le voile est en absolu par-dessus, et
  // doit se caler sur ce bloc-ci, pas sur la feuille entière.
  lockedBlock: { position: "relative" },
  lockedMore: {
    color: "#8193AC",
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "700" },
  subtitle: { color: TEXT_3, fontSize: 12.5, marginTop: 2 },
  empty: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyText: {
    color: TEXT_2,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },
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
  monthHeadText: {
    color: TEXT_3,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
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
