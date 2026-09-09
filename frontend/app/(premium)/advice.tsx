// Écran Conseils personnalisés Premium.
import { openExternal } from "../../src/utils/openExternal";
//
// Flow :
//  - Load profile (encrypted_payloads.advice_profile)
//  - Si profil incomplet → onboarding
//  - Sinon → conseils groupés par catégorie (Budget/Invest/Fiscalité/…)

import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { goBack } from "../../src/lib/nav";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScopeSwitcher from "../../src/components/ScopeSwitcher";
import { COUNTRY_OPTIONS, FR_REGIONS } from "../../src/constants/geo";
import { useLang } from "../../src/contexts/LangContext";
import { useSession } from "../../src/contexts/SessionContext";
import { usePaywall } from "../../src/hooks/usePaywall";
import { LockedOverlay } from "../../src/components/LockedOverlay";
import { SyncBanner } from "../../src/components/SyncBanner";
import { InflationBanner, RealReturnLine } from "../../src/components/InflationNote";
import * as Haptics from "expo-haptics";
import Reanimated, { FadeInDown, ZoomIn } from "react-native-reanimated";
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
  resolveTitle,
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
import { markAdviceSeen } from "../../src/utils/notificationScheduler";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const SURFACE_2 = "#0F1B33";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const MINT = "#10B981";
const BORDER = "rgba(255,255,255,0.08)";
const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

// Les libellés d'options sont construits à la volée à partir du catalogue de
// traductions : ils dépendent de la langue, donc plus de constantes figées.
type Translate = (key: string) => string;
type Interpolate = (
  key: string,
  params: Record<string, string | number>,
) => string;
type Option<T extends string> = { value: T; label: string };

const ageOptions = (t: Translate): Option<AgeBracket>[] => [
  { value: "under_18", label: t("coach.age.under18") },
  { value: "18-25", label: t("coach.age.18_25") },
  { value: "26-35", label: t("coach.age.26_35") },
  { value: "36-50", label: t("coach.age.36_50") },
  { value: "51-65", label: t("coach.age.51_65") },
  { value: "66+", label: t("coach.age.66plus") },
];

const familyOptions = (t: Translate): Option<FamilyStatus>[] => [
  { value: "single", label: t("coach.family.single") },
  { value: "couple_no_kids", label: t("coach.family.coupleNoKids") },
  { value: "couple_with_kids", label: t("coach.family.coupleWithKids") },
  { value: "single_parent", label: t("coach.family.singleParent") },
];

const housingOptions = (t: Translate): Option<HousingStatus>[] => [
  { value: "renter", label: t("coach.housing.renter") },
  { value: "owner", label: t("coach.housing.owner") },
  { value: "accessor", label: t("coach.housing.accessor") },
  { value: "free_housing", label: t("coach.housing.freeHousing") },
];

const petOptions = (t: Translate): Option<PetSpecies>[] => [
  { value: "dog", label: t("coach.pet.dog") },
  { value: "cat", label: t("coach.pet.cat") },
  { value: "small_mammal", label: t("coach.pet.smallMammal") },
  { value: "bird", label: t("coach.pet.bird") },
  { value: "fish", label: t("coach.pet.fish") },
  { value: "reptile", label: t("coach.pet.reptile") },
];

// Seule la tranche à 0% porte une mention à traduire ; les autres ne sont que
// des pourcentages.
const tmiOptions = (t: Translate): Option<TaxBracket>[] => [
  { value: "0", label: t("coach.tmi.zero") },
  { value: "11", label: "11%" },
  { value: "30", label: "30%" },
  { value: "41", label: "41%" },
  { value: "45", label: "45%" },
];

const childrenOptions = (t: Translate): Option<ChildAgeBracket>[] => [
  { value: "0-6", label: t("coach.children.0_6") },
  { value: "7-11", label: t("coach.children.7_11") },
  { value: "12-15", label: t("coach.children.12_15") },
  { value: "16-18", label: t("coach.children.16_18") },
  { value: "19+", label: t("coach.children.19plus") },
];

const savingsOptions = (t: Translate): Option<SavingsCapacity>[] => [
  { value: "under_100", label: t("coach.savings.under100") },
  { value: "100_300", label: t("coach.savings.100_300") },
  { value: "300_800", label: t("coach.savings.300_800") },
  { value: "800_2000", label: t("coach.savings.800_2000") },
  { value: "2000_plus", label: t("coach.savings.2000plus") },
];

function hasKids(family?: FamilyStatus): boolean {
  return family === "couple_with_kids" || family === "single_parent";
}

// Foyer d'un workspace "famille" : deux parents ou parent solo.
// Réutilise le champ profile.family (valeurs avec enfants uniquement).
const foyerOptions = (t: Translate): Option<FamilyStatus>[] => [
  { value: "couple_with_kids", label: t("coach.foyer.twoParents") },
  { value: "single_parent", label: t("coach.family.singleParent") },
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

const onboardingConfig = (
  t: Translate,
): Record<AdviceMode, OnboardingConfig> => ({
  perso: {
    intro: t("coach.onb.perso.intro"),
    minimumHint: t("coach.onb.perso.minHint"),
    askAge: true,
    ageLabel: t("coach.onb.perso.ageLabel"),
    askFamily: true,
    askFoyer: false,
    askKids: "auto",
    kidsLabel: t("coach.onb.perso.kidsLabel"),
    askCountry: true,
    countryLabel: t("coach.onb.perso.countryLabel"),
    askHousing: true,
    housingLabel: t("coach.onb.perso.housingLabel"),
    askTmi: true,
    tmiLabel: t("coach.onb.perso.tmiLabel"),
    askSavings: true,
    savingsLabel: t("coach.onb.perso.savingsLabel"),
    savingsHint: t("coach.onb.perso.savingsHint"),
    askPets: true,
    petsLabel: t("coach.onb.perso.petsLabel"),
  },
  couple: {
    intro: t("coach.onb.couple.intro"),
    minimumHint: t("coach.onb.couple.minHint"),
    askAge: true,
    ageLabel: t("coach.onb.couple.ageLabel"),
    askFamily: false,
    askFoyer: false,
    askKids: "always",
    kidsLabel: t("coach.onb.couple.kidsLabel"),
    askCountry: true,
    countryLabel: t("coach.onb.couple.countryLabel"),
    askHousing: true,
    housingLabel: t("coach.onb.couple.housingLabel"),
    askTmi: true,
    tmiLabel: t("coach.onb.couple.tmiLabel"),
    askSavings: true,
    savingsLabel: t("coach.onb.couple.savingsLabel"),
    savingsHint: t("coach.onb.couple.savingsHint"),
    askPets: true,
    petsLabel: t("coach.onb.couple.petsLabel"),
  },
  family: {
    intro: t("coach.onb.family.intro"),
    minimumHint: t("coach.onb.family.minHint"),
    askAge: true,
    ageLabel: t("coach.onb.family.ageLabel"),
    askFamily: false,
    askFoyer: true,
    askKids: "always",
    kidsLabel: t("coach.onb.family.kidsLabel"),
    askCountry: true,
    countryLabel: t("coach.onb.family.countryLabel"),
    askHousing: true,
    housingLabel: t("coach.onb.family.housingLabel"),
    askTmi: true,
    tmiLabel: t("coach.onb.family.tmiLabel"),
    askSavings: true,
    savingsLabel: t("coach.onb.family.savingsLabel"),
    savingsHint: t("coach.onb.family.savingsHint"),
    askPets: true,
    petsLabel: t("coach.onb.family.petsLabel"),
  },
  coloc: {
    intro: t("coach.onb.coloc.intro"),
    minimumHint: t("coach.onb.coloc.minHint"),
    askAge: true,
    ageLabel: t("coach.onb.coloc.ageLabel"),
    askFamily: false,
    askFoyer: false,
    askKids: "never",
    kidsLabel: "",
    askCountry: true,
    countryLabel: t("coach.onb.coloc.countryLabel"),
    askHousing: true,
    housingLabel: t("coach.onb.coloc.housingLabel"),
    askTmi: false, // l'impôt reste individuel en coloc
    tmiLabel: "",
    askSavings: true,
    savingsLabel: t("coach.onb.coloc.savingsLabel"),
    savingsHint: t("coach.onb.coloc.savingsHint"),
    askPets: true,
    petsLabel: t("coach.onb.coloc.petsLabel"),
  },
  association: {
    intro: t("coach.onb.association.intro"),
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
    savingsLabel: t("coach.onb.association.savingsLabel"),
    savingsHint: t("coach.onb.association.savingsHint"),
    askPets: false,
    petsLabel: "",
  },
});

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
function profileSummary(
  p: UserProfile,
  mode: AdviceMode,
  t: Translate,
  tp: Interpolate,
): string {
  const age = ageOptions(t).find((o) => o.value === p.age)?.label;
  const housing = housingOptions(t).find((o) => o.value === p.housing)?.label;
  const kidsCount = p.children?.length ?? 0;
  const kidsPart = kidsCount
    ? tp(kidsCount > 1 ? "coach.summary.kidsPlural" : "coach.summary.kids", {
        n: kidsCount,
      })
    : null;
  const parts: (string | null | undefined)[] = [];
  switch (mode) {
    case "association":
      return t("coach.summary.association");
    case "couple":
      parts.push(
        t("coach.summary.couple"),
        age,
        kidsPart ?? t("coach.summary.noKids"),
        housing,
      );
      break;
    case "family":
      parts.push(
        p.family === "single_parent"
          ? t("coach.family.singleParent")
          : t("coach.foyer.twoParents"),
        age,
        kidsPart,
        housing,
      );
      break;
    case "coloc":
      parts.push(t("coach.summary.coloc"), age, housing);
      break;
    default:
      parts.push(
        age,
        familyOptions(t).find((o) => o.value === p.family)?.label,
        kidsPart,
        housing,
      );
  }
  if (mode !== "coloc" && p.tmi)
    parts.push(tp("coach.summary.tmi", { rate: p.tmi }));
  if (p.country && p.country !== "FR") {
    parts.push(COUNTRY_OPTIONS.find((o) => o.value === p.country)?.label);
  }
  if ((p.country ?? "FR") === "FR" && p.region) parts.push(p.region);
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
  const { t, tp } = useLang();
  const { user, loading: sessionLoading } = useSession();
  // Les conseils font partie de l'abonnement, mais le QUESTIONNAIRE reste
  // ouvert à tous — et jusqu'au bout.
  //
  // C'est délibéré : quelqu'un qui vient de décrire sa situation en douze
  // questions a investi quelque chose, et il arrive au moment précis où il se
  // demande « alors, qu'est-ce que ça donne pour moi ? ». C'est là que la
  // proposition a un sens. La même proposition affichée à l'entrée, avant
  // qu'il ait rien donné, n'est qu'une porte fermée.
  //
  // Son profil est ENREGISTRÉ dans tous les cas : s'il s'abonne un mois plus
  // tard, ses conseils sont déjà prêts. Lui faire tout ressaisir serait le
  // punir d'avoir hésité.
  const paywall = usePaywall();
  // Dernier échec de synchronisation, affiché en bandeau. Voir SyncBanner.
  const [syncError, setSyncError] = useState<string | null>(null);
  // Âge et localisation viennent de l'inscription. On les REPLIE au lieu de
  // les redemander : reposer une question déjà posée deux écrans plus tôt
  // donne le sentiment que rien n'a été enregistré, et c'est le premier
  // moment où l'on gagne ou perd la confiance de quelqu'un.
  const [editBasics, setEditBasics] = useState(false);
  // Fin du questionnaire pendant l'inscription : on MARQUE l'aboutissement.
  // Basculer sec du formulaire à la liste ne dit pas « c'est fait » — la
  // personne vient de répondre à douze questions et n'a aucun signe que ça a
  // servi à quelque chose.
  const [justFinished, setJustFinished] = useState(false);
  const adviceLocked =
    !paywall.loading && !paywall.allows({ feature: "advice" });
  // ?onboard=1 (depuis l'inscription) : ouvre TOUJOURS le questionnaire,
  // jamais la liste — l'utilisateur continue de remplir naturellement.
  const { onboard } = useLocalSearchParams<{ onboard?: string }>();
  const {
    workspaceId,
    workspaceKind,
    scopeLabel,
    scopeLabelIsKey,
    loading: scopeLoading,
  } = useActiveScope();
  // Le scope perso renvoie une CLÉ i18n, un espace nommé renvoie son nom.
  const resolvedScopeLabel = scopeLabelIsKey ? t(scopeLabel) : scopeLabel;
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
  const cfg = useMemo(() => onboardingConfig(t)[mode], [t, mode]);

  // « Connu » = les deux champs que l'inscription remplit vraiment. Un seul
  // des deux ne suffit pas : un récapitulatif à trous inquiète plus qu'il
  // rassure.
  const basicsKnown = Boolean(profile.age && profile.country);
  const basicsSummary = useMemo(() => {
    // On passe par les MÊMES tables d'options que les questions : construire
    // une clé de traduction à la main (« coach.age.18-25 ») donnerait un
    // libellé manquant, affiché tel quel à l'écran.
    const parts: string[] = [];
    const age = ageOptions(t).find((o) => o.value === profile.age)?.label;
    if (age) parts.push(age);
    if (profile.region) parts.push(profile.region);
    else {
      const country = COUNTRY_OPTIONS.find((o) => o.value === profile.country)?.label;
      if (country) parts.push(country);
    }
    return parts.join(" · ");
  }, [profile.age, profile.region, profile.country, t]);

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
      setEditing(
        onboard === "1" ||
          !hasMinimumProfileFor(loaded, modeFor(workspaceKind)),
      );
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

  // Ce que l'utilisateur a réellement sous les yeux est marqué « vu » : les
  // notifications « tu as peut-être droit à ça » ne proposeront donc jamais un
  // conseil déjà lu. On ne marque QUE les groupes dépliés — tout marquer à
  // l'ouverture de l'écran viderait la source de la notification la plus utile
  // de l'app alors que rien n'aurait été lu.
  useEffect(() => {
    const shown = grouped
      .filter((g) => expandedGroups.has(g.group.key))
      .flatMap((g) => g.cards.map((c) => c.id));
    if (shown.length) void markAdviceSeen(shown);
  }, [grouped, expandedGroups]);

  const completeness = profileCompleteness(profile, cfg);
  // Questions non répondues, formulées comme des bénéfices concrets — c'est ce
  // qui donne envie de finir, pas un pourcentage abstrait.
  const missingQuestions = useMemo(() => {
    const out: string[] = [];
    if (!profile.age) out.push(t("coach.missing.age"));
    if (cfg.askFamily && !profile.family) out.push(t("coach.missing.family"));
    if (cfg.askHousing && !profile.housing)
      out.push(t("coach.missing.housing"));
    if (
      cfg.askKids === "auto" &&
      hasKids(profile.family) &&
      !profile.children?.length
    )
      out.push(t("coach.missing.children"));
    if (cfg.askSavings && !profile.monthlySavingsCapacity)
      out.push(t("coach.missing.savings"));
    if (cfg.askTmi && !profile.tmi) out.push(t("coach.missing.tmi"));
    if (cfg.askPets && profile.hasPets === undefined)
      out.push(t("coach.missing.pets"));
    return out;
  }, [profile, cfg, t]);

  const totalCount = useMemo(
    () => grouped.reduce((s, g) => s + g.cards.length, 0),
    [grouped],
  );

  const persist = useCallback(
    async (next: UserProfile) => {
      setProfile(next);
      if (!user?.id) return;
      const result = await saveAdviceProfile(user.id, next, workspaceId);
      // Bandeau, jamais d'alerte : cet écran enregistre à CHAQUE sélection.
      // Une modale par échec faisait douze fenêtres à fermer sur un
      // questionnaire de douze questions, et rendait l'app inutilisable.
      setSyncError(result.ok ? null : (result.error ?? "unknown"));
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
      persist({
        ...profile,
        pets: current.filter((p) => p.species !== species),
      });
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
          <Text style={styles.emptyTitle}>{t("coach.locked.title")}</Text>
          <TouchableOpacity
            onPress={() => goBack()}
            style={styles.emptyBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyBtnText}>{t("coach.locked.back")}</Text>
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
              else goBack();
            }}
            hitSlop={10}
          >
            <Feather name="arrow-left" size={22} color={TEXT_1} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {mode === "perso"
              ? t("coach.profileTitle.perso")
              : t("coach.profileTitle.space")}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.scopeBadge}>
          <Feather
            name={workspaceId ? "users" : "user"}
            size={13}
            color={GOLD}
          />
          <Text style={styles.scopeBadgeText}>{resolvedScopeLabel}</Text>
        </View>

        {/* C'est ICI que l'alerte tombait : le questionnaire enregistre à
            chaque sélection. Le bandeau informe une fois et reste. */}
        <SyncBanner error={syncError} />

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>{cfg.intro}</Text>

          {/* Récapitulatif de ce qui a déjà été saisi à l'inscription. On ne
              le montre que si les deux sont connus : à moitié rempli, il
              vaut mieux poser les questions normalement. */}
          {basicsKnown && !editBasics ? (
            <TouchableOpacity
              style={styles.recapCard}
              onPress={() => setEditBasics(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              testID="coach-recap-basics"
            >
              <Feather name="check-circle" size={16} color={GOLD} />
              <View style={{ flex: 1 }}>
                <Text style={styles.recapTitle}>{t("coach.recap.title")}</Text>
                <Text style={styles.recapValue}>{basicsSummary}</Text>
              </View>
              <Text style={styles.recapEdit}>{t("coach.recap.edit")}</Text>
            </TouchableOpacity>
          ) : null}

          {cfg.askAge && (!basicsKnown || editBasics) ? (
            <QuestionBlock
              label={cfg.ageLabel}
              options={ageOptions(t)}
              value={profile.age}
              onSelect={(v) => updateField("age", v)}
            />
          ) : null}

          {cfg.askFamily ? (
            <QuestionBlock
              label={t("coach.familyLabel")}
              options={familyOptions(t)}
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
              label={t("coach.foyerLabel")}
              options={foyerOptions(t)}
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

          {cfg.askCountry ||
          cfg.askHousing ||
          cfg.askTmi ||
          cfg.askSavings ||
          cfg.askPets ? (
            <Text style={styles.optionalHeader}>
              {t("coach.optionalHeader")}
            </Text>
          ) : null}

          {cfg.askCountry && (!basicsKnown || editBasics) ? (
            <ChipsBlock
              label={cfg.countryLabel}
              hint={t("coach.country.hint")}
              options={COUNTRY_OPTIONS}
              value={profile.country}
              onSelect={(v) => updateField("country", v)}
            />
          ) : null}
          {cfg.askCountry &&
          (!basicsKnown || editBasics) &&
          (profile.country ?? "FR") === "FR" ? (
            <ChipsBlock
              label={
                mode === "perso"
                  ? t("coach.region.labelPerso")
                  : t("coach.region.labelShared")
              }
              hint={t("coach.region.hint")}
              options={FR_REGIONS.map((r) => ({ value: r, label: r }))}
              value={profile.region}
              onSelect={(v) => updateField("region", v)}
            />
          ) : null}
          {cfg.askHousing ? (
            <QuestionBlock
              label={cfg.housingLabel}
              options={housingOptions(t)}
              value={profile.housing}
              onSelect={(v) => updateField("housing", v)}
              allowDeselect
            />
          ) : null}
          {cfg.askHousing &&
          (profile.housing === "owner" || profile.housing === "accessor") ? (
            <>
              <ChipsBlock
                label={t("coach.housingType.label")}
                hint={t("coach.housingType.hint")}
                options={[
                  {
                    value: "apartment",
                    label: t("coach.housingType.apartment"),
                  },
                  { value: "house", label: t("coach.housingType.house") },
                ]}
                value={profile.housingType}
                onSelect={(v) => updateField("housingType", v)}
              />
              <ChipsBlock
                label={t("coach.propertyCount.label")}
                hint={t("coach.propertyCount.hint")}
                options={[
                  { value: "1", label: "1" },
                  { value: "2", label: "2" },
                  { value: "3", label: t("coach.propertyCount.threePlus") },
                ]}
                value={
                  profile.propertyCount
                    ? String(profile.propertyCount)
                    : undefined
                }
                onSelect={(v) =>
                  updateField("propertyCount", v ? parseInt(v, 10) : undefined)
                }
              />
            </>
          ) : null}
          {cfg.askHousing ? (
            <ChipsBlock
              label={
                mode === "perso"
                  ? t("coach.zone.labelPerso")
                  : t("coach.zone.labelShared")
              }
              hint={t("coach.zone.hint")}
              options={[
                { value: "big_city", label: t("coach.zone.bigCity") },
                { value: "province", label: t("coach.zone.province") },
                { value: "rural", label: t("coach.zone.rural") },
                { value: "coastal", label: t("coach.zone.coastal") },
                { value: "mountain", label: t("coach.zone.mountain") },
              ]}
              value={profile.zone}
              onSelect={(v) => updateField("zone", v)}
            />
          ) : null}
          {cfg.askTmi ? (
            <QuestionBlock
              label={cfg.tmiLabel}
              hint={t("coach.tmi.hint")}
              options={tmiOptions(t)}
              value={profile.tmi}
              onSelect={(v) => updateField("tmi", v)}
              allowDeselect
            />
          ) : null}
          {cfg.askSavings ? (
            <QuestionBlock
              label={cfg.savingsLabel}
              hint={cfg.savingsHint}
              options={savingsOptions(t)}
              value={profile.monthlySavingsCapacity}
              onSelect={(v) => updateField("monthlySavingsCapacity", v)}
              allowDeselect
            />
          ) : null}

          {cfg.askPets ? (
            <>
              <Text style={styles.qLabel}>{cfg.petsLabel}</Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  marginTop: 8,
                  marginBottom: 4,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    const active = profile.hasPets === true;
                    persist({
                      ...profile,
                      hasPets: active ? undefined : true,
                      pets: active ? undefined : profile.pets,
                    });
                  }}
                  style={[
                    styles.optionRow,
                    { flex: 1 },
                    profile.hasPets === true && styles.optionRowActive,
                  ]}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.radio,
                      profile.hasPets === true && styles.radioActive,
                    ]}
                  >
                    {profile.hasPets === true ? (
                      <Feather name="check" size={12} color="#000" />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      profile.hasPets === true && styles.optionTextActive,
                    ]}
                  >
                    {t("coach.yes")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    persist({ ...profile, hasPets: false, pets: [] })
                  }
                  style={[
                    styles.optionRow,
                    { flex: 1 },
                    profile.hasPets === false && styles.optionRowActive,
                  ]}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.radio,
                      profile.hasPets === false && styles.radioActive,
                    ]}
                  >
                    {profile.hasPets === false ? (
                      <Feather name="check" size={12} color="#000" />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      profile.hasPets === false && styles.optionTextActive,
                    ]}
                  >
                    {t("coach.no")}
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

          {/* Situation de handicap — question facultative, formulée en termes de
              DROITS. Trois cases indépendantes : un adulte concerné, un parent
              et un aidant n'ont pas du tout les mêmes démarches. */}
          <Text style={styles.qLabel}>{t("coach.disability.label")}</Text>
          <Text style={styles.qHint}>{t("coach.disability.hint")}</Text>
          <View style={{ gap: 8, marginTop: 8, marginBottom: 4 }}>
            {(
              [
                ["disabilitySelf", t("coach.disability.self")],
                ["disabilityChild", t("coach.disability.child")],
                ["caregiver", t("coach.disability.caregiver")],
              ] as const
            ).map(([field, label]) => {
              const active = profile[field] === true;
              return (
                <TouchableOpacity
                  key={field}
                  onPress={() =>
                    persist({ ...profile, [field]: active ? undefined : true })
                  }
                  style={[styles.optionRow, active && styles.optionRowActive]}
                  activeOpacity={0.85}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={label}
                >
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? (
                      <Feather name="check" size={12} color="#000" />
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {hasMinimumProfileFor(profile, mode) ? (
            missingQuestions.length === 0 ? (
              <TouchableOpacity
                onPress={() => {
                  void Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  ).catch(() => {});
                  // L'aboutissement ne s'affiche qu'à la PREMIÈRE fin, pendant
                  // l'inscription. Le rejouer à chaque retouche du profil
                  // deviendrait une porte à franchir.
                  if (onboard === "1") setJustFinished(true);
                  setEditing(false);
                }}
                style={styles.ctaBtn}
                activeOpacity={0.85}
              >
                <Feather name="check" size={18} color="#000" />
                <Text style={styles.ctaBtnText}>{t("coach.cta.complete")}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.missingBox}>
                  <Feather name="alert-circle" size={16} color={GOLD} />
                  <Text style={styles.missingText}>
                    {tp("coach.missing.box", {
                      list: missingQuestions.join(", "),
                    })}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditing(false)}
                  style={styles.ctaBtnSecondary}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ctaBtnSecondaryText}>
                    {tp("coach.cta.skip", {
                      filled: completeness.filled,
                      total: completeness.total,
                    })}
                  </Text>
                </TouchableOpacity>
              </>
            )
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

  if (justFinished) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.doneWrap}>
          <Reanimated.View entering={ZoomIn.duration(420)} style={styles.doneRing}>
            <Feather name="check" size={38} color={GOLD} />
          </Reanimated.View>

          <Reanimated.Text
            entering={FadeInDown.delay(220).duration(420)}
            style={styles.doneTitle}
          >
            {t("coach.done.title")}
          </Reanimated.Text>
          <Reanimated.Text
            entering={FadeInDown.delay(320).duration(420)}
            style={styles.doneBody}
          >
            {tp("coach.done.body", { n: totalCount })}
          </Reanimated.Text>

          <Reanimated.View
            entering={FadeInDown.delay(460).duration(420)}
            style={{ alignSelf: "stretch", gap: 10, marginTop: 26 }}
          >
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => setJustFinished(false)}
              activeOpacity={0.85}
              testID="coach-done-see"
            >
              <Text style={styles.ctaBtnText}>{t("coach.done.see")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doneLater}
              onPress={() => {
                setJustFinished(false);
                router.replace({ pathname: "/", params: { tab: "premium" } } as never);
              }}
              activeOpacity={0.8}
              testID="coach-done-home"
            >
              <Text style={styles.doneLaterText}>{t("coach.done.home")}</Text>
            </TouchableOpacity>
          </Reanimated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("coach.title")}</Text>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <TouchableOpacity onPress={() => setEditing(true)} hitSlop={10}>
            <Feather name="settings" size={20} color={TEXT_2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              router.navigate({
                pathname: "/",
                params: { tab: "premium" },
              } as never)
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
        <Text style={styles.scopeBadgeText}>{resolvedScopeLabel}</Text>
        <Feather name="chevron-down" size={13} color={TEXT_3} />
      </TouchableOpacity>

      <ScopeSwitcher
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
      />

      <SyncBanner error={syncError} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={styles.profileTag}>
          <Text style={styles.profileTagText}>
            {profileSummary(profile, mode, t, tp)}
          </Text>
        </View>

        <InflationBanner country={profile.country} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {tp("coach.summary.tpl", {
              advice: tp(
                totalCount > 1
                  ? "coach.summary.advicePlural"
                  : "coach.summary.advice",
                { n: totalCount },
              ),
              categories: tp(
                rotatedGrouped.length > 1
                  ? "coach.summary.categoryPlural"
                  : "coach.summary.category",
                { n: rotatedGrouped.length },
              ),
            })}
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
                  ? t("coach.collapseAll")
                  : t("coach.expandAll")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {rotatedGrouped.length === 0 ? (
          <View style={styles.emptyList}>
            <Feather name="compass" size={28} color={TEXT_3} />
            <Text style={styles.emptyTitle}>{t("coach.empty.title")}</Text>
            <Text style={styles.emptyBody}>{t("coach.empty.body")}</Text>
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
                  <Text style={styles.groupLabel}>{t(group.labelKey)}</Text>
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

      {/* Le voile se pose sur la liste, jamais sur l'en-tête : on doit pouvoir
          revenir en arrière, changer d'espace et rouvrir le questionnaire. */}
      {adviceLocked ? (
        <View style={styles.lockedArea} pointerEvents="box-none">
          <LockedOverlay
            titleKey="coach.paywall.title"
            bodyKey="coach.paywall.body"
            icon="award"
            cards
          />
        </View>
      ) : null}
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
              <Text
                style={[styles.optionText, active && styles.optionTextActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Grille de chips compacte — pour les questions à beaucoup d'options (pays).
// Retape la sélection pour la retirer (déselection toujours permise).
function ChipsBlock<T extends string>({
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
  onSelect: (v: T | undefined) => void;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.qLabel}>{label}</Text>
      {hint ? <Text style={styles.qHint}>{hint}</Text> : null}
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onSelect(active ? undefined : opt.value)}
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
  const { t } = useLang();
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.qLabel}>{t("coach.pets.label")}</Text>
      <Text style={styles.qHint}>{t("coach.pets.hint")}</Text>
      <View style={{ gap: 8, marginTop: 8 }}>
        {petOptions(t).map((opt) => {
          const pet = pets.find((p) => p.species === opt.value);
          const active = !!pet;
          return (
            <View key={opt.value}>
              <TouchableOpacity
                onPress={() => onToggleSpecies(opt.value)}
                style={[styles.optionRow, active && styles.optionRowActive]}
                activeOpacity={0.85}
              >
                <View
                  style={[styles.checkbox, active && styles.checkboxActive]}
                >
                  {active ? (
                    <Feather name="check" size={12} color="#000" />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    active && styles.optionTextActive,
                    { flex: 1 },
                  ]}
                >
                  {opt.label}
                </Text>
                {active ? (
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      onPress={() =>
                        onSetCount(opt.value, (pet?.count ?? 1) - 1)
                      }
                      hitSlop={8}
                      style={styles.stepperBtn}
                    >
                      <Feather name="minus" size={14} color={TEXT_1} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{pet?.count ?? 1}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        onSetCount(opt.value, (pet?.count ?? 1) + 1)
                      }
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
  const { t } = useLang();
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.qLabel}>{label}</Text>
      <Text style={styles.qHint}>{t("coach.children.hint")}</Text>
      <View style={{ gap: 8, marginTop: 8 }}>
        {childrenOptions(t).map((opt) => {
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
              <Text
                style={[styles.optionText, active && styles.optionTextActive]}
              >
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
  const { t, tp } = useLang();
  const [expanded, setExpanded] = useState(false);
  // Le catalogue ne porte que des clés i18n (`adv.…`) : on traduit au rendu.
  const i18n = useMemo(() => ({ t, tp }), [t, tp]);
  const body = resolveBody(card, profile, i18n);
  const action = resolveAction(card, profile, i18n);
  const figures = resolveFigures(card, profile, i18n);

  return (
    <View style={styles.adviceCard}>
      <Text style={styles.adviceTitle}>{resolveTitle(card, i18n)}</Text>
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

      {card.nominalRatePct !== undefined ? (
        <RealReturnLine
          nominalRatePct={card.nominalRatePct}
          country={profile.country}
        />
      ) : null}

      {action.link ? (
        <TouchableOpacity
          onPress={() => openExternal(action.link)}
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
          {tp(expanded ? "coach.sources.hide" : "coach.sources.show", {
            date: card.lastVerified,
          })}
        </Text>
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.sourcesList}>
          {card.sources.map((src, i) => (
            <TouchableOpacity key={i} onPress={() => openExternal(src)}>
              <Text style={styles.sourceText}>{src}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  doneWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  doneRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(74,222,128,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(74,222,128,0.4)",
    marginBottom: 22,
  },
  doneTitle: {
    color: TEXT_1,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  doneBody: {
    color: TEXT_2,
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: "center",
  },
  doneLater: { alignItems: "center", paddingVertical: 12 },
  doneLaterText: { color: TEXT_3, fontSize: 13.5, fontWeight: "600" },
  recapCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    marginBottom: 18,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.28)",
    backgroundColor: "rgba(74,222,128,0.06)",
  },
  recapTitle: { color: TEXT_2, fontSize: 11.5 },
  recapValue: { color: TEXT_1, fontSize: 14, fontWeight: "700", marginTop: 1 },
  recapEdit: { color: GOLD, fontSize: 12, fontWeight: "700" },
  // Commence sous l'en-tête et le badge de scope, qui restent nets et actifs.
  lockedArea: { position: "absolute", left: 0, right: 0, top: 116, bottom: 0 },
  safe: { flex: 1, backgroundColor: MIDNIGHT },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
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

  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { color: TEXT_2, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#000", fontWeight: "700" },

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
  ctaBtnSecondary: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 10,
  },
  ctaBtnSecondaryText: { color: TEXT_2, fontSize: 14, fontWeight: "600" },
  missingBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "rgba(74,222,128,0.08)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.28)",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  missingText: { color: TEXT_2, fontSize: 13, lineHeight: 19, flex: 1 },

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
  figureLabel: {
    color: TEXT_3,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
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
