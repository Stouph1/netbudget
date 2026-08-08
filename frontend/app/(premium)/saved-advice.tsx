// Dépôt de conseils — les cartes gardées (swipe droite à l'anniversaire).
import { openExternal } from "../../src/utils/openExternal";
// Accessible depuis le Profil. Suppression à l'unité.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useLang } from "../../src/contexts/LangContext";
import { useSession } from "../../src/contexts/SessionContext";
import type { Lang } from "../../src/i18n/translations";
import {
  loadSavedAdvice,
  removeSavedAdvice,
  type SavedAdviceItem,
} from "../../src/lib/premiumStore";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

// Locale d'affichage des dates, dérivée de la langue de l'app.
const DATE_LOCALES: Record<Lang, string> = {
  fr: "fr-FR",
  en: "en-GB",
  es: "es-ES",
  pt: "pt-PT",
  de: "de-DE",
  it: "it-IT",
  ar: "ar",
  ja: "ja-JP",
};

// Regroupe par origine : mon anniversaire, celui d'un enfant, d'un animal…
function groupBySource(
  items: SavedAdviceItem[],
  t: (key: string) => string,
  tp: (key: string, params: Record<string, string | number>) => string,
): { label: string; entries: SavedAdviceItem[] }[] {
  const byLabel = new Map<string, SavedAdviceItem[]>();
  const labelOf = (src: string): string => {
    if (src === "birthday") return t("saved.src.birthday");
    if (src.startsWith("child:")) return tp("saved.src.child", { name: src.slice(6) });
    if (src.startsWith("pet:")) return tp("saved.src.pet", { name: src.slice(4) });
    if (src === "coach") return t("saved.src.coach");
    return t("saved.src.other");
  };
  for (const it of items) {
    const label = labelOf(it.source);
    byLabel.set(label, [...(byLabel.get(label) ?? []), it]);
  }
  return [...byLabel.entries()].map(([label, entries]) => ({
    label,
    entries: entries.sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
  }));
}

const TONE_BORDER: Record<string, string> = {
  good: "#4ADE80",
  gold: "#FCD34D",
  bad: "#F87171",
  neutral: "rgba(255,255,255,0.12)",
};

export default function SavedAdvice() {
  const { lang, t, tp } = useLang();
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = useState<SavedAdviceItem[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      let cancelled = false;
      loadSavedAdvice(user.id).then((list) => {
        if (!cancelled) setItems(list);
      });
      return () => {
        cancelled = true;
      };
    }, [user?.id]),
  );

  async function remove(id: string) {
    if (!user?.id) return;
    setItems((prev) => (prev ?? []).filter((x) => x.id !== id));
    await removeSavedAdvice(user.id, id);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("saved.title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      {sessionLoading || items === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="bookmark" size={30} color={TEXT_3} />
          <Text style={styles.emptyTitle}>{t("saved.empty.title")}</Text>
          <Text style={styles.emptyBody}>{t("saved.empty.body")}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          {groupBySource(items, t, tp).map(({ label, entries }) => (
            <View key={label} style={{ marginBottom: 10 }}>
              <Text style={styles.sectionTitle}>{label}</Text>
              {entries.map((it) => (
                <View
                  key={it.id}
                  style={[
                    styles.card,
                    { borderLeftColor: TONE_BORDER[it.tone ?? "neutral"] },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {it.emoji ? <Text style={{ fontSize: 20 }}>{it.emoji}</Text> : null}
                    <Text style={styles.cardTitle}>{it.title}</Text>
                    <TouchableOpacity
                      onPress={() => remove(it.id)}
                      hitSlop={10}
                      style={{ marginLeft: "auto" }}
                    >
                      <Feather name="trash-2" size={16} color={TEXT_3} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardBody}>{it.body}</Text>
                  {it.sources?.length ? (
                    <View style={{ marginTop: 8, gap: 4 }}>
                      {it.sources.map((src, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={() => openExternal(src)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                        >
                          <Feather name="external-link" size={11} color={GOLD} />
                          <Text style={styles.sourceLink} numberOfLines={1}>
                            {src.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                  <Text style={styles.cardMeta}>
                    {tp("saved.savedOn", {
                      date: new Date(it.savedAt).toLocaleDateString(
                        DATE_LOCALES[lang],
                      ),
                    })}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTitle: { color: TEXT_1, fontSize: 16, fontWeight: "600", marginTop: 14 },
  emptyBody: {
    color: TEXT_2,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 280,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: TEXT_1, fontSize: 15, fontWeight: "700", flexShrink: 1 },
  cardBody: { color: TEXT_2, fontSize: 13, lineHeight: 19, marginTop: 8 },
  cardMeta: { color: TEXT_3, fontSize: 11, marginTop: 10 },
  sectionTitle: {
    color: TEXT_2,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  sourceLink: { color: GOLD, fontSize: 12, flexShrink: 1 },
});
