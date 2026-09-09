// L'inflation, affichée là où elle change une décision.
//
// DEUX ENDROITS, DEUX RÔLES :
//
// `InflationBanner` en tête des conseils donne l'étalon une fois — le taux du
// pays, sa période, sa source. C'est le contexte dans lequel tout le reste se
// lit.
//
// `RealReturnLine` sous une carte qui recommande un placement fait le calcul à
// la place de l'utilisateur. C'est là que ça compte : personne ne compare
// spontanément « 1,5 % » à « 2,7 % » lus à trente secondes d'intervalle, et
// c'est précisément l'écart qui dit si le conseil est bon.
//
// CE QU'ON NE FAIT PAS. On ne retire pas le conseil, et on ne le barre pas. Un
// livret qui ne bat pas l'inflation reste le bon endroit pour une épargne de
// précaution — disponible tout de suite, sans risque. On donne le chiffre, on
// dit ce qu'il signifie, et on laisse décider.

import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLang } from "../contexts/LangContext";
import {
  beatsInflation,
  formatRate,
  inflationFor,
  isStale,
  periodLabel,
  realRate,
  sourceUrl,
} from "../lib/inflation";
import { rateLoan, type LoanGrade } from "../lib/loanRating";
import type { Country } from "../types/advice";
import { openExternal } from "../utils/openExternal";

const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GREEN = "#4ADE80";
const AMBER = "#FBBF24";
const RED = "#F87171";
const BLUE = "#7DD3FC";

const SOURCE_NAMES = {
  eurostat: "Eurostat",
  oecd: "OCDE",
  worldbank: "Banque mondiale",
} as const;

export function InflationBanner({ country }: { country: Country | undefined }) {
  const { lang, t, tp } = useLang();
  const row = inflationFor(country);
  // Pays non couvert : on n'affiche rien. Une bannière vide vaudrait mieux que
  // rien seulement si elle disait quelque chose.
  if (!row) return null;

  const stale = isStale(row);

  return (
    <TouchableOpacity
      style={s.banner}
      onPress={() => openExternal(sourceUrl(row))}
      activeOpacity={0.8}
      accessibilityRole="link"
      testID="inflation-banner"
    >
      <Feather name="trending-up" size={15} color={AMBER} />
      <View style={{ flex: 1 }}>
        <Text style={s.bannerTitle}>
          {tp("inflation.banner.title", { rate: formatRate(row.rate, lang) })}
        </Text>
        <Text style={s.bannerBody}>
          {tp(stale ? "inflation.banner.stale" : "inflation.banner.sub", {
            period: periodLabel(row, lang),
            source: SOURCE_NAMES[row.source],
          })}
        </Text>
      </View>
      <Feather name="external-link" size={13} color={TEXT_3} />
      <Text style={s.srOnly}>{t("inflation.banner.a11y")}</Text>
    </TouchableOpacity>
  );
}

export function RealReturnLine({
  nominalRatePct,
  country,
}: {
  nominalRatePct: number;
  country: Country | undefined;
}) {
  const { lang, tp } = useLang();
  const row = inflationFor(country);
  if (!row) return null;

  const real = realRate(nominalRatePct, row);
  const wins = beatsInflation(nominalRatePct, row);
  const color = wins ? GREEN : AMBER;

  return (
    <View style={[s.real, { borderColor: color + "44", backgroundColor: color + "12" }]}>
      <Feather name={wins ? "trending-up" : "trending-down"} size={13} color={color} />
      <Text style={[s.realText, { color }]}>
        {tp(wins ? "inflation.real.beats" : "inflation.real.loses", {
          real: formatRate(real, lang, true),
        })}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.28)",
    backgroundColor: "rgba(251,191,36,0.07)",
  },
  bannerTitle: { color: TEXT_1, fontSize: 12.5, fontWeight: "700" },
  bannerBody: { color: TEXT_2, fontSize: 11.5, lineHeight: 16, marginTop: 1 },
  real: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  realText: { fontSize: 12, fontWeight: "700", flexShrink: 1 },
  // Hors écran : complète le libellé pour les lecteurs d'écran sans alourdir
  // la bannière visuellement.
  srOnly: { position: "absolute", width: 1, height: 1, opacity: 0 },
  loanWrap: { marginTop: 7, gap: 3 },
  loanChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  loanGrade: { fontSize: 11.5, fontWeight: "800" },
  loanReal: { color: TEXT_2, fontSize: 11 },
  loanCaveat: { color: TEXT_3, fontSize: 10, lineHeight: 13.5 },
});

/**
 * Ce qu'un prêt coûte vraiment, une fois les prix pris en compte.
 *
 * Contrairement à l'épargne, un taux SOUS l'inflation est ici une bonne
 * nouvelle : on rembourse en monnaie dévaluée. La couleur suit donc la note,
 * pas le signe.
 *
 * La mention en dessous n'est pas décorative. Sans elle, « excellent » se lit
 * comme « emprunte », alors que la note ne parle que du coût du crédit — jamais
 * de la capacité à le rembourser.
 */
export function LoanRatingChip({
  ratePercent,
  country,
}: {
  ratePercent: number;
  country: Country | undefined;
}) {
  const { lang, t, tp } = useLang();
  const rating = rateLoan(ratePercent, inflationFor(country));
  if (!rating) return null;

  const color: Record<LoanGrade, string> = {
    excellent: GREEN,
    good: BLUE,
    fair: TEXT_2,
    costly: RED,
  };
  const tone = color[rating.grade];

  return (
    <View style={s.loanWrap}>
      <View style={[s.loanChip, { borderColor: tone + "55", backgroundColor: tone + "14" }]}>
        <Text style={[s.loanGrade, { color: tone }]}>
          {t(`loan.rating.${rating.grade}`)}
        </Text>
        <Text style={s.loanReal}>
          {tp("loan.rating.real", { real: formatRate(rating.realRate, lang, true) })}
        </Text>
      </View>
      <Text style={s.loanCaveat}>{t("loan.rating.caveat")}</Text>
    </View>
  );
}
