// Sauvegarde de la clé : douze mots, et rien d'autre.
//
// CE QUE CET ÉCRAN NE FAIT PAS, volontairement. Il n'explique pas ce qu'est le
// chiffrement, ne vante pas la protection obtenue, ne demande pas
// d'autorisation. Le chiffrement est déjà actif — il l'a été sans rien demander
// à personne. Un écran qui argumente sur la sécurité produit l'effet inverse de
// celui recherché : il donne à penser qu'il y avait un risque, donc un doute.
//
// Il sert à une seule chose : permettre à qui le veut de conserver son accès
// avant de changer de téléphone. Deux phrases, les mots, un bouton.

import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLang } from "../src/contexts/LangContext";
import { useSession } from "../src/contexts/SessionContext";
import { backupPhrase } from "../src/lib/crypto/vault";
import { phraseWords } from "../src/lib/crypto/vaultKey";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

export default function VaultBackup() {
  const { t } = useLang();
  const { user } = useSession();
  const [phrase, setPhrase] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    backupPhrase(user.id)
      .then((p) => {
        if (!alive) return;
        setPhrase(p);
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  async function copy() {
    if (!phrase) return;
    await Clipboard.setStringAsync(phrase);
    setCopied(true);
    // Le presse-papiers est partagé avec les autres apps : on n'y laisse pas
    // traîner un accès aux données.
    setTimeout(() => Clipboard.setStringAsync(""), 60_000);
  }

  const words = phrase ? phraseWords(phrase) : [];

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={s.title}>{t("vault.backup.title")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {loading ? (
          <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />
        ) : !phrase ? (
          // Cas du navigateur : la clé n'est pas conservée, donc il n'y a rien
          // à sauvegarder ici.
          <Text style={s.body}>{t("vault.backup.unavailable")}</Text>
        ) : (
          <>
            <Text style={s.body}>{t("vault.backup.body")}</Text>

            <View style={s.grid}>
              {words.map(({ index, word }) => (
                <View key={index} style={s.chip}>
                  <Text style={s.chipIndex}>{index}</Text>
                  <Text style={s.chipWord} selectable>
                    {word}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={s.copyBtn}
              onPress={copy}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Feather name={copied ? "check" : "copy"} size={16} color="#000" />
              <Text style={s.copyText}>
                {t(copied ? "vault.backup.copied" : "vault.backup.copy")}
              </Text>
            </TouchableOpacity>

            <Text style={s.note}>{t("vault.backup.note")}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { color: TEXT_1, fontSize: 17, fontWeight: "700" },
  body: { color: TEXT_2, fontSize: 14.5, lineHeight: 22, marginBottom: 22 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 22 },
  chip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    minWidth: "30%",
  },
  chipIndex: {
    color: TEXT_3,
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  chipWord: { color: TEXT_1, fontSize: 14.5, fontWeight: "600" },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
  },
  copyText: { color: "#000", fontSize: 15, fontWeight: "800" },
  note: { color: TEXT_3, fontSize: 12, lineHeight: 17, marginTop: 14 },
});
