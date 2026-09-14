// Déclaration de revenus — le guide pas à pas.
//
// Un écran qu'on coche, pas un simulateur. Chaque étape dit quoi faire, et
// chaque étape porte la fiche officielle d'où elle vient, avec sa date. La
// liste vit dans src/lib/taxGuide.ts, où un test vérifie qu'aucune étape n'a
// perdu sa source. Les cases cochées restent sur l'appareil, le temps de la
// session : ce n'est pas une donnée, c'est un aide-mémoire.

import { alpha } from "../../src/theme/accents";
import { useAccent } from "../../src/contexts/ThemeContext";
import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLang } from "../../src/contexts/LangContext";
import { useSession } from "../../src/contexts/SessionContext";
import { goBack } from "../../src/lib/nav";
import { loadAdviceProfile } from "../../src/lib/premiumStore";
import { loadProfileDetails } from "../../src/lib/profile";
import { audiencesOf, stepsFor, type TaxProfile } from "../../src/lib/taxGuide";
import { ADVICE_CATALOG_FR } from "../../src/lib/adviceEngine";
import type { Country } from "../../src/types/advice";
import { openExternal } from "../../src/utils/openExternal";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const BORDER = "rgba(255,255,255,0.10)";

export default function ImpotsScreen() {
  const GOLD = useAccent().main;
  const s = useMemo(() => makeS(GOLD), [GOLD]);
  const { t, lang } = useLang();
  const { user } = useSession();
  const [taxProfile, setTaxProfile] = useState<TaxProfile>({});
  const [country, setCountry] = useState<Country | undefined>(undefined);
  const [done, setDone] = useState<string[]>([]);

  // Le guide lit deux choses : le profil Coach (situation, enfants) et le
  // réglage « Dons & cadeaux ». Rien d'autre — pas de montant, pas de revenu.
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    Promise.all([loadAdviceProfile(user.id, null), loadProfileDetails(user.id)]).then(
      ([p, details]) => {
        if (!alive) return;
        setCountry(p.country);
        setTaxProfile({
          occupation: p.occupation ?? details.occupation_status ?? undefined,
          gives: details.tithe_enabled && details.tithe_percent > 0,
          youngKids: !!p.children?.includes("0-6"),
        });
      },
    );
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const steps = useMemo(() => stepsFor(taxProfile), [taxProfile]);
  const audiences = useMemo(() => audiencesOf(taxProfile), [taxProfile]);
  // Hors de France, le pas-à-pas n'a pas de sens : chaque pays a ses
  // formulaires. On montre la fiche « portail officiel » du pays quand elle
  // existe dans le catalogue (vérifiée, datée), et rien d'inventé sinon.
  const foreign = !!country && country !== "FR";
  const portal = useMemo(
    () => (foreign ? ADVICE_CATALOG_FR.find((c) => c.id.startsWith("tax-portal-") && c.countries?.includes(country)) : undefined),
    [foreign, country],
  );
  const portalLink = portal && typeof portal.action === "object" ? portal.action.link : undefined;
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
        {foreign ? (
          <>
            <View style={s.card}>
              <Text style={s.stepTitle}>{portal ? t(portal.titleKey ?? "") : t("impots.other.title")}</Text>
              <Text style={[s.stepBody, { marginLeft: 0 }]}>
                {portal ? t(portal.bodyKey ?? "") : t("impots.other.none")}
              </Text>
              {portalLink ? (
                <TouchableOpacity onPress={() => openExternal(portalLink)} style={s.cta} accessibilityRole="link">
                  <Feather name="external-link" size={16} color="#04140B" />
                  <Text style={s.ctaText}>{t(portal?.actionLabelKey ?? "impots.other.open")}</Text>
                </TouchableOpacity>
              ) : null}
              {portal ? (
                <Text style={[s.source, { marginTop: 8 }]}>
                  {t("impots.source")} · {t("impots.verified")} {fmtDate(portal.lastVerified ?? "")}
                </Text>
              ) : null}
            </View>
            <Text style={s.foot}>{t("impots.other.frOnly")}</Text>
          </>
        ) : null}
        {foreign ? null : (
        <>
        <Text style={s.intro}>{t("impots.intro")}</Text>
        {/* Pourquoi CES étapes : la personne voit ce que le guide a retenu
            d'elle, et peut corriger dans son profil si c'est faux. */}
        <View style={s.audRow}>
          <Text style={s.audLead}>{t("impots.for.lead")}</Text>
          {audiences.map((a) => (
            <View key={a} style={s.audChip}>
              <Text style={s.audChipText}>{t(`impots.for.${a}`)}</Text>
            </View>
          ))}
        </View>
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
              {/* Où, concrètement : le formulaire, la rubrique, la case quand la
                  source officielle la donne — sinon on le dit. */}
              <View style={s.whereRow}>
                <Feather name="map-pin" size={12} color={GOLD} style={{ marginTop: 3 }} />
                <Text style={s.where}>
                  <Text style={s.whereLead}>{t("impots.where.lead")} </Text>
                  {t(`impots.step.${step.id}.where`)}
                </Text>
              </View>
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
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeS = (GOLD: string) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "800" },
  intro: { color: TEXT_2, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  progress: { color: GOLD, fontSize: 13, fontWeight: "800", marginBottom: 14 },
  audRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 10 },
  audLead: { color: TEXT_3, fontSize: 12 },
  audChip: { borderRadius: 999, borderWidth: 1, borderColor: alpha(GOLD, 0.35), backgroundColor: alpha(GOLD, 0.08), paddingHorizontal: 9, paddingVertical: 3 },
  audChipText: { color: GOLD, fontSize: 12, fontWeight: "700" },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, marginBottom: 10 },
  cardOn: { borderColor: alpha(GOLD, 0.35) },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.4, borderColor: BORDER, alignItems: "center", justifyContent: "center", marginTop: 2 },
  boxOn: { backgroundColor: GOLD, borderColor: GOLD },
  stepNum: { color: TEXT_3, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  stepTitle: { color: TEXT_1, fontSize: 15, fontWeight: "800", marginTop: 1 },
  stepBody: { color: TEXT_2, fontSize: 13, lineHeight: 18.5, marginTop: 8, marginLeft: 33 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, marginLeft: 33 },
  source: { color: TEXT_3, fontSize: 11, textDecorationLine: "underline" },
  foot: { color: TEXT_3, fontSize: 11.5, lineHeight: 16, marginTop: 14 },
  whereRow: { flexDirection: "row", gap: 6, marginTop: 8, marginLeft: 33, padding: 9, borderRadius: 10, backgroundColor: alpha(GOLD, 0.07), borderWidth: 1, borderColor: alpha(GOLD, 0.25) },
  where: { flex: 1, color: TEXT_2, fontSize: 12.5, lineHeight: 18 },
  whereLead: { color: GOLD, fontWeight: "800" },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: GOLD, borderRadius: 12, paddingVertical: 12, marginTop: 12 },
  ctaText: { color: "#04140B", fontSize: 14, fontWeight: "800" },
  });
