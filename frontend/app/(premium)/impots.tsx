// Déclaration de revenus — le guide pas à pas.
//
// Un écran qu'on coche, pas un simulateur. Chaque étape dit quoi faire, et
// chaque étape porte la fiche officielle d'où elle vient, avec sa date. La
// liste vit dans src/lib/taxGuide.ts, où un test vérifie qu'aucune étape n'a
// perdu sa source. Les cases cochées restent sur l'appareil, le temps de la
// session : ce n'est pas une donnée, c'est un aide-mémoire.

import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLang } from "../../src/contexts/LangContext";
import { useSession } from "../../src/contexts/SessionContext";
import { goBack } from "../../src/lib/nav";
import { loadAdviceProfile } from "../../src/lib/premiumStore";
import { stepsFor } from "../../src/lib/taxGuide";
import { openExternal } from "../../src/utils/openExternal";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.10)";

export default function ImpotsScreen() {
  const { t, lang } = useLang();
  const { user } = useSession();
  const [occupation, setOccupation] = useState<string | undefined>(undefined);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    loadAdviceProfile(user.id, null).then((p) => {
      if (alive) setOccupation(p.occupation);
    });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const steps = useMemo(() => stepsFor(occupation), [occupation]);
  const fmtDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang, { dateStyle: "long" }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={10} accessibilityRole="button">
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={s.title}>{t("impots.title")}</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={s.intro}>{t("impots.intro")}</Text>
        <Text style={s.progress}>
          {done.filter((d) => steps.some((st) => st.id === d)).length} / {steps.length}
        </Text>

        {steps.map((step, i) => {
          const on = done.includes(step.id);
          return (
            <View key={step.id} style={[s.card, on && s.cardOn]} testID={`impots-step-${step.id}`}>
              <TouchableOpacity
                onPress={() =>
                  setDone((cur) => (on ? cur.filter((x) => x !== step.id) : [...cur, step.id]))
                }
                style={s.row}
                activeOpacity={0.8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
              >
                <View style={[s.box, on && s.boxOn]}>
                  {on ? <Feather name="check" size={13} color="#04140B" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.stepNum}>{i + 1}</Text>
                  <Text style={[s.stepTitle, on && { color: TEXT_2 }]}>
                    {t(`impots.step.${step.id}.title`)}
                  </Text>
                </View>
              </TouchableOpacity>
              <Text style={s.stepBody}>{t(`impots.step.${step.id}.body`)}</Text>
              <TouchableOpacity
                onPress={() => openExternal(step.sourceUrl)}
                accessibilityRole="link"
                style={s.sourceRow}
              >
                <Feather name="external-link" size={12} color={TEXT_3} />
                <Text style={s.source}>
                  {t("impots.source")} · {t("impots.verified")} {fmtDate(step.verified)}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <Text style={s.foot}>{t("impots.disclaimer")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "800" },
  intro: { color: TEXT_2, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  progress: { color: GOLD, fontSize: 13, fontWeight: "800", marginBottom: 14 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, marginBottom: 10 },
  cardOn: { borderColor: "rgba(74,222,128,0.35)" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.4, borderColor: BORDER, alignItems: "center", justifyContent: "center", marginTop: 2 },
  boxOn: { backgroundColor: GOLD, borderColor: GOLD },
  stepNum: { color: TEXT_3, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  stepTitle: { color: TEXT_1, fontSize: 15, fontWeight: "800", marginTop: 1 },
  stepBody: { color: TEXT_2, fontSize: 13, lineHeight: 18.5, marginTop: 8, marginLeft: 33 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, marginLeft: 33 },
  source: { color: TEXT_3, fontSize: 11, textDecorationLine: "underline" },
  foot: { color: TEXT_3, fontSize: 11.5, lineHeight: 16, marginTop: 14 },
});
