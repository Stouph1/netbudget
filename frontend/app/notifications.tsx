// Réglages fins des notifications.
//
// PARTI PRIS D'INTERFACE : montrer ce qui va arriver, pas seulement offrir des
// interrupteurs. Le réflexe « je coupe tout » vient de l'incertitude — on ne
// sait pas ce qu'on a accepté. En affichant les prochaines notifications
// réellement planifiées, l'utilisateur constate qu'il s'agit de deux ou trois
// messages utiles, et il garde le canal ouvert.
//
// Les catégories sont indépendantes : couper les rappels de budget ne doit pas
// faire perdre l'alerte « tu as droit à cette aide », qui est la plus utile.

import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCurrency } from "../src/contexts/CurrencyContext";
import { useLang } from "../src/contexts/LangContext";
import { useActiveScope } from "../src/contexts/ScopeContext";
import { useSession } from "../src/contexts/SessionContext";
import { loadAdviceProfile } from "../src/lib/premiumStore";
import type { NotifCategory, NotifPrefs } from "../src/utils/notificationEngine";
import {
  loadNotifPrefs,
  saveNotifPrefs,
  syncPersonalNotifications,
  type SyncInput,
} from "../src/utils/notificationScheduler";
import { buildSyncInput } from "../src/utils/notificationSources";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

// Ordre d'affichage : du plus utile au plus accessoire. Ce n'est pas cosmétique
// — la première ligne est celle qu'on lit, et c'est celle qu'il faut garder.
const CATEGORIES: { key: NotifCategory; icon: keyof typeof Feather.glyphMap }[] = [
  // La facturation n'apparaît PAS ici, volontairement : l'avis de fin d'essai
  // n'est pas une préférence, c'est ce qui évite qu'un client soit prélevé
  // sans le savoir. Le rendre désactivable revenait à proposer d'y renoncer.
  { key: "rights", icon: "award" },
  { key: "event", icon: "calendar" },
  { key: "goal", icon: "target" },
  { key: "budget", icon: "pie-chart" },
  { key: "loan", icon: "home" },
  { key: "seasonal", icon: "sun" },
  { key: "comeback", icon: "refresh-cw" },
];

const FREQUENCIES = [1, 2, 3, 5];
const HOURS = [9, 12, 19, 21];

export default function NotificationSettings() {
  const { t, tp } = useLang();
  const { user } = useSession();
  const { workspaceId } = useActiveScope();
  const { currency } = useCurrency();

  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [input, setInput] = useState<SyncInput | null>(null);

  const tt = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      params ? tp(key, params) : t(key),
    [t, tp],
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const profile = user?.id
          ? await loadAdviceProfile(user.id, workspaceId).catch(() => null)
          : null;
        const built = await buildSyncInput({
          userId: user?.id,
          workspaceId,
          displayCurrency: currency,
          profile,
        });
        const p = await loadNotifPrefs();
        if (!alive) return;
        setInput(built);
        setPrefs(p);
      })();
      return () => {
        alive = false;
      };
    }, [user?.id, workspaceId, currency]),
  );

  // Toute modification est appliquée immédiatement : on enregistre, on
  // reprogramme, et l'aperçu se met à jour sous les yeux de l'utilisateur.
  const update = useCallback(
    async (patch: Partial<NotifPrefs>) => {
      if (!prefs) return;
      const next = { ...prefs, ...patch };
      setPrefs(next);
      await saveNotifPrefs(next);
      if (!input) return;
      await syncPersonalNotifications(input, tt);
    },
    [prefs, input, tt],
  );



  if (!prefs) {
    return (
      <SafeAreaView style={s.screen}>
        <ActivityIndicator color={GOLD} style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          testID="notif-back"
        >
          <Feather name="arrow-left" size={20} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={s.title}>{t("notifPrefs.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>{t("notifPrefs.intro")}</Text>

        {/* --- Fréquence ------------------------------------------------- */}
        <Text style={s.sectionTitle}>{t("notifPrefs.frequency.title")}</Text>
        <View style={s.chipRow}>
          {FREQUENCIES.map((n) => {
            const active = prefs.maxPerWeek === n;
            return (
              <TouchableOpacity
                key={n}
                onPress={() => update({ maxPerWeek: n })}
                style={[s.chip, active && s.chipActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tp("notifPrefs.frequency.perWeek", { n })}
                testID={`notif-freq-${n}`}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {tp("notifPrefs.frequency.perWeek", { n })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.hint}>{t("notifPrefs.frequency.hint")}</Text>

        {/* --- Heure ------------------------------------------------------ */}
        <Text style={s.sectionTitle}>{t("notifPrefs.hour.title")}</Text>
        <View style={s.chipRow}>
          {HOURS.map((h) => {
            const active = prefs.hour === h;
            return (
              <TouchableOpacity
                key={h}
                onPress={() => update({ hour: h })}
                style={[s.chip, active && s.chipActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tp("notifPrefs.hour.at", { h })}
                testID={`notif-hour-${h}`}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {tp("notifPrefs.hour.at", { h })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* --- Catégories -------------------------------------------------- */}
        <Text style={s.sectionTitle}>{t("notifPrefs.categories.title")}</Text>
        <View style={s.card}>
          {CATEGORIES.map(({ key, icon }, i) => (
            <View key={key} style={[s.row, i > 0 && s.rowBorderTop]}>
              <Feather
                name={icon}
                size={18}
                color={prefs[key] ? GOLD : TEXT_3}
                style={{ marginTop: 2 }}
              />
              <View style={s.rowText}>
                <Text style={s.rowLabel}>{t(`notifPrefs.cat.${key}.label`)}</Text>
                <Text style={s.rowDesc}>{t(`notifPrefs.cat.${key}.desc`)}</Text>
              </View>
              <Switch
                value={prefs[key]}
                onValueChange={(v) => update({ [key]: v } as Partial<NotifPrefs>)}
                trackColor={{ false: BORDER, true: GOLD }}
                thumbColor="#fff"
                ios_backgroundColor={BORDER}
                accessibilityLabel={t(`notifPrefs.cat.${key}.label`)}
                testID={`notif-cat-${key}`}
              />
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: MIDNIGHT },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
  },
  title: { color: TEXT_1, fontSize: 20, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  intro: { color: TEXT_2, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  sectionTitle: {
    color: TEXT_3,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 10,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: { backgroundColor: "rgba(74,222,128,0.14)", borderColor: GOLD },
  chipText: { color: TEXT_2, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: GOLD },
  hint: { color: TEXT_3, fontSize: 12, lineHeight: 17, marginTop: 8 },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14 },
  rowBorderTop: { borderTopWidth: 1, borderTopColor: BORDER },
  rowText: { flex: 1 },
  rowLabel: { color: TEXT_1, fontSize: 15, fontWeight: "600" },
  rowDesc: { color: TEXT_3, fontSize: 12, lineHeight: 17, marginTop: 2 },
  previewRow: { paddingVertical: 14 },
  previewWhen: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  previewTitle: { color: TEXT_1, fontSize: 15, fontWeight: "600", marginTop: 4 },
  previewBody: { color: TEXT_2, fontSize: 13, lineHeight: 18, marginTop: 2 },
  empty: { color: TEXT_3, fontSize: 13, lineHeight: 19, paddingVertical: 16 },
});
