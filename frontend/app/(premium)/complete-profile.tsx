// Écran de complétion d'inscription — s'affiche après la première connexion
// (Apple/Google) tant que le pseudo n'est pas choisi.
//
// Collecte : photo (optionnelle), pseudo (requis), prénom/nom (optionnels),
// âge, et la question dîme (chrétien → % configurable, 10% par défaut).
// À la fin : enchaîne sur le profil conseils (advice) pour que l'utilisateur
// reçoive des conseils personnalisés dès la fin de l'inscription.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../src/contexts/SessionContext";
import { pickAndUploadAvatar } from "../../src/lib/photos";
import { loadProfileDetails, updateProfileDetails } from "../../src/lib/profile";
import { loadAdviceProfile, saveAdviceProfile } from "../../src/lib/premiumStore";
import type { AgeBracket } from "../../src/types/advice";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const SURFACE_2 = "#0F1B33";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#64748B";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

const AGE_OPTIONS: { value: AgeBracket; label: string }[] = [
  { value: "under_18", label: "− 18" },
  { value: "18-25", label: "18-25" },
  { value: "26-35", label: "26-35" },
  { value: "36-50", label: "36-50" },
  { value: "51-65", label: "51-65" },
  { value: "66+", label: "66+" },
];

export default function CompleteProfile() {
  const { user, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState<AgeBracket | undefined>(undefined);
  const [isChristian, setIsChristian] = useState(false);
  const [tithePercent, setTithePercent] = useState("10");

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      const details = await loadProfileDetails(user.id);
      setAvatarUrl(details.avatar_url);
      setUsername(details.username ?? "");
      setFirstName(details.first_name ?? "");
      setLastName(details.last_name ?? "");
      setIsChristian(details.tithe_enabled);
      setTithePercent(String(details.tithe_percent));
      setLoading(false);
    })();
  }, [user?.id]);

  async function changeAvatar() {
    if (!user?.id) return;
    setBusyAvatar(true);
    const result = await pickAndUploadAvatar(user.id);
    setBusyAvatar(false);
    if (result.ok) setAvatarUrl(result.url);
    else if (result.reason === "error") {
      Alert.alert("Upload échoué", result.message ?? "Erreur inconnue");
    }
  }

  async function submit() {
    if (!user?.id) return;
    if (!username.trim()) {
      Alert.alert("Pseudo requis", "Choisis un nom d'utilisateur pour continuer.");
      return;
    }
    const pct = parseFloat(tithePercent.replace(",", "."));
    if (isChristian && (isNaN(pct) || pct < 0 || pct > 100)) {
      Alert.alert("Dîme", "Le pourcentage doit être entre 0 et 100.");
      return;
    }

    setBusy(true);
    const result = await updateProfileDetails(user.id, {
      username,
      first_name: firstName,
      last_name: lastName,
      tithe_enabled: isChristian,
      tithe_percent: isChristian ? pct : 10,
    });

    // Pré-remplit l'âge du profil conseils (perso) pour que l'onboarding
    // advice démarre avec le champ requis déjà coché.
    if (result.ok && age) {
      const adviceProfile = await loadAdviceProfile(user.id, null);
      await saveAdviceProfile(user.id, { ...adviceProfile, age }, null);
    }
    setBusy(false);

    if (!result.ok) {
      Alert.alert("Impossible", result.error ?? "Erreur inconnue");
      return;
    }

    // Enchaîne sur la configuration du profil conseils
    Alert.alert(
      "Inscription terminée",
      "Dernière étape : configure ton profil pour recevoir des conseils personnalisés dès maintenant.",
      [
        {
          text: "Configurer mes conseils",
          onPress: () => router.replace("/(premium)/advice" as never),
        },
        { text: "Plus tard", style: "cancel", onPress: () => router.back() },
      ],
    );
  }

  if (sessionLoading || loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <ActivityIndicator color={GOLD} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <Feather name="lock" size={32} color={TEXT_3} />
          <Text style={styles.centerTitle}>Connecte-toi d'abord</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
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
          <Text style={styles.title}>Ton inscription</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            Quelques infos pour personnaliser ton espace. Seul le pseudo est
            obligatoire — le reste améliore tes conseils.
          </Text>

          {/* Photo */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <TouchableOpacity onPress={changeAvatar} disabled={busyAvatar} activeOpacity={0.8}>
              <View style={styles.avatar}>
                {busyAvatar ? (
                  <ActivityIndicator color={GOLD} />
                ) : avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Feather name="user" size={34} color={GOLD} />
                )}
                <View style={styles.avatarEditBadge}>
                  <Feather name="camera" size={12} color="#000" />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Photo de profil (optionnel)</Text>
          </View>

          <Text style={styles.label}>Pseudo *</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="stephane.p"
            placeholderTextColor={TEXT_3}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Prénom</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Stéphane"
                placeholderTextColor={TEXT_3}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Nom</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Dupont"
                placeholderTextColor={TEXT_3}
              />
            </View>
          </View>

          <Text style={styles.label}>Ton âge</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {AGE_OPTIONS.map((opt) => {
              const active = age === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setAge(active ? undefined : opt.value)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dîme */}
          <View style={styles.titheCard}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.titheTitle}>Es-tu chrétien ?</Text>
                <Text style={styles.titheHint}>
                  Si oui, NetBudget peut appliquer le principe de la dîme sur
                  tes revenus — tu choisiras revenu par revenu.
                </Text>
              </View>
              <Switch
                value={isChristian}
                onValueChange={setIsChristian}
                trackColor={{ false: BORDER, true: GOLD }}
                thumbColor="#fff"
                ios_backgroundColor={BORDER}
              />
            </View>

            {isChristian ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
                <Text style={styles.titheLabel}>Pourcentage de la dîme</Text>
                <TextInput
                  style={[styles.input, { width: 80, textAlign: "center", marginBottom: 0 }]}
                  value={tithePercent}
                  onChangeText={setTithePercent}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
                <Text style={styles.titheLabel}>%</Text>
              </View>
            ) : null}
          </View>

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
                <Feather name="check" size={18} color="#000" />
                <Text style={styles.ctaBtnText}>Terminer mon inscription</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  centerTitle: { color: TEXT_1, fontSize: 16, fontWeight: "600", marginTop: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "600" },
  intro: { color: TEXT_2, fontSize: 13, lineHeight: 20, marginBottom: 20 },

  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: SURFACE_2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 84, height: 84, borderRadius: 42 },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: MIDNIGHT,
  },
  avatarHint: { color: TEXT_3, fontSize: 12, marginTop: 10 },

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

  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: TEXT_2, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#000", fontWeight: "700" },

  titheCard: {
    marginTop: 24,
    padding: 16,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  titheTitle: { color: TEXT_1, fontSize: 15, fontWeight: "600" },
  titheHint: { color: TEXT_3, fontSize: 12, marginTop: 4, lineHeight: 17, paddingRight: 8 },
  titheLabel: { color: TEXT_2, fontSize: 13 },

  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 28,
  },
  ctaBtnText: { color: "#000", fontSize: 15, fontWeight: "700" },

  secondaryBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  secondaryBtnText: { color: TEXT_1, fontSize: 14, fontWeight: "500" },
});
