// Repères : ta structure de dépenses face aux moyennes nationales officielles.
//
// Sans abonnement (ou sans compte) : trois lignes lisibles, les suivantes
// floutées avec la porte vers les formules. C'est exactement ce qu'un abonné
// obtient, montré à moitié : on ne cache pas la fonctionnalité, on en donne
// le goût.
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAccent } from "../contexts/ThemeContext";
import type { Comparison, CompareLine } from "../lib/spendingCompare";
import { alpha } from "../theme/accents";

const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const SURFACE = "#1A2238";
const BORDER = "rgba(255,255,255,0.10)";
const AMBER = "#FBBF24";

const BUCKET_EMOJI: Record<CompareLine["bucket"], string> = {
  housing: "🏠",
  food: "🛒",
  transport: "🚗",
  restaurants: "🍽️",
  recreation: "🎬",
  health: "🏥",
};

export const FREE_VISIBLE_LINES = 3;
export const FREE_BLURRED_LINES = 2;

export function SpendingBenchmark({
  comparison,
  cityName,
  cityIndex,
  countryName,
  premium,
  t,
  tp,
}: {
  comparison: Comparison;
  cityName: string;
  cityIndex: number;
  countryName: string;
  premium: boolean;
  t: (k: string) => string;
  tp: (k: string, p: Record<string, string | number>) => string;
}) {
  const GOLD = useAccent().main;
  const s = useMemo(() => makeS(GOLD), [GOLD]);
  const visible = premium ? comparison.lines : comparison.lines.slice(0, FREE_VISIBLE_LINES);
  const blurred = premium ? [] : comparison.lines.slice(FREE_VISIBLE_LINES, FREE_VISIBLE_LINES + FREE_BLURRED_LINES);
  const pctIndex = Math.round((cityIndex - 1) * 100);

  return (
    <View style={s.card} testID="spending-benchmark">
      <View style={s.head}>
        <Feather name="bar-chart-2" size={16} color={GOLD} />
        <Text style={s.title}>{t("bench.title")}</Text>
      </View>
      <Text style={s.sub}>
        {tp("bench.intro", { country: countryName, year: comparison.year })}
        {pctIndex !== 0
          ? " " + tp(pctIndex > 0 ? "bench.city.above" : "bench.city.below", { city: cityName, pct: Math.abs(pctIndex) })
          : ""}
      </Text>

      {visible.map((l) => (
        <Line key={l.bucket} line={l} s={s} GOLD={GOLD} t={t} tp={tp} />
      ))}

      {blurred.length > 0 ? (
        <TouchableOpacity
          onPress={() => router.push("/plans" as never)}
          activeOpacity={0.85}
          accessibilityRole="button"
          testID="bench-locked"
        >
          <View>
            {blurred.map((l) => (
              <View key={l.bucket} style={s.blurWrap}>
                <Line line={l} s={s} GOLD={GOLD} t={t} tp={tp} />
                <View style={s.blurVeil} />
              </View>
            ))}
            <View style={s.lockRow}>
              <Feather name="lock" size={14} color={GOLD} />
              <Text style={s.lockText}>{tp("bench.locked", { n: blurred.length })}</Text>
              <Feather name="chevron-right" size={16} color={GOLD} />
            </View>
          </View>
        </TouchableOpacity>
      ) : null}

      <Text style={s.source}>{tp("bench.source", { source: comparison.source, year: comparison.year })}</Text>
    </View>
  );
}

function Line({
  line,
  s,
  GOLD,
  t,
  tp,
}: {
  line: CompareLine;
  s: ReturnType<typeof makeS>;
  GOLD: string;
  t: (k: string) => string;
  tp: (k: string, p: Record<string, string | number>) => string;
}) {
  const color = line.verdict === "above" ? AMBER : line.verdict === "below" ? GOLD : TEXT_2;
  return (
    <View style={s.line} testID={`bench-${line.bucket}`}>
      <Text style={s.emoji}>{BUCKET_EMOJI[line.bucket]}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.lineTitle}>{t(`bench.bucket.${line.bucket}`)}</Text>
        <Text style={s.lineBody}>{tp(`bench.verdict.${line.verdict}`, { mine: line.mine, national: line.national })}</Text>
      </View>
      <View style={s.pcts}>
        <Text style={[s.mine, { color }]}>{line.mine} %</Text>
        <Text style={s.national}>{line.national} %</Text>
      </View>
    </View>
  );
}

const makeS = (GOLD: string) =>
  StyleSheet.create({
    card: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, marginTop: 14 },
    head: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { color: TEXT_1, fontSize: 15, fontWeight: "800" },
    sub: { color: TEXT_2, fontSize: 12.5, lineHeight: 18, marginTop: 6, marginBottom: 8 },
    line: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: BORDER },
    emoji: { fontSize: 20, width: 28, textAlign: "center" },
    lineTitle: { color: TEXT_1, fontSize: 13.5, fontWeight: "700" },
    lineBody: { color: TEXT_2, fontSize: 12, lineHeight: 16, marginTop: 2 },
    pcts: { alignItems: "flex-end", minWidth: 52 },
    mine: { fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
    national: { color: TEXT_3, fontSize: 11, fontVariant: ["tabular-nums"] },
    blurWrap: { position: "relative" },
    blurVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: alpha(SURFACE, 0.82) },
    lockRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, marginTop: -4 },
    lockText: { flex: 1, color: TEXT_1, fontSize: 13, fontWeight: "700" },
    source: { color: TEXT_3, fontSize: 10.5, marginTop: 10 },
  });
