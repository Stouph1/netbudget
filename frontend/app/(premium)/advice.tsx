// Écran Conseils personnalisés Premium.
//
// Flow :
//  - Load profile (encrypted_payloads.advice_profile)
//  - Si profil incomplet → onboarding
//  - Sinon → conseils groupés par catégorie (Budget/Invest/Fiscalité/…)

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
import ScopeSwitcher from "../../src/components/ScopeSwitcher";
import { useSession } from "../../src/contexts/SessionContext";
import { useActiveScope } from "../../src/hooks/useActiveScope";
import {
  allAdviceGrouped,
  adviceModeFor as modeFor,
  deriveMatchingProfile as matchingProfile,
  type AdviceMode,
} from "../../src/lib/adviceEngine";
import {
  loadAdviceProfile,
  saveAdviceProfile,
} from "../../src/lib/premiumStore";
import {
  resolveAction,
  resolveBody,
  resolveFigures,
} from "../../src/types/advice";
import type {
  AdviceCard,
  AgeBracket,
  ChildAgeBracket,
  Country,
  FamilyStatus,
  HousingStatus,
  Pet,
  PetSpecies,
  SavingsCapacity,
  TaxBracket,
  UserProfile,
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
  { value: "under_18", label: "Moins de 18 ans" },
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
  { value: "free_housing", label: "Hébergé gratuitement" },
];

const PET_OPTIONS: { value: PetSpecies; label: string }[] = [
  { value: "dog", label: "Chien" },
  { value: "cat", label: "Chat" },
  { value: "small_mammal", label: "Rongeur / lapin" },
  { value: "bird", label: "Oiseau" },
  { value: "fish", label: "Poisson / aquarium" },
  { value: "reptile", label: "Reptile / NAC" },
];


const TMI_OPTIONS: { value: TaxBracket; label: string }[] = [
  { value: "0", label: "0% (non imposable)" },
  { value: "11", label: "11%" },
  { value: "30", label: "30%" },
  { value: "41", label: "41%" },
  { value: "45", label: "45%" },
];

const CHILDREN_OPTIONS: { value: ChildAgeBracket; label: string }[] = [
  { value: "0-6", label: "0 - 6 ans (petite enfance)" },
  { value: "7-11", label: "7 - 11 ans (primaire)" },
  { value: "12-15", label: "12 - 15 ans (collège)" },
  { value: "16-18", label: "16 - 18 ans (lycée)" },
  { value: "19+", label: "19+ ans (études sup / autonomes)" },
];

const COUNTRY_OPTIONS: { value: Country; label: string }[] = [
  { value: "FR", label: "France" },
  { value: "BE", label: "Belgique" },
  { value: "CH", label: "Suisse" },
  { value: "LU", label: "Luxembourg" },
  { value: "CA", label: "Canada" },
  { value: "OTHER", label: "Autre pays" },
];

const SAVINGS_OPTIONS: { value: SavingsCapacity; label: string }[] = [
  { value: "under_100", label: "< 100 € / mois" },
  { value: "100_300", label: "100 - 300 € / mois" },
  { value: "300_800", label: "300 - 800 € / mois" },
  { value: "800_2000", label: "800 - 2 000 € / mois" },
  { value: "2000_plus", label: "> 2 000 € / mois" },
];

function hasKids(family?: FamilyStatus): boolean {
  return family === "couple_with_kids" || family === "single_parent";
}

// Foyer d'un workspace "famille" : deux parents ou parent solo.
// Réutilise le champ profile.family (valeurs avec enfants uniquement).
const FOYER_OPTIONS: { value: FamilyStatus; label: string }[] = [
  { value: "couple_with_kids", label: "Deux parents" },
  { value: "single_parent", label: "Parent solo" },
];

// ============================================================================
// Onboarding par type de scope : les questions posées dépendent du contexte.
// Un compte perso demande la situation individuelle ; un workspace couple /
// famille / coloc décrit le FOYER ou le GROUPE ; une association ne demande
// aucune info personnelle.
// ============================================================================

type OnboardingConfig = {
  intro: string;
  minimumHint: string;
  askAge: boolean;
  ageLabel: string;
  askFamily: boolean; // situation familiale complète (perso)
  askFoyer: boolean; // deux parents / parent solo (workspace famille)
  askKids: "auto" | "always" | "never"; // auto = si situation avec enfants
  kidsLabel: string;
  askCountry: boolean;
  countryLabel: string;
  askHousing: boolean;
  housingLabel: string;
  askTmi: boolean;
  tmiLabel: string;
  askSavings: boolean;
  savingsLabel: string;
  savingsHint: string;
  askPets: boolean;
  petsLabel: string;
};

const ONBOARDING_CONFIG: Record<AdviceMode, OnboardingConfig> = {
  perso: {
    intro:
      "Seuls l'âge et la situation familiale sont nécessaires pour démarrer. Plus tu remplis, plus les conseils deviennent précis (règles fiscales 2026).",
    minimumHint:
      "Renseigne au moins l'âge et la situation familiale pour débloquer les conseils.",
    askAge: true,
    ageLabel: "Ton âge *",
    askFamily: true,
    askFoyer: false,
    askKids: "auto",
    kidsLabel: "Âges de tes enfants",
    askCountry: true,
    countryLabel: "Ton pays",
    askHousing: true,
    housingLabel: "Ton logement",
    askTmi: true,
    tmiLabel: "Ta tranche marginale d'imposition (TMI)",
    askSavings: true,
    savingsLabel: "Ta capacité d'épargne mensuelle",
    savingsHint:
      "Ce qu'il te reste chaque mois après charges fixes et dépenses courantes. Retape ta sélection pour la retirer.",
    askPets: true,
    petsLabel: "As-tu un animal de compagnie ?",
  },
  couple: {
    intro:
      "Profil du couple — les conseils portent sur votre budget commun : compte joint, déclaration, projets à deux. Seule la tranche d'âge est nécessaire pour démarrer.",
    minimumHint: "Renseigne la tranche d'âge du couple pour débloquer les conseils.",
    askAge: true,
    ageLabel: "Tranche d'âge du couple *",
    askFamily: false,
    askFoyer: false,
    askKids: "always",
    kidsLabel: "Vos enfants (laisser vide si aucun)",
    askCountry: true,
    countryLabel: "Votre pays",
    askHousing: true,
    housingLabel: "Votre logement",
    askTmi: true,
    tmiLabel: "TMI du foyer",
    askSavings: true,
    savingsLabel: "Capacité d'épargne du foyer",
    savingsHint:
      "Ce que vous mettez de côté à deux chaque mois, une fois toutes les charges payées.",
    askPets: true,
    petsLabel: "Des animaux dans le foyer ?",
  },
  family: {
    intro:
      "Profil du foyer — conseils famille : allocations, garde, études, quotient familial, transmission. L'âge des parents et le type de foyer suffisent pour démarrer.",
    minimumHint:
      "Renseigne la tranche d'âge des parents et le type de foyer pour débloquer les conseils.",
    askAge: true,
    ageLabel: "Tranche d'âge des parents *",
    askFamily: false,
    askFoyer: true,
    askKids: "always",
    kidsLabel: "Âges des enfants",
    askCountry: true,
    countryLabel: "Votre pays",
    askHousing: true,
    housingLabel: "Votre logement",
    askTmi: true,
    tmiLabel: "TMI du foyer",
    askSavings: true,
    savingsLabel: "Capacité d'épargne du foyer",
    savingsHint:
      "Ce que le foyer met de côté chaque mois, une fois toutes les charges payées.",
    askPets: true,
    petsLabel: "Des animaux dans le foyer ?",
  },
  coloc: {
    intro:
      "Profil de la coloc — les conseils portent sur le budget commun : compte joint, bail, charges, caution. La tranche d'âge des colocataires suffit pour démarrer.",
    minimumHint:
      "Renseigne la tranche d'âge des colocataires pour débloquer les conseils.",
    askAge: true,
    ageLabel: "Tranche d'âge des colocataires *",
    askFamily: false,
    askFoyer: false,
    askKids: "never",
    kidsLabel: "",
    askCountry: true,
    countryLabel: "Votre pays",
    askHousing: true,
    housingLabel: "Votre logement",
    askTmi: false, // l'impôt reste individuel en coloc
    tmiLabel: "",
    askSavings: true,
    savingsLabel: "Capacité d'épargne commune",
    savingsHint:
      "Ce que la coloc peut mettre de côté chaque mois (caution, cagnotte commune, imprévus).",
    askPets: true,
    petsLabel: "Des animaux dans la coloc ?",
  },
  association: {
    intro:
      "Espace association — les conseils portent sur la gestion de l'asso : trésorerie, comptabilité, dons, subventions, assurance. Aucune information personnelle n'est demandée.",
    minimumHint: "",
    askAge: false,
    ageLabel: "",
    askFamily: false,
    askFoyer: false,
    askKids: "never",
    kidsLabel: "",
    askCountry: false,
    countryLabel: "",
    askHousing: false,
    housingLabel: "",
    askTmi: false,
    tmiLabel: "",
    askSavings: true,
    savingsLabel: "Mise en réserve mensuelle possible",
    savingsHint:
      "Ce que l'association peut mettre de côté chaque mois une fois ses charges payées. Retape ta sélection pour la retirer.",
    askPets: false,
    petsLabel: "",
  },
};

// Le minimum requis dépend du mode : une asso n'a rien d'obligatoire,
// un couple / une coloc n'ont besoin que de la tranche d'âge.
function hasMinimumProfileFor(p: UserProfile, mode: AdviceMode): boolean {
  switch (mode) {
    case "association":
      return true;
    case "couple":
    case "coloc":
      return !!p.age;
    case "family":
      return !!(p.age && p.family);
    default:
      return !!(p.age && p.family);
  }
}

// Renvoie le nombre de champs optionnels remplis (pour l'indicateur UI),
// en ne comptant que les questions effectivement posées dans ce mode.
function profileCompleteness(
  p: UserProfile,
  cfg: OnboardingConfig,
): { filled: number; total: number } {
  const optional: unknown[] = [];
  if (cfg.askHousing) optional.push(p.housing);
  if (cfg.askTmi) optional.push(p.tmi);
  if (cfg.askSavings) optional.push(p.monthlySavingsCapacity);
  if (cfg.askKids === "auto") {
    optional.push(
      hasKids(p.family) ? (p.children?.length ? true : undefined) : true,
    );
  }
  if (cfg.askPets) optional.push(p.hasPets === undefined ? undefined : true);
  const filled = optional.filter((v) => v !== undefined && v !== null).length;
  return { filled, total: optional.length };
}

// Résumé lisible du profil affiché au-dessus des conseils, selon le mode.
function profileSummary(p: UserProfile, mode: AdviceMode): string {
  const age = AGE_OPTIONS.find((o) => o.value === p.age)?.label;
  const housing = HOUSING_OPTIONS.find((o) => o.value === p.housing)?.label;
  const kidsPart = p.children?.length
    ? `enfants (${p.children.length} tranche${p.children.length > 1 ? "s" : ""} d'âge)`
    : null;
  const parts: (string | null | undefined)[] = [];
  switch (mode) {
    case "association":
      return "Association · gestion, trésorerie, dons & subventions";
    case "couple":
      parts.push("Couple", age, kidsPart ?? "sans enfant", housing);
      break;
    case "family":
      parts.push(
        p.family === "single_parent" ? "Parent solo" : "Deux parents",
        age,
        kidsPart,
        housing,
      );
      break;
    case "coloc":
      parts.push("Colocation", age, housing);
      break;
    default:
      parts.push(
        age,
        FAMILY_OPTIONS.find((o) => o.value === p.family)?.label,
        kidsPart,
        housing,
      );
  }
  if (mode !== "coloc" && p.tmi) parts.push(`TMI ${p.tmi}%`);
  if (p.country && p.country !== "FR") {
    parts.push(COUNTRY_OPTIONS.find((o) => o.value === p.country)?.label);
  }
  return parts.filter(Boolean).join(" · ");
}

function currentWeekSeed(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor(
    (now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
}

export default function AdviceScreen() {
  const { user, loading: sessionLoading } = useSession();
  const {
    workspaceId,
    workspaceKind,
    scopeLabel,
    loading: scopeLoading,
  } = useActiveScope();
  const [profile, setProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // Set des group.key expanded. Par défaut : Budget & Épargne + Budget à
  // plusieurs + Association (ces derniers n'apparaissent que dans le bon scope).
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["budget", "shared", "association"]),
  );

  const mode = modeFor(workspaceKind);
  const cfg = ONBOARDING_CONFIG[mode];

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const setAllGroups = useCallback((expand: boolean, keys: string[]) => {
    setExpandedGroups(expand ? new Set(keys) : new Set());
  }, []);

  useEffect(() => {
    if (!user?.id || scopeLoading) {
      if (!user?.id) setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const loaded = await loadAdviceProfile(user.id, workspaceId);
      setProfile(loaded);
      // Onboarding forcé seulement si le minimum du mode n'est pas rempli
      // (asso : rien d'obligatoire → direct sur les conseils).
      setEditing(!hasMinimumProfileFor(loaded, modeFor(workspaceKind)));
      setLoading(false);
    })();
  }, [user?.id, workspaceId, workspaceKind, scopeLoading]);

  const grouped = useMemo(() => {
    if (!hasMinimumProfileFor(profile, mode)) return [];
    // Le profil de matching dérive la situation familiale du type de workspace
    // (couple → couple avec/sans enfants) et neutralise les champs perso
    // pour les associations.
    return allAdviceGrouped(matchingProfile(profile, workspaceKind));
  }, [profile, workspaceKind, mode]);

  const completeness = profileCompleteness(profile, cfg);

  const totalCount = useMemo(
    () => grouped.reduce((s, g) => s + g.cards.length, 0),
    [grouped],
  );

  const persist = useCallback(
    async (next: UserProfile) => {
      setProfile(next);
      if (!user?.id) return;
      const result = await saveAdviceProfile(user.id, next, workspaceId);
      if (!result.ok) {
        Alert.alert(
          "Sync",
          `Sauvegardé en local. Sync cloud échoué : ${result.error ?? "erreur inconnue"}`,
        );
      }
    },
    [user?.id, workspaceId],
  );

  function updateField<K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K],
  ) {
    persist({ ...profile, [key]: value });
  }

  function toggleChild(bracket: ChildAgeBracket) {
    const current = profile.children ?? [];
    const next = current.includes(bracket)
      ? current.filter((c) => c !== bracket)
      : [...current, bracket];
    updateField("children", next);
  }

  function togglePetSpecies(species: PetSpecies) {
    const current = profile.pets ?? [];
    const idx = current.findIndex((p) => p.species === species);
    if (idx >= 0) {
      persist({ ...profile, pets: current.filter((p) => p.species !== species) });
    } else {
      persist({ ...profile, pets: [...current, { species, count: 1 }] });
    }
  }

  function setPetCount(species: PetSpecies, count: number) {
    const current = profile.pets ?? [];
    const next = current.map((p) =>
      p.species === species ? { ...p, count: Math.max(1, count) } : p,
    );
    updateField("pets", next);
  }

  if (sessionLoading || scopeLoading || loading) {
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

  // =========================================================================
  // Onboarding
  // =========================================================================
  if (editing) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (hasMinimumProfileFor(profile, mode)) setEditing(false);
              else router.back();
            }}
            hitSlop={10}
          >
            <Feather name="arrow-left" size={22} color={TEXT_1} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {mode === "perso" ? "Ton profil" : "Profil de l'espace"}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.scopeBadge}>
          <Feather name={workspaceId ? "users" : "user"} size={13} color={GOLD} />
          <Text style={styles.scopeBadgeText}>{scopeLabel}</Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>{cfg.intro}</Text>

          {cfg.askAge ? (
            <QuestionBlock
              label={cfg.ageLabel}
              options={AGE_OPTIONS}
              value={profile.age}
              onSelect={(v) => updateField("age", v)}
            />
          ) : null}

          {cfg.askFamily ? (
            <QuestionBlock
              label="Ta situation familiale *"
              options={FAMILY_OPTIONS}
              value={profile.family}
              onSelect={(v) => {
                // Update famille + reset children si sans enfant, DANS LE MÊME
                // persist pour éviter le race condition (2 setState consécutifs
                // écrasent le premier via closure stale).
                const next: UserProfile = { ...profile, family: v };
                if (!hasKids(v)) next.children = [];
                persist(next);
              }}
            />
          ) : null}

          {cfg.askFoyer ? (
            <QuestionBlock
              label="Le foyer *"
              options={FOYER_OPTIONS}
              value={profile.family}
              onSelect={(v) => updateField("family", v)}
            />
          ) : null}

          {cfg.askKids === "always" ||
          (cfg.askKids === "auto" && hasKids(profile.family)) ? (
            <ChildrenBlock
              label={cfg.kidsLabel}
              value={profile.children ?? []}
              onToggle={toggleChild}
            />
          ) : null}

          {cfg.askCountry || cfg.askHousing || cfg.askTmi || cfg.askSavings || cfg.askPets ? (
            <Text style={styles.optionalHeader}>
              Optionnel — plus tu remplis, plus c'est précis
            </Text>
          ) : null}

          {cfg.askCountry ? (
            <QuestionBlock
              label={cfg.countryLabel}
              hint="France par défaut. Les conseils s'adaptent à la fiscalité et aux dispositifs de ton pays."
              options={COUNTRY_OPTIONS}
              value={profile.country}
              onSelect={(v) => updateField("country", v)}
              allowDeselect
            />
          ) : null}
          {cfg.askHousing ? (
            <QuestionBlock
              label={cfg.housingLabel}
              options={HOUSING_OPTIONS}
              value={profile.housing}
              onSelect={(v) => updateField("housing", v)}
              allowDeselect
            />
          ) : null}
          {cfg.askTmi ? (
            <QuestionBlock
              label={cfg.tmiLabel}
              hint="0% = non imposable · 11% ~ jusqu'à 28k€/an · 30% ~ 28k à 80k€ · 41% ~ 80k à 170k€ · 45% > 170k€ · Retape ta sélection pour la retirer."
              options={TMI_OPTIONS}
              value={profile.tmi}
              onSelect={(v) => updateField("tmi", v)}
              allowDeselect
            />
          ) : null}
          {cfg.askSavings ? (
            <QuestionBlock
              label={cfg.savingsLabel}
              hint={cfg.savingsHint}
              options={SAVINGS_OPTIONS}
              value={profile.monthlySavingsCapacity}
              onSelect={(v) => updateField("monthlySavingsCapacity", v)}
              allowDeselect
            />
          ) : null}

          {cfg.askPets ? (
            <>
              <Text style={styles.qLabel}>{cfg.petsLabel}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 4 }}>
                <TouchableOpacity
                  onPress={() => {
                    const active = profile.hasPets === true;
                    persist({
                      ...profile,
                      hasPets: active ? undefined : true,
                      pets: active ? undefined : profile.pets,
                    });
                  }}
                  style={[styles.optionRow, { flex: 1 }, profile.hasPets === true && styles.optionRowActive]}
                  activeOpacity={0.85}
                >
                  <View style={[styles.radio, profile.hasPets === true && styles.radioActive]}>
                    {profile.hasPets === true ? <Feather name="check" size={12} color="#000" /> : null}
                  </View>
                  <Text style={[styles.optionText, profile.hasPets === true && styles.optionTextActive]}>
                    Oui
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => persist({ ...profile, hasPets: false, pets: [] })}
                  style={[styles.optionRow, { flex: 1 }, profile.hasPets === false && styles.optionRowActive]}
                  activeOpacity={0.85}
                >
                  <View style={[styles.radio, profile.hasPets === false && styles.radioActive]}>
                    {profile.hasPets === false ? <Feather name="check" size={12} color="#000" /> : null}
                  </View>
                  <Text style={[styles.optionText, profile.hasPets === false && styles.optionTextActive]}>
                    Non
                  </Text>
                </TouchableOpacity>
              </View>

              {profile.hasPets === true ? (
                <PetsBlock
                  pets={profile.pets ?? []}
                  onToggleSpecies={togglePetSpecies}
                  onSetCount={setPetCount}
                />
              ) : null}
            </>
          ) : null}

          {hasMinimumProfileFor(profile, mode) ? (
            <TouchableOpacity
              onPress={() => setEditing(false)}
              style={styles.ctaBtn}
              activeOpacity={0.85}
            >
              <Feather name="check" size={18} color="#000" />
              <Text style={styles.ctaBtnText}>
                Voir les conseils
                {completeness.total > 0
                  ? ` (${completeness.filled}/${completeness.total} détails)`
                  : ""}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.hint}>{cfg.minimumHint}</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // Conseils groupés par catégorie
  // =========================================================================
  const seed = currentWeekSeed();
  // Applique une petite rotation intra-catégorie (déterministe par semaine)
  const rotatedGrouped = grouped.map(({ group, cards }) => {
    if (cards.length <= 1) return { group, cards };
    const offset = ((seed % cards.length) + cards.length) % cards.length;
    return {
      group,
      cards: cards.map((_, i) => cards[(offset + i) % cards.length]),
    };
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={styles.title}>Coach budget</Text>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <TouchableOpacity onPress={() => setEditing(true)} hitSlop={10}>
            <Feather name="settings" size={20} color={TEXT_2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              router.navigate({ pathname: "/", params: { tab: "premium" } } as never)
            }
            hitSlop={10}
          >
            <Feather name="home" size={20} color={TEXT_2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Badge de scope — tape pour changer de workspace sans quitter l'écran */}
      <TouchableOpacity
        style={styles.scopeBadge}
        onPress={() => setSwitcherOpen(true)}
        activeOpacity={0.8}
      >
        <Feather name={workspaceId ? "users" : "user"} size={13} color={GOLD} />
        <Text style={styles.scopeBadgeText}>{scopeLabel}</Text>
        <Feather name="chevron-down" size={13} color={TEXT_3} />
      </TouchableOpacity>

      <ScopeSwitcher
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
      />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={styles.profileTag}>
          <Text style={styles.profileTagText}>
            {profileSummary(profile, mode)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {totalCount} conseil{totalCount > 1 ? "s" : ""} en{" "}
            {rotatedGrouped.length} catégorie
            {rotatedGrouped.length > 1 ? "s" : ""}
          </Text>
          {rotatedGrouped.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                const allKeys = rotatedGrouped.map((g) => g.group.key);
                const allOpen = allKeys.every((k) => expandedGroups.has(k));
                setAllGroups(!allOpen, allKeys);
              }}
              hitSlop={10}
            >
              <Text style={styles.expandAllText}>
                {rotatedGrouped.every((g) => expandedGroups.has(g.group.key))
                  ? "Tout replier"
                  : "Tout déplier"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {rotatedGrouped.length === 0 ? (
          <View style={styles.emptyList}>
            <Feather name="compass" size={28} color={TEXT_3} />
            <Text style={styles.emptyTitle}>Aucun conseil ne match ton profil</Text>
            <Text style={styles.emptyBody}>
              Le catalogue s'enrichit chaque mois. Reviens bientôt.
            </Text>
          </View>
        ) : (
          rotatedGrouped.map(({ group, cards }) => {
            const expanded = expandedGroups.has(group.key);
            return (
              <View key={group.key} style={{ marginTop: 20 }}>
                <TouchableOpacity
                  style={styles.groupHeader}
                  onPress={() => toggleGroup(group.key)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={group.icon as never}
                    size={16}
                    color={GOLD}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.groupLabel}>{group.label}</Text>
                  <View style={styles.groupCount}>
                    <Text style={styles.groupCountText}>{cards.length}</Text>
                  </View>
                  <Feather
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={TEXT_2}
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
                {expanded
                  ? cards.map((card) => (
                      <AdviceCardView
                        key={card.id}
                        card={card}
                        profile={profile}
                      />
                    ))
                  : null}
              </View>
            );
          })
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
  allowDeselect = false,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onSelect: (v: T | undefined) => void;
  allowDeselect?: boolean; // optional fields: click on selected to unset
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
              onPress={() => {
                if (active && allowDeselect) {
                  onSelect(undefined);
                } else {
                  onSelect(opt.value);
                }
              }}
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

function PetsBlock({
  pets,
  onToggleSpecies,
  onSetCount,
}: {
  pets: Pet[];
  onToggleSpecies: (s: PetSpecies) => void;
  onSetCount: (s: PetSpecies, count: number) => void;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.qLabel}>Quels animaux ?</Text>
      <Text style={styles.qHint}>Sélectionne les espèces, précise le nombre pour chacune.</Text>
      <View style={{ gap: 8, marginTop: 8 }}>
        {PET_OPTIONS.map((opt) => {
          const pet = pets.find((p) => p.species === opt.value);
          const active = !!pet;
          return (
            <View key={opt.value}>
              <TouchableOpacity
                onPress={() => onToggleSpecies(opt.value)}
                style={[styles.optionRow, active && styles.optionRowActive]}
                activeOpacity={0.85}
              >
                <View style={[styles.checkbox, active && styles.checkboxActive]}>
                  {active ? <Feather name="check" size={12} color="#000" /> : null}
                </View>
                <Text style={[styles.optionText, active && styles.optionTextActive, { flex: 1 }]}>
                  {opt.label}
                </Text>
                {active ? (
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      onPress={() => onSetCount(opt.value, (pet?.count ?? 1) - 1)}
                      hitSlop={8}
                      style={styles.stepperBtn}
                    >
                      <Feather name="minus" size={14} color={TEXT_1} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{pet?.count ?? 1}</Text>
                    <TouchableOpacity
                      onPress={() => onSetCount(opt.value, (pet?.count ?? 1) + 1)}
                      hitSlop={8}
                      style={styles.stepperBtn}
                    >
                      <Feather name="plus" size={14} color={TEXT_1} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ChildrenBlock({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: ChildAgeBracket[];
  onToggle: (b: ChildAgeBracket) => void;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.qLabel}>{label}</Text>
      <Text style={styles.qHint}>
        Sélectionne toutes les tranches concernées (multi-choix).
      </Text>
      <View style={{ gap: 8, marginTop: 8 }}>
        {CHILDREN_OPTIONS.map((opt) => {
          const active = value.includes(opt.value);
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onToggle(opt.value)}
              style={[styles.optionRow, active && styles.optionRowActive]}
              activeOpacity={0.85}
            >
              <View style={[styles.checkbox, active && styles.checkboxActive]}>
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

function AdviceCardView({
  card,
  profile,
}: {
  card: AdviceCard;
  profile: UserProfile;
}) {
  const [expanded, setExpanded] = useState(false);
  const body = resolveBody(card, profile);
  const action = resolveAction(card, profile);
  const figures = resolveFigures(card, profile);

  return (
    <View style={styles.adviceCard}>
      <Text style={styles.adviceTitle}>{card.title}</Text>
      <Text style={styles.adviceBody}>{body}</Text>

      {figures.length > 0 ? (
        <View style={styles.figuresRow}>
          {figures.map((f, i) => (
            <View key={i} style={styles.figureChip}>
              <Text style={styles.figureLabel}>{f.label}</Text>
              <Text style={styles.figureValue}>{f.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {action.link ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(action.link!)}
          style={styles.actionBtn}
          activeOpacity={0.85}
        >
          <Feather name="external-link" size={16} color={GOLD} />
          <Text style={styles.actionBtnText}>{action.label}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.actionBtn}>
          <Feather name="target" size={16} color={GOLD} />
          <Text style={styles.actionBtnText}>{action.label}</Text>
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

  scopeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
  },
  scopeBadgeText: { color: GOLD, fontSize: 12, fontWeight: "700" },

  intro: {
    color: TEXT_2,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },
  optionalHeader: {
    color: TEXT_3,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER,
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
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: BORDER,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: GOLD, borderColor: GOLD },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: SURFACE_2,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    color: TEXT_1,
    fontSize: 14,
    fontWeight: "700",
    minWidth: 18,
    textAlign: "center",
    fontFamily: MONO_FONT,
  },
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
    marginBottom: 12,
  },
  profileTagText: { color: TEXT_2, fontSize: 12, lineHeight: 18 },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryText: {
    color: TEXT_3,
    fontSize: 12,
    fontStyle: "italic",
  },
  expandAllText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "600",
  },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  groupLabel: {
    color: TEXT_1,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  groupCount: {
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 28,
    alignItems: "center",
  },
  groupCountText: {
    color: TEXT_2,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: MONO_FONT,
  },

  adviceCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
