// Le conseil de la semaine.
//
// UNE carte, UN conseil, renouvelé chaque lundi. Elle arrive fermée : on la
// touche pour la découvrir. C'est la seule « récompense variable » de l'app,
// et elle est faite de contenu utile, pas d'un badge : le conseil vient du
// moteur (matchAdvice), donc de la situation réelle de la personne.
//
// Le choix est déterministe (numéro de semaine) : deux ouvertures le même
// jour montrent le même conseil, et on ne saute jamais une semaine parce
// qu'un tirage est tombé deux fois sur la même carte.
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLang } from "../contexts/LangContext";
import { useAccent } from "../contexts/ThemeContext";
import { matchAdvice, universalAdvice } from "../lib/adviceEngine";
import { loadAdviceProfile } from "../lib/premiumStore";
import { alpha } from "../theme/accents";
import { resolveBody, resolveTitle, type AdviceCard, type UserProfile } from "../types/advice";
import { pickWeekly, weekKey } from "../lib/weeklyAdvice";

const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const BORDER = "rgba(255,255,255,0.10)";
const REVEALED_KEY = "netbudget:weeklyAdvice:revealed";

export function WeeklyAdviceCard({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string | null;
}) {
  const GOLD = useAccent().main;
  const s = useMemo(() => makeS(GOLD), [GOLD]);
  const { t, tp } = useLang();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [card, setCard] = useState<AdviceCard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const key = weekKey(new Date());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await loadAdviceProfile(userId, workspaceId);
        // Pays sans catalogue dédié : on pioche dans les conseils universels
        // plutôt que de ne rien montrer.
        let matched: AdviceCard[] = [];
        try {
          matched = matchAdvice(p);
        } catch {}
        const pool = matched.length > 0 ? matched : universalAdvice(p);
        if (!alive) return;
        setProfile(p);
        setCard(pickWeekly(pool, key));
        const seen = await AsyncStorage.getItem(REVEALED_KEY);
        if (alive) setRevealed(seen === key);
      } catch {
        if (alive) setCard(null); // profil incomplet : pas de carte, pas d'erreur
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, workspaceId, key]);

  if (!card || !profile) return null;
  const i18n = { t, tp };

  async function reveal() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRevealed(true);
    try {
      await AsyncStorage.setItem(REVEALED_KEY, key);
    } catch {}
  }

  if (!revealed) {
    return (
      <TouchableOpacity style={[s.card, s.locked]} onPress={reveal} activeOpacity={0.85} accessibilityRole="button" testID="weekly-advice-locked">
        <View style={s.gift}>
          <Feather name="gift" size={20} color={GOLD} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t("weekly.title")}</Text>
          <Text style={s.body}>{t("weekly.locked")}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={TEXT_2} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.card} testID="weekly-advice-open">
      <View style={s.row}>
        <Feather name="gift" size={15} color={GOLD} />
        <Text style={s.eyebrow}>{t("weekly.title")}</Text>
      </View>
      <Text style={s.adviceTitle}>{resolveTitle(card, i18n)}</Text>
      <Text style={s.adviceBody} numberOfLines={4}>
        {resolveBody(card, profile, i18n)}
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/(premium)/advice" as never)}
        style={s.cta}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={s.ctaText}>{t("weekly.open")}</Text>
        <Feather name="arrow-right" size={14} color={GOLD} />
      </TouchableOpacity>
      <Text style={s.foot}>{t("weekly.renew")}</Text>
    </View>
  );
}

const makeS = (GOLD: string) =>
  StyleSheet.create({
    card: {
      backgroundColor: SURFACE,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: alpha(GOLD, 0.35),
      padding: 16,
      marginBottom: 14,
    },
    locked: { flexDirection: "row", alignItems: "center", gap: 12 },
    gift: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: alpha(GOLD, 0.14),
    },
    row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    eyebrow: { color: TEXT_2, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
    title: { color: TEXT_1, fontSize: 15, fontWeight: "800" },
    body: { color: TEXT_2, fontSize: 13, lineHeight: 18, marginTop: 3 },
    adviceTitle: { color: TEXT_1, fontSize: 16, fontWeight: "800", lineHeight: 22 },
    adviceBody: { color: TEXT_2, fontSize: 13.5, lineHeight: 19, marginTop: 6 },
    cta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
    ctaText: { color: GOLD, fontSize: 13.5, fontWeight: "700" },
    foot: { color: alpha("#94A3B8", 0.8), fontSize: 11, marginTop: 10, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 8 },
  });
