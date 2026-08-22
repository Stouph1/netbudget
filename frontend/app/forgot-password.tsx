// Demande de réinitialisation : une page à elle seule.
//
// POURQUOI PAS UN SIMPLE LIEN sur l'écran de connexion : quelqu'un qui a
// oublié son mot de passe est déjà agacé. Le laisser sur un formulaire qui
// demande aussi un mot de passe — celui qu'il vient justement d'oublier — est
// exactement le mauvais moment pour être ambigu. Ici, un seul champ, une seule
// action, et on dit ce qui va se passer avant que ça arrive.

import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
import { sendPasswordReset } from "../src/lib/auth";
import { notify } from "../src/utils/notify";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const { t, tp } = useLang();
  // L'écran de connaissance passe l'adresse déjà saisie : la retaper serait
  // une corvée gratuite.
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(
    typeof params.email === "string" ? params.email : "",
  );
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    const mail = email.trim();
    if (!EMAIL_RE.test(mail)) {
      notify(t("auth.forgot.needEmail.title"), t("auth.forgot.needEmail.body"));
      return;
    }
    setBusy(true);
    const result = await sendPasswordReset(mail);
    setBusy(false);
    if (!result.ok) {
      notify(t("auth.forgot.failed.title"), result.error ?? t("auth.error.unknown"));
      return;
    }
    // On affiche l'écran de confirmation plutôt qu'une alerte : l'utilisateur
    // doit maintenant quitter l'app pour aller dans sa boîte mail, et il faut
    // qu'en revenant il retrouve l'explication à l'écran.
    setSent(true);
  }

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
          >
            <Feather name="arrow-left" size={22} color={TEXT_1} />
          </TouchableOpacity>
          <Text style={s.title}>{t("auth.forgot.title")}</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {sent ? (
            <View style={s.sentBox}>
              <View style={s.sentIcon}>
                <Feather name="mail" size={26} color={GOLD} />
              </View>
              <Text style={s.sentTitle}>{t("auth.forgot.sent.title")}</Text>
              <Text style={s.sentBody}>
                {tp("auth.forgot.sent.body", { email: email.trim() })}
              </Text>
              <Text style={s.sentHint}>{t("auth.forgot.sent.hint")}</Text>

              <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => router.back()}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Text style={s.primaryBtnText}>{t("auth.forgot.backToSignin")}</Text>
              </TouchableOpacity>

              {/* Deuxième chance sans repartir en arrière : l'e-mail peut
                  atterrir dans les indésirables, ou l'adresse être mal tapée. */}
              <TouchableOpacity
                onPress={() => setSent(false)}
                style={{ paddingVertical: 14 }}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={s.linkText}>{t("auth.forgot.retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={s.intro}>{t("auth.forgot.intro")}</Text>

              <Text style={s.label}>{t("auth.label.email")}</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t("auth.placeholder.email")}
                placeholderTextColor={TEXT_3}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                autoFocus
                onSubmitEditing={submit}
                returnKeyType="send"
                accessibilityLabel={t("auth.label.email")}
              />

              <TouchableOpacity
                style={[s.primaryBtn, busy && { opacity: 0.6 }]}
                onPress={submit}
                disabled={busy}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy, busy }}
              >
                {busy ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={s.primaryBtnText}>{t("auth.forgot.submit")}</Text>
                )}
              </TouchableOpacity>

              <Text style={s.footnote}>{t("auth.forgot.footnote")}</Text>
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
  intro: { color: TEXT_2, fontSize: 14, lineHeight: 21, marginBottom: 24 },
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
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: 6,
  },
  primaryBtnText: { color: "#000", fontSize: 15, fontWeight: "800" },
  footnote: {
    color: TEXT_3,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 20,
    textAlign: "center",
  },
  linkText: { color: GOLD, fontSize: 13.5, fontWeight: "600" },
  sentBox: { alignItems: "center", paddingTop: 20 },
  sentIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(74,222,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  sentTitle: { color: TEXT_1, fontSize: 19, fontWeight: "800", marginBottom: 10 },
  sentBody: {
    color: TEXT_2,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 12,
  },
  sentHint: {
    color: TEXT_3,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 24,
  },
});
