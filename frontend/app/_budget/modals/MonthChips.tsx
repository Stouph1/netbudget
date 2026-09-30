// Douze pastilles, une par mois, à cocher. Sert à la période d'une dépense,
// à l'ajout comme à la modification. « Toute l'année » remet tout à zéro,
// « À partir d'ici » coche du mois choisi jusqu'à décembre : c'est le cas le
// plus courant (un loyer ou un abonnement qui commence en cours d'année).
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MONTH_KEYS_SHORT } from "../constants";
import { useBudgetTheme } from "../useBudgetTheme";
import type { Translate } from "../types";
import { ALL_MONTHS, normalizeMonths } from "../expensePeriod";

export function MonthChips({
  months,
  onChange,
  t,
  testID = "period",
}: {
  /** `undefined` = toute l'année. */
  months: number[] | undefined;
  onChange: (next: number[] | undefined) => void;
  t: Translate;
  testID?: string;
}) {
  const { styles, GOLD } = useBudgetTheme();
  const active = months ?? ALL_MONTHS;
  const all = !months;
  const toggle = (m: number) => {
    const next = active.includes(m) ? active.filter((x) => x !== m) : [...active, m];
    onChange(normalizeMonths(next) ?? (next.length === 0 ? [] : undefined));
  };
  return (
    <View testID={testID}>
      <Text style={styles.familySub}>{t("period.hint")}</Text>
      <View style={styles.periodRow}>
        {ALL_MONTHS.map((m) => {
          const on = active.includes(m);
          return (
            <TouchableOpacity
              key={m}
              onPress={() => toggle(m)}
              style={[styles.periodChip, on && { backgroundColor: GOLD, borderColor: GOLD }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              testID={`${testID}-month-${m}`}
            >
              <Text style={[styles.periodChipText, on && { color: "#000", fontWeight: "800" }]}>
                {t(MONTH_KEYS_SHORT[m])}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.periodPresets}>
        <TouchableOpacity
          onPress={() => onChange(undefined)}
          style={[styles.periodPreset, all && { borderColor: GOLD }]}
          accessibilityRole="button"
          testID={`${testID}-all`}
        >
          <Text style={[styles.periodPresetText, all && { color: GOLD }]}>{t("period.all")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            const from = new Date().getMonth();
            onChange(normalizeMonths(ALL_MONTHS.filter((m) => m >= from)));
          }}
          style={styles.periodPreset}
          accessibilityRole="button"
          testID={`${testID}-from-now`}
        >
          <Text style={styles.periodPresetText}>{t("period.fromNow")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
