// Retour du lien « mot de passe oublié » : on définit le nouveau mot de passe.
//
// CE QUI SE PASSE AVANT D'ARRIVER ICI : Supabase a envoyé un e-mail contenant
// un lien vers cette route, avec un code d'autorisation. Le flux PKCE veut que
// ce code soit échangé contre une session ; sur le web, le client Supabase le
// fait seul (`detectSessionInUrl`), sur mobile il faut l'échanger à la main.
// C'est la différence facile à manquer : sans cet échange, l'écran s'ouvre et
// l'enregistrement échoue sans que l'utilisateur comprenne pourquoi.
//
// Le lien est à usage unique et expire. On distingue donc trois états — en
// cours de vérification, lien valide, lien mort — parce que « ça ne marche
// pas » n'aide personne à savoir s'il faut redemander un e-mail.

import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
import { hasRecoverySession, updatePassword } from "../src/lib/auth";
import { supabase } from "../src/lib/supabase";
import { notify } from "../src/utils/notify";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const DANGER = "#F87171";
const BORDER = "rgba(255,255,255,0.08)";

/** Longueur minimale — alignée sur l'écran de création de compte. */
const MIN_LENGTH = 8;

type LinkState = "checking" | "valid" | "expired";

export default function ResetPassword() {
  const { t } = useLang();
  const params = useLocalSearchParams<{ code?: string }>();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Le web a peut-être déjà créé la session en lisant l'URL.
      if (await hasRecoverySession()) {
        if (alive) setLinkState("valid");
        return;
      }
      const code = typeof params.code === "string" ? params.code : null;
      if (!code) {
        if (alive) setLinkState("expired");
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (alive) setLinkState(error ? "expired" : "valid");
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (password.length < MIN_LENGTH) {
      notify(t("auth.label.password"), t("auth.password.tooShort"));
      return;
    }
    if (password !== confirm) {
      notify(t("auth.label.password"), t("auth.password.mismatch"));
      return;
    }
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.ok) {
      notify(t("auth.reset.failed.title"), result.error ?? t("auth.error.unknown"));
      return;
    }
    // Le mot de passe est changé ET la session est déjà ouverte : inutile de
    // faire ressaisir les identifiants qu'on vient de définir.
    notify(t("auth.reset.done.title"), t("auth.reset.done.body"), () =>
      router.replace("/" as never),
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.replace("/" as never)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
          >
            <Feather name="arrow-left" size={22} color={TEXT_1} />
          </TouchableOpacity>
          <Text style={s.title}>{t("auth.reset.title")}</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {linkState === "checking" ? (
            <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />
          ) : linkState === "expired" ? (
            <View style={s.expiredBox}>
              <Feather name="alert-circle" size={22} color={DANGER} />
              <Text style={s.expiredTitle}>{t("auth.reset.expired.title")}</Text>
              <Text style={s.expiredBody}>{t("auth.reset.expired.body")}</Text>
              <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => router.replace("/(premium)/email-auth" as never)}
                activeOpacity={0.85}
              >
                <Text style={s.primaryBtnText}>{t("auth.reset.expired.action")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={s.intro}>{t("auth.reset.intro")}</Text>

              <Text style={s.label}>{t("auth.reset.newPassword")}</Text>
              <View style={s.pwdRow}>
                <TextInput
                  style={[s.input, { flex: 1, marginBottom: 0 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("auth.placeholder.password")}
                  placeholderTextColor={TEXT_3}
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
                <TouchableOpacity
                  onPress={() => setShowPwd(!showPwd)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t(showPwd ? "auth.hidePassword" : "auth.showPassword")}
                >
                  <Feather name={showPwd ? "eye-off" : "eye"} size={18} color={TEXT_3} />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>{t("auth.reset.confirmPassword")}</Text>
              <TextInput
                style={s.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder={t("auth.placeholder.password")}
                placeholderTextColor={TEXT_3}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
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
                  <Text style={s.primaryBtnText}>{t("auth.reset.submit")}</Text>
                )}
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
  intro: { color: TEXT_2, fontSize: 14, lineHeight: 20, marginBottom: 20 },
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
  pwdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingRight: 14,
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
  expiredBox: { alignItems: "center", gap: 10, paddingTop: 30 },
  expiredTitle: { color: TEXT_1, fontSize: 17, fontWeight: "700" },
  expiredBody: {
    color: TEXT_2,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 10,
  },
});
