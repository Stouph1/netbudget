// Ressaisie de la phrase sur un appareil qui n'a pas la clé.
//
// C'est l'écran du pire moment : nouveau téléphone, ou navigateur relancé, et
// des données illisibles en attendant. Trois choses le rendent supportable.
//
// 1. UN SEUL CHAMP, pas douze. Douze cases obligent à sauter de l'une à
//    l'autre et interdisent le collage depuis un gestionnaire de mots de passe,
//    qui est pourtant l'endroit où la phrase devrait être rangée.
//
// 2. UN DIAGNOSTIC PRÉCIS. « Phrase invalide » ne dit pas quoi faire. On
//    distingue le compte de mots, le mot inexistant — qu'on nomme — et l'ordre
//    faux détecté par la somme de contrôle. Chacun appelle une correction
//    différente.
//
// 3. LES MOTS DÉJÀ RECONNUS S'AFFICHENT au fur et à mesure. On voit sa
//    progression, et une faute de frappe se repère à l'endroit où le compteur
//    cesse d'avancer.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { goBack } from "../src/lib/nav";
import { useMemo, useState } from "react";
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
import { resetVault, unlockVault } from "../src/lib/crypto/vault";
import { checkPhrase, normalizePhrase, PHRASE_WORDS } from "../src/lib/crypto/vaultKey";
import { WORDLIST } from "../src/lib/crypto/wordlist";
import { confirmDialog, notify } from "../src/utils/notify";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const DANGER = "#F87171";
const BORDER = "rgba(255,255,255,0.08)";

export default function VaultUnlock() {
  const { t, tp } = useLang();
  const { user } = useSession();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  // Analyse à chaque frappe, sans rien envoyer : tout se vérifie localement.
  const analysis = useMemo(() => {
    const normalized = normalizePhrase(input);
    const words = normalized ? normalized.split(" ") : [];
    const known = new Set(WORDLIST);
    return {
      words,
      // Le dernier mot est en cours de frappe : on ne le déclare pas faux
      // tant que l'utilisateur n'a pas mis d'espace derrière.
      typing: input.length > 0 && !input.endsWith(" "),
      unknown: words.filter((w, i) => {
        const isLast = i === words.length - 1;
        if (isLast && !input.endsWith(" ")) return false;
        return !known.has(w);
      }),
      check: checkPhrase(input),
    };
  }, [input]);

  /** Complétions du mot en cours — la liste garantit un préfixe non ambigu à 4 lettres. */
  const suggestions = useMemo(() => {
    if (!analysis.typing) return [];
    const last = analysis.words[analysis.words.length - 1] ?? "";
    if (last.length < 2) return [];
    return WORDLIST.filter((w) => w.startsWith(last)).slice(0, 4);
  }, [analysis]);

  function applySuggestion(word: string) {
    const kept = analysis.words.slice(0, -1);
    setInput([...kept, word].join(" ") + " ");
  }

  async function submit() {
    if (!user?.id) return;
    setBusy(true);
    const result = await unlockVault(user.id, input);
    setBusy(false);

    if (result.ok) {
      notify(t("vault.unlock.done.title"), t("vault.unlock.done.body"), () =>
        goBack(),
      );
      return;
    }
    notify(
      t("vault.unlock.failed.title"),
      t(
        result.reason === "wrongAccount"
          ? "vault.unlock.wrongAccount"
          : result.reason === "notSetUp"
            ? "vault.unlock.notSetUp"
            : result.reason === "invalidPhrase"
              ? "vault.unlock.invalidPhrase"
              : "vault.unlock.error",
      ),
    );
  }

  const ready = analysis.check.ok;

  /** Message de diagnostic sous le champ. Silencieux tant qu'on saisit. */
  function hint(): { text: string; bad: boolean } | null {
    if (input.trim() === "") return null;
    if (analysis.unknown.length > 0) {
      return {
        text: tp("vault.unlock.unknownWords", { words: analysis.unknown.join(", ") }),
        bad: true,
      };
    }
    if (analysis.words.length < PHRASE_WORDS) {
      return {
        text: tp("vault.unlock.progress", {
          n: analysis.words.length,
          total: PHRASE_WORDS,
        }),
        bad: false,
      };
    }
    if (analysis.words.length > PHRASE_WORDS) {
      return { text: t("vault.unlock.tooMany"), bad: true };
    }
    if (!analysis.check.ok && analysis.check.reason === "checksum") {
      return { text: t("vault.unlock.checksum"), bad: true };
    }
    return { text: t("vault.unlock.ready"), bad: false };
  }

  const h = hint();

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => goBack()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
          >
            <Feather name="arrow-left" size={22} color={TEXT_1} />
          </TouchableOpacity>
          <Text style={s.title}>{t("vault.unlock.title")}</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.body}>{t("vault.unlock.body")}</Text>

          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={t("vault.unlock.placeholder")}
            placeholderTextColor={TEXT_3}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            autoFocus
            accessibilityLabel={t("vault.unlock.placeholder")}
          />

          {h ? (
            <Text style={[s.hint, h.bad && { color: DANGER }]}>{h.text}</Text>
          ) : null}

          {suggestions.length > 0 ? (
            <View style={s.suggestRow}>
              {suggestions.map((w) => (
                <TouchableOpacity
                  key={w}
                  style={s.suggestChip}
                  onPress={() => applySuggestion(w)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <Text style={s.suggestText}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.primaryBtn, (!ready || busy) && { opacity: 0.45 }]}
            onPress={submit}
            disabled={!ready || busy}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready || busy, busy }}
          >
            {busy ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={s.primaryBtnText}>{t("vault.unlock.cta")}</Text>
            )}
          </TouchableOpacity>

          {!keyPersistsOnThisDevice ? (
            <Text style={s.note}>{t("vault.unlock.webNote")}</Text>
          ) : null}

          <View style={s.lostBox}>
            <Feather name="help-circle" size={16} color={TEXT_3} />
            <Text style={s.lostText}>{t("vault.unlock.lost")}</Text>
          </View>

          {/* L'ISSUE DE SECOURS.
              Sans elle, quelqu'un qui a perdu sa phrase reste bloqué à vie :
              chaque écriture échoue et rien ne le débloque. On ne peut pas
              déchiffrer à sa place — personne ne peut, c'est la garantie même
              du chiffrement de bout en bout. La seule chose honnête est de
              lui dire ce qu'il perd et de lui laisser la décision.

              Double confirmation, parce que c'est irréversible. */}
          <TouchableOpacity
            style={s.resetBtn}
            onPress={() => {
              const userId = user?.id;
              if (!userId) return;
              // DEUX confirmations, pas une. C'est irréversible et ça détruit
              // des données : un seul « OK » se donne par réflexe.
              confirmDialog(
                t("vault.reset.confirm1.title"),
                t("vault.reset.confirm1.body"),
                t("vault.reset.confirm1.cta"),
                () =>
                  confirmDialog(
                    t("vault.reset.confirm2.title"),
                    t("vault.reset.confirm2.body"),
                    t("vault.reset.confirm2.cta"),
                    async () => {
                      setBusy(true);
                      const result = await resetVault(userId);
                      setBusy(false);
                      if (!result.ok) {
                        notify(t("vault.reset.failed"), result.error);
                        return;
                      }
                      notify(
                        t("vault.reset.done.title"),
                        t("vault.reset.done.body"),
                        () => goBack(),
                      );
                    },
                    { destructive: true, cancelLabel: t("btn.cancel") },
                  ),
                { destructive: true, cancelLabel: t("btn.cancel") },
              );
            }}
            disabled={busy}
            activeOpacity={0.8}
            accessibilityRole="button"
            testID="vault-reset"
          >
            <Feather name="rotate-ccw" size={15} color={DANGER} />
            <Text style={s.resetText}>{t("vault.reset.cta")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.4)",
  },
  resetText: { color: DANGER, fontSize: 13.5, fontWeight: "700" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { color: TEXT_1, fontSize: 17, fontWeight: "700" },
  body: { color: TEXT_2, fontSize: 14.5, lineHeight: 22, marginBottom: 20 },
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: TEXT_1,
    fontSize: 15.5,
    lineHeight: 23,
    minHeight: 92,
  },
  hint: { color: TEXT_3, fontSize: 12.5, lineHeight: 18, marginTop: 9 },
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  suggestChip: {
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
    backgroundColor: "rgba(74,222,128,0.07)",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  suggestText: { color: GOLD, fontSize: 13, fontWeight: "600" },
  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 22,
  },
  primaryBtnText: { color: "#000", fontSize: 15, fontWeight: "800" },
  note: { color: TEXT_3, fontSize: 12, lineHeight: 17, marginTop: 14 },
  lostBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    marginTop: 24,
  },
  lostText: { flex: 1, color: TEXT_2, fontSize: 12.5, lineHeight: 19 },
});
