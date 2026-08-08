// Connexion / création de compte par e-mail + mot de passe.
// 3e voie d'accès à côté d'Apple et Google (voir PremiumHomePanel).
// Après succès : si le pseudo n'est pas encore choisi → écran d'inscription
// (complete-profile), sinon retour au Profil — même flow que les providers.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { useLang } from "../../src/contexts/LangContext";
import { signInWithEmail, signUpWithEmail } from "../../src/lib/auth";
import { recordConsent } from "../../src/lib/profile";
import { notify } from "../../src/utils/notify";
import { loadProfileBasics } from "../../src/lib/profile";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

export default function EmailAuth() {
  const { t, tp } = useLang();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function afterAuth(userId: string) {
    await recordConsent(userId); // case RGPD cochée en amont (hero Profil)
    // Même enchaînement qu'Apple/Google : inscription incomplète → écran dédié
    const basics = await loadProfileBasics(userId);
    if (!basics.username) {
      router.replace("/(premium)/complete-profile" as never);
    } else {
      router.back();
    }
  }

  async function submit() {
    const mail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      notify(t("auth.label.email"), t("auth.email.invalid"));
      return;
    }
    if (password.length < 8) {
      notify(t("auth.label.password"), t("auth.password.tooShort"));
      return;
    }
    if (isSignup && password !== confirm) {
      notify(t("auth.label.password"), t("auth.password.mismatch"));
      return;
    }

    setBusy(true);
    const result = isSignup
      ? await signUpWithEmail(mail, password)
      : await signInWithEmail(mail, password);
    setBusy(false);

    if (result.ok) {
      await afterAuth(result.userId);
      return;
    }
    if (result.reason === "confirm_email") {
      notify(
        t("auth.confirmEmail.title"),
        tp("auth.confirmEmail.body", { email: mail }),
        () => setMode("signin"),
      );
      return;
    }
    // Chaîne technique renvoyée par Supabase : on la compare telle quelle,
    // puis on affiche notre propre message traduit.
    const msg =
      result.message === "Invalid login credentials"
        ? t("auth.invalidCredentials")
        : (result.message ?? t("auth.error.unknown"));
    notify(t(isSignup ? "auth.signup.failed" : "auth.signin.failed"), msg);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={TEXT_1} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {isSignup ? t("auth.title.signup") : t("auth.title.signin")}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Bascule inscription / connexion */}
          <View style={styles.switchRow}>
            {(
              [
                ["signup", "auth.switch.signup"],
                ["signin", "auth.switch.signin"],
              ] as const
            ).map(([m, labelKey]) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[styles.switchBtn, mode === m && styles.switchBtnActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.switchText, mode === m && styles.switchTextActive]}>
                  {t(labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t("auth.label.email")}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t("auth.placeholder.email")}
            placeholderTextColor={TEXT_3}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>{t("auth.label.password")}</Text>
          <View style={styles.pwdRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.placeholder.password")}
              placeholderTextColor={TEXT_3}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
            <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={10} style={styles.eyeBtn}>
              <Feather name={showPwd ? "eye-off" : "eye"} size={18} color={TEXT_3} />
            </TouchableOpacity>
          </View>

          {isSignup ? (
            <>
              <Text style={styles.label}>{t("auth.label.confirm")}</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder={t("auth.placeholder.confirm")}
                placeholderTextColor={TEXT_3}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                autoComplete="new-password"
              />
            </>
          ) : null}

          <TouchableOpacity
            onPress={submit}
            disabled={busy}
            style={styles.ctaBtn}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Feather name={isSignup ? "user-plus" : "log-in"} size={18} color="#000" />
                <Text style={styles.ctaBtnText}>
                  {isSignup ? t("auth.cta.signup") : t("auth.cta.signin")}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footnote}>
            {isSignup ? t("auth.footnote.signup") : t("auth.footnote.signin")}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
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

  switchRow: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 4,
    marginBottom: 22,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  switchBtnActive: { backgroundColor: GOLD },
  switchText: { color: TEXT_2, fontSize: 13, fontWeight: "600" },
  switchTextActive: { color: "#000", fontWeight: "700" },

  label: {
    color: TEXT_2,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: SURFACE,
    color: TEXT_1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 4,
  },
  pwdRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },

  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 26,
  },
  ctaBtnText: { color: "#000", fontSize: 15, fontWeight: "700" },

  footnote: {
    color: TEXT_3,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    textAlign: "center",
  },
});
