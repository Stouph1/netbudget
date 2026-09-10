// Suis-je éligible à l'ACRE ? — vérification guidée pour indépendants.
//
// CE QUE CET ÉCRAN FAIT, ET NE FAIT PAS. Il reprend, une par une, les
// situations qui ouvrent droit à l'ACRE telles que la fiche officielle les
// énumère, laisse la personne cocher celles qui sont les siennes, et lui dit
// si au moins une l'est. Puis il l'envoie vers la démarche officielle. Il ne
// dépose aucune demande, ne calcule aucun montant, et ne promet rien : c'est
// l'Urssaf qui accorde, pas nous.
//
// LA SOURCE. Tout ce qui est écrit ici vient de la fiche F11677 de
// entreprendre.service-public.gouv.fr, « Vérifié le 01 juillet 2026 » au
// moment où cet écran a été écrit. La liste des situations et la règle des
// trois ans vivent dans src/lib/acre.ts, où un test les verrouille ; le délai
// de soixante jours, le taux et la durée d'exonération sont dans les textes
// traduits. Rien n'est de nous. Si la fiche change, on relit les deux — la
// date est affichée en bas exprès.
//
// POURQUOI LE DÉLAI EST EN GROS. Soixante jours après le début d'activité,
// c'est perdu. C'est la seule information de cet écran qui coûte de l'argent
// si on la rate, donc elle est la plus visible.

import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLang } from "../../src/contexts/LangContext";
import { goBack } from "../../src/lib/nav";
import { openExternal } from "../../src/utils/openExternal";
import {
  ACRE_CONDITIONS,
  ACRE_SOURCE,
  ACRE_VERIFIED,
  acreVerdict,
  type AcreCondition,
} from "../../src/lib/acre";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const AMBER = "#FBBF24";
const BORDER = "rgba(255,255,255,0.10)";

export default function AcreScreen() {
  const { t, lang } = useLang();
  const [checked, setChecked] = useState<AcreCondition[]>([]);
  const [hadAcre, setHadAcre] = useState<boolean | null>(null);

  const verdict = useMemo(
    () => (hadAcre === null ? null : acreVerdict(checked, hadAcre)),
    [checked, hadAcre],
  );

  const verifiedLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(new Date(ACRE_VERIFIED));
    } catch {
      return ACRE_VERIFIED;
    }
  }, [lang]);

  function toggle(c: AcreCondition) {
    setChecked((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={10} accessibilityRole="button">
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={s.title}>{t("acre.title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={s.intro}>{t("acre.intro")}</Text>

        {/* Le délai d'abord : la seule information qui coûte si on la rate. */}
        <View style={s.deadline}>
          <Feather name="clock" size={18} color={AMBER} />
          <Text style={s.deadlineText}>{t("acre.deadline")}</Text>
        </View>

        <Text style={s.section}>{t("acre.conditions.title")}</Text>
        <Text style={s.hint}>{t("acre.conditions.hint")}</Text>
        {ACRE_CONDITIONS.map((c) => {
          const on = checked.includes(c);
          return (
            <TouchableOpacity
              key={c}
              onPress={() => toggle(c)}
              style={[s.row, on && s.rowOn]}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              testID={`acre-cond-${c}`}
            >
              <View style={[s.box, on && s.boxOn]}>
                {on ? <Feather name="check" size={13} color="#04140B" /> : null}
              </View>
              <Text style={[s.rowText, on && { color: TEXT_1 }]}>{t(`acre.cond.${c}`)}</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={s.section}>{t("acre.rule3y.title")}</Text>
        <Text style={s.hint}>{t("acre.rule3y.body")}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {([false, true] as const).map((v) => (
            <TouchableOpacity
              key={String(v)}
              onPress={() => setHadAcre(v)}
              style={[s.chip, hadAcre === v && s.chipOn]}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: hadAcre === v }}
              testID={`acre-had-${v}`}
            >
              <Text style={[s.chipText, hadAcre === v && s.chipTextOn]}>
                {t(v ? "acre.rule3y.yes" : "acre.rule3y.no")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {verdict ? (
          <View
            style={[
              s.verdict,
              verdict === "eligible" ? s.verdictOk : verdict === "blocked" ? s.verdictBad : s.verdictNone,
            ]}
            testID={`acre-verdict-${verdict}`}
          >
            <Feather
              name={verdict === "eligible" ? "check-circle" : verdict === "blocked" ? "x-circle" : "help-circle"}
              size={18}
              color={verdict === "eligible" ? GOLD : verdict === "blocked" ? "#F87171" : TEXT_2}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.verdictTitle}>{t(`acre.verdict.${verdict}.title`)}</Text>
              <Text style={s.verdictBody}>{t(`acre.verdict.${verdict}.body`)}</Text>
            </View>
          </View>
        ) : null}

        <View style={s.facts}>
          <Text style={s.factsTitle}>{t("acre.exemption.title")}</Text>
          <Text style={s.factsBody}>{t("acre.exemption.body")}</Text>
        </View>

        <TouchableOpacity
          onPress={() => openExternal(ACRE_SOURCE)}
          style={s.cta}
          activeOpacity={0.85}
          accessibilityRole="link"
          testID="acre-cta"
        >
          <Feather name="external-link" size={16} color="#04140B" />
          <Text style={s.ctaText}>{t("acre.cta")}</Text>
        </TouchableOpacity>

        <Text style={s.foot}>{t("acre.disclaimer")}</Text>
        <TouchableOpacity onPress={() => openExternal(ACRE_SOURCE)} accessibilityRole="link">
          <Text style={s.source}>{t("acre.source")} {verifiedLabel}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "800" },
  intro: { color: TEXT_2, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  deadline: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(251,191,36,0.35)", backgroundColor: "rgba(251,191,36,0.08)", marginBottom: 18 },
  deadlineText: { flex: 1, color: TEXT_1, fontSize: 13.5, fontWeight: "700", lineHeight: 19 },
  section: { color: TEXT_1, fontSize: 15, fontWeight: "800", marginTop: 8, marginBottom: 4 },
  hint: { color: TEXT_3, fontSize: 12.5, lineHeight: 17, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 11, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, marginBottom: 8 },
  rowOn: { borderColor: "rgba(74,222,128,0.45)" },
  rowText: { flex: 1, color: TEXT_2, fontSize: 13.5, lineHeight: 19 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.4, borderColor: BORDER, alignItems: "center", justifyContent: "center", marginTop: 1 },
  boxOn: { backgroundColor: GOLD, borderColor: GOLD },
  chip: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE },
  chipOn: { borderColor: "rgba(74,222,128,0.5)", backgroundColor: "rgba(74,222,128,0.10)" },
  chipText: { color: TEXT_2, fontSize: 13.5 },
  chipTextOn: { color: GOLD, fontWeight: "700" },
  verdict: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 18 },
  verdictOk: { borderColor: "rgba(74,222,128,0.4)", backgroundColor: "rgba(74,222,128,0.08)" },
  verdictBad: { borderColor: "rgba(248,113,113,0.4)", backgroundColor: "rgba(248,113,113,0.08)" },
  verdictNone: { borderColor: BORDER, backgroundColor: SURFACE },
  verdictTitle: { color: TEXT_1, fontSize: 14.5, fontWeight: "800", marginBottom: 3 },
  verdictBody: { color: TEXT_2, fontSize: 13, lineHeight: 18.5 },
  facts: { marginTop: 18, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE },
  factsTitle: { color: TEXT_1, fontSize: 13.5, fontWeight: "800", marginBottom: 4 },
  factsBody: { color: TEXT_2, fontSize: 13, lineHeight: 18.5 },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, marginTop: 18 },
  ctaText: { color: "#04140B", fontSize: 15, fontWeight: "800" },
  foot: { color: TEXT_3, fontSize: 11.5, lineHeight: 16, marginTop: 14 },
  source: { color: TEXT_3, fontSize: 11, marginTop: 8, textDecorationLine: "underline" },
});
