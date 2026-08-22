// Changer son mot de passe quand on est déjà connecté.
//
// L'ancien mot de passe est EXIGÉ, alors que Supabase ne le demande pas : une
// session suffirait. C'est trop permissif — un téléphone déverrouillé posé sur
// une table permettrait de changer le mot de passe et d'enfermer dehors son
// propriétaire. Le coût est une ligne de saisie, le gain est réel.

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
import { useLang } from "../src/contexts/LangContext";
import { changePasswordWithCurrent } from "../src/lib/auth";
import { notify } from "../src/utils/notify";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

const MIN_LENGTH = 8;

export default function ChangePassword() {
  const { t } = useLang();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (next.length < MIN_LENGTH) {
      notify(t("auth.label.password"), t("auth.password.tooShort"));
      return;
    }
    if (next !== confirm) {
      notify(t("auth.label.password"), t("auth.password.mismatch"));
      return;
    }
    if (next === current) {
      notify(t("auth.label.password"), t("auth.change.same"));
      return;
    }

    setBusy(true);
    const result = await changePasswordWithCurrent(current, next);
    setBusy(false);

    if (result.wrongCurrent) {
      notify(t("auth.change.failed.title"), t("auth.change.wrongCurrent"));
      return;
    }
    if (!result.ok) {
      notify(t("auth.change.failed.title"), result.error ?? t("auth.error.unknown"));
      return;
    }
    notify(t("auth.change.done.title"), t("auth.change.done.body"), () =>
      router.back(),
    );
  }

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    complete: "current-password" | "new-password",
  ) => (
    <>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        placeholder={t("auth.placeholder.password")}
        placeholderTextColor={TEXT_3}
        secureTextEntry={!showPwd}
        autoCapitalize="none"
        autoComplete={complete}
        accessibilityLabel={label}
      />
    </>
  );

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
          <Text style={s.title}>{t("auth.change.title")}</Text>
          <TouchableOpacity
            onPress={() => setShowPwd(!showPwd)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t(showPwd ? "auth.hidePassword" : "auth.showPassword")}
          >
            <Feather name={showPwd ? "eye-off" : "eye"} size={20} color={TEXT_3} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.intro}>{t("auth.change.intro")}</Text>

          {field(t("auth.change.current"), current, setCurrent, "current-password")}
          {field(t("auth.reset.newPassword"), next, setNext, "new-password")}
          {field(t("auth.reset.confirmPassword"), confirm, setConfirm, "new-password")}

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
              <Text style={s.primaryBtnText}>{t("auth.change.submit")}</Text>
            )}
          </TouchableOpacity>

          <Text style={s.footnote}>{t("auth.change.footnote")}</Text>
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
  intro: { color: TEXT_2, fontSize: 14, lineHeight: 20, marginBottom: 22 },
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
  footnote: {
    color: TEXT_3,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 18,
    textAlign: "center",
  },
});
