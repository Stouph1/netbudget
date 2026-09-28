// L'écran qui précède la demande système de notifications.
//
// Il dit trois choses concrètes qu'on enverra, et la limite (trois par
// semaine). Deux boutons, aucun piège : « Plus tard » ferme sans rien
// demander, et on ne revient pas à la charge avant deux semaines.
import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLang } from "../contexts/LangContext";
import { useAccent } from "../contexts/ThemeContext";
import { useSheetBottom } from "../hooks/useSheetBottom";
import { alpha } from "../theme/accents";
import { ensureMonthlyRemindersScheduled, pickMonthlyVariants, requestPermissionOnce } from "../utils/notifications";
import { emitNotificationsGranted, markPrimed, shouldPrimeNotifications } from "../utils/notificationPrimer";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const BORDER = "rgba(255,255,255,0.10)";

const BULLETS: { icon: keyof typeof Feather.glyphMap; key: string }[] = [
  { icon: "calendar", key: "notifPrimer.b1" },
  { icon: "flag", key: "notifPrimer.b2" },
  { icon: "gift", key: "notifPrimer.b3" },
];

export function NotificationPrimer({ delayMs = 1800 }: { delayMs?: number }) {
  const GOLD = useAccent().main;
  const s = useMemo(() => makeS(GOLD), [GOLD]);
  const { t } = useLang();
  const sheetBottom = useSheetBottom(28);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      if (await shouldPrimeNotifications()) {
        if (alive) setVisible(true);
      }
    }, delayMs);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [delayMs]);

  async function later() {
    await markPrimed();
    setVisible(false);
  }

  async function enable() {
    setBusy(true);
    await markPrimed();
    const granted = await requestPermissionOnce();
    if (granted) {
      await ensureMonthlyRemindersScheduled(pickMonthlyVariants(t));
      emitNotificationsGranted();
    }
    setBusy(false);
    setVisible(false);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={later}>
      <Pressable style={s.backdrop} onPress={later}>
        <Pressable style={[s.sheet, { paddingBottom: sheetBottom }]} onPress={(e) => e.stopPropagation()}>
          <View style={s.grabber} />
          <Text style={s.title}>{t("notifPrimer.title")}</Text>
          <Text style={s.sub}>{t("notifPrimer.body")}</Text>

          <View style={s.list}>
            {BULLETS.map((b) => (
              <View key={b.key} style={s.row}>
                <View style={s.iconWrap}>
                  <Feather name={b.icon} size={16} color={GOLD} />
                </View>
                <Text style={s.rowText}>{t(b.key)}</Text>
              </View>
            ))}
          </View>

          <Text style={s.note}>{t("notifPrimer.note")}</Text>

          <TouchableOpacity
            style={s.cta}
            onPress={enable}
            disabled={busy}
            activeOpacity={0.85}
            accessibilityRole="button"
            testID="notif-primer-enable"
          >
            <Text style={s.ctaText}>{t("notifPrimer.cta")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.later}
            onPress={later}
            activeOpacity={0.7}
            accessibilityRole="button"
            testID="notif-primer-later"
          >
            <Text style={s.laterText}>{t("notifPrimer.later")}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeS = (GOLD: string) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: MIDNIGHT,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    grabber: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignSelf: "center",
      marginBottom: 16,
    },
    title: { color: TEXT_1, fontSize: 20, fontWeight: "800" },
    sub: { color: TEXT_2, fontSize: 13.5, lineHeight: 19, marginTop: 6, marginBottom: 14 },
    list: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: BORDER,
      backgroundColor: SURFACE,
      paddingVertical: 4,
      paddingHorizontal: 12,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: alpha(GOLD, 0.12),
    },
    rowText: { flex: 1, color: TEXT_1, fontSize: 14, lineHeight: 19 },
    note: { color: TEXT_3, fontSize: 12, lineHeight: 17, marginTop: 12, textAlign: "center" },
    cta: { marginTop: 14, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
    ctaText: { color: "#04140B", fontSize: 15, fontWeight: "800" },
    later: { alignItems: "center", paddingVertical: 13, marginTop: 4 },
    laterText: { color: TEXT_2, fontSize: 14, fontWeight: "600" },
  });
