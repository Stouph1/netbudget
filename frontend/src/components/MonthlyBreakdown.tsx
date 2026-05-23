import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { CurrencyCode, formatCurrency } from "../utils/currency";

export type MonthRow = {
  index: number;
  name: string;
  shortName: string;
  income: number;
  expenses: number;
  remaining: number;
};

const GOLD = "#4ADE80";
const SURFACE = "#141826";
const SURFACE_2 = "#1C2130";
const BORDER = "#2A3142";
const TEXT = "#FFFFFF";
const TEXT_2 = "#A1A1AA";
const TEXT_3 = "#71717A";
const DANGER = "#EF4444";
const SUCCESS = "#10B981";

type Props = {
  months: MonthRow[];
  currentMonthIndex: number;
  annualRemaining: number;
  annualIncome: number;
  annualExpenses: number;
  currency: CurrencyCode;
};

export default function MonthlyBreakdown({
  months,
  currentMonthIndex,
  annualRemaining,
  currency,
  annualIncome,
  annualExpenses,
}: Props) {
  const fmt = (v: number) => formatCurrency(v, currency);
  const max = Math.max(...months.map((m) => Math.abs(m.remaining)), 1);

  return (
    <View testID="monthly-breakdown">
      {/* Cards scroll horizontally */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsRow}
      >
        {months.map((m) => {
          const positive = m.remaining >= 0;
          const isCurrent = m.index === currentMonthIndex;
          const ratio = Math.min(1, Math.abs(m.remaining) / max);
          return (
            <View
              key={m.index}
              style={[styles.monthCard, isCurrent && styles.monthCardCurrent]}
              testID={`month-card-${m.index}`}
            >
              <Text style={[styles.monthName, isCurrent && { color: GOLD }]}>
                {m.shortName.toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.monthValue,
                  { color: positive ? GOLD : DANGER },
                ]}
              >
                {fmt(m.remaining)}
              </Text>
              <Text style={styles.monthMeta}>net {fmt(m.income)}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${ratio * 100}%`,
                      backgroundColor: positive ? GOLD : DANGER,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Detailed list */}
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 1.1 }]}>Mois</Text>
          <Text style={[styles.th, { flex: 1.4, textAlign: "right" }]}>
            Revenu net
          </Text>
          <Text style={[styles.th, { flex: 1.4, textAlign: "right" }]}>
            Dépenses
          </Text>
          <Text style={[styles.th, { flex: 1.3, textAlign: "right" }]}>
            Reste
          </Text>
        </View>

        {months.map((m) => {
          const positive = m.remaining >= 0;
          const isCurrent = m.index === currentMonthIndex;
          return (
            <View
              key={m.index}
              style={[styles.tableRow, isCurrent && styles.tableRowCurrent]}
              testID={`month-row-${m.index}`}
            >
              <View style={{ flex: 1.1, flexDirection: "row", alignItems: "center" }}>
                {isCurrent && <View style={styles.dot} />}
                <Text style={[styles.td, isCurrent && { color: GOLD, fontWeight: "700" }]}>
                  {m.name}
                </Text>
              </View>
              <Text style={[styles.tdNum, { flex: 1.4 }]}>
                {fmt(m.income)}
              </Text>
              <Text style={[styles.tdNum, { flex: 1.4, color: TEXT_3 }]}>
                - {fmt(m.expenses)}
              </Text>
              <Text
                style={[
                  styles.tdNum,
                  {
                    flex: 1.3,
                    color: positive ? GOLD : DANGER,
                    fontWeight: "800",
                  },
                ]}
              >
                {fmt(m.remaining)}
              </Text>
            </View>
          );
        })}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total annuel</Text>
          <View style={styles.totalValues}>
            <View style={styles.totalBlock}>
              <Text style={styles.totalSub}>Revenus</Text>
              <Text style={[styles.totalNum, { color: SUCCESS }]}>
                {fmt(annualIncome)}
              </Text>
            </View>
            <View style={styles.totalBlock}>
              <Text style={styles.totalSub}>Dépenses</Text>
              <Text style={[styles.totalNum, { color: TEXT_2 }]}>
                {fmt(annualExpenses)}
              </Text>
            </View>
            <View style={styles.totalBlock}>
              <Text style={styles.totalSub}>Reste</Text>
              <Text
                style={[
                  styles.totalNum,
                  { color: annualRemaining >= 0 ? GOLD : DANGER },
                ]}
                testID="annual-remaining-value"
              >
                {fmt(annualRemaining)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardsRow: { paddingVertical: 4, paddingRight: 12, gap: 10 },
  monthCard: {
    width: 120,
    padding: 14,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 10,
  },
  monthCardCurrent: {
    borderColor: GOLD,
    backgroundColor: "rgba(74,222,128,0.08)",
  },
  monthName: {
    color: TEXT_2,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: "700",
    marginBottom: 6,
  },
  monthValue: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  monthMeta: {
    color: TEXT_3,
    fontSize: 11,
    marginBottom: 10,
  },
  barTrack: {
    height: 4,
    backgroundColor: SURFACE_2,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: { height: 4, borderRadius: 2 },

  tableCard: {
    marginTop: 14,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 4,
  },
  th: {
    color: TEXT_3,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(39,39,42,0.5)",
  },
  tableRowCurrent: {
    backgroundColor: "rgba(74,222,128,0.08)",
    borderRadius: 8,
    paddingHorizontal: 6,
    marginHorizontal: -6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
    marginRight: 6,
  },
  td: { color: TEXT, fontSize: 13 },
  tdNum: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },

  totalRow: {
    marginTop: 8,
    paddingTop: 14,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  totalLabel: {
    color: TEXT_3,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 8,
  },
  totalValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  totalBlock: { flex: 1, alignItems: "flex-start" },
  totalSub: {
    color: TEXT_3,
    fontSize: 11,
    marginBottom: 2,
  },
  totalNum: {
    fontSize: 14,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
