// Écran Conseils personnalisés Premium.
//
// Flow :
//  - Load profile (encrypted_payloads.advice_profile)
//  - Si profil vide → onboarding (5 questions)
//  - Sinon → liste des top 5 conseils personnalisés (adviceEngine.topAdvice)
//
// Le profil est stocké comme un blob encrypted_payloads pour rester
// consistent avec l'E2E-first approach (encryption stub Phase 3).

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../src/contexts/SessionContext";
import { topAdvice } from "../../src/lib/adviceEngine";
import {
  loadAdviceProfile,
  saveAdviceProfile,
} from "../../src/lib/premiumStore";
import type {
  AdviceCard,
  AgeBracket,
  FamilyStatus,
  HousingStatus,
  TaxBracket,
  UserProfile,
  Zone,
} from "../../src/types/advice";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const SURFACE_2 = "#0F1B33";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#64748B";
const GOLD = "#4ADE80";
const MINT = "#10B981";
const BORDER = "rgba(255,255,255,0.08)";
const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

const AGE_OPTIONS: { value: AgeBracket; label: string }[] = [
  { value: "18-25", label: "18 - 25 ans" },
  { value: "26-35", label: "26 - 35 ans" },
  { value: "36-50", label: "36 - 50 ans" },
  { value: "51-65", label: "51 - 65 ans" },
  { value: "66+", label: "66+ ans" },
];

const FAMILY_OPTIONS: { value: FamilyStatus; label: string }[] = [
  { value: "single", label: "Célibataire" },
  { value: "couple_no_kids", label: "En couple, sans enfant" },
  { value: "couple_with_kids", label: "En couple avec enfants" },
  { value: "single_parent", label: "Parent solo" },
];

const HOUSING_OPTIONS: { value: HousingStatus; label: string }[] = [
  { value: "renter", label: "Locataire" },
  { value: "owner", label: "Propriétaire" },
  { value: "accessor", label: "Accédant (crédit en cours)" },
];

const ZONE_OPTIONS: { value: Zone; label: string }[] = [
  { value: "big_city", label: "Grande ville (Paris, Lyon, Marseille…)" },
  { value: "province", label: "Province / petite ville" },
];

const TMI_OPTIONS: { value: TaxBracket; label: string }[] = [
  { value: "0", label: "0% (non imposable)" },
  { value: "11", label: "11%" },
  { value: "30", label: "30%" },
  { value: "41", label: "41%" },
  { value: "45", label: "45%" },
];

function isProfileComplete(p: UserProfile): boolean {
  return !!(p.age && p.family && p.housing && p.zone && p.tmi);
}

// Seed hebdomadaire pour la rotation des conseils
function currentWeekSeed(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.floor(
    (now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  return week;
}

export default function AdviceScreen() {
  const { user, loading: sessionLoading } = useSession();
  const [profile, setProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      const loaded = await loadAdviceProfile(user.id);
      setProfile(loaded);
      // Force l'onboarding la première fois
      setEditing(!isProfileComplete(loaded));
      setLoading(false);
    })();
  }, [user?.id]);

  const cards: AdviceCard[] = useMemo(() => {
    if (!isProfileComplete(profile)) return [];
    return topAdvice(profile, 6, currentWeekSeed());
  }, [profile]);

  const persist = useCallback(
    async (next: UserProfile) => {
      setProfile(next);
      if (!user?.id) return;
      const result = await saveAdviceProfile(user.id, next);
      if (!result.ok) {
        Alert.alert(
          "Sync",
          `Sauvegardé en local. Sync cloud échoué : ${result.error ?? "erreur inconnue"}`,
        );
      }
    },
    [user?.id],
  );

  function updateField<K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K],
  ) {
    persist({ ...profile, [key]: value });
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
          <Text style={styles.emptyTitle}>Connexion Premium requise</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.emptyBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============ Onboarding ============
  if (editing) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (isProfileComplete(profile)) setEditing(false);
              else router.back();
            }}
            hitSlop={10}
          >
            <Feather name="arrow-left" size={22} color={TEXT_1} />
          </TouchableOpacity>
          <Text style={styles.title}>Ton profil</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            5 questions rapides pour te donner des conseils personnalisés basés
            sur les règles fiscales et financières 2026 (source : impots.gouv.fr,
            economie.gouv.fr, Banque de France).
          </Text>

          <QuestionBlock
            label="Ton âge"
            options={AGE_OPTIONS}
            value={profile.age}
            onSelect={(v) => updateField("age", v)}
          />
          <QuestionBlock
            label="Ta situation"
            options={FAMILY_OPTIONS}
            value={profile.family}
            onSelect={(v) => updateField("family", v)}
          />
          <QuestionBlock
            label="Ton logement"
            options={HOUSING_OPTIONS}
            value={profile.housing}
            onSelect={(v) => updateField("housing", v)}
          />
          <QuestionBlock
            label="Ta zone"
            options={ZONE_OPTIONS}
            value={profile.zone}
            onSelect={(v) => updateField("zone", v)}
          />
          <QuestionBlock
            label="Ta tranche marginale d'imposition (TMI)"
            hint="Si tu ne sais pas : 0% = tu n'es pas imposable, 11% = revenu jusqu'à ~28k€/an, 30% = ~28k à 80k€, 41% = 80k à 170k€"
            options={TMI_OPTIONS}
            value={profile.tmi}
            onSelect={(v) => updateField("tmi", v)}
          />

          {isProfileComplete(profile) ? (
            <TouchableOpacity
              onPress={() => setEditing(false)}
              style={styles.ctaBtn}
              activeOpacity={0.85}
            >
              <Feather name="check" size={18} color="#000" />
              <Text style={styles.ctaBtnText}>Voir mes conseils</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.hint}>
              Réponds aux 5 questions pour débloquer tes conseils.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============ Advice list ============
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={styles.title}>Conseils personnalisés</Text>
        <TouchableOpacity onPress={() => setEditing(true)} hitSlop={10}>
          <Feather name="settings" size={20} color={TEXT_2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={styles.profileTag}>
          <Text style={styles.profileTagText}>
            {AGE_OPTIONS.find((o) => o.value === profile.age)?.label} ·{" "}
            {FAMILY_OPTIONS.find((o) => o.value === profile.family)?.label} ·{" "}
            {HOUSING_OPTIONS.find((o) => o.value === profile.housing)?.label} · TMI{" "}
            {profile.tmi}%
          </Text>
        </View>

        {cards.length === 0 ? (
          <View style={styles.emptyList}>
            <Feather name="compass" size={28} color={TEXT_3} />
            <Text style={styles.emptyTitle}>Aucun conseil ne match ton profil</Text>
            <Text style={styles.emptyBody}>
              Le catalogue Premium s'enrichit chaque mois. Reviens bientôt.
            </Text>
          </View>
        ) : (
          cards.map((card) => <AdviceCardView key={card.id} card={card} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function QuestionBlock<T extends string>({
  label,
  hint,
  options,
  value,
  onSelect,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.qLabel}>{label}</Text>
      {hint ? <Text style={styles.qHint}>{hint}</Text> : null}
      <View style={{ gap: 8, marginTop: 8 }}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={[styles.optionRow, active && styles.optionRowActive]}
              activeOpacity={0.85}
            >
              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? (
                  <Feather name="check" size={12} color="#000" />
                ) : null}
              </View>
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function AdviceCardView({ card }: { card: AdviceCard }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.adviceCard}>
      <Text style={styles.adviceTitle}>{card.title}</Text>
      <Text style={styles.adviceBody}>{card.body}</Text>

      {card.figures && card.figures.length > 0 ? (
        <View style={styles.figuresRow}>
          {card.figures.map((f, i) => (
            <View key={i} style={styles.figureChip}>
              <Text style={styles.figureLabel}>{f.label}</Text>
              <Text style={styles.figureValue}>{f.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {card.action.link ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(card.action.link!)}
          style={styles.actionBtn}
          activeOpacity={0.85}
        >
          <Feather name="external-link" size={16} color={GOLD} />
          <Text style={styles.actionBtnText}>{card.action.label}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.actionBtn}>
          <Feather name="target" size={16} color={GOLD} />
          <Text style={styles.actionBtnText}>{card.action.label}</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={styles.sourcesToggle}
        activeOpacity={0.7}
      >
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={TEXT_3}
        />
        <Text style={styles.sourcesToggleText}>
          {expanded ? "Masquer" : "Voir"} les sources · vérifié le{" "}
          {card.lastVerified}
        </Text>
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.sourcesList}>
          {card.sources.map((src, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => src.startsWith("http") && Linking.openURL(src)}
            >
              <Text style={styles.sourceText}>{src}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { color: TEXT_1, fontSize: 18, fontWeight: "600" },

  intro: {
    color: TEXT_2,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },

  qLabel: {
    color: TEXT_2,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  qHint: {
    color: TEXT_3,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  optionRowActive: { borderColor: GOLD, backgroundColor: SURFACE_2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { backgroundColor: GOLD, borderColor: GOLD },
  optionText: { color: TEXT_1, fontSize: 14 },
  optionTextActive: { fontWeight: "600" },

  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  ctaBtnText: { color: "#000", fontSize: 15, fontWeight: "700" },

  hint: {
    color: TEXT_3,
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },

  profileTag: {
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  profileTagText: { color: TEXT_2, fontSize: 12 },

  adviceCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  adviceTitle: {
    color: TEXT_1,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 22,
  },
  adviceBody: { color: TEXT_2, fontSize: 14, lineHeight: 20 },

  figuresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  figureChip: {
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  figureLabel: { color: TEXT_3, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.3 },
  figureValue: {
    color: MINT,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: MONO_FONT,
    marginTop: 2,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: SURFACE_2,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  actionBtnText: { color: GOLD, fontSize: 13, fontWeight: "600" },

  sourcesToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
  },
  sourcesToggleText: { color: TEXT_3, fontSize: 11 },
  sourcesList: { marginTop: 8, gap: 4 },
  sourceText: {
    color: TEXT_3,
    fontSize: 11,
    fontFamily: MONO_FONT,
    lineHeight: 16,
  },

  emptyList: { alignItems: "center", padding: 40 },
  emptyTitle: {
    color: TEXT_1,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptyBody: {
    color: TEXT_2,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  emptyBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyBtnText: { color: TEXT_1, fontSize: 14, fontWeight: "500" },
});
