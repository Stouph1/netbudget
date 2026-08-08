// Écran de complétion d'inscription — s'affiche après la première connexion
// (Apple/Google) tant que le pseudo n'est pas choisi.
//
// Collecte : photo (optionnelle), pseudo (requis), prénom/nom (optionnels),
// âge, et la section Dons & cadeaux (part réservée % configurable, 10% par défaut).
// À la fin : enchaîne sur le profil conseils (advice) pour que l'utilisateur
// reçoive des conseils personnalisés dès la fin de l'inscription.

import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { COUNTRY_OPTIONS, FR_REGIONS } from "../../src/constants/geo";
import { CITIES, getCountry } from "../../src/constants/cities";
import { useSession } from "../../src/contexts/SessionContext";
import { useActiveScope } from "../../src/hooks/useActiveScope";
import { pickAndUploadAvatar } from "../../src/lib/photos";
import { loadProfileDetails, updateProfileDetails } from "../../src/lib/profile";
import { loadAdviceProfile, saveAdviceProfile } from "../../src/lib/premiumStore";
import {
  ageToBracket,
  computeAge,
  dateToIso,
  isoToInput,
  parseBirthdate,
} from "../../src/utils/birthday";
import { notify } from "../../src/utils/notify";
import type { AgeBracket, Country, Occupation } from "../../src/types/advice";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const SURFACE_2 = "#0F1B33";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
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
  const { setScope } = useActiveScope();
  // ?edit=1 → mode édition (depuis le Profil) : mêmes champs, sans le
  // wording "inscription" ni l'enchaînement vers la config des conseils.
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const isEdit = edit === "1";
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState<AgeBracket | undefined>(undefined);
  const [birthInput, setBirthInput] = useState(""); // "JJ/MM/AAAA"
  const [occupation, setOccupation] = useState<Occupation | undefined>(undefined);
  const [occupationField, setOccupationField] = useState("");
  const [country, setCountry] = useState<Country | undefined>(undefined);
  const [region, setRegion] = useState<string | undefined>(undefined);
  const [city, setCity] = useState("");
  // On n'affiche les suggestions qu'après une frappe (pas au chargement du
  // profil, sinon la liste s'ouvre alors que la ville est déjà bonne).
  const [cityTouched, setCityTouched] = useState(false);
  const [givingEnabled, setGivingEnabled] = useState(false); // dons/dîme/zakat
  const [tithePercent, setTithePercent] = useState("10");

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      const [details, advicePerso] = await Promise.all([
        loadProfileDetails(user.id),
        // L'âge vit dans le profil conseils PERSO (jamais celui d'un workspace).
        loadAdviceProfile(user.id, null),
      ]);
      setAvatarUrl(details.avatar_url);
      setUsername(details.username ?? "");
      setFirstName(details.first_name ?? "");
      setLastName(details.last_name ?? "");
      setGivingEnabled(details.tithe_enabled);
      setTithePercent(String(details.tithe_percent));
      if (advicePerso.age) setAge(advicePerso.age);
      setBirthInput(isoToInput(details.birthdate));
      if (details.occupation_status) setOccupation(details.occupation_status as Occupation);
      setOccupationField(details.occupation_field ?? "");
      setCity(details.city ?? "");
      if (advicePerso.country) setCountry(advicePerso.country);
      if (advicePerso.region) setRegion(advicePerso.region);
      setLoading(false);
    })();
  }, [user?.id]);

  const citySuggestions = useMemo(() => {
    if (!cityTouched) return [];
    const norm = (v: string) =>
      v
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z]/g, "");
    const q = norm(city);
    if (q.length < 2) return [];
    // Exactitude d'abord (préfixe), puis contenu — et on limite à 6 pour ne
    // pas noyer le formulaire.
    const starts = CITIES.filter((c) => norm(c.name).startsWith(q));
    const contains = CITIES.filter(
      (c) => !norm(c.name).startsWith(q) && norm(c.name).includes(q),
    );
    return [...starts, ...contains].slice(0, 6);
  }, [city, cityTouched]);

  async function changeAvatar() {
    if (!user?.id) return;
    setBusyAvatar(true);
    const result = await pickAndUploadAvatar(user.id);
    setBusyAvatar(false);
    if (result.ok) setAvatarUrl(result.url);
    else if (result.reason === "error") {
      notify("Upload échoué", result.message ?? "Erreur inconnue");
    }
  }

  async function submit() {
    if (!user?.id) return;
    if (!username.trim()) {
      notify("Pseudo requis", "Choisis un nom d'utilisateur pour continuer.");
      return;
    }
    const pct = parseFloat(tithePercent.replace(",", "."));
    if (givingEnabled && (isNaN(pct) || pct < 0 || pct > 100)) {
      notify("Dons & cadeaux", "Le pourcentage doit être entre 0 et 100.");
      return;
    }

    // Date de naissance → âge automatique (facultatif mais recommandé)
    let birthIso: string | null | undefined = undefined;
    let derivedAge: AgeBracket | undefined = age;
    if (birthInput.trim()) {
      const bd = parseBirthdate(birthInput);
      if (!bd) {
        notify("Date de naissance", "Format attendu : JJ/MM/AAAA (ex. 23/04/2001).");
        return;
      }
      birthIso = dateToIso(bd);
      derivedAge = ageToBracket(computeAge(bd));
    }

    setBusy(true);
    const result = await updateProfileDetails(user.id, {
      username,
      first_name: firstName,
      last_name: lastName,
      tithe_enabled: givingEnabled,
      tithe_percent: givingEnabled ? pct : 10,
      country: country ?? "",
      region: country === "FR" ? (region ?? "") : "",
      city,
      birthdate: birthIso ?? null,
      occupation_status: occupation ?? "",
      occupation_field: occupationField,
    });

    // Pré-remplit le profil conseils PERSO (âge, pays, région) pour que
    // l'onboarding Coach démarre déjà personnalisé.
    if (result.ok && (derivedAge || country || occupation)) {
      const adviceProfile = await loadAdviceProfile(user.id, null);
      await saveAdviceProfile(
        user.id,
        {
          ...adviceProfile,
          ...(derivedAge ? { age: derivedAge } : {}),
          ...(country ? { country } : {}),
          ...(country === "FR" && region ? { region } : {}),
          ...(occupation ? { occupation } : {}),
        },
        null,
      );
    }
    setBusy(false);

    if (!result.ok) {
      notify("Impossible", result.error ?? "Erreur inconnue");
      return;
    }

    if (isEdit) {
      notify("Profil mis à jour", undefined, () => router.back());
      return;
    }

    // Enchaînement DIRECT vers le QUESTIONNAIRE du Coach (en scope PERSO) :
    // ?onboard=1 force l'écran d'édition du profil conseils, jamais la liste.
    // (Pas d'Alert ici : les popups à boutons sont muettes sur le web.)
    await setScope(null);
    router.replace("/(premium)/advice?onboard=1" as never);
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
          <Text style={styles.title}>{isEdit ? "Mon profil" : "Ton inscription"}</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            {isEdit
              ? "Modifie tes informations — elles s'appliquent à ton compte, quel que soit l'espace actif."
              : "Quelques infos pour personnaliser ton espace. Seul le pseudo est obligatoire — le reste améliore tes conseils."}
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

          <Text style={styles.label}>Ta date de naissance</Text>
          <Text style={styles.hint}>
            Ton âge se met à jour tout seul — et on te réserve une petite
            surprise le jour J 🎂
          </Text>
          <TextInput
            style={styles.input}
            value={birthInput}
            onChangeText={setBirthInput}
            placeholder="JJ/MM/AAAA"
            placeholderTextColor={TEXT_3}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          {(() => {
            const bd = parseBirthdate(birthInput);
            return bd ? (
              <Text style={styles.ageEcho}>→ {computeAge(bd)} ans</Text>
            ) : null;
          })()}

          {!birthInput.trim() ? (
            <>
              <Text style={styles.label}>… ou ta tranche d'âge</Text>
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
            </>
          ) : null}

          {/* Situation professionnelle (CRM + conseils ciblés) */}
          <Text style={styles.label}>Ta situation</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(
              [
                ["student", "Étudiant·e"],
                ["employee", "Salarié·e"],
                ["self_employed", "Indépendant·e"],
                ["civil_servant", "Fonctionnaire"],
                ["unemployed", "Sans emploi"],
                ["retired", "Retraité·e"],
              ] as const
            ).map(([value, lbl]) => {
              const active = occupation === value;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => setOccupation(active ? undefined : value)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {lbl}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {occupation && occupation !== "unemployed" && occupation !== "retired" ? (
            <>
              <Text style={styles.label}>
                {occupation === "student"
                  ? "Ton domaine d'études"
                  : "Ton domaine de travail"}
              </Text>
              <TextInput
                style={styles.input}
                value={occupationField}
                onChangeText={setOccupationField}
                placeholder={
                  occupation === "student"
                    ? "Droit, informatique, médecine…"
                    : "Informatique, santé, BTP, commerce…"
                }
                placeholderTextColor={TEXT_3}
                autoCapitalize="sentences"
              />
            </>
          ) : null}

          {/* Lieu : personnalise les conseils (fiscalité pays, aides région) */}
          <Text style={styles.label}>Où vis-tu ?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {COUNTRY_OPTIONS.map((opt) => {
              const active = country === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    setCountry(active ? undefined : opt.value);
                    if (opt.value !== "FR") setRegion(undefined);
                  }}
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

          {country === "FR" ? (
            <>
              <Text style={styles.label}>Ta région</Text>
              <Text style={styles.hint}>
                Les aides locales changent d'une région à l'autre (transport
                jeunes, cartes région, bourses) — tes conseils s'y adaptent.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {FR_REGIONS.map((r) => {
                  const active = region === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRegion(active ? undefined : r)}
                      style={[styles.chip, active && styles.chipActive]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

          <Text style={styles.label}>Ta ville (optionnel)</Text>
          <Text style={styles.hint}>
            Choisis dans les suggestions : ces villes ont un indice de coût de
            la vie dans l'app, ton budget s'y ajuste automatiquement.
          </Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={(v) => {
              setCity(v);
              setCityTouched(true);
            }}
            placeholder="Rouen, Douala, Montréal…"
            placeholderTextColor={TEXT_3}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {/* Suggestions issues du référentiel de l'app : une ville reconnue
              donne un indice de coût de la vie précis, une ville libre non. */}
          {citySuggestions.length > 0 ? (
            <View style={styles.suggestBox}>
              {citySuggestions.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.suggestRow}
                  activeOpacity={0.8}
                  onPress={() => {
                    setCity(c.name);
                    setCityTouched(false);
                    // La ville dicte le pays et la région : on les aligne.
                    setCountry(c.countryCode as Country);
                    if (c.countryCode === "FR") setRegion(c.region);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Choisir ${c.name}, ${c.region}`}
                >
                  <Text style={styles.suggestFlag}>
                    {getCountry(c.countryCode)?.flag ?? "🌍"}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestName}>{c.name}</Text>
                    <Text style={styles.suggestRegion}>{c.region}</Text>
                  </View>
                  <Text style={styles.suggestIndex}>×{c.index.toFixed(2)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : cityTouched && city.trim().length >= 3 ? (
            <Text style={styles.suggestNone}>
              « {city.trim()} » n'est pas dans notre référentiel — on utilisera
              alors la moyenne de ta région pour ajuster les estimations.
            </Text>
          ) : null}

          {/* Dons & cadeaux — formulation inclusive : couvre dîme, zakat,
              dons associatifs, soutien familial, cadeaux réguliers. */}
          <View style={styles.titheCard}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.titheTitle}>Dons & cadeaux</Text>
                <Text style={styles.titheHint}>
                  Tu réserves régulièrement une part de tes revenus pour donner
                  (dons, dîme, zakat, soutien familial, cadeaux) ? NetBudget
                  peut la déduire automatiquement — tu choisiras revenu par
                  revenu.
                </Text>
              </View>
              <Switch
                value={givingEnabled}
                onValueChange={setGivingEnabled}
                trackColor={{ false: BORDER, true: GOLD }}
                thumbColor="#fff"
                ios_backgroundColor={BORDER}
              />
            </View>

            {givingEnabled ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
                <Text style={styles.titheLabel}>Part réservée</Text>
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
                <Text style={styles.ctaBtnText}>
                  {isEdit ? "Enregistrer" : "Terminer mon inscription"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Réassurance sécurité / confidentialité */}
          <View style={styles.secureNote}>
            <Feather name="lock" size={13} color={TEXT_3} />
            <Text style={styles.secureNoteText}>
              Tes données transitent en HTTPS et sont stockées en Europe.
              Elles ne sont jamais vendues ni partagées — elles servent
              uniquement à personnaliser tes conseils.
            </Text>
          </View>
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
  hint: { color: TEXT_3, fontSize: 12, lineHeight: 17, marginBottom: 8 },
  ageEcho: { color: GOLD, fontSize: 13, fontWeight: "700", marginTop: 6 },
  secureNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  secureNoteText: {
    color: TEXT_3,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    flexShrink: 1,
  },

  label: {
    color: TEXT_2,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 14,
  },
  suggestBox: {
    marginTop: 8,
    backgroundColor: SURFACE_2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.28)",
    overflow: "hidden",
  },
  suggestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  suggestFlag: { fontSize: 18 },
  suggestName: { color: TEXT_1, fontSize: 14.5, fontWeight: "600" },
  suggestRegion: { color: TEXT_3, fontSize: 11.5, marginTop: 1 },
  suggestIndex: { color: GOLD, fontSize: 12.5, fontWeight: "700" },
  suggestNone: {
    color: TEXT_3,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    fontStyle: "italic",
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
