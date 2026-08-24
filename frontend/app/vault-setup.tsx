// Activation du chiffrement de bout en bout, en trois temps.
//
// LE PARTI PRIS : la troisième étape fait RESSAISIR trois mots au hasard avant
// de valider. C'est de la friction volontaire, et c'est la partie la plus
// importante de l'écran.
//
// Sans elle, l'immense majorité des gens cochent « j'ai noté » sans rien noter
// — puis perdent leurs données au changement de téléphone. Une case à cocher
// mesure la bonne volonté ; redemander trois mots mesure le fait. Comme il n'y
// a aucune récupération possible, c'est la seule protection qui existe.
//
// Et on annonce le risque AVANT de générer la phrase, pas après. Quelqu'un qui
// refuse d'assumer cette contrainte doit pouvoir repartir sans avoir rien
// activé.

import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLang } from "../src/contexts/LangContext";
import { useSession } from "../src/contexts/SessionContext";
import { keyPersistsOnThisDevice } from "../src/lib/crypto/keystore";
import { setUpVault } from "../src/lib/crypto/vault";
import { normalizePhrase, phraseWords } from "../src/lib/crypto/vaultKey";
import { notify } from "../src/utils/notify";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const WARN = "#FCD34D";
const BORDER = "rgba(255,255,255,0.08)";

/** Nombre de mots redemandés à l'étape de vérification. */
const CHECK_COUNT = 3;

type Step = "explain" | "phrase" | "verify";

/** Trois positions distinctes tirées au hasard, dans l'ordre croissant. */
function pickPositions(total: number, count: number): number[] {
  const pool = Array.from({ length: total }, (_, i) => i + 1);
  const picked: number[] = [];
  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return picked.sort((a, b) => a - b);
}

export default function VaultSetup() {
  const { t, tp } = useLang();
  const { user } = useSession();

  const [step, setStep] = useState<Step>("explain");
  const [busy, setBusy] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [copied, setCopied] = useState(false);
  const [positions, setPositions] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const words = phrase ? phraseWords(phrase) : [];

  const generate = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    const result = await setUpVault(user.id);
    setBusy(false);

    if (!result.ok) {
      notify(
        t("vault.setup.failed.title"),
        result.error === "vault-already-set"
          ? t("vault.setup.alreadySet")
          : t("vault.setup.failed.body"),
      );
      return;
    }
    setPhrase(result.phrase);
    setPositions(pickPositions(12, CHECK_COUNT));
    setStep("phrase");
  }, [user?.id, t]);

  const copy = useCallback(async () => {
    await Clipboard.setStringAsync(phrase);
    setCopied(true);
    // Le presse-papiers est partagé avec les autres apps : on ne laisse pas
    // une phrase de récupération y traîner indéfiniment.
    setTimeout(() => Clipboard.setStringAsync(""), 60_000);
  }, [phrase]);

  const verify = useCallback(() => {
    const expected = phraseWords(phrase);
    const wrong = positions.filter(
      (p) => normalizePhrase(answers[p] ?? "") !== expected[p - 1].word,
    );
    if (wrong.length > 0) {
      notify(t("vault.verify.failed.title"), t("vault.verify.failed.body"));
      return;
    }
    notify(t("vault.done.title"), t("vault.done.body"), () => router.back());
  }, [phrase, positions, answers, t]);

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            // Une fois la phrase générée, revenir en arrière serait perdre la
            // seule copie qui existe. On ferme la sortie à ce moment précis.
            disabled={step !== "explain"}
          >
            <Feather
              name="arrow-left"
              size={22}
              color={step === "explain" ? TEXT_1 : "transparent"}
            />
          </TouchableOpacity>
          <Text style={s.title}>{t("vault.title")}</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === "explain" ? (
            <>
              <View style={s.hero}>
                <Feather name="lock" size={28} color={GOLD} />
              </View>
              <Text style={s.h1}>{t("vault.explain.title")}</Text>
              <Text style={s.body}>{t("vault.explain.what")}</Text>

              {/* L'avertissement AVANT la génération. C'est le moment où le
                  choix est encore réversible. */}
              <View style={s.warnBox}>
                <Feather name="alert-triangle" size={17} color={WARN} />
                <Text style={s.warnText}>{t("vault.explain.warning")}</Text>
              </View>

              <Text style={s.body}>{t("vault.explain.howto")}</Text>

              {!keyPersistsOnThisDevice ? (
                <Text style={s.note}>{t("vault.explain.webNote")}</Text>
              ) : null}

              <TouchableOpacity
                style={[s.primaryBtn, busy && { opacity: 0.6 }]}
                onPress={generate}
                disabled={busy}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                {busy ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={s.primaryBtnText}>{t("vault.explain.cta")}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                style={{ paddingVertical: 16 }}
                activeOpacity={0.7}
              >
                <Text style={s.linkText}>{t("vault.explain.later")}</Text>
              </TouchableOpacity>
            </>
          ) : step === "phrase" ? (
            <>
              <Text style={s.h1}>{t("vault.phrase.title")}</Text>
              <Text style={s.body}>{t("vault.phrase.body")}</Text>

              <View style={s.grid}>
                {words.map(({ index, word }) => (
                  <View key={index} style={s.wordChip}>
                    <Text style={s.wordIndex}>{index}</Text>
                    <Text style={s.wordText} selectable>
                      {word}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={s.copyBtn}
                onPress={copy}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Feather name={copied ? "check" : "copy"} size={15} color={GOLD} />
                <Text style={s.copyText}>
                  {t(copied ? "vault.phrase.copied" : "vault.phrase.copy")}
                </Text>
              </TouchableOpacity>
              <Text style={s.note}>{t("vault.phrase.clipboardNote")}</Text>

              <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => setStep("verify")}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Text style={s.primaryBtnText}>{t("vault.phrase.cta")}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.h1}>{t("vault.verify.title")}</Text>
              <Text style={s.body}>{t("vault.verify.body")}</Text>

              {positions.map((p) => (
                <View key={p}>
                  <Text style={s.label}>{tp("vault.verify.wordN", { n: p })}</Text>
                  <TextInput
                    style={s.input}
                    value={answers[p] ?? ""}
                    onChangeText={(v) => setAnswers((prev) => ({ ...prev, [p]: v }))}
                    autoCapitalize="none"
                    autoCorrect={false}
                    // Pas de suggestion du clavier : elle donnerait la réponse
                    // à quelqu'un qui vient de copier la phrase.
                    autoComplete="off"
                    spellCheck={false}
                    accessibilityLabel={tp("vault.verify.wordN", { n: p })}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={s.primaryBtn}
                onPress={verify}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Text style={s.primaryBtnText}>{t("vault.verify.cta")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setStep("phrase")}
                style={{ paddingVertical: 16 }}
                activeOpacity={0.7}
              >
                <Text style={s.linkText}>{t("vault.verify.showAgain")}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  hero: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(74,222,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  h1: {
    color: TEXT_1,
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 28,
    marginBottom: 12,
  },
  body: { color: TEXT_2, fontSize: 14.5, lineHeight: 22, marginBottom: 16 },
  note: { color: TEXT_3, fontSize: 12, lineHeight: 17, marginBottom: 16 },
  warnBox: {
    flexDirection: "row",
    gap: 11,
    backgroundColor: "rgba(252,211,77,0.08)",
    borderWidth: 1,
    borderColor: "rgba(252,211,77,0.28)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  warnText: { flex: 1, color: "#FDE68A", fontSize: 13.5, lineHeight: 20 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  wordChip: {
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
  wordIndex: {
    color: TEXT_3,
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  wordText: { color: TEXT_1, fontSize: 14.5, fontWeight: "600" },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  copyText: { color: GOLD, fontSize: 13.5, fontWeight: "700" },
  label: {
    color: TEXT_3,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: TEXT_1,
    fontSize: 15,
    marginBottom: 18,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 6,
  },
  primaryBtnText: { color: "#000", fontSize: 15, fontWeight: "800" },
  linkText: { color: TEXT_2, fontSize: 13.5, fontWeight: "600", textAlign: "center" },
});
