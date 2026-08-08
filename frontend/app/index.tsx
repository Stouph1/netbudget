import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openExternal } from "../src/utils/openExternal";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  SectionList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Pressable,
  Alert,
  Keyboard,
  Switch,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as StoreReview from "expo-store-review";
import * as Application from "expo-application";
import { checkForUpdate, dismissUpdate, type UpdateInfo } from "../src/utils/appUpdate";
import { loanProgress, remainingParts } from "../src/utils/loanSchedule";
import LoanScheduleModal from "../src/components/LoanScheduleModal";
import PremiumHomePanel from "../src/components/PremiumHomePanel";
import EventsPanel, { eventNeedsAttention } from "../src/components/EventsPanel";
import { useSession } from "../src/contexts/SessionContext";
import { deleteAccount } from "../src/lib/auth";
import { notify } from "../src/utils/notify";
import BirthdayCelebration from "../src/components/BirthdayCelebration";
import {
  buildBirthdayCards,
  buildChildBirthdayCards,
  buildPetBirthdayCards,
  type BirthdayCard,
} from "../src/constants/ageFacts";
import {
  computeAge,
  isBirthdayToday,
  scheduleBirthdayNotification,
} from "../src/utils/birthday";
import { useActiveScope } from "../src/hooks/useActiveScope";
import { useCurrency } from "../src/contexts/CurrencyContext";
import { useLang } from "../src/contexts/LangContext";
import {
  computeBudgetSplit,
  deriveMatchingProfile,
  explainBudgetSplit,
  getBudgetMixProfile,
} from "../src/lib/adviceEngine";
import {
  addSavedAdvice,
  loadCelebrations,
  loadAdviceProfile,
  loadBudget,
  loadEvents,
  recordBudgetHistoryPoint,
  saveBudget,
} from "../src/lib/premiumStore";
import { loadProfileDetails } from "../src/lib/profile";
import ScopeSwitcher from "../src/components/ScopeSwitcher";
import type { UserProfile } from "../src/types/advice";
import {
  ensureMonthlyRemindersScheduled,
  getMonthlyEnabled,
  pickMonthlyVariants,
  setMonthlyReminderEnabled,
  setupNotificationHandler,
} from "../src/utils/notifications";
import DonutChart, { DonutSegment } from "../src/components/DonutChart";
import MonthlyBreakdown, { MonthRow } from "../src/components/MonthlyBreakdown";
import { CITIES, City, COUNTRIES, INDEX_SOURCES, citiesByCountry, getCountry } from "../src/constants/cities";
import {
  computeLoanMonthlyPayment,
  normalizeText,
  levenshtein,
  parseNumber,
} from "../src/utils/finance";
import {
  CurrencyCode,
  CURRENCIES,
  DEFAULT_CURRENCY,
  formatCurrency,
  getCurrency,
} from "../src/utils/currency";
import { buildAdvice, AdviceItem, interpolate } from "../src/utils/advice";
import {
  getRates,
  convert,
  isFresh,
  RatesPayload,
} from "../src/utils/exchangeRates";
import {
  Lang,
  LANGUAGES,
  DEFAULT_LANG,
  t as tr,
} from "../src/i18n/translations";
import { generatePdfHtml, PdfData } from "../src/utils/pdf";
import {
  IncomeSource,
  IncomeType,
  IncomeFrequency,
  ProStatus,
  STATUS_LABEL,
  STATUS_DEFAULT_CHARGES,
  TYPE_LABEL,
  TYPE_ICON,
  TYPE_DEFAULT_CHARGES,
  TYPE_HINT,
  averageMonthlyNet,
  averageMonthlyTithe,
  annualGross,
  monthlyNetSeries,
  defaultIncomeSource,
} from "../src/utils/income";
import { loadState, saveState } from "../src/utils/storage";

const MONTH_KEYS_LONG = [
  "month.long.0", "month.long.1", "month.long.2", "month.long.3",
  "month.long.4", "month.long.5", "month.long.6", "month.long.7",
  "month.long.8", "month.long.9", "month.long.10", "month.long.11",
];
const MONTH_KEYS_SHORT = [
  "month.short.0", "month.short.1", "month.short.2", "month.short.3",
  "month.short.4", "month.short.5", "month.short.6", "month.short.7",
  "month.short.8", "month.short.9", "month.short.10", "month.short.11",
];

type LoanMode = "computed" | "direct";

type Loan = {
  id: string;
  name: string;
  mode?: LoanMode; // undefined = "computed" (rétrocompat v1.2.x)
  principal: string;
  ratePercent: string;
  years: string;
  directMonthly?: string;
  startDate?: string; // "AAAA-MM-JJ" — 1re échéance, pour le suivi dans le temps
};

// La date de 1re échéance se saisit en MM/AAAA (le jour n'a pas d'importance
// pour un échéancier mensuel) et se stocke en ISO.
// Saisie de la date : on ne garde que les chiffres et on formate en MM/AAAA
// au fur et à mesure. Le clavier numérique n'a pas de touche "/" — l'utilisateur
// tape 092023, l'app affiche 09/2023.
function formatMonthInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function monthInputToIso(input: string): string | undefined {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 6) return undefined;
  const month = parseInt(digits.slice(0, 2), 10);
  const year = parseInt(digits.slice(2), 10);
  if (month < 1 || month > 12) return undefined;
  if (year < 1950 || year > 2100) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function isoToMonthInput(iso: string | undefined): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[2]}/${m[1]}` : "";
}

function loanMonthlyPayment(l: Loan): number {
  if (l.mode === "direct") return parseNumber(l.directMonthly || "0");
  return computeLoanMonthlyPayment(
    parseNumber(l.principal),
    parseNumber(l.ratePercent),
    parseNumber(l.years)
  );
}

type ExpenseFamily = "besoins" | "loisirs" | "epargne";

type ExpenseItem = {
  id: string;
  family: ExpenseFamily;
  label: string;
  labelKey?: string; // si present, sert de cle i18n pour traduire le label par defaut
  icon: keyof typeof Feather.glyphMap;
  color: string;
  amount: string;
};

const FAMILY_META: Record<
  ExpenseFamily,
  { label: string; sub: string; color: string; icon: keyof typeof Feather.glyphMap }
> = {
  besoins: { label: "Besoins", sub: "indispensable au quotidien", color: "#3B82F6", icon: "shield" },
  loisirs: { label: "Loisirs", sub: "plaisirs, sorties, vacances", color: "#A855F7", icon: "music" },
  epargne: { label: "Épargne / Investissement", sub: "ce que tu mets de côté", color: "#F59E0B", icon: "trending-up" },
};

const FAMILY_ORDER: ExpenseFamily[] = ["besoins", "loisirs", "epargne"];

const DEFAULT_ITEMS: ExpenseItem[] = [
  { id: "alimentation", family: "besoins", label: "Alimentation", labelKey: "expense.alimentation", icon: "shopping-cart", color: "#10B981", amount: "0" },
  { id: "transport", family: "besoins", label: "Transport", labelKey: "expense.transport", icon: "navigation", color: "#F59E0B", amount: "0" },
  { id: "sante", family: "besoins", label: "Santé / Mutuelle", labelKey: "expense.sante", icon: "heart", color: "#06B6D4", amount: "0" },
  { id: "energie", family: "besoins", label: "Énergie", labelKey: "expense.energie", icon: "zap", color: "#F97316", amount: "0" },
  { id: "eau", family: "besoins", label: "Eau", labelKey: "expense.eau", icon: "droplet", color: "#38BDF8", amount: "0" },
  { id: "abonnements", family: "besoins", label: "Abonnements (essentiels)", labelKey: "expense.abonnements", icon: "wifi", color: "#EC4899", amount: "0" },
  { id: "sorties", family: "loisirs", label: "Sorties / Restos", labelKey: "expense.sorties", icon: "coffee", color: "#A855F7", amount: "0" },
  { id: "vacances", family: "loisirs", label: "Vacances", labelKey: "expense.vacances", icon: "sun", color: "#C084FC", amount: "0" },
  { id: "streaming", family: "loisirs", label: "Streaming / Hobbies", labelKey: "expense.streaming", icon: "play", color: "#D946EF", amount: "0" },
  { id: "livret", family: "epargne", label: "Livret A / LDDS", labelKey: "expense.livret", icon: "save", color: "#F59E0B", amount: "0" },
  { id: "pea", family: "epargne", label: "PEA", labelKey: "expense.pea", icon: "bar-chart-2", color: "#FBBF24", amount: "0" },
  { id: "cto", family: "epargne", label: "CTO", labelKey: "expense.cto", icon: "trending-up", color: "#FDE047", amount: "0" },
  { id: "av", family: "epargne", label: "Assurance vie", labelKey: "expense.av", icon: "file-text", color: "#FCD34D", amount: "0" },
];

// Renvoie le label affiche pour un item : prefere la traduction si labelKey existe,
// sauf si l'utilisateur a renomme l'item (label != labelKey FR par defaut).
function displayItemLabel(item: ExpenseItem, tt: (key: string) => string): string {
  if (item.labelKey) return tt(item.labelKey);
  return item.label;
}

// Backfill labelKey pour les items par défaut sauvegardés avant l'i18n des
// labels — utilisé à l'hydratation ET au switch de scope budget.
function backfillItemLabels(items: ExpenseItem[]): ExpenseItem[] {
  return items.map((it) => {
    if (it.labelKey) return it;
    const def = DEFAULT_ITEMS.find((d) => d.id === it.id);
    if (def && def.labelKey && it.label === def.label) {
      return { ...it, labelKey: def.labelKey };
    }
    return it;
  });
}

const FAMILY_PALETTE: Record<ExpenseFamily, string[]> = {
  besoins: ["#10B981", "#06B6D4", "#3B82F6", "#F97316", "#EC4899"],
  loisirs: ["#A855F7", "#C084FC", "#D946EF", "#8B5CF6", "#E879F9"],
  epargne: ["#F59E0B", "#FBBF24", "#FCD34D", "#FDE047", "#EAB308"],
};

const SCREEN_H = Dimensions.get("window").height;

const GOLD = "#4ADE80";
const BG = "#0A0F1A";
const SURFACE = "#141826";
const SURFACE_2 = "#1C2130";
const BORDER = "#2A3142";
const TEXT = "#FFFFFF";
const TEXT_2 = "#A1A1AA";
const TEXT_3 = "#71717A";
const DANGER = "#EF4444";
const SUCCESS = "#10B981";
const COLOR_LOYER = "#3B82F6";
const COLOR_PRETS = "#EF4444";

type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
  onConfirm?: () => void;
  /** Libellé du bouton d'annulation (défaut : « Annuler »). */
  cancelLabel?: string;
  /** Action au refus — utile quand « Non » n'est pas un simple abandon. */
  onCancel?: () => void;
};

export default function Index() {
  // Insets pour éviter que les modales remontent sous la barre de statut iOS
  // quand le clavier s'ouvre (cf. KeyboardAvoidingView dans chaque modal).
  const insets = useSafeAreaInsets();

  // Revenus
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e?.endCoordinates?.height ?? 0);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Hauteur dynamique du sheet : si le clavier est ouvert, on rétrécit la modale
  // pour qu'elle ne déborde plus sous la barre de statut iOS. Sinon, 85 % comme avant.
  const sheetHeight =
    keyboardHeight > 0
      ? Math.max(220, SCREEN_H - insets.top - keyboardHeight - 16)
      : Math.round(SCREEN_H * 0.85);


  // Hydratation depuis AsyncStorage au démarrage
  const [hydrated, setHydrated] = useState(false);

  // Devise
  // Devise partagée avec tous les écrans (contexte) : un changement dans les
  // Réglages se propage aux Projets, aux objectifs et au profil.
  const { currency, setCurrency } = useCurrency();
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const fmt = (v: number) => formatCurrency(v, currency);

  // Langue
  // Langue partagée avec tous les écrans (contexte) : un changement dans les
  // Réglages se propage au Coach, aux Projets et à l'inscription.
  const { lang, setLang } = useLang();
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const t = (k: string) => tr(k, lang);
  // Traducteurs passés aux modules de DONNÉES (moteur de conseils, cartes
  // d'anniversaire) : ils ne portent que des clés i18n, jamais de texte.
  const adviceI18n = useMemo(
    () => ({
      t: (k: string) => tr(k, lang),
      tp: (k: string, params: Record<string, string | number>) =>
        interpolate(tr(k, lang), params),
    }),
    [lang],
  );

  // Durée restante d'un prêt, composée dans la langue de l'app (l'utilitaire
  // ne renvoie que les nombres — la phrase dépend de la langue).
  const humanRemaining = useCallback(
    (p: Parameters<typeof remainingParts>[0]): string => {
      const { finished, years, months } = remainingParts(p);
      if (finished) return t("schedule.finished");
      const mLabel = interpolate(t("schedule.rem.months"), { m: months });
      if (years === 0) return mLabel;
      const yLabel =
        years === 1
          ? t("schedule.rem.years.one")
          : interpolate(t("schedule.rem.years.many"), { y: years });
      return months === 0
        ? yLabel
        : interpolate(t("schedule.rem.combo"), { years: yLabel, months: mLabel });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );

  // Navigation par onglet (bottom tabs).
  // Les 3 onglets sont rendus en rangée horizontale ; on translate le container
  // pour suivre le doigt en temps réel (style Instagram/Twitter), puis on snap
  // au plus proche au relâchement.
  type Tab = "settings" | "events" | "budget" | "converter" | "premium";
  const TAB_ORDER: Tab[] = ["settings", "events", "budget", "converter", "premium"];
  const [tab, setTab] = useState<Tab>("budget");

  // Retour depuis les écrans Premium (icône maison) : ils naviguent vers "/"
  // avec ?tab=premium pour rouvrir l'app sur l'onglet Profil AVEC la tab bar.
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  useEffect(() => {
    if (!tabParam) return;
    if ((TAB_ORDER as string[]).includes(tabParam)) {
      setTab(tabParam as Tab);
    }
    router.setParams({ tab: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  const screenW = Dimensions.get("window").width;
  const tabIndexSV = useSharedValue(2); // 2 = budget par défaut
  const swipeX = useSharedValue(-screenW * 2);

  const setTabFromIndex = useCallback((idx: number) => {
    setTab(TAB_ORDER[idx]);
  }, []);

  useEffect(() => {
    const idx = TAB_ORDER.indexOf(tab);
    tabIndexSV.value = idx;
    swipeX.value = withTiming(-idx * screenW, { duration: 220 });
  }, [tab, screenW, tabIndexSV, swipeX]);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-20, 20])
        .onUpdate((e) => {
          "worklet";
          const base = -tabIndexSV.value * screenW;
          // résistance aux extrémités (style iOS)
          let dx = e.translationX;
          if (tabIndexSV.value === 0 && dx > 0) dx = dx * 0.35;
          if (tabIndexSV.value === TAB_ORDER.length - 1 && dx < 0) dx = dx * 0.35;
          swipeX.value = base + dx;
        })
        .onEnd((e) => {
          "worklet";
          const threshold = screenW / 4;
          let newIdx = tabIndexSV.value;
          if (e.translationX < -threshold || e.velocityX < -600) {
            newIdx = Math.min(TAB_ORDER.length - 1, newIdx + 1);
          } else if (e.translationX > threshold || e.velocityX > 600) {
            newIdx = Math.max(0, newIdx - 1);
          }
          swipeX.value = withTiming(-newIdx * screenW, { duration: 220 });
          if (newIdx !== tabIndexSV.value) {
            tabIndexSV.value = newIdx;
            runOnJS(setTabFromIndex)(newIdx);
          }
        }),
    [screenW, setTabFromIndex, swipeX, tabIndexSV],
  );

  const swipeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  // ----- Tab bar "liquid glass" : bulle de sélection façon Apple -----
  //
  // Deux régimes distincts, c'est ce qui fait la sensation :
  //  - au repos, la bulle suit swipeX → elle glisse avec les swipes d'écran ;
  //  - pendant un maintien, elle suit le DOIGT en direct (dragProgress), sans
  //    passer par l'animation d'écran de 220 ms qui donnait un rendu mou.
  // Au maintien, la bulle « prend le focus » : elle grossit et s'éclaircit.
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const dragProgress = useSharedValue(-1); // -1 = pas de drag en cours
  const tabFocus = useSharedValue(0); // 0 → 1 pendant le maintien

  const tabIndicatorStyle = useAnimatedStyle(() => {
    const tabW = tabBarWidth > 0 ? (tabBarWidth - 20) / TAB_ORDER.length : 0;
    // Position continue : le doigt prime sur l'animation d'écran.
    const progress =
      dragProgress.value >= 0 ? dragProgress.value : -swipeX.value / screenW;
    return {
      transform: [
        { translateX: 10 + progress * tabW },
        { scale: 1 + tabFocus.value * 0.1 },
      ],
      opacity: tabBarWidth > 0 ? 1 : 0,
      backgroundColor: `rgba(74,222,128,${0.14 + tabFocus.value * 0.16})`,
      shadowOpacity: tabFocus.value * 0.5,
    };
  }, [tabBarWidth, screenW]);

  // Maintenir le doigt sur la barre puis glisser = la sélection suit le doigt.
  const lastSlideIdx = useSharedValue(-1);
  const tabSlideGesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(160)
        .onStart((e) => {
          "worklet";
          // Le maintien est reconnu : la bulle s'anime pour le signaler et
          // saute sous le doigt.
          tabFocus.value = withTiming(1, { duration: 140 });
          lastSlideIdx.value = -1;
          if (tabBarWidth > 0) {
            const tabW = (tabBarWidth - 20) / TAB_ORDER.length;
            dragProgress.value = Math.min(
              TAB_ORDER.length - 1,
              Math.max(0, (e.x - 10) / tabW - 0.5),
            );
          }
        })
        .onUpdate((e) => {
          "worklet";
          if (tabBarWidth <= 0) return;
          const tabW = (tabBarWidth - 20) / TAB_ORDER.length;
          // Position continue → la bulle colle au doigt, sans à-coups.
          dragProgress.value = Math.min(
            TAB_ORDER.length - 1,
            Math.max(0, (e.x - 10) / tabW - 0.5),
          );
          // Sélection réelle : dès que le doigt entre dans une nouvelle case.
          const idx = Math.min(
            TAB_ORDER.length - 1,
            Math.max(0, Math.floor((e.x - 10) / tabW)),
          );
          if (idx !== lastSlideIdx.value) {
            lastSlideIdx.value = idx;
            runOnJS(setTabFromIndex)(idx);
          }
        })
        .onFinalize(() => {
          "worklet";
          // Relâchement : la bulle se recale en douceur sur l'onglet actif et
          // rend la main à swipeX.
          tabFocus.value = withTiming(0, { duration: 180 });
          if (dragProgress.value >= 0) {
            dragProgress.value = withSpring(
              Math.round(dragProgress.value),
              { damping: 18, stiffness: 220 },
              (finished?: boolean) => {
                "worklet";
                if (finished) dragProgress.value = -1;
              },
            );
          }
        }),
    [tabBarWidth, setTabFromIndex, lastSlideIdx],
  );

  // Convertisseur de devise
  const [convFrom, setConvFrom] = useState<CurrencyCode>("EUR");
  const [convTo, setConvTo] = useState<CurrencyCode>("USD");
  const [convAmount, setConvAmount] = useState<string>("100");
  const [rates, setRates] = useState<RatesPayload | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [convPickerFor, setConvPickerFor] = useState<"from" | "to" | null>(null);

  type ConvHistoryItem = {
    id: string;
    from: CurrencyCode;
    to: CurrencyCode;
    amount: number;
    result: number;
    timestamp: number;
  };
  const [convHistory, setConvHistory] = useState<ConvHistoryItem[]>([]);

  function swapConv() {
    const f = convFrom;
    const tCode = convTo;
    setConvFrom(tCode);
    setConvTo(f);
  }

  function pushHistory(amount: number, result: number) {
    if (amount <= 0 || result <= 0) return;
    setConvHistory((prev) => {
      // Évite les doublons immédiats
      if (
        prev[0] &&
        prev[0].from === convFrom &&
        prev[0].to === convTo &&
        prev[0].amount === amount
      )
        return prev;
      return [
        {
          id: `${Date.now()}`,
          from: convFrom,
          to: convTo,
          amount,
          result,
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 15);
    });
  }

  function restoreHistory(h: ConvHistoryItem) {
    setConvFrom(h.from);
    setConvTo(h.to);
    setConvAmount(String(h.amount));
  }

  async function refreshRates(force = false) {
    setRatesLoading(true);
    const r = await getRates(force);
    if (r) setRates(r);
    setRatesLoading(false);
  }

  useEffect(() => {
    refreshRates(false);
  }, []);

  // Enregistre automatiquement dans l'historique 1,5 s après que l'utilisateur ait fini de taper
  useEffect(() => {
    if (tab !== "converter") return;
    const amt = parseNumber(convAmount);
    const res = convert(amt, convFrom, convTo, rates);
    if (amt <= 0 || res <= 0) return;
    const timeoutId = setTimeout(() => pushHistory(amt, res), 1500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convAmount, convFrom, convTo, rates, tab]);

  const convResult = useMemo(
    () => convert(parseNumber(convAmount), convFrom, convTo, rates),
    [convAmount, convFrom, convTo, rates]
  );

  function formatRelativeAgo(ts: number): string {
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH} h`;
    const diffD = Math.round(diffH / 24);
    return `il y a ${diffD} j`;
  }

  // Sources de revenu (v2 multi-sources)
  const [incomes, setIncomes] = useState<IncomeSource[]>([defaultIncomeSource()]);

  // Modal d'édition d'une source de revenu
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null);
  const [incomeForm, setIncomeForm] = useState<IncomeSource>(defaultIncomeSource());

  // Logement
  const [rent, setRent] = useState<string>("0");

  // Dépenses mensuelles par famille (Besoins / Loisirs / Épargne)
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>(DEFAULT_ITEMS);

  // Modal "Mise à jour disponible" : vérification au lancement contre l'App Store.
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  useEffect(() => {
    (async () => {
      const installed = Application.nativeApplicationVersion ?? "0.0.0";
      const info = await checkForUpdate(installed);
      if (info) setUpdateInfo(info);
    })();
  }, []);

  // Rappels mensuels (1er + 28) : toggle, état initial + (re)programmation au boot.
  // L'OS peut perdre la planification après une réinstall ou un long redémarrage ;
  // on re-schedule à chaque ouverture si l'utilisateur a la permission + le toggle ON.
  // La variante du message tourne chaque mois (mois % 3) — voir pickMonthlyVariants.
  const [monthlyReminder, setMonthlyReminder] = useState(true);
  useEffect(() => {
    setupNotificationHandler();
    (async () => {
      const enabled = await getMonthlyEnabled();
      setMonthlyReminder(enabled);
      const variants = pickMonthlyVariants(t);
      await ensureMonthlyRemindersScheduled(variants);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggleMonthlyReminder = useCallback(
    async (next: boolean) => {
      setMonthlyReminder(next); // optimiste
      const variants = pickMonthlyVariants(t);
      const effective = await setMonthlyReminderEnabled(next, variants);
      if (effective !== next) {
        // L'utilisateur a refusé la permission système → on remet à OFF et on l'informe.
        setMonthlyReminder(false);
        Alert.alert(
          t("settings.notifications.title"),
          t("settings.notifications.denied"),
        );
      }
    },
    [t],
  );

  // Profil Premium (advice engine) — pour personnaliser le ratio budgétaire
  // (50/30/20 par défaut) dans l'en-tête du tab Budget. Null si free tier.
  // Suit le scope actif : le mix du workspace "couple" peut différer du perso.
  const { user: premiumUser } = useSession();
  const {
    workspaceId: activeWorkspaceId,
    workspaceKind: activeWorkspaceKind,
    scopeLabel, scopeLabelIsKey,
  } = useActiveScope();
  // Le scope perso renvoie une CLÉ i18n, un espace nommé renvoie son nom.
  const resolvedScopeLabel = scopeLabelIsKey ? t(scopeLabel) : scopeLabel;
  const [premiumProfile, setPremiumProfile] = useState<UserProfile | null>(null);
  // Ville libre saisie dans le profil (« Rouen »), à faire correspondre au
  // référentiel de villes pour l'indice de coût de la vie.
  const [profileCity, setProfileCity] = useState<string | null>(null);
  // Points rouges de la tab bar : un signal par onglet (événement en retard /
  // J-7 sous-financé sur Événements, fête d'anniversaire prête sur Profil).
  const [tabBadges, setTabBadges] = useState<Partial<Record<Tab, boolean>>>({});
  // Anniversaire : cartes de célébration (une fois par an, le jour J)
  const [bdayCards, setBdayCards] = useState<BirthdayCard[] | null>(null);
  const [bdayOpen, setBdayOpen] = useState(false);
  // Source du dépôt pour la fête en cours : "birthday" | "child:Nom" | "pet:Nom"
  const [bdaySource, setBdaySource] = useState("birthday");
  // Dîme (profil chrétien) : chargée depuis la table profiles. 0 = inactif.
  const [tithePercent, setTithePercent] = useState(0);
  useEffect(() => {
    if (!premiumUser?.id) {
      setTabBadges((b) => ({ ...b, events: false }));
      return;
    }
    let cancelled = false;
    loadEvents(premiumUser.id, activeWorkspaceId).then((evs) => {
      if (cancelled) return;
      setTabBadges((b) => ({ ...b, events: evs.some((e) => eventNeedsAttention(e)) }));
    });
    return () => {
      cancelled = true;
    };
  }, [premiumUser?.id, activeWorkspaceId, tab]);

  useEffect(() => {
    setTabBadges((b) => ({ ...b, premium: bdayOpen }));
  }, [bdayOpen]);

  const reloadPremiumProfile = useCallback(async () => {
    if (!premiumUser?.id) {
      setPremiumProfile(null);
      setTithePercent(0);
      return;
    }
    const [p, details] = await Promise.all([
      loadAdviceProfile(premiumUser.id, activeWorkspaceId),
      loadProfileDetails(premiumUser.id),
    ]);
    // Même dérivation que l'écran Conseils : en scope couple la situation
    // familiale est déduite du workspace, en scope association le profil
    // perso est neutralisé (mix 50/30/20 par défaut).
    setPremiumProfile(deriveMatchingProfile(p, activeWorkspaceKind));
    setTithePercent(details.tithe_enabled ? details.tithe_percent : 0);
    // La ville saisie dans le profil est la donnée la PLUS précise sur « où je
    // vis » : elle bat la région pour choisir l'indice de coût de la vie.
    setProfileCity(details.city ?? null);

    // Anniversaires : le sien + ceux des enfants/animaux suivis.
    // Une célébration par personne et par an ; la sienne est prioritaire.
    const year = new Date().getFullYear();
    let opened = false;
    if (details.birthdate) {
      scheduleBirthdayNotification(details.birthdate, details.first_name);
      if (isBirthdayToday(details.birthdate)) {
        const yearKey = `netbudget:bday:${year}`;
        const seen = await AsyncStorage.getItem(yearKey).catch(() => null);
        if (!seen) {
          await AsyncStorage.setItem(yearKey, "1").catch(() => {});
          const a = computeAge(new Date(details.birthdate));
          // Toujours le profil PERSO frais : le pays/la région choisis dans
          // le Coach doivent piloter les cartes, jamais le scope actif.
          const perso = await loadAdviceProfile(premiumUser!.id, null);
          setBdaySource("birthday");
          setBdayCards(buildBirthdayCards(a, details.first_name, perso, adviceI18n));
          setBdayOpen(true);
          opened = true;
        }
      }
    }
    if (!opened && premiumUser?.id) {
      const celebs = await loadCelebrations(premiumUser.id).catch(() => []);
      for (const c of celebs) {
        if (!isBirthdayToday(c.birthdate)) continue;
        const key = `netbudget:bday:${c.id}:${year}`;
        const seen = await AsyncStorage.getItem(key).catch(() => null);
        if (seen) continue;
        await AsyncStorage.setItem(key, "1").catch(() => {});
        if (c.kind === "child") {
          const a = computeAge(new Date(c.birthdate));
          const perso = await loadAdviceProfile(premiumUser.id, null);
          setBdaySource(`child:${c.name}`);
          setBdayCards(buildChildBirthdayCards(a, c.name, perso, adviceI18n));
        } else {
          setBdaySource(`pet:${c.name}`);
          setBdayCards(buildPetBirthdayCards(c.name, c.species ?? "other", adviceI18n));
        }
        setBdayOpen(true);
        break; // une fête à la fois
      }
    }
  }, [premiumUser?.id, activeWorkspaceId, activeWorkspaceKind, adviceI18n]);
  useEffect(() => {
    reloadPremiumProfile();
  }, [reloadPremiumProfile]);
  // Recharge à chaque switch vers le tab Budget (au cas où le profil ait été
  // modifié dans l'écran Conseils personnalisés Premium).
  useEffect(() => {
    if (tab === "budget") {
      reloadPremiumProfile();
    }
  }, [tab, reloadPremiumProfile]);

  const budgetRatio = useMemo(() => {
    // Dès qu'UN signal du profil est connu (âge, famille, logement, pays,
    // handicap…), on personnalise. Exiger age ET family faisait retomber la
    // majorité des utilisateurs sur un ratio générique alors qu'ils avaient
    // rempli leur profil — d'où l'impression de conseils qui ne les
    // connaissent pas.
    const hasSignal =
      premiumProfile &&
      (premiumProfile.age ||
        premiumProfile.family ||
        premiumProfile.housing ||
        premiumProfile.children?.length ||
        premiumProfile.monthlySavingsCapacity ||
        premiumProfile.disabilitySelf ||
        premiumProfile.disabilityChild);
    if (hasSignal) {
      const s = computeBudgetSplit(premiumProfile);
      return { ...s, personalized: true };
    }
    return { besoins: 50, envies: 30, epargne: 20, personalized: false };
  }, [premiumProfile]);

  // Prompt de note App Store : se déclenche une seule fois, quand l'utilisateur
  // scrolle jusqu'en bas de l'onglet Budget après avoir rempli quelques données.
  const RATE_KEY = "netbudget:ratePromptShown";
  const ratePromptShownRef = useRef(false);
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(RATE_KEY);
        ratePromptShownRef.current = v === "1";
      } catch {}
    })();
  }, []);
  const maybePromptRate = useCallback(async () => {
    if (ratePromptShownRef.current) return;
    const hasData =
      incomes.some((s) => parseNumber(s.amount) > 0) ||
      parseNumber(rent) > 0 ||
      expenseItems.some((e) => parseNumber(e.amount) > 0);
    if (!hasData) return;
    try {
      const ok = await StoreReview.isAvailableAsync();
      if (!ok) return;
      ratePromptShownRef.current = true;
      await AsyncStorage.setItem(RATE_KEY, "1");
      await StoreReview.requestReview();
    } catch {
      // silencieux : le prompt est non-essentiel
    }
  }, [incomes, rent, expenseItems]);
  const onBudgetScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const reachedBottom =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 120;
      if (reachedBottom) maybePromptRate();
    },
    [maybePromptRate],
  );

  // Modal d'ajout d'une catégorie custom
  const [addItemFamily, setAddItemFamily] = useState<ExpenseFamily | null>(null);
  const [newItemLabel, setNewItemLabel] = useState<string>("");
  const [newItemAmount, setNewItemAmount] = useState<string>("0");

  // Ville
  const [city, setCity] = useState<City>(CITIES[0]);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityInfoOpen, setCityInfoOpen] = useState(false);

  // Localisation : le PROFIL est la source de vérité dès qu'un compte existe.
  //
  // Avant, le réglage local « localisation par défaut » gagnait dès qu'on y
  // avait touché : on pouvait déclarer Rouen dans son profil et continuer de
  // voir Boston dans le dashboard. Deux endroits pour la même information,
  // l'un écrasant l'autre en silence — mauvaise conception. Désormais :
  //   - connecté    → la ville vient du profil (ville, sinon région, sinon pays)
  //   - sans compte → le réglage local des Réglages, comme avant
  const profileCityResolved = useMemo(() => {
    if (!premiumUser?.id) return null;
    const norm = (v: string) =>
      v
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z]/g, "");

    // 1. La ville saisie dans le profil — donnée la plus précise.
    const wanted = profileCity?.trim() ? norm(profileCity) : "";
    if (wanted) {
      const exact = CITIES.find((c) => norm(c.name) === wanted);
      const partial =
        exact ??
        (wanted.length >= 4
          ? CITIES.find((c) => norm(c.name).startsWith(wanted))
          : undefined);
      if (partial) return partial;
    }

    // 2. Sinon la région, 3. sinon le pays : ville d'indice MÉDIAN de la zone,
    //    pour ne surestimer (capitale) ni sous-estimer (village) le coût de la vie.
    const region = premiumProfile?.region;
    const country = premiumProfile?.country;
    const pool = region
      ? CITIES.filter((c) => c.region === region)
      : country
        ? CITIES.filter((c) => c.countryCode === country)
        : [];
    if (!pool.length) return null;
    const sorted = [...pool].sort((a, b) => a.index - b.index);
    return sorted[Math.floor(sorted.length / 2)];
  }, [premiumUser?.id, profileCity, premiumProfile?.region, premiumProfile?.country]);

  useEffect(() => {
    if (profileCityResolved && profileCityResolved.id !== city.id) {
      setCity(profileCityResolved);
    }
  }, [profileCityResolved, city.id]);

  // Picker à 2 étapes : "country" puis "city"
  const [pickerStep, setPickerStep] = useState<"country" | "city">("country");
  const [pickerCountry, setPickerCountry] = useState<string | null>(null);
  const [ruleInfoOpen, setRuleInfoOpen] = useState(false);

  // Prêts
  const [loans, setLoans] = useState<Loan[]>([]);
  // Texte brut du champ « début du prêt » (MM/AAAA en cours de frappe)
  const [loanStartText, setLoanStartText] = useState("");
  // Prêt dont on consulte l'échéancier détaillé
  const [scheduleLoan, setScheduleLoan] = useState<Loan | null>(null);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [form, setForm] = useState<Loan>({
    id: "", name: "", mode: "computed",
    principal: "0", ratePercent: "0", years: "0", directMonthly: "0",
  });

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false, title: "", message: "",
  });

  // ----- Persistance : load au montage -----
  useEffect(() => {
    (async () => {
      const stored = await loadState();
      if (stored) {
        if (Array.isArray(stored.incomes) && stored.incomes.length > 0) {
          setIncomes(stored.incomes as IncomeSource[]);
        } else if (stored.baseAnnual || stored.variableAnnual) {
          // Migration v1 → v2 : reconstruit une source unique depuis les anciens champs
          const status = (stored.proStatus as ProStatus) || "non-cadre";
          const base: IncomeSource = {
            id: `salary-${Date.now()}`,
            label: "Salaire",
            type: "salaire",
            amount: stored.baseAnnual || "0",
            frequency: stored.salaryMode === "monthly" ? "monthly" : "annual",
            chargesPercent: stored.chargesPercent || String(STATUS_DEFAULT_CHARGES[status]),
            proStatus: status,
            timeMode: stored.timeMode || "plein",
          };
          const migrated: IncomeSource[] = [base];
          if (parseNumber(stored.variableAnnual || "0") > 0) {
            migrated.push({
              id: `variable-${Date.now()}`,
              label: "Variable / Primes",
              type: "salaire",
              amount: stored.variableAnnual || "0",
              frequency:
                typeof stored.variableMonth === "number" ? "monthOnce" : "annual",
              variableMonth: typeof stored.variableMonth === "number" ? stored.variableMonth : undefined,
              chargesPercent: stored.chargesPercent || String(STATUS_DEFAULT_CHARGES[status]),
              proStatus: status,
              timeMode: stored.timeMode || "plein",
            });
          }
          setIncomes(migrated);
        }
        if (stored.rent !== undefined) setRent(stored.rent as string);
        if (Array.isArray(stored.expenseItems) && stored.expenseItems.length > 0) {
          setExpenseItems(backfillItemLabels(stored.expenseItems as ExpenseItem[]));
        }
        if (Array.isArray(stored.loans)) setLoans(stored.loans as Loan[]);
        if (stored.cityId) {
          const found = CITIES.find((c) => c.id === stored.cityId);
          if (found) setCity(found);
        }
        // Langue et devise sont restaurées par leurs contextes respectifs
        // (montés à la racine) — pas ici, sinon deux sources de vérité.
      }
      setHydrated(true);
    })();
  }, []);

  // ---- Calculs revenus (multi-sources) ----
  const netSeries = useMemo(
    () => monthlyNetSeries(incomes, tithePercent),
    [incomes, tithePercent],
  );
  const netMensuel = useMemo(
    () => averageMonthlyNet(incomes, tithePercent),
    [incomes, tithePercent],
  );
  const totalBrutAnnuel = useMemo(() => annualGross(incomes), [incomes]);
  const monthlyTithe = useMemo(
    () => averageMonthlyTithe(incomes, tithePercent),
    [incomes, tithePercent],
  );
  const netAnnuel = netMensuel * 12;
  const brutMensuel = totalBrutAnnuel / 12;

  const rentNum = parseNumber(rent);

  const loansMonthly = useMemo(
    () => loans.reduce((s, l) => s + loanMonthlyPayment(l), 0),
    [loans]
  );

  const itemsByFamily = useMemo<Record<ExpenseFamily, ExpenseItem[]>>(
    () => ({
      besoins: expenseItems.filter((it: ExpenseItem) => it.family === "besoins"),
      loisirs: expenseItems.filter((it: ExpenseItem) => it.family === "loisirs"),
      epargne: expenseItems.filter((it: ExpenseItem) => it.family === "epargne"),
    }),
    [expenseItems]
  );

  const sumAmounts = (items: ExpenseItem[]): number =>
    items.reduce((s: number, it: ExpenseItem) => s + parseNumber(it.amount), 0);

  const familyTotals: Record<ExpenseFamily, number> = {
    besoins: sumAmounts(itemsByFamily.besoins),
    loisirs: sumAmounts(itemsByFamily.loisirs),
    epargne: sumAmounts(itemsByFamily.epargne),
  };

  const totalExpenses = familyTotals.besoins + familyTotals.loisirs + familyTotals.epargne;

  const monthlyExpenses = rentNum + loansMonthly + totalExpenses;
  const remaining = netMensuel - monthlyExpenses;
  const remainingColor = remaining >= 0 ? GOLD : DANGER;

  const advice: AdviceItem[] = useMemo(
    () =>
      buildAdvice({
        netMensuel,
        rent: rentNum,
        loansMonthly,
        besoinsExtra: familyTotals.besoins,
        loisirs: familyTotals.loisirs,
        epargne: familyTotals.epargne,
        remaining,
        // Seuils basés sur le mix personnalisé si Premium loggé (sinon 50/30/20)
        targetSplit: budgetRatio.personalized
          ? {
              besoins: budgetRatio.besoins,
              envies: budgetRatio.envies,
              epargne: budgetRatio.epargne,
            }
          : undefined,
      }),
    [netMensuel, rentNum, loansMonthly, familyTotals, remaining, budgetRatio]
  );

  // Donut
  const segments: DonutSegment[] = useMemo(() => {
    const segs: DonutSegment[] = [];
    if (rentNum > 0) segs.push({ label: t("donut.rent"), value: rentNum, color: COLOR_LOYER });
    if (loansMonthly > 0) segs.push({ label: t("donut.loans"), value: loansMonthly, color: COLOR_PRETS });
    for (const it of expenseItems) {
      const v = parseNumber(it.amount);
      if (v > 0) segs.push({ label: displayItemLabel(it, t), value: v, color: it.color });
    }
    segs.push({ label: t("donut.remaining"), value: remaining > 0 ? remaining : 0, color: GOLD });
    return segs;
  }, [rentNum, loansMonthly, expenseItems, remaining, lang]);

  // Projection mensuelle : utilise directement la série de nets calculée par income.ts
  const months: MonthRow[] = useMemo(
    () =>
      netSeries.map((income, i) => ({
        index: i,
        name: t(MONTH_KEYS_LONG[i]),
        shortName: t(MONTH_KEYS_SHORT[i]),
        income,
        expenses: monthlyExpenses,
        remaining: income - monthlyExpenses,
      })),
    [netSeries, monthlyExpenses, lang]
  );
  const annualIncome = months.reduce((s, m) => s + m.income, 0);
  const annualExpenses = monthlyExpenses * 12;
  const annualRemaining = annualIncome - annualExpenses;
  const currentMonthIndex = new Date().getMonth();

  const filteredCountries = useMemo(() => {
    const q = normalizeText(citySearch);
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => normalizeText(c.name).includes(q));
  }, [citySearch]);

  // Suggestions GLOBALES de villes affichées sur l'étape "pays" :
  // si le user tape "argenteuil" sans avoir sélectionné un pays, on lui montre
  // quand même les villes correspondantes (avec fuzzy match en bonus).
  const globalCitySuggestions = useMemo(() => {
    const q = normalizeText(citySearch);
    if (q.length < 2) return [] as City[];
    // 1) Substring match exact sur nom OU région
    const exact = CITIES.filter((c) =>
      normalizeText(`${c.name} ${c.region}`).includes(q),
    );
    if (exact.length > 0) return exact.slice(0, 12);
    // 2) Sinon : fuzzy Levenshtein sur le nom seul, tolérance proportionnelle.
    const tolerance = Math.max(1, Math.floor(q.length / 4));
    const scored = CITIES.map((c) => ({
      c,
      d: levenshtein(normalizeText(c.name), q),
    })).filter((x) => x.d <= tolerance);
    scored.sort((a, b) => a.d - b.d);
    return scored.slice(0, 8).map((x) => x.c);
  }, [citySearch]);

  const filteredCities = useMemo(() => {
    if (!pickerCountry) return [];
    const list = citiesByCountry(pickerCountry);
    const q = normalizeText(citySearch);
    if (!q) return list;
    // 1) Substring match exact (comportement original)
    const exact = list.filter((c) => {
      const haystack = normalizeText(`${c.name} ${c.region}`);
      return haystack.includes(q);
    });
    if (exact.length > 0) return exact;
    // 2) Aucun match exact dans ce pays → on suggère via Levenshtein.
    const tolerance = Math.max(1, Math.floor(q.length / 4));
    return list
      .map((c) => ({ c, d: levenshtein(normalizeText(c.name), q) }))
      .filter((x) => x.d <= tolerance)
      .sort((a, b) => a.d - b.d)
      .slice(0, 8)
      .map((x) => x.c);
  }, [citySearch, pickerCountry]);

  // ----- Budget scopé par workspace (Premium) -----
  // Les données budget en mémoire appartiennent à `budgetScope` (null = perso).
  // Perso / free tier : AsyncStorage local, strictement comme avant.
  // Workspace : cloud partagé entre membres (encrypted_payloads "budget")
  // + cache local par scope pour l'offline.
  const budgetScopeTarget = premiumUser?.id ? activeWorkspaceId : null;
  const [budgetScope, setBudgetScope] = useState<string | null>(null);
  const [budgetSwitcherOpen, setBudgetSwitcherOpen] = useState(false);

  const applyBudgetSnapshot = useCallback(
    (d: {
      incomes?: unknown[];
      rent?: string;
      expenseItems?: unknown[];
      loans?: unknown[];
    } | null) => {
      setIncomes(
        Array.isArray(d?.incomes) && d.incomes.length > 0
          ? (d.incomes as IncomeSource[])
          : [defaultIncomeSource()],
      );
      setRent(typeof d?.rent === "string" ? d.rent : "0");
      setExpenseItems(
        Array.isArray(d?.expenseItems) && d.expenseItems.length > 0
          ? backfillItemLabels(d.expenseItems as ExpenseItem[])
          : DEFAULT_ITEMS,
      );
      setLoans(Array.isArray(d?.loans) ? (d.loans as Loan[]) : []);
    },
    [],
  );

  // Changement de scope → charge le budget du scope cible avant de réactiver
  // la sauvegarde (sinon on écrirait les données d'un scope dans l'autre).
  useEffect(() => {
    if (!hydrated) return;
    if (budgetScopeTarget === budgetScope) return;
    let cancelled = false;
    (async () => {
      if (budgetScopeTarget && premiumUser?.id) {
        const b = await loadBudget(premiumUser.id, budgetScopeTarget);
        if (cancelled) return;
        applyBudgetSnapshot(b);
      } else {
        const stored = await loadState();
        if (cancelled) return;
        applyBudgetSnapshot(stored ?? null);
      }
      if (!cancelled) setBudgetScope(budgetScopeTarget);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, budgetScopeTarget, budgetScope, premiumUser?.id, applyBudgetSnapshot]);

  // ----- Persistance : sauvegarde à chaque changement (après hydratation) -----
  useEffect(() => {
    if (!hydrated) return;
    // Switch de scope en cours : suspend la sauvegarde jusqu'au chargement.
    if (budgetScope !== budgetScopeTarget) return;
    if (budgetScope === null) {
      saveState({
        incomes,
        rent,
        expenseItems,
        loans,
        cityId: city.id,
        currency,
        lang,
      });
    } else if (premiumUser?.id) {
      saveBudget(
        premiumUser.id,
        { incomes, rent, expenseItems, loans },
        budgetScope,
      );
      // Devise / langue / ville restent des réglages device : on les merge
      // dans le stockage local SANS toucher au budget perso qui y vit.
      (async () => {
        const stored = await loadState();
        await saveState({ ...(stored ?? {}), cityId: city.id, currency, lang });
      })();
    }
  }, [
    hydrated,
    budgetScope,
    budgetScopeTarget,
    incomes,
    rent,
    expenseItems,
    loans,
    city,
    currency,
    lang,
    premiumUser?.id,
  ]);

  // ----- Historique budget (Premium) : un point agrégé par mois et par scope,
  // pour la carte "Évolution du budget" de l'onglet Profil. Débounce 2,5 s
  // pour ne pas écrire à chaque frappe. -----
  useEffect(() => {
    if (!hydrated || !premiumUser?.id) return;
    if (budgetScope !== budgetScopeTarget) return;
    if (netMensuel <= 0 && monthlyExpenses <= 0) return; // budget vide → pas de bruit
    const userId = premiumUser.id;
    const scope = budgetScope;
    const timer = setTimeout(() => {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      recordBudgetHistoryPoint(userId, scope, {
        month,
        net: Math.round(netMensuel),
        expenses: Math.round(monthlyExpenses),
        remaining: Math.round(remaining),
        // Détail du mois — alimente la fiche mois + la comparaison dans le Profil
        breakdown: {
          rent: Math.round(rentNum),
          loans: Math.round(loansMonthly),
          besoins: Math.round(familyTotals.besoins),
          loisirs: Math.round(familyTotals.loisirs),
          epargne: Math.round(familyTotals.epargne),
          items: expenseItems
            .map((it) => ({
              id: it.id,
              label: displayItemLabel(it, t),
              family: it.family,
              amount: Math.round(parseNumber(it.amount)),
            }))
            .filter((it) => it.amount > 0),
        },
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    premiumUser?.id,
    budgetScope,
    budgetScopeTarget,
    netMensuel,
    monthlyExpenses,
    remaining,
    rentNum,
    loansMonthly,
    expenseItems,
    lang,
  ]);

  function openAddLoan() {
    setEditingLoan(null);
    setForm({
      id: "",
      name: "",
      mode: "computed",
      principal: "0",
      ratePercent: "0",
      years: "0",
      directMonthly: "0",
    });
    setLoanStartText("");
    setLoanModalOpen(true);
  }
  function openEditLoan(loan: Loan) {
    setEditingLoan(loan);
    setForm(loan);
    setLoanStartText(isoToMonthInput(loan.startDate));
    setLoanModalOpen(true);
  }
  // Convertit un champ texte de montant d'une devise à l'autre.
  function convertOne(
    raw: string,
    from: CurrencyCode,
    to: CurrencyCode,
    rates: Parameters<typeof convert>[3],
    decimals: number,
  ): string {
    const n = parseNumber(raw);
    if (!n) return raw;
    const c = convert(n, from, to, rates);
    if (!isFinite(c) || c === 0) return raw;
    return decimals === 0 ? String(Math.round(c)) : c.toFixed(2);
  }

  // Changement de devise : on propose de CONVERTIR les montants existants.
  // Sans ça, 12 000 € devenaient « 12 000 ¥ » — soit 70 € réels. Le symbole
  // seul ne suffit pas, il faut convertir les valeurs.
  const changeCurrency = useCallback(
    async (next: CurrencyCode) => {
      const prev = currency;
      if (next === prev) return;

      const hasAmounts =
        parseNumber(rent) > 0 ||
        incomes.some((i) => parseNumber(i.amount) > 0) ||
        loans.length > 0 ||
        expenseItems.some((e) => parseNumber(e.amount) > 0);

      if (!hasAmounts) {
        setCurrency(next);
        return;
      }

      const rates = await getRates();
      if (!rates) {
        // Hors ligne : on change le symbole mais on prévient que les montants
        // n'ont pas pu être convertis — mieux vaut le dire que laisser croire.
        setCurrency(next);
        notify(t("currency.offline.title"), t("currency.offline.msg"));
        return;
      }

      const fromLabel = getCurrency(prev).code;
      const toLabel = getCurrency(next).code;
      const example = convert(1000, prev, next, rates);

      setConfirm({
        open: true,
        title: t("currency.convert.title"),
        message: interpolate(t("currency.convert.msg"), {
          from: fromLabel,
          to: toLabel,
          example: formatCurrency(example, next),
        }),
        confirmLabel: t("currency.convert.yes"),
        cancelLabel: t("currency.convert.no"),
        onConfirm: () => {
          const decimals = getCurrency(next).decimals;
          setRent((r) => convertOne(r, prev, next, rates, decimals));
          setIncomes((list) =>
            list.map((i) => ({
              ...i,
              amount: convertOne(i.amount, prev, next, rates, decimals),
            })),
          );
          setLoans((list) =>
            list.map((l) => ({
              ...l,
              principal: convertOne(l.principal, prev, next, rates, decimals),
              directMonthly: convertOne(l.directMonthly ?? "0", prev, next, rates, decimals),
            })),
          );
          setExpenseItems((list) =>
            list.map((e) => ({
              ...e,
              amount: convertOne(e.amount, prev, next, rates, decimals),
            })),
          );
          setCurrency(next);
          // Les données Premium (objectifs, événements) ne sont PAS réécrites :
          // elles portent leur propre devise et sont converties à l'affichage,
          // pour chaque membre. Convertir en base écraserait les montants vus
          // par les autres membres d'un espace partagé.
        },
        onCancel: () => setCurrency(next),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currency, rent, incomes, loans, expenseItems, lang],
  );

  function saveLoan() {
    if (form.mode === "direct") {
      if (parseNumber(form.directMonthly || "0") <= 0) {
        setConfirm({
          open: true,
          title: t("error.loanMonthlyRequired"),
          message: t("error.loanMonthlyRequiredHint"),
          confirmLabel: t("btn.ok"),
          onConfirm: () => {},
        });
        return;
      }
    } else {
      const principal = parseNumber(form.principal);
      const years = parseNumber(form.years);
      if (principal <= 0 || years <= 0) {
        setConfirm({
          open: true,
          title: t("error.loanIncomplete"),
          message: t("error.loanIncompleteHint"),
          confirmLabel: t("btn.ok"),
          onConfirm: () => {},
        });
        return;
      }
    }
    if (editingLoan) {
      setLoans((ls) =>
        ls.map((l) => (l.id === editingLoan.id ? { ...form, id: editingLoan.id } : l))
      );
    } else {
      const id = Date.now().toString();
      setLoans((ls) => [...ls, { ...form, id, name: form.name || t("loan.defaultName") }]);
    }
    setLoanModalOpen(false);
  }
  function askDeleteLoan(id: string) {
    setConfirm({
      open: true,
      title: t("confirm.deleteLoan.title"),
      message: t("confirm.deleteLoan.msg"),
      danger: true,
      confirmLabel: t("btn.delete"),
      onConfirm: () => setLoans((ls) => ls.filter((l) => l.id !== id)),
    });
  }
  function openAddIncome() {
    setEditingIncome(null);
    setIncomeForm({
      id: `inc-${Date.now()}`,
      label: "",
      type: "salaire",
      amount: "0",
      frequency: "annual",
      chargesPercent: String(TYPE_DEFAULT_CHARGES["salaire"]),
      proStatus: "non-cadre",
      timeMode: "plein",
    });
    setIncomeModalOpen(true);
  }

  function openEditIncome(src: IncomeSource) {
    setEditingIncome(src);
    setIncomeForm({ ...src });
    setIncomeModalOpen(true);
  }

  function saveIncome() {
    const amount = parseNumber(incomeForm.amount);
    if (amount <= 0) {
      setConfirm({
        open: true,
        title: t("error.amountRequired"),
        message: t("error.amountRequiredHint"),
        confirmLabel: t("btn.ok"),
        onConfirm: () => {},
      });
      return;
    }
    const final: IncomeSource = {
      ...incomeForm,
      label: incomeForm.label.trim() || t(`incomeType.${incomeForm.type}`),
    };
    if (editingIncome) {
      setIncomes((prev) => prev.map((s) => (s.id === editingIncome.id ? final : s)));
    } else {
      setIncomes((prev) => [...prev, final]);
    }
    setIncomeModalOpen(false);
  }

  function askDeleteIncome(id: string) {
    setConfirm({
      open: true,
      title: t("confirm.deleteIncome.title"),
      message: t("confirm.deleteIncome.msg"),
      danger: true,
      confirmLabel: t("btn.delete"),
      onConfirm: () => setIncomes((prev) => prev.filter((s) => s.id !== id)),
    });
  }

  function changeIncomeType(t: IncomeType) {
    setIncomeForm((f) => ({
      ...f,
      type: t,
      chargesPercent: String(TYPE_DEFAULT_CHARGES[t]),
      ...(t === "salaire"
        ? { proStatus: f.proStatus ?? "non-cadre", timeMode: f.timeMode ?? "plein" }
        : { proStatus: undefined, timeMode: undefined }),
    }));
  }

  function changeIncomeProStatus(s: ProStatus) {
    setIncomeForm((f) => ({
      ...f,
      proStatus: s,
      chargesPercent: String(STATUS_DEFAULT_CHARGES[s]),
    }));
  }

  function updateItemAmount(id: string, value: string) {
    setExpenseItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, amount: value } : it))
    );
  }

  function updateItemLabel(id: string, label: string) {
    setExpenseItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, label, labelKey: undefined } : it))
    );
  }

  function deleteItem(id: string) {
    setExpenseItems((prev) => prev.filter((it) => it.id !== id));
  }

  function openAddItem(family: ExpenseFamily) {
    setAddItemFamily(family);
    setNewItemLabel("");
    setNewItemAmount("0");
  }

  function saveNewItem() {
    if (!addItemFamily) return;
    const label = newItemLabel.trim();
    if (!label) {
      setConfirm({
        open: true,
        title: t("error.nameRequired"),
        message: t("error.nameRequiredHint"),
        confirmLabel: t("btn.ok"),
        onConfirm: () => {},
      });
      return;
    }
    const palette = FAMILY_PALETTE[addItemFamily];
    const used = expenseItems
      .filter((it) => it.family === addItemFamily)
      .map((it) => it.color);
    const color = palette.find((c) => !used.includes(c)) || palette[0];
    setExpenseItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        family: addItemFamily,
        label,
        icon: "tag",
        color,
        amount: newItemAmount || "0",
      },
    ]);
    setAddItemFamily(null);
    setNewItemLabel("");
    setNewItemAmount("0");
  }

  function buildPdfData(): PdfData {
    return {
      cityName: city.name,
      cityRegion: city.region,
      cityIndex: city.index,
      netMensuel,
      brutAnnuel: totalBrutAnnuel,
      rent: rentNum,
      loansMonthly,
      besoins: familyTotals.besoins,
      loisirs: familyTotals.loisirs,
      epargne: familyTotals.epargne,
      totalExpenses,
      remaining,
      advice,
      currency,
      t,
    };
  }

  async function shareGeneratedPdf(html: string, dialogTitle: string) {
    const { uri } = await Print.printToFileAsync({ html });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        UTI: "com.adobe.pdf",
        mimeType: "application/pdf",
        dialogTitle,
      });
    } else {
      Alert.alert(t("doc.ready.title"), interpolate(t("doc.ready.msg"), { uri }));
    }
  }

  async function exportPdf() {
    try {
      await shareGeneratedPdf(generatePdfHtml(buildPdfData()), "Mon budget NETbudget");
    } catch {
      Alert.alert(t("err.pdf.title"), t("err.pdf.msg"));
    }
  }

  function askResetAll() {
    setConfirm({
      open: true,
      title: t("reset.title"),
      message: t("reset.message"),
      danger: true,
      confirmLabel: t("btn.reset"),
      onConfirm: () => {
        setIncomes([defaultIncomeSource()]);
        setRent("0");
        setExpenseItems(DEFAULT_ITEMS.map((it) => ({ ...it })));
        setLoans([]);
        setCity(CITIES[0]);
      },
    });
  }

  // DEV uniquement : rejoue la fête d'anniversaire sans toucher au verrou
  // annuel (netbudget:bday:<année>) — pour tester le deck à volonté.
  const devReplayBirthday = __DEV__
    ? async () => {
        if (!premiumUser?.id) return;
        const details = await loadProfileDetails(premiumUser.id);
        const a = details.birthdate
          ? computeAge(new Date(details.birthdate))
          : 25;
        const perso = await loadAdviceProfile(premiumUser.id, null);
        setBdaySource("birthday");
        setBdayCards(buildBirthdayCards(a, details.first_name, perso, adviceI18n));
        setBdayOpen(true);
      }
    : undefined;

  // Suppression du COMPTE (cloud) — double confirmation, irréversible.
  // Le budget local du téléphone n'est pas touché (free tier préservé).
  function askDeleteAccount() {
    setConfirm({
      open: true,
      title: "Supprimer ton compte ?",
      message:
        "Ton compte, tes espaces partagés (dont tu es propriétaire) et toutes tes données cloud seront définitivement effacés. Ton budget local sur ce téléphone n'est pas touché.",
      danger: true,
      confirmLabel: "Continuer",
      onConfirm: () => {
        // Deuxième confirmation après fermeture de la première modale
        setTimeout(() => {
          setConfirm({
            open: true,
            title: "Dernière confirmation",
            message:
              "Cette action est irréversible. Supprimer définitivement le compte ?",
            danger: true,
            confirmLabel: "Supprimer définitivement",
            onConfirm: async () => {
              const res = await deleteAccount();
              if (res.ok) {
                notify(
                  "Compte supprimé",
                  "Ton compte et tes données cloud ont été effacés. L'app reste utilisable en local, sans compte.",
                );
              } else {
                notify("Suppression impossible", res.error ?? "Erreur inconnue");
              }
            },
          });
        }, 400);
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[{ flex: 1, width: screenW * 5, flexDirection: "row" }, swipeAnimStyle]}>
        {/* Écran Événements (onglet 1, entre Réglages et Budget) */}
        <View style={{ width: screenW, position: "absolute", left: screenW, top: 0, bottom: 0 }}>
          <EventsPanel />
        </View>

        <View style={{ width: screenW, position: "absolute", left: screenW * 2, top: 0, bottom: 0 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={onBudgetScroll}
          scrollEventThrottle={400}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>
                {t("tab.budget")} · {getCurrency(currency).flag} {getCurrency(currency).code}
              </Text>
              <Text style={styles.title}>NETbudget</Text>
            </View>
            <TouchableOpacity
              onPress={() => setRuleInfoOpen(true)}
              style={styles.ratioWidget}
              testID="budget-ratio-widget"
              activeOpacity={0.85}
            >
              {budgetRatio.personalized && premiumProfile ? (
                <Text style={styles.ratioMixName} numberOfLines={1}>
                  {getBudgetMixProfile(premiumProfile, adviceI18n).name}
                </Text>
              ) : (
                <Text style={styles.ratioLabel}>{t("adv.mix.benchmark")}</Text>
              )}
              <Text style={styles.ratioValue}>
                {budgetRatio.besoins}/{budgetRatio.envies}/{budgetRatio.epargne}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scope du budget (Premium connecté) : perso ou workspace partagé.
              Tape pour changer — les données affichées suivent le scope. */}
          {premiumUser ? (
            <TouchableOpacity
              style={styles.budgetScopeBadge}
              onPress={() => setBudgetSwitcherOpen(true)}
              activeOpacity={0.8}
            >
              <Feather
                name={activeWorkspaceId ? "users" : "user"}
                size={12}
                color={GOLD}
              />
              <Text style={styles.budgetScopeBadgeText} numberOfLines={1}>
                Budget : {resolvedScopeLabel}
              </Text>
              {budgetScope !== budgetScopeTarget ? (
                <ActivityIndicator size="small" color={GOLD} />
              ) : (
                <Feather name="chevron-down" size={12} color={TEXT_3} />
              )}
            </TouchableOpacity>
          ) : null}
          <ScopeSwitcher
            visible={budgetSwitcherOpen}
            onClose={() => setBudgetSwitcherOpen(false)}
          />

          {/* Top : onboarding tant qu'il n'y a pas de données, résultats live ensuite */}
          {netMensuel <= 0 ? (
            <View style={styles.onboardingCard} testID="onboarding-card">
              <View style={styles.onboardingHeader}>
                <Feather name="compass" size={20} color={GOLD} />
                <Text style={styles.onboardingTitle}>{t("onboarding.title")}</Text>
              </View>
              <Text style={styles.onboardingStep}>
                <Text style={styles.onboardingNum}>1. </Text>
                {t("onboarding.step1")}
              </Text>
              <Text style={styles.onboardingStep}>
                <Text style={styles.onboardingNum}>2. </Text>
                {t("onboarding.step2")}
              </Text>
              <Text style={styles.onboardingStep}>
                <Text style={styles.onboardingNum}>3. </Text>
                {t("onboarding.step3")}
              </Text>
              <Text style={styles.onboardingTip}>{t("onboarding.tip")}</Text>
            </View>
          ) : (
            <View style={styles.topSummary} testID="top-summary">
              <View style={styles.topSummaryRow}>
                <View style={styles.topSummaryBlock}>
                  <Text style={styles.topSummaryLabel}>{t("top.netMonthly")}</Text>
                  <Text style={styles.topSummaryValue}>{fmt(netMensuel)}</Text>
                </View>
                <View style={styles.topSummaryDivider} />
                <View style={styles.topSummaryBlock}>
                  <Text style={styles.topSummaryLabel}>{t("top.expenses")}</Text>
                  <Text style={[styles.topSummaryValue, { color: TEXT_2 }]}>
                    {fmt(monthlyExpenses)}
                  </Text>
                </View>
                <View style={styles.topSummaryDivider} />
                <View style={styles.topSummaryBlock}>
                  <Text style={styles.topSummaryLabel}>{t("top.remaining")}</Text>
                  <Text style={[styles.topSummaryValue, { color: remainingColor }]} testID="top-reste-value">
                    {fmt(remaining)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Revenus — multi-sources */}
          <Section
            title={t("section.income.title")}
            subtitle={t("section.income.subtitle")}
            action={
              <TouchableOpacity
                onPress={openAddIncome}
                style={styles.addBtn}
                testID="add-income-button"
                activeOpacity={0.85}
              >
                <Feather name="plus" size={16} color="#000" />
                <Text style={styles.addBtnText}>{t("btn.add")}</Text>
              </TouchableOpacity>
            }
          >
            {incomes.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="briefcase" size={22} color={TEXT_3} />
                <Text style={styles.emptyTitle}>{t("income.empty.title")}</Text>
                <Text style={styles.emptyText}>{t("income.empty.text")}</Text>
              </View>
            ) : (
              incomes.map((src) => {
                const monthly = averageMonthlyNet([src], tithePercent);
                const freqLabel =
                  src.frequency === "monthly"
                    ? t("freq.monthly")
                    : src.frequency === "annual"
                      ? t("freq.annual")
                      : interpolate(t("income.paidIn"), { month: t(MONTH_KEYS_SHORT[src.variableMonth ?? 0]) });
                return (
                  <TouchableOpacity
                    key={src.id}
                    style={styles.incomeRow}
                    onPress={() => openEditIncome(src)}
                    testID={`income-item-${src.id}`}
                    activeOpacity={0.85}
                  >
                    <View style={styles.incomeIcon}>
                      <Feather
                        name={TYPE_ICON[src.type] as keyof typeof Feather.glyphMap}
                        size={18}
                        color={GOLD}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.incomeLabel}>{src.label || t(`incomeType.${src.type}`)}</Text>
                      <Text style={styles.incomeMeta}>
                        {t(`incomeType.${src.type}`)} · {freqLabel} · {parseNumber(src.chargesPercent)} %
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.incomeNet}>{fmt(monthly)}</Text>
                      <Text style={styles.incomeMetaSmall}>{t("income.netPerMonth")}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => askDeleteIncome(src.id)}
                      style={styles.trashBtn}
                      testID={`delete-income-${src.id}`}
                      hitSlop={10}
                    >
                      <Feather name="trash-2" size={16} color={DANGER} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={styles.revenusSummary}>
              <View style={styles.revenusRow}>
                <Text style={styles.revenusLabel}>{t("summary.totalBrutAnnual")}</Text>
                <Text style={styles.revenusTotal} testID="total-brut-annuel">
                  {fmt(totalBrutAnnuel)}
                </Text>
              </View>
              {/* Cascade mensuelle : brut moyen → dîme → net. L'annuel reste
                  au-dessus, séparé, pour ne pas laisser croire que la dîme
                  (mensuelle) se soustrait de l'annuel. */}
              <View style={styles.revenusRow}>
                <Text style={styles.revenusLabel}>{t("summary.brutMonthlyAvg")}</Text>
                <Text style={styles.revenusTotalMuted}>{fmt(brutMensuel)}</Text>
              </View>
              {monthlyTithe > 0 ? (
                <View style={styles.revenusRow}>
                  <Text style={styles.revenusLabel} numberOfLines={2}>
                    {interpolate(t("summary.giving"), { pct: tithePercent })}
                  </Text>
                  <Text style={styles.revenusTotalMuted} numberOfLines={1}>
                    − {fmt(monthlyTithe)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.revenusRow}>
                <Text style={styles.revenusLabel}>
                  {t("summary.netMonthlyEst")}
                  {monthlyTithe > 0 ? " (dons déduits)" : ""}
                </Text>
                <Text style={[styles.revenusTotal, { color: GOLD }]} testID="net-mensuel-value">
                  {fmt(netMensuel)}
                </Text>
              </View>
            </View>
          </Section>

          {/* Logement */}
          <Section title={t("section.housing.title")}>
            <Field
              label={t("label.rent")}
              icon={<Feather name="home" size={18} color={COLOR_LOYER} />}
              right={getCurrency(currency).symbol}
              value={rent}
              onChangeText={setRent}
              keyboardType="decimal-pad"
              placeholder="0"
              testID="rent-input"
            />
          </Section>

          {/* Prêts */}
          <Section
            title={t("section.loans.title")}
            action={
              <TouchableOpacity
                onPress={openAddLoan}
                style={styles.addBtn}
                testID="add-loan-button"
                activeOpacity={0.8}
              >
                <Feather name="plus" size={16} color="#000" />
                <Text style={styles.addBtnText}>{t("btn.add")}</Text>
              </TouchableOpacity>
            }
          >
            {loans.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="credit-card" size={24} color={TEXT_3} />
                <Text style={styles.emptyTitle}>{t("loans.empty.title")}</Text>
                <Text style={styles.emptyText}>{t("loans.empty.text")}</Text>
              </View>
            ) : (
              loans.map((l) => {
                const m = loanMonthlyPayment(l);
                const isDirect = l.mode === "direct";
                // Suivi dans le temps : disponible dès qu'une date de 1re
                // échéance est renseignée sur un prêt calculé.
                const prog = isDirect
                  ? null
                  : loanProgress(
                      parseNumber(l.principal),
                      parseNumber(l.ratePercent),
                      parseNumber(l.years),
                      l.startDate,
                      m,
                    );
                return (
                  <TouchableOpacity
                    key={l.id}
                    style={styles.loanItem}
                    onPress={() => openEditLoan(l)}
                    testID={`loan-item-${l.id}`}
                    activeOpacity={0.8}
                  >
                    <View style={styles.loanIcon}>
                      <Feather name="credit-card" size={18} color={COLOR_PRETS} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.loanName}>{l.name || t("loan.defaultName")}</Text>
                      <Text style={styles.loanMeta}>
                        {isDirect
                          ? t("label.loanDirect")
                          : `${fmt(parseNumber(l.principal))} · ${l.ratePercent || "0"}% · ${l.years || "0"} ${t("label.years")}`}
                      </Text>

                      {prog ? (
                        <View style={styles.loanProgressWrap}>
                          <View style={styles.loanProgressBar}>
                            <View
                              style={[
                                styles.loanProgressFill,
                                { width: `${Math.min(100, prog.percentElapsed)}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.loanProgressText}>
                            {prog.finished
                              ? t("loan.repaid")
                              : interpolate(t("loan.remaining"), {
                                  time: humanRemaining(prog),
                                  amount: fmt(prog.remainingPrincipal),
                                })}
                          </Text>
                          {!prog.finished ? (
                            <Text style={styles.loanSplitText}>
                              {interpolate(t("loan.splitThisMonth"), {
                                principal: fmt(prog.nextPrincipal),
                                interest: fmt(prog.nextInterest),
                              })}
                            </Text>
                          ) : null}
                          <TouchableOpacity
                            onPress={() => setScheduleLoan(l)}
                            hitSlop={8}
                            style={styles.scheduleLinkRow}
                            accessibilityRole="button"
                            accessibilityLabel={`${t("loan.scheduleA11y")} — ${l.name || t("loan.defaultName")}`}
                          >
                            <Feather name="list" size={12} color={GOLD} />
                            <Text style={styles.scheduleLinkText}>
                              {t("loan.seeSchedule")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : !isDirect ? (
                        <Text style={styles.loanHintText}>
                          {t("loan.addStartHint")}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.loanAmount}>{fmt(m)}</Text>
                      <Text style={styles.loanMetaSmall}>{t("label.perMonth")}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => askDeleteLoan(l.id)}
                      style={styles.trashBtn}
                      testID={`delete-loan-${l.id}`}
                      hitSlop={10}
                    >
                      <Feather name="trash-2" size={16} color={DANGER} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </Section>

          {/* Dépenses mensuelles — 3 familles */}
          {FAMILY_ORDER.map((family) => {
            const meta = FAMILY_META[family];
            const items = itemsByFamily[family];
            return (
              <Section
                key={family}
                title={t(`family.${family}.label`)}
                action={
                  <TouchableOpacity
                    onPress={() => openAddItem(family)}
                    style={[styles.addBtn, { backgroundColor: meta.color }]}
                    testID={`add-item-${family}`}
                    activeOpacity={0.85}
                  >
                    <Feather name="plus" size={16} color="#000" />
                    <Text style={styles.addBtnText}>{t("btn.add")}</Text>
                  </TouchableOpacity>
                }
              >
                <Text style={styles.familySub}>{t(`family.${family}.sub`)}</Text>
                {items.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Feather name={meta.icon} size={22} color={TEXT_3} />
                    <Text style={styles.emptyTitle}>{t("family.empty.title")}</Text>
                    <Text style={styles.emptyText}>{t("family.empty.text")}</Text>
                  </View>
                ) : (
                  items.map((it) => (
                    <Field
                      key={it.id}
                      label={displayItemLabel(it, t)}
                      icon={<Feather name={it.icon} size={18} color={it.color} />}
                      right={getCurrency(currency).symbol}
                      value={it.amount}
                      onChangeText={(v) => updateItemAmount(it.id, v)}
                      onLabelChange={(v) => updateItemLabel(it.id, v)}
                      onDelete={() => deleteItem(it.id)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      renameHint={t("renameHint")}
                      testID={`expense-${it.id}`}
                    />
                  ))
                )}
                <View style={styles.familyTotalRow}>
                  <Text style={styles.familyTotalLabel}>{interpolate(t("items.totalFamily"), { family: t(`family.${family}.label`).toLowerCase() })}</Text>
                  <Text style={[styles.familyTotalValue, { color: meta.color }]}>
                    {fmt(familyTotals[family])}
                  </Text>
                </View>
              </Section>
            );
          })}

          {/* Total général */}
          <View style={styles.expensesTotalRow}>
            <Text style={styles.expensesTotalLabel}>{t("items.totalMonthly")}</Text>
            <Text style={styles.expensesTotalValue} testID="expenses-total">
              {fmt(rentNum + loansMonthly + totalExpenses)}
            </Text>
          </View>

          {/* Budget mois par mois */}
          <Section title={t("section.monthly.title")}>
            <Text style={styles.familySub}>
              {t("monthly.intro")}
            </Text>
            <MonthlyBreakdown
              months={months}
              currentMonthIndex={currentMonthIndex}
              annualRemaining={annualRemaining}
              annualIncome={annualIncome}
              annualExpenses={annualExpenses}
              currency={currency}
              labels={{
                netSmall: t("monthly.netSmall"),
                colMonth: t("monthly.col.month"),
                colIncome: t("monthly.col.income"),
                colExpenses: t("monthly.col.expenses"),
                colRemaining: t("monthly.col.remaining"),
                totalAnnual: t("monthly.total.annual"),
                totalIncome: t("monthly.total.income"),
                totalExpenses: t("monthly.total.expenses"),
                totalRemaining: t("monthly.total.remaining"),
              }}
            />
          </Section>

          {/* === Conseils 50/30/20 === */}
          <Section title={t("section.advice.title")}>
            <Text style={styles.familySub}>
              {t("advice.intro")}
            </Text>
            {advice.map((a, idx) => {
              const accent =
                a.tone === "good"
                  ? "#10B981"
                  : a.tone === "warn"
                    ? "#F59E0B"
                    : a.tone === "danger"
                      ? "#EF4444"
                      : "#3B82F6";
              return (
                <View
                  key={idx}
                  style={[styles.adviceCard, { borderLeftColor: accent }]}
                  testID={`advice-${idx}`}
                >
                  <View style={styles.adviceHeader}>
                    <Feather name={a.icon as keyof typeof Feather.glyphMap} size={16} color={accent} />
                    <Text style={[styles.adviceTitle, { color: accent }]}>{t(a.titleKey)}</Text>
                  </View>
                  <Text style={styles.adviceMessage}>{interpolate(t(a.messageKey), a.params)}</Text>
                </View>
              );
            })}
          </Section>

          {/* === Résultat : camembert à la fin === */}
          <Section title={t("section.breakdown.title")}>
            <View style={styles.hero} testID="dashboard-card">
              <LinearGradient
                colors={[city.theme.from, city.theme.to]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroOverlay}
              >
                <Text style={[styles.heroLabel, { color: city.theme.accent }]}>
                  {city.name.toUpperCase()} · {city.theme.label.toUpperCase()}
                </Text>
                <DonutChart
                  segments={segments}
                  size={240}
                  strokeWidth={28}
                  centerLabel={t("donut.remaining")}
                  centerValue={fmt(remaining)}
                  centerValueColor={remainingColor}
                />
                {/* Les 3 familles en un coup d'œil : réel vs cible du profil.
                    Le donut global dit OÙ va l'argent ; ceux-ci disent SI la
                    répartition tient la route. */}
                {netMensuel > 0 ? (
                  <View style={styles.miniDonutsRow}>
                    {(
                      [
                        {
                          key: "besoins",
                          label: t("family.besoins.label"),
                          value: rentNum + loansMonthly + familyTotals.besoins,
                          target: budgetRatio.besoins,
                          color: FAMILY_META.besoins.color,
                        },
                        {
                          key: "loisirs",
                          label: t("family.loisirs.label"),
                          value: familyTotals.loisirs,
                          target: budgetRatio.envies,
                          color: FAMILY_META.loisirs.color,
                        },
                        {
                          key: "epargne",
                          label: t("family.epargne.label"),
                          value: familyTotals.epargne,
                          target: budgetRatio.epargne,
                          color: FAMILY_META.epargne.color,
                        },
                      ] as const
                    ).map((f) => {
                      const pctReal = Math.round((f.value / netMensuel) * 100);
                      // Épargne : dépasser la cible est une bonne nouvelle.
                      // Besoins et envies : c'est l'inverse.
                      const over =
                        f.key === "epargne" ? pctReal < f.target - 5 : pctReal > f.target + 5;
                      return (
                        <View
                          key={f.key}
                          style={styles.miniDonutCell}
                          accessibilityRole="progressbar"
                          accessibilityLabel={`${f.label} : ${pctReal} pour cent, cible ${f.target} pour cent`}
                          accessibilityValue={{ min: 0, max: 100, now: pctReal }}
                        >
                          <DonutChart
                            segments={[
                              { label: f.label, value: Math.max(0, pctReal), color: f.color },
                              {
                                label: "reste",
                                value: Math.max(0, 100 - pctReal),
                                color: "rgba(255,255,255,0.07)",
                              },
                            ]}
                            size={82}
                            strokeWidth={9}
                            centerValue={`${pctReal}%`}
                            centerValueColor={over ? DANGER : f.color}
                          />
                          <Text style={styles.miniDonutLabel} numberOfLines={1}>
                            {f.label}
                          </Text>
                          <Text style={[styles.miniDonutTarget, over && { color: DANGER }]}>
                            {interpolate(t("donut.targetShort"), { pct: f.target })}
                          </Text>
                          <Text style={styles.miniDonutAmount}>{fmt(f.value)}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                <View style={styles.legendWrap}>
                  {segments.map((s) => (
                    <View key={s.label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                      <Text style={styles.legendText}>{s.label}</Text>
                      <Text style={styles.legendValue}>{fmt(s.value)}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </View>
          </Section>

          {/* === Export PDF === */}
          <TouchableOpacity
            style={[styles.exportBtn, styles.exportBtnPrimary, { marginTop: 16 }]}
            onPress={exportPdf}
            testID="export-pdf"
            activeOpacity={0.85}
          >
            <Feather name="file-text" size={18} color="#000" />
            <Text style={styles.exportBtnTextDark}>{t("btn.exportPdf")}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
        </View>

        {/* ====== Converter tab (Google Translate style) ====== */}
        <View style={{ width: screenW, position: "absolute", left: screenW * 3, top: 0, bottom: 0 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>{t("tab.converter")}</Text>
              <Text style={styles.title}>{t("section.converter.title")}</Text>
            </View>
            <TouchableOpacity
              onPress={() => refreshRates(true)}
              style={styles.headerBtn}
              testID="refresh-rates"
              activeOpacity={0.85}
              disabled={ratesLoading}
            >
              <Feather name="refresh-cw" size={16} color={ratesLoading ? TEXT_3 : GOLD} />
            </TouchableOpacity>
          </View>

          {/* From card */}
          <View style={styles.convCard}>
            <TouchableOpacity
              style={styles.convChip}
              onPress={() => setConvPickerFor("from")}
              testID="conv-from-chip"
              activeOpacity={0.85}
            >
              <Text style={styles.convChipFlag}>{getCurrency(convFrom).flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.convChipCode}>{getCurrency(convFrom).code}</Text>
                <Text style={styles.convChipName}>{getCurrency(convFrom).name}</Text>
              </View>
              <Feather name="chevron-down" size={20} color={TEXT_3} />
            </TouchableOpacity>
            <TextInput
              style={styles.convBigInput}
              value={convAmount}
              onChangeText={setConvAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={TEXT_3}
              selectTextOnFocus
              returnKeyType="done"
              testID="conv-amount"
            />
            <Text style={styles.convSymbolHint}>{getCurrency(convFrom).symbol}</Text>
          </View>

          {/* Swap button */}
          <View style={styles.convSwapWrap}>
            <View style={styles.convDivider} />
            <TouchableOpacity
              hitSlop={10}
              onPress={swapConv}
              style={styles.convSwapBtn}
              testID="conv-swap"
              activeOpacity={0.85}
            >
              <Feather name="repeat" size={20} color="#000" />
            </TouchableOpacity>
            <View style={styles.convDivider} />
          </View>

          {/* To card */}
          <View style={[styles.convCard, styles.convCardResult]}>
            <TouchableOpacity
              style={styles.convChip}
              onPress={() => setConvPickerFor("to")}
              testID="conv-to-chip"
              activeOpacity={0.85}
            >
              <Text style={styles.convChipFlag}>{getCurrency(convTo).flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.convChipCode}>{getCurrency(convTo).code}</Text>
                <Text style={styles.convChipName}>{getCurrency(convTo).name}</Text>
              </View>
              <Feather name="chevron-down" size={20} color={TEXT_3} />
            </TouchableOpacity>
            <Text style={styles.convBigResult} testID="conv-result">
              {formatCurrency(convResult, convTo)}
            </Text>
            <Text style={styles.convRateMeta}>
              {rates
                ? `1 ${convFrom} ≈ ${formatCurrency(
                    convert(1, convFrom, convTo, rates),
                    convTo
                  )} · ${t("converter.updated")} ${formatRelativeAgo(rates.fetchedAt)}`
                : t("converter.loading")}
            </Text>
          </View>

          {/* History */}
          <View style={{ marginTop: 24 }}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>{t("converter.history")}</Text>
              {convHistory.length > 0 && (
                <TouchableOpacity onPress={() => setConvHistory([])} testID="clear-history">
                  <Text style={styles.historyClear}>{t("converter.clearHistory")}</Text>
                </TouchableOpacity>
              )}
            </View>
            {convHistory.length === 0 ? (
              <Text style={styles.familySub}>{t("converter.historyEmpty")}</Text>
            ) : (
              convHistory.map((h) => (
                <TouchableOpacity
                  key={h.id}
                  style={styles.historyRow}
                  onPress={() => restoreHistory(h)}
                  testID={`history-${h.id}`}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyMain}>
                      {formatCurrency(h.amount, h.from)} → {formatCurrency(h.result, h.to)}
                    </Text>
                    <Text style={styles.historyMeta}>
                      {h.from} → {h.to} · {formatRelativeAgo(h.timestamp)}
                    </Text>
                  </View>
                  <Feather name="corner-up-left" size={16} color={TEXT_3} />
                </TouchableOpacity>
              ))
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
        </View>

        {/* ====== Settings tab ====== */}
        <View style={{ width: screenW, position: "absolute", left: 0, top: 0, bottom: 0 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>{t("tab.settings")}</Text>
              <Text style={styles.title}>{t("settings.title")}</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>{t("settings.intro")}</Text>

          <Section title={t("settings.currency.title")} subtitle={t("settings.currency.hint")}>
            <TouchableOpacity
              style={styles.inputWrap}
              onPress={() => setCurrencyPickerOpen(true)}
              testID="open-currency-picker"
              activeOpacity={0.85}
            >
              <View style={[styles.currencySymbolBig, { marginRight: 12 }]}>
                <Text style={styles.currencySymbolBigText}>
                  {getCurrency(currency).symbol}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{getCurrency(currency).code}</Text>
                <Text style={styles.inputValue}>{getCurrency(currency).name}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={TEXT_3} />
            </TouchableOpacity>
          </Section>

          <Section title={t("settings.language.title")} subtitle={t("settings.language.hint")}>
            <TouchableOpacity
              style={styles.inputWrap}
              onPress={() => setLangPickerOpen(true)}
              testID="open-lang-picker"
              activeOpacity={0.85}
            >
              <Text style={[styles.currencyFlag, { marginRight: 12 }]}>
                {LANGUAGES.find((l) => l.code === lang)?.flag ?? "🌐"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{lang.toUpperCase()}</Text>
                <Text style={styles.inputValue}>
                  {LANGUAGES.find((l) => l.code === lang)?.label ?? lang}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={TEXT_3} />
            </TouchableOpacity>
          </Section>

          <Section title={t("settings.location.title")} subtitle={t("settings.location.hint")}>
            {premiumUser?.id ? (
              <TouchableOpacity
                style={styles.profileLocNote}
                activeOpacity={0.85}
                onPress={() => router.push("/(premium)/complete-profile?edit=1" as never)}
                accessibilityRole="button"
                accessibilityLabel="Modifier ma localisation dans mon profil"
              >
                <Feather name="user" size={15} color={GOLD} />
                <Text style={styles.profileLocNoteText}>
                  {interpolate(t("settings.locationFromProfile"), {
                    place: city.region ? `${city.name}, ${city.region}` : city.name,
                  })}
                </Text>
                <Feather name="chevron-right" size={16} color={TEXT_3} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.inputWrap, premiumUser?.id ? { opacity: 0.5 } : null]}
              disabled={!!premiumUser?.id}
              onPress={() => {
                setPickerCountry(city.countryCode);
                setPickerStep("country");
                setCitySearch("");
                setCityPickerOpen(true);
              }}
              testID="city-picker-button"
              activeOpacity={0.8}
            >
              <Text style={[styles.currencyFlag, { marginRight: 12 }]}>
                {getCountry(city.countryCode)?.flag ?? "🌍"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{city.name}</Text>
                <Text style={styles.inputValue}>{city.region}</Text>
              </View>
              <View style={[styles.indexBadge, { borderColor: city.theme.accent, borderWidth: 1, marginRight: 6 }]}>
                <Text style={[styles.indexBadgeText, { color: city.theme.accent }]}>
                  ×{city.index.toFixed(2)}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={TEXT_3} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCityInfoOpen(true)}
              style={styles.infoRow}
              testID="city-info-button"
              activeOpacity={0.7}
            >
              <Feather name="info" size={14} color={TEXT_3} />
              <Text style={styles.infoRowText}>{t("info.indexHelp")}</Text>
            </TouchableOpacity>
          </Section>

          <Section title={t("settings.notifications.title")}>
            <View style={styles.toggleRow}>
              <Feather
                name="bell"
                size={20}
                color={monthlyReminder ? GOLD : TEXT_3}
                style={{ marginRight: 12 }}
              />
              <Text style={[styles.toggleLabel, { flex: 1 }]}>
                {t("settings.notifications.title")}
              </Text>
              <Switch
                value={monthlyReminder}
                onValueChange={toggleMonthlyReminder}
                trackColor={{ false: BORDER, true: GOLD }}
                thumbColor="#fff"
                ios_backgroundColor={BORDER}
                testID="settings-notifications-toggle"
              />
            </View>
          </Section>

          <Section title={t("settings.danger.title")}>
            <TouchableOpacity
              onPress={askResetAll}
              style={[styles.exportBtn, { backgroundColor: DANGER }]}
              testID="settings-reset"
              activeOpacity={0.85}
            >
              <Feather name="trash-2" size={18} color="#fff" />
              <Text style={[styles.exportBtnTextDark, { color: "#fff" }]}>
                {t("settings.reset.btn")}
              </Text>
            </TouchableOpacity>

            {/* Suppression du COMPTE (RGPD + exigence App Store) — visible
                seulement si connecté. Double confirmation, irréversible :
                efface le compte, les workspaces possédés et toutes les
                données cloud (cascade + Edge Function delete-account). */}
            {premiumUser ? (
              <TouchableOpacity
                onPress={askDeleteAccount}
                style={[
                  styles.exportBtn,
                  {
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: DANGER,
                    marginTop: 10,
                  },
                ]}
                testID="settings-delete-account"
                activeOpacity={0.85}
              >
                <Feather name="user-x" size={18} color={DANGER} />
                <Text style={[styles.exportBtnTextDark, { color: DANGER }]}>
                  Supprimer mon compte
                </Text>
              </TouchableOpacity>
            ) : null}
          </Section>
          <View style={{ height: 40 }} />
        </ScrollView>
        </View>

        {/* ====== Premium / Profil tab (style Instagram : tout à droite) ====== */}
        <View style={{ width: screenW, position: "absolute", left: screenW * 4, top: 0, bottom: 0 }}>
          <View style={[styles.header, { paddingHorizontal: 20 }]}>
            <View>
              <Text style={styles.eyebrow}>{t("tab.premium")}</Text>
              <Text style={styles.title}>NETbudget</Text>
            </View>
          </View>
          <PremiumHomePanel onGoBudget={() => setTab("budget")} onDevReplayBirthday={devReplayBirthday} />
        </View>
        </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>

      {/* Floating "Terminé" button while keyboard is up */}
      {keyboardVisible && (
        <TouchableOpacity
          style={styles.dismissKbBtn}
          onPress={() => Keyboard.dismiss()}
          activeOpacity={0.85}
          testID="dismiss-keyboard"
        >
          <Feather name="check" size={16} color="#000" />
          <Text style={styles.dismissKbBtnText}>{t("kb.done")}</Text>
        </TouchableOpacity>
      )}

      {/* Converter Currency Picker Modal */}
      <Modal
        visible={convPickerFor !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setConvPickerFor(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setConvPickerFor(null)}
          />
          <View style={[styles.sheet, { height: sheetHeight }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {convPickerFor === "from" ? t("converter.from") : t("converter.to")} ·{" "}
                {t("modal.chooseCurrency")}
              </Text>
              <TouchableOpacity
                onPress={() => setConvPickerFor(null)}
                testID="close-conv-picker"
              >
                <Feather name="x" size={22} color={TEXT_2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {CURRENCIES.map((c) => {
                const current = convPickerFor === "from" ? convFrom : convTo;
                const active = c.code === current;
                return (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.currencyRow, active && styles.currencyRowActive]}
                    onPress={() => {
                      if (convPickerFor === "from") setConvFrom(c.code);
                      else setConvTo(c.code);
                      setConvPickerFor(null);
                    }}
                    testID={`conv-currency-${c.code}`}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.currencySymbolBig, { marginRight: 12 }]}>
                      <Text style={styles.currencySymbolBigText}>{c.symbol}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.currencyName}>{c.name}</Text>
                      <Text style={styles.currencyMeta}>{c.flag} {c.code}</Text>
                    </View>
                    {active && (
                      <Feather name="check" size={18} color={GOLD} style={{ marginLeft: 10 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Language Picker Modal */}
      <Modal
        visible={langPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLangPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setLangPickerOpen(false)}
          />
          <View style={[styles.sheet, { height: sheetHeight }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t("modal.chooseLanguage")}</Text>
              <TouchableOpacity
                onPress={() => setLangPickerOpen(false)}
                testID="close-lang-picker"
              >
                <Feather name="x" size={22} color={TEXT_2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((l) => {
                const active = l.code === lang;
                return (
                  <TouchableOpacity
                    key={l.code}
                    style={[styles.currencyRow, active && styles.currencyRowActive]}
                    onPress={() => {
                      setLang(l.code);
                      setLangPickerOpen(false);
                    }}
                    testID={`lang-option-${l.code}`}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.currencyFlag}>{l.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.currencyName}>{l.label}</Text>
                      <Text style={styles.currencyMeta}>{l.code.toUpperCase()}</Text>
                    </View>
                    {active && <Feather name="check" size={18} color={GOLD} style={{ marginLeft: 10 }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Currency Picker Modal */}
      <Modal
        visible={currencyPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCurrencyPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setCurrencyPickerOpen(false)}
          />
          <View style={[styles.sheet, { height: sheetHeight }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t("modal.chooseCurrency")}</Text>
              <TouchableOpacity
                onPress={() => setCurrencyPickerOpen(false)}
                testID="close-currency-picker"
              >
                <Feather name="x" size={22} color={TEXT_2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {CURRENCIES.map((c) => {
                const active = c.code === currency;
                return (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.currencyRow, active && styles.currencyRowActive]}
                    onPress={() => {
                      setCurrencyPickerOpen(false);
                      void changeCurrency(c.code);
                    }}
                    testID={`currency-option-${c.code}`}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.currencySymbolBig, { marginRight: 12 }]}>
                      <Text style={styles.currencySymbolBigText}>{c.symbol}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.currencyName}>{c.name}</Text>
                      <Text style={styles.currencyMeta}>{c.flag} {c.code}</Text>
                    </View>
                    {active && <Feather name="check" size={18} color={GOLD} style={{ marginLeft: 10 }} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fête d'anniversaire (jour J, une fois par an) */}
      <BirthdayCelebration
        visible={bdayOpen}
        cards={bdayCards ?? []}
        onKeep={(c) => {
          if (!premiumUser?.id) return;
          addSavedAdvice(premiumUser.id, {
            id: `bday-${new Date().getFullYear()}-${bdaySource}-${c.title}`,
            emoji: c.emoji,
            title: c.title,
            body: c.body,
            tone: c.tone,
            sources: c.sources,
            savedAt: new Date().toISOString(),
            source: bdaySource,
          });
        }}
        onClose={() => setBdayOpen(false)}
      />

      {/* Échéancier détaillé d'un prêt */}
      {scheduleLoan ? (
        <LoanScheduleModal
          visible
          onClose={() => setScheduleLoan(null)}
          loanName={scheduleLoan.name || t("loan.defaultName")}
          principal={parseNumber(scheduleLoan.principal)}
          ratePercent={parseNumber(scheduleLoan.ratePercent)}
          years={parseNumber(scheduleLoan.years)}
          startIso={scheduleLoan.startDate}
          monthlyPayment={loanMonthlyPayment(scheduleLoan)}
          format={fmt}
        />
      ) : null}

      {/* Bottom Tab Bar — bulle "liquid glass" façon Apple :
          - flotte AU-DESSUS du contenu (absolute) → le contenu défile derrière
            et transparaît à travers le flou
          - une bulle de sélection GLISSE entre les onglets (spring), et suit
            en temps réel les swipes d'écran (pilotée par swipeX)
          - maintenir le doigt sur la barre puis glisser déplace la sélection
            (Pan après appui long, comme iOS) */}
      <View
        style={[
          styles.tabBarWrap,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === "ios" ? 18 : 10) },
        ]}
        pointerEvents="box-none"
      >
        <GestureDetector gesture={tabSlideGesture}>
          <BlurView
            intensity={55}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={styles.tabBarPill}
            onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}
            accessibilityRole="tablist"
          >
            {/* Bulle de sélection animée (derrière les icônes) */}
            {tabBarWidth > 0 ? (
              <Animated.View
                style={[
                  styles.tabIndicator,
                  { width: (tabBarWidth - 20) / TAB_ORDER.length },
                  tabIndicatorStyle,
                ]}
              />
            ) : null}
            {([
              { key: "settings", icon: "settings" },
              { key: "events", icon: "calendar" },
              { key: "budget", icon: "pie-chart" },
              { key: "converter", icon: "refresh-cw" },
              { key: "premium", icon: "user" },
            ] as { key: Tab; icon: keyof typeof Feather.glyphMap }[]).map((it) => {
              const active = tab === it.key;
              return (
                <TouchableOpacity
                  key={it.key}
                  onPress={() => setTab(it.key)}
                  style={styles.tabBtn}
                  testID={`tab-${it.key}`}
                  activeOpacity={0.7}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={
                    tabBadges[it.key]
                      ? `${t(`tab.${it.key}`)}, nouveautés à voir`
                      : t(`tab.${it.key}`)
                  }
                >
                  <View>
                    <Feather
                      name={it.icon}
                      size={21}
                      color={active ? GOLD : TEXT_3}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    {tabBadges[it.key] ? <View style={styles.tabBadge} /> : null}
                  </View>
                  <Text
                    style={[styles.tabLabel, active && styles.tabLabelActive]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {t(`tab.${it.key}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </BlurView>
        </GestureDetector>
      </View>

      {/* City Picker Modal (2-step : pays → ville) */}
      <Modal
        visible={cityPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCityPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => { Keyboard.dismiss(); setCityPickerOpen(false); }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
            style={{ width: "100%" }}
          >
          <View style={[styles.sheet, { height: sheetHeight }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              {pickerStep === "city" ? (
                <TouchableOpacity
                  onPress={() => { setPickerStep("country"); setCitySearch(""); }}
                  hitSlop={10}
                  testID="picker-back-to-country"
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Feather name="chevron-left" size={20} color={TEXT_2} />
                  <Text style={styles.sheetTitle}>
                    {getCountry(pickerCountry ?? "")?.flag} {getCountry(pickerCountry ?? "")?.name}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.sheetTitle}>{t("modal.chooseCountry")}</Text>
              )}
              <TouchableOpacity onPress={() => { Keyboard.dismiss(); setCityPickerOpen(false); }} testID="close-city-picker">
                <Feather name="x" size={22} color={TEXT_2} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrap}>
              <Feather name="search" size={16} color={TEXT_3} />
              <TextInput
                style={styles.searchInput}
                value={citySearch}
                onChangeText={setCitySearch}
                placeholder={pickerStep === "country" ? t("btn.searchCountry") : t("btn.search")}
                placeholderTextColor={TEXT_3}
                returnKeyType="search"
                testID="city-search-input"
              />
              {citySearch.length > 0 && (
                <TouchableOpacity
                  onPress={() => setCitySearch("")}
                  hitSlop={10}
                  testID="city-search-clear"
                >
                  <Feather name="x-circle" size={16} color={TEXT_3} />
                </TouchableOpacity>
              )}
            </View>
            {pickerStep === "country" ? (
              <FlatList
                data={filteredCountries}
                keyExtractor={(c) => c.code}
                keyboardShouldPersistTaps="handled"
                style={{ flex: 1 }}
                ListHeaderComponent={
                  globalCitySuggestions.length > 0 ? (
                    <View>
                      <View style={styles.regionHeader}>
                        <Text style={styles.regionHeaderText}>{t("country.citySuggestions")}</Text>
                      </View>
                      {globalCitySuggestions.map((sug) => {
                        const country = COUNTRIES.find((c) => c.code === sug.countryCode);
                        return (
                          <TouchableOpacity
                            key={sug.id}
                            style={styles.cityRow}
                            onPress={() => {
                              setCity(sug);
                              setCityPickerOpen(false);
                              setCitySearch("");
                            }}
                            testID={`city-suggestion-${sug.id}`}
                          >
                            <Text style={{ fontSize: 20, marginRight: 12 }}>{country?.flag ?? "🌍"}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.cityName}>{sug.name}</Text>
                              <Text style={styles.cityRegion}>
                                {country?.name ?? sug.countryCode} · {sug.region}
                              </Text>
                            </View>
                            <View style={styles.cityIndex}>
                              <Text style={[styles.cityIndexText, { color: sug.index > 1 ? GOLD : SUCCESS }]}>
                                ×{sug.index.toFixed(2)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                      {filteredCountries.length > 0 && (
                        <View style={[styles.regionHeader, { marginTop: 8 }]}>
                          <Text style={styles.regionHeaderText}>{t("country.allCountries")}</Text>
                        </View>
                      )}
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  globalCitySuggestions.length === 0 ? (
                    <View style={styles.cityEmpty} testID="country-empty">
                      <Feather name="search" size={20} color={TEXT_3} />
                      <Text style={styles.cityEmptyTitle}>{t("country.noResult")}</Text>
                      <Text style={styles.cityEmptyText}>{t("city.noResultHint")}</Text>
                    </View>
                  ) : null
                }
                renderItem={({ item }) => {
                  const active = city.countryCode === item.code;
                  const count = citiesByCountry(item.code).length;
                  return (
                    <TouchableOpacity
                      style={[styles.cityRow, active && styles.cityRowActive]}
                      onPress={() => {
                        setPickerCountry(item.code);
                        setPickerStep("city");
                        setCitySearch("");
                      }}
                      testID={`country-option-${item.code}`}
                    >
                      <Text style={{ fontSize: 24, marginRight: 12 }}>{item.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cityName}>{item.name}</Text>
                        <Text style={styles.cityRegion}>{count} {count > 1 ? t("country.cities") : t("country.city")}</Text>
                      </View>
                      <Feather name="chevron-right" size={20} color={TEXT_3} />
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <SectionList<City, { title: string }>
                sections={(() => {
                  const grouped: Record<string, City[]> = {};
                  for (const c of filteredCities) {
                    if (!grouped[c.region]) grouped[c.region] = [];
                    grouped[c.region].push(c);
                  }
                  return Object.entries(grouped).map(([region, data]) => ({ title: region, data }));
                })()}
                keyExtractor={(c) => c.id}
                keyboardShouldPersistTaps="handled"
                style={{ flex: 1 }}
                stickySectionHeadersEnabled={false}
                renderSectionHeader={({ section }) => (
                  <View style={styles.regionHeader}>
                    <Text style={styles.regionHeaderText}>{section.title}</Text>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.cityEmpty} testID="city-empty">
                    <Feather name="search" size={20} color={TEXT_3} />
                    <Text style={styles.cityEmptyTitle}>{t("city.noResult")}</Text>
                    <Text style={styles.cityEmptyText}>{t("city.noResultHint")}</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const active = item.id === city.id;
                  return (
                    <TouchableOpacity
                      style={[styles.cityRow, active && styles.cityRowActive]}
                      onPress={() => {
                        setCity(item);
                        setCityPickerOpen(false);
                        setCitySearch("");
                      }}
                      testID={`city-option-${item.id}`}
                    >
                      <View style={[styles.cityDot, { backgroundColor: item.theme.accent }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cityName}>{item.name}</Text>
                        <Text style={styles.cityRegion}>{item.region}</Text>
                      </View>
                      <View style={styles.cityIndex}>
                        <Text
                          style={[
                            styles.cityIndexText,
                            { color: item.index > 1 ? GOLD : SUCCESS },
                          ]}
                        >
                          ×{item.index.toFixed(2)}
                        </Text>
                      </View>
                      {active && <Feather name="check" size={18} color={GOLD} style={{ marginLeft: 10 }} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* City Info Modal */}
      <Modal
        visible={cityInfoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCityInfoOpen(false)}
      >
        <View style={styles.confirmBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setCityInfoOpen(false)}
          />
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>{t("info.indexTitle")}</Text>
            <Text style={styles.confirmMessage}>{t("info.indexBody")}</Text>
            <Text style={[styles.confirmMessage, { marginTop: 10, fontWeight: "700" }]}>
              {t("info.indexFooter")}
            </Text>
            {INDEX_SOURCES.map((src) => (
              <TouchableOpacity
                key={src.url}
                onPress={() => openExternal(src.url)}
                style={styles.sourceLinkRow}
                activeOpacity={0.7}
                testID={`source-link-${src.url}`}
              >
                <Feather name="external-link" size={13} color={GOLD} />
                <Text style={styles.sourceLinkText}>{src.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.infoCloseBtn}
              onPress={() => setCityInfoOpen(false)}
              testID="close-city-info"
            >
              <Text style={styles.infoCloseText}>{t("btn.understood")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ratio budgétaire — Info Modal (personnalisée si Premium loggé) */}
      <Modal
        visible={ruleInfoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRuleInfoOpen(false)}
      >
        <View style={styles.confirmBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setRuleInfoOpen(false)}
          />
          <View style={styles.confirmBox}>
            {(() => {
              const info = explainBudgetSplit(premiumProfile ?? {}, adviceI18n);
              return (
                <>
                  <Text style={styles.confirmTitle}>
                    {info.isPersonalized
                      ? `${info.mix.name} · ${info.split.besoins}/${info.split.envies}/${info.split.epargne}`
                      : `${t("adv.mix.equilibre.name")} · 50/30/20`}
                  </Text>
                  {info.isPersonalized ? (
                    <>
                      <Text style={[styles.confirmMessage, { fontStyle: "italic", marginTop: 2 }]}>
                        {info.mix.tagline}
                      </Text>
                      <Text style={[styles.confirmMessage, { marginTop: 10 }]}>
                        {info.mix.description}
                      </Text>
                      <Text style={[styles.confirmMessage, { marginTop: 12, color: TEXT_3, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }]}>
                        {t("adv.mix.detail")}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.confirmMessage}>
                      {t("adv.mix.generic.intro")}
                    </Text>
                  )}
                  <Text style={[styles.confirmMessage, { marginTop: 12 }]}>
                    <Text style={{ color: "#10B981", fontWeight: "800" }}>
                      {t("adv.mix.label.besoins")} {info.split.besoins}% ·{" "}
                    </Text>
                    {info.besoinsReason}
                  </Text>
                  <Text style={[styles.confirmMessage, { marginTop: 8 }]}>
                    <Text style={{ color: "#A855F7", fontWeight: "800" }}>
                      {t("adv.mix.label.envies")} {info.split.envies}% ·{" "}
                    </Text>
                    {info.enviesReason}
                  </Text>
                  <Text style={[styles.confirmMessage, { marginTop: 8 }]}>
                    <Text style={{ color: "#F59E0B", fontWeight: "800" }}>
                      {t("adv.mix.label.epargne")} {info.split.epargne}% ·{" "}
                    </Text>
                    {info.epargneReason}
                  </Text>
                  <Text
                    style={[
                      styles.confirmMessage,
                      { marginTop: 14, fontStyle: "italic" },
                    ]}
                  >
                    {info.reminder}
                  </Text>
                </>
              );
            })()}
            <TouchableOpacity
              style={styles.infoCloseBtn}
              onPress={() => setRuleInfoOpen(false)}
              testID="close-rule-info"
            >
              <Text style={styles.infoCloseText}>{t("btn.understood")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Income Source Modal (Add / Edit) */}
      <Modal
        visible={incomeModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIncomeModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => { Keyboard.dismiss(); setIncomeModalOpen(false); }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
            style={{ width: "100%" }}
          >
            <View style={[styles.sheet, { height: sheetHeight }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {editingIncome ? t("modal.editIncome") : t("modal.newIncome")}
                </Text>
                <TouchableOpacity
                  onPress={() => { Keyboard.dismiss(); setIncomeModalOpen(false); }}
                  testID="close-income-modal"
                >
                  <Feather name="x" size={22} color={TEXT_2} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Dropdown<IncomeType>
                  label={t("income.type")}
                  icon={
                    <Feather
                      name={TYPE_ICON[incomeForm.type] as keyof typeof Feather.glyphMap}
                      size={18}
                      color={GOLD}
                    />
                  }
                  value={incomeForm.type}
                  options={(Object.keys(TYPE_LABEL) as IncomeType[]).map((code) => ({
                    value: code,
                    label: t(`incomeType.${code}`),
                    hint: t(`incomeType.${code}Hint`),
                  }))}
                  onChange={changeIncomeType}
                  testID="income-type-dropdown"
                />

                <Field
                  label={t("income.name")}
                  icon={<Feather name="tag" size={18} color={GOLD} />}
                  value={incomeForm.label}
                  onChangeText={(v) => setIncomeForm((f) => ({ ...f, label: v }))}
                  placeholder={t(`incomeType.${incomeForm.type}`)}
                  testID="income-label"
                />

                <Field
                  label={t("income.amount")}
                  icon={<Text style={styles.euroIcon}>{getCurrency(currency).symbol}</Text>}
                  right={getCurrency(currency).symbol}
                  value={incomeForm.amount}
                  onChangeText={(t) => setIncomeForm((f) => ({ ...f, amount: t }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  testID="income-amount"
                />

                <Dropdown<IncomeFrequency>
                  label={t("income.frequency")}
                  icon={<Feather name="calendar" size={18} color={GOLD} />}
                  value={incomeForm.frequency}
                  options={[
                    { value: "monthly", label: t("freq.monthly"), hint: t("freq.monthlyHint") },
                    { value: "annual", label: t("freq.annual"), hint: t("freq.annualHint") },
                    { value: "monthOnce", label: t("freq.monthOnce"), hint: t("freq.monthOnceHint") },
                  ]}
                  onChange={(next) =>
                    setIncomeForm((f) => ({
                      ...f,
                      frequency: next,
                      variableMonth: next === "monthOnce" ? f.variableMonth ?? 11 : f.variableMonth,
                    }))
                  }
                  testID="income-freq-dropdown"
                />
                {incomeForm.frequency === "monthOnce" && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingVertical: 8, paddingHorizontal: 4 }}
                  >
                    {MONTH_KEYS_SHORT.map((key, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setIncomeForm((f) => ({ ...f, variableMonth: i }))}
                        style={[styles.distribPill, incomeForm.variableMonth === i && styles.distribPillActive]}
                        testID={`income-month-${i}`}
                      >
                        <Text style={[styles.distribPillText, incomeForm.variableMonth === i && styles.distribPillTextActive]}>
                          {t(key)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {incomeForm.type === "salaire" && (
                  <>
                    <Dropdown<ProStatus>
                      label={t("income.status")}
                      icon={<Feather name="briefcase" size={18} color={GOLD} />}
                      value={incomeForm.proStatus ?? "non-cadre"}
                      options={(Object.keys(STATUS_LABEL) as ProStatus[]).map((s) => ({
                        value: s,
                        label: t(`status.${s}`),
                        hint: `≈ ${STATUS_DEFAULT_CHARGES[s]} %`,
                      }))}
                      onChange={changeIncomeProStatus}
                      testID="income-status-dropdown"
                    />
                    <Dropdown<"plein" | "partiel">
                      label={t("income.timeMode")}
                      icon={<Feather name="clock" size={18} color={GOLD} />}
                      value={incomeForm.timeMode ?? "plein"}
                      options={[
                        { value: "plein", label: t("time.full") },
                        { value: "partiel", label: t("time.part") },
                      ]}
                      onChange={(next) => setIncomeForm((f) => ({ ...f, timeMode: next }))}
                      testID="income-time-dropdown"
                    />
                  </>
                )}

                <Field
                  label={t("income.charges")}
                  icon={<Feather name="percent" size={18} color={GOLD} />}
                  right="%"
                  value={incomeForm.chargesPercent}
                  onChangeText={(t) => setIncomeForm((f) => ({ ...f, chargesPercent: t }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  hintText={TYPE_HINT[incomeForm.type]}
                  testID="income-charges"
                />

                {/* Dîme — visible seulement si activée dans le profil (Premium) */}
                {tithePercent > 0 ? (
                  <View style={styles.toggleRow}>
                    <Feather
                      name="heart"
                      size={20}
                      color={incomeForm.titheApplied ? GOLD : TEXT_3}
                      style={{ marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.toggleLabel}>
                        Réserver {tithePercent} % pour les dons
                      </Text>
                      <Text style={{ color: TEXT_3, fontSize: 12, marginTop: 2 }}>
                        Déduite du net de ce revenu.
                      </Text>
                    </View>
                    <Switch
                      value={incomeForm.titheApplied ?? false}
                      onValueChange={(v) =>
                        setIncomeForm((f) => ({ ...f, titheApplied: v }))
                      }
                      trackColor={{ false: BORDER, true: GOLD }}
                      thumbColor="#fff"
                      ios_backgroundColor={BORDER}
                    />
                  </View>
                ) : null}
              </ScrollView>
              <View style={styles.sheetFooter}>
                <TouchableOpacity
                  onPress={saveIncome}
                  style={styles.primaryBtn}
                  testID="save-income"
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>
                    {editingIncome ? t("btn.save") : t("btn.add")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Add Custom Expense Item Modal */}
      <Modal
        visible={addItemFamily !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setAddItemFamily(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => { Keyboard.dismiss(); setAddItemFamily(null); }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
            style={{ width: "100%" }}
          >
            <View style={[styles.sheet, { height: sheetHeight }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {t("btn.add")} ·{" "}
                  {addItemFamily === "epargne"
                    ? t("family.epargne.short")
                    : addItemFamily
                      ? t(`family.${addItemFamily}.label`)
                      : ""}
                </Text>
                <TouchableOpacity
                  onPress={() => setAddItemFamily(null)}
                  testID="close-add-item"
                >
                  <Feather name="x" size={22} color={TEXT_2} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Field
                  label={t("income.name")}
                  icon={<Feather name="tag" size={18} color={GOLD} />}
                  value={newItemLabel}
                  onChangeText={setNewItemLabel}
                  placeholder={t("newCategoryName")}
                  testID="new-item-label"
                />
                <Field
                  label={`${t("converter.amount")} · ${t("freq.monthly")}`}
                  icon={<Text style={styles.euroIcon}>{getCurrency(currency).symbol}</Text>}
                  right={getCurrency(currency).symbol}
                  value={newItemAmount}
                  onChangeText={setNewItemAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  testID="new-item-amount"
                />
              </ScrollView>
              <View style={styles.sheetFooter}>
                <TouchableOpacity
                  onPress={saveNewItem}
                  style={styles.primaryBtn}
                  testID="save-new-item"
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>{t("btn.add")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Loan Modal */}
      <Modal
        visible={loanModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setLoanModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => { Keyboard.dismiss(); setLoanModalOpen(false); }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
            style={{ width: "100%" }}
          >
            <View style={[styles.sheet, { height: sheetHeight }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {editingLoan ? t("modal.editLoan") : t("modal.newLoan")}
                </Text>
                <TouchableOpacity
                  onPress={() => { Keyboard.dismiss(); setLoanModalOpen(false); }}
                  testID="close-loan-modal"
                >
                  <Feather name="x" size={22} color={TEXT_2} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 8 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Field
                  label={t("label.loanName")}
                  icon={<Feather name="tag" size={18} color={GOLD} />}
                  value={form.name}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                  placeholder={t("loan.placeholder")}
                  testID="loan-name-input"
                />

                <Dropdown<LoanMode>
                  label={t("label.loanMode")}
                  icon={<Feather name="sliders" size={18} color={GOLD} />}
                  value={form.mode ?? "computed"}
                  options={[
                    { value: "computed", label: t("label.loanComputed"), hint: t("label.loanComputedHint") },
                    { value: "direct", label: t("label.loanDirect"), hint: t("label.loanDirectHint") },
                  ]}
                  onChange={(next) => setForm({ ...form, mode: next })}
                  testID="loan-mode-dropdown"
                />

                {(form.mode ?? "computed") === "direct" ? (
                  <Field
                    label={t("label.loanMonthly")}
                    icon={<Text style={styles.euroIcon}>{getCurrency(currency).symbol}</Text>}
                    right={`${getCurrency(currency).symbol} ${t("label.perMonth")}`}
                    value={form.directMonthly ?? "0"}
                    onChangeText={(v) => setForm({ ...form, directMonthly: v })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    hintText={t("label.loanMonthlyHint")}
                    testID="loan-direct-monthly-input"
                  />
                ) : (
                  <>
                    <Field
                      label={t("label.loanPrincipal")}
                      icon={<Text style={styles.euroIcon}>{getCurrency(currency).symbol}</Text>}
                      right={getCurrency(currency).symbol}
                      value={form.principal}
                      onChangeText={(v) => setForm({ ...form, principal: v })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      testID="loan-principal-input"
                    />
                    <Field
                      label={t("label.loanRate")}
                      icon={<Feather name="percent" size={18} color={GOLD} />}
                      right="%"
                      value={form.ratePercent}
                      onChangeText={(v) => setForm({ ...form, ratePercent: v })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      testID="loan-rate-input"
                    />
                    <Field
                      label={t("label.loanDuration")}
                      icon={<Feather name="calendar" size={18} color={GOLD} />}
                      right={t("label.years")}
                      value={form.years}
                      onChangeText={(v) => setForm({ ...form, years: v })}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      testID="loan-years-input"
                    />
                    <Field
                      label={t("loan.startLabel")}
                      icon={<Feather name="clock" size={18} color={GOLD} />}
                      value={loanStartText}
                      onChangeText={(v) => {
                        const formatted = formatMonthInput(v);
                        setLoanStartText(formatted);
                        setForm((f) => ({
                          ...f,
                          startDate: monthInputToIso(formatted),
                        }));
                      }}
                      keyboardType="number-pad"
                      maxLength={7}
                      placeholder={t("loan.startPlaceholder")}
                      hintText={t("loan.startHint")}
                      testID="loan-start-input"
                    />
                    <View style={styles.previewBox}>
                      <Text style={styles.previewLabel}>{t("label.loanPreview")}</Text>
                      <Text style={styles.previewValue} testID="loan-preview-monthly">
                        {fmt(loanMonthlyPayment(form))}
                      </Text>
                      {(() => {
                        const pr = loanProgress(
                          parseNumber(form.principal),
                          parseNumber(form.ratePercent),
                          parseNumber(form.years),
                          form.startDate,
                          loanMonthlyPayment(form),
                        );
                        if (!pr) return null;
                        return (
                          <Text style={styles.previewHint}>
                            {pr.finished
                              ? t("loan.previewFinished")
                              : interpolate(t("loan.previewRemaining"), {
                                  time: humanRemaining(pr),
                                  cost: fmt(pr.totalInterest),
                                })}
                          </Text>
                        );
                      })()}
                    </View>
                  </>
                )}
              </ScrollView>
              <View style={styles.sheetFooter}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={saveLoan}
                  testID="save-loan-button"
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>
                    {editingLoan ? t("btn.save") : t("btn.add")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Confirm Modal */}
      <Modal
        visible={confirm.open}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirm({ ...confirm, open: false })}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>{confirm.title}</Text>
            <Text style={styles.confirmMessage}>{confirm.message}</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => {
                  const fn = confirm.onCancel;
                  setConfirm({ ...confirm, open: false });
                  if (fn) fn();
                }}
                testID="confirm-cancel"
              >
                <Text style={styles.confirmCancelText}>
                  {confirm.cancelLabel || t("btn.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmOkBtn, confirm.danger && { backgroundColor: DANGER }]}
                onPress={() => {
                  const fn = confirm.onConfirm;
                  setConfirm({ ...confirm, open: false });
                  if (fn) fn();
                }}
                testID="confirm-ok"
              >
                <Text style={[styles.confirmOkText, confirm.danger && { color: "#fff" }]}>
                  {confirm.confirmLabel || t("btn.confirm")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal : nouvelle version disponible sur l'App Store */}
      <Modal
        visible={!!updateInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setUpdateInfo(null)}
      >
        <View style={styles.confirmBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setUpdateInfo(null)}
          />
          <View style={styles.confirmBox}>
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <View style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: "rgba(16,185,129,0.15)",
                alignItems: "center", justifyContent: "center",
                borderWidth: 1, borderColor: "rgba(16,185,129,0.4)",
              }}>
                <Feather name="download" size={26} color="#10B981" />
              </View>
            </View>
            <Text style={styles.confirmTitle}>{t("update.title")}</Text>
            <Text style={styles.confirmMessage}>
              {interpolate(t("update.message"), {
                current: updateInfo?.installedVersion ?? "",
                latest: updateInfo?.storeVersion ?? "",
              })}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                style={[styles.infoCloseBtn, { flex: 1, backgroundColor: "rgba(255,255,255,0.06)" }]}
                onPress={async () => {
                  if (updateInfo) await dismissUpdate(updateInfo.storeVersion);
                  setUpdateInfo(null);
                }}
                testID="update-later"
              >
                <Text style={styles.infoCloseText}>{t("update.later")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.infoCloseBtn, { flex: 1, backgroundColor: "#10B981" }]}
                onPress={() => {
                  if (updateInfo?.appStoreUrl) openExternal(updateInfo.appStoreUrl);
                  setUpdateInfo(null);
                }}
                testID="update-now"
              >
                <Text style={[styles.infoCloseText, { color: "#0A0A0C" }]}>{t("update.now")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

function Field({
  label,
  icon,
  right,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  testID,
  hintText,
  onDelete,
  onLabelChange,
  renameHint,
  maxLength,
  keepEmpty,
}: {
  label: string;
  icon?: React.ReactNode;
  right?: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "number-pad";
  placeholder?: string;
  testID?: string;
  hintText?: string;
  onDelete?: () => void;
  onLabelChange?: (next: string) => void;
  renameHint?: string;
  maxLength?: number;
  // Les champs de MONTANT retombent à "0" quand on les vide (pratique pour
  // saisir un chiffre). Un champ de DATE ne doit pas : "0" n'est pas une date.
  keepEmpty?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const handleFocus = () => {
    setFocused(true);
    if (!keepEmpty && value === "0") onChangeText("");
  };
  const handleBlur = () => {
    setFocused(false);
    if (!keepEmpty && value === "") onChangeText("0");
  };
  return (
    <View>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        {icon && <View style={styles.inputIcon}>{icon}</View>}
        <View style={{ flex: 1 }}>
          {onLabelChange ? (
            <TextInput
              style={[styles.inputLabel, styles.inputLabelEditable]}
              value={label}
              onChangeText={onLabelChange}
              placeholder={renameHint ?? "Renomme cette catégorie"}
              placeholderTextColor={TEXT_3}
              selectTextOnFocus
              returnKeyType="done"
              testID={testID ? `${testID}-label` : undefined}
            />
          ) : (
            <Text style={styles.inputLabel}>{label}</Text>
          )}
          <TextInput
            style={styles.inputField}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType={keyboardType || "default"}
            maxLength={maxLength}
            placeholder={placeholder}
            placeholderTextColor={TEXT_3}
            selectTextOnFocus
            returnKeyType="done"
            testID={testID}
          />
        </View>
        {right && <Text style={styles.inputRight}>{right}</Text>}
        {onDelete && (
          <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            onPress={onDelete}
            style={styles.fieldDeleteBtn}
            hitSlop={10}
            testID={testID ? `${testID}-delete` : undefined}
          >
            <Feather name="x" size={14} color={TEXT_3} />
          </TouchableOpacity>
        )}
      </View>
      {hintText && <Text style={styles.fieldHint}>{hintText}</Text>}
    </View>
  );
}

type DropdownOption<T extends string> = { value: T; label: string; hint?: string };

function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  icon,
  testID,
}: {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (next: T) => void;
  icon?: React.ReactNode;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <TouchableOpacity
        style={styles.inputWrap}
        onPress={() => setOpen(true)}
        testID={testID}
        activeOpacity={0.8}
      >
        {icon && <View style={styles.inputIcon}>{icon}</View>}
        <View style={{ flex: 1 }}>
          <Text style={styles.inputLabel}>{label}</Text>
          <Text style={styles.inputValue}>{current?.label ?? "—"}</Text>
        </View>
        <Feather name="chevron-down" size={20} color={TEXT_3} />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.dropdownBackdrop}
          onPress={() => setOpen(false)}
        >
          <View style={styles.dropdownSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.dropdownTitle}>{label}</Text>
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  testID={testID ? `${testID}-opt-${opt.value}` : undefined}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                      {opt.label}
                    </Text>
                    {opt.hint && <Text style={styles.dropdownItemHint}>{opt.hint}</Text>}
                  </View>
                  {active && <Feather name="check" size={16} color={GOLD} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function StatusPill({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
      testID={testID}
      activeOpacity={0.8}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    // La tab bar flotte au-dessus du contenu (position absolute) : on
    // réserve sa hauteur pour que le bas des listes reste atteignable.
    paddingBottom: 130,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
  },
  ratioWidget: {
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  ratioLabel: {
    color: TEXT_3,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ratioMixName: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    maxWidth: 120,
  },
  ratioValue: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  budgetScopeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  budgetScopeBadgeText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "700",
    maxWidth: 220,
  },
  eyebrow: {
    color: GOLD,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 2,
  },
  title: { color: TEXT, fontSize: 32, fontWeight: "800", letterSpacing: -0.8 },
  resetBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    minWidth: 40, height: 40, paddingHorizontal: 10,
    borderRadius: 20, backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  headerBtnText: { color: TEXT, fontSize: 14, fontWeight: "800" },

  currencyRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12,
  },
  currencyRowActive: { backgroundColor: SURFACE },
  currencyFlag: { fontSize: 24 },
  currencyName: { color: TEXT, fontSize: 15, fontWeight: "600" },
  currencyMeta: { color: TEXT_3, fontSize: 12, marginTop: 2 },
  currencySymbol: {
    backgroundColor: SURFACE_2, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, minWidth: 50, alignItems: "center",
  },
  currencySymbolText: { color: GOLD, fontSize: 13, fontWeight: "700" },
  currencySymbolBig: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  currencySymbolBigText: { color: GOLD, fontSize: 18, fontWeight: "800" },

  convResultBox: {
    backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 18, marginTop: 8, alignItems: "center",
  },
  convResultLabel: {
    color: TEXT_3, fontSize: 11, letterSpacing: 1.2,
    textTransform: "uppercase", fontWeight: "700", marginBottom: 8,
  },
  convResultValue: { color: GOLD, fontSize: 28, fontWeight: "800", fontVariant: ["tabular-nums"] },
  convResultMeta: { color: TEXT_3, fontSize: 11, marginTop: 8 },

  // Google-Translate-like converter
  convCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginTop: 12,
  },
  convCardResult: { backgroundColor: SURFACE_2 },
  convChip: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingBottom: 14, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  convChipFlag: { fontSize: 30 },
  convChipCode: { color: TEXT, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  convChipName: { color: TEXT_3, fontSize: 12, marginTop: 2 },
  convBigInput: {
    color: TEXT, fontSize: 38, fontWeight: "800",
    padding: 0, margin: 0, fontVariant: ["tabular-nums"],
  },
  convBigResult: {
    color: GOLD, fontSize: 38, fontWeight: "800",
    fontVariant: ["tabular-nums"], marginTop: 2,
  },
  convSymbolHint: {
    color: TEXT_3, fontSize: 13, fontWeight: "600", marginTop: 4,
  },
  convRateMeta: {
    color: TEXT_3, fontSize: 12, marginTop: 10,
  },
  convSwapWrap: {
    flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4,
  },
  convDivider: { flex: 1, height: 1, backgroundColor: BORDER },
  convSwapBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: GOLD,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },

  historyHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 8,
  },
  historyClear: { color: DANGER, fontSize: 12, fontWeight: "700" },
  historyRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SURFACE, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: BORDER, marginBottom: 8,
  },
  historyMain: { color: TEXT, fontSize: 14, fontWeight: "700" },
  historyMeta: { color: TEXT_3, fontSize: 11, marginTop: 4 },

  tabBarWrap: {
    // Flotte au-dessus du contenu : le contenu défile derrière et
    // transparaît à travers le flou (vrai effet "liquid glass").
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: "transparent",
    zIndex: 50,
  },
  tabBarPill: {
    flexDirection: "row",
    borderRadius: 28,
    overflow: "hidden",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(14,19,33,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  miniDonutsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 18,
    marginBottom: 4,
  },
  miniDonutCell: { flex: 1, alignItems: "center", gap: 2 },
  miniDonutLabel: { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 6 },
  miniDonutTarget: { color: TEXT_2, fontSize: 10.5 },
  miniDonutAmount: { color: TEXT_2, fontSize: 11, fontWeight: "600" },
  previewHint: { color: TEXT_2, fontSize: 12, marginTop: 6, textAlign: "center" },
  loanProgressWrap: { marginTop: 8, gap: 4 },
  loanProgressBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  loanProgressFill: { height: 5, borderRadius: 3, backgroundColor: COLOR_PRETS },
  loanProgressText: { color: TEXT_2, fontSize: 11.5, fontWeight: "600" },
  loanSplitText: { color: TEXT_3, fontSize: 11 },
  profileLocNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(74,222,128,0.08)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.28)",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 10,
  },
  profileLocNoteText: { color: TEXT_2, fontSize: 12.5, lineHeight: 18, flex: 1 },
  scheduleLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  scheduleLinkText: { color: GOLD, fontSize: 11.5, fontWeight: "700" },
  loanHintText: { color: TEXT_3, fontSize: 11, marginTop: 6, fontStyle: "italic" },
  tabBadge: {
    position: "absolute",
    top: -3,
    right: -5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F87171",
  },
  tabIndicator: {
    position: "absolute",
    top: 8,
    bottom: 8,
    left: 0,
    borderRadius: 19,
    // backgroundColor piloté par l'animation (s'éclaircit au maintien)
    backgroundColor: "rgba(74,222,128,0.14)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.22)",
    // Halo qui apparaît quand la bulle prend le focus
    shadowColor: "#4ADE80",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0,
    elevation: 0,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 2,
    gap: 3,
    borderRadius: 20,
  },
  tabLabel: { color: TEXT_3, fontSize: 10.5, fontWeight: "600", textAlign: "center" },
  tabLabelActive: { color: GOLD, fontWeight: "800" },

  topSummary: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 24,
  },
  onboardingCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginBottom: 24,
  },
  onboardingHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14,
  },
  onboardingTitle: { color: TEXT, fontSize: 16, fontWeight: "800" },
  onboardingStep: {
    color: TEXT_2, fontSize: 13, lineHeight: 19, marginBottom: 10,
  },
  onboardingNum: { color: GOLD, fontWeight: "800" },
  onboardingHl: { color: TEXT, fontWeight: "700" },
  onboardingTip: {
    color: TEXT_3, fontSize: 12, lineHeight: 18, marginTop: 4,
    fontStyle: "italic",
  },
  topSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topSummaryBlock: { flex: 1, alignItems: "center" },
  topSummaryDivider: { width: 1, height: 36, backgroundColor: BORDER },
  topSummaryLabel: {
    color: TEXT_3, fontSize: 10, letterSpacing: 1.2,
    textTransform: "uppercase", fontWeight: "700", marginBottom: 6,
  },
  topSummaryValue: {
    color: TEXT, fontSize: 16, fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "700", letterSpacing: 0.2 },
  sectionSubtitle: {
    color: TEXT_3, fontSize: 12, lineHeight: 17, marginBottom: 14, marginTop: -4,
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: GOLD,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4,
  },
  addBtnText: { color: "#000", fontWeight: "700", fontSize: 13 },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  inputWrapFocused: { borderColor: GOLD },
  inputIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: SURFACE_2, alignItems: "center", justifyContent: "center",
    marginRight: 12,
  },
  inputLabel: {
    color: TEXT_3, fontSize: 11, letterSpacing: 0.8,
    textTransform: "uppercase", fontWeight: "600", marginBottom: 2,
  },
  inputLabelEditable: { padding: 0, margin: 0, marginBottom: 2 },
  euroIcon: { color: GOLD, fontSize: 18, fontWeight: "800" },
  dismissKbBtn: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 16 : 24,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GOLD,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dismissKbBtnText: { color: "#000", fontSize: 13, fontWeight: "800" },
  inputField: {
    color: TEXT, fontSize: 18, fontWeight: "600", padding: 0, margin: 0,
  },
  inputValue: { color: TEXT, fontSize: 18, fontWeight: "600" },
  inputRight: { color: TEXT_2, fontSize: 16, fontWeight: "600", marginLeft: 8 },
  fieldHint: {
    color: TEXT_3, fontSize: 11, marginBottom: 10, paddingLeft: 4,
  },
  indexBadge: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginRight: 10,
  },
  indexBadgeText: { fontSize: 12, fontWeight: "700" },

  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 4, paddingVertical: 6,
  },

  toggleRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SURFACE_2, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, padding: 14,
  },
  toggleLabel: {
    color: TEXT, fontSize: 15, fontWeight: "600",
  },
  infoRowText: {
    color: TEXT_3, fontSize: 12, textDecorationLine: "underline",
  },

  hint: {
    color: TEXT_3, fontSize: 12, marginTop: 4, paddingHorizontal: 4, lineHeight: 18,
  },

  revenusSummary: {
    backgroundColor: SURFACE_2, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, padding: 14, marginTop: 6,
  },
  revenusRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: 4, gap: 10,
  },
  revenusLabel: { color: TEXT_2, fontSize: 13, flexShrink: 1 },
  revenusTotal: {
    color: TEXT, fontSize: 15, fontWeight: "700",
    flexShrink: 0, textAlign: "right",
  },
  revenusTotalMuted: {
    color: TEXT_3, fontSize: 14, fontWeight: "500",
    flexShrink: 0, textAlign: "right",
  },
  statusToggle: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 12 },
  modeToggleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  pillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  pillSectionLabel: {
    color: TEXT_3, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase",
    fontWeight: "700", marginTop: 14, marginBottom: 8,
  },
  pill: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, alignItems: "center", backgroundColor: SURFACE,
  },
  pillActive: { borderColor: GOLD, backgroundColor: "rgba(74,222,128,0.12)" },
  pillText: { color: TEXT_2, fontSize: 12, fontWeight: "600" },
  pillTextActive: { color: GOLD, fontWeight: "800" },

  emptyCard: {
    backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    borderStyle: "dashed", padding: 24, alignItems: "center",
  },
  emptyTitle: { color: TEXT, fontSize: 15, fontWeight: "700", marginTop: 10, marginBottom: 4 },
  emptyText: { color: TEXT_3, fontSize: 13, textAlign: "center", lineHeight: 18 },

  loanItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1,
    borderColor: BORDER, padding: 14, marginBottom: 10,
  },
  loanIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: SURFACE_2, alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  loanName: { color: TEXT, fontSize: 15, fontWeight: "700", marginBottom: 2 },
  loanMeta: { color: TEXT_3, fontSize: 12 },
  loanMetaSmall: { color: TEXT_3, fontSize: 11 },
  loanAmount: { color: COLOR_PRETS, fontSize: 15, fontWeight: "800" },
  trashBtn: { marginLeft: 10, width: 32, height: 32, alignItems: "center", justifyContent: "center" },

  expensesTotalRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginTop: 10, paddingHorizontal: 4,
  },
  expensesTotalLabel: {
    color: TEXT_3, fontSize: 12, letterSpacing: 1,
    textTransform: "uppercase", fontWeight: "700",
  },
  expensesTotalValue: {
    color: TEXT, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"],
  },

  hero: {
    borderRadius: 24, overflow: "hidden",
    borderWidth: 1, borderColor: BORDER,
  },
  heroOverlay: {
    alignItems: "center", paddingVertical: 28, paddingHorizontal: 18,
  },
  heroLabel: {
    fontSize: 11, letterSpacing: 2, fontWeight: "800", marginBottom: 18,
  },
  legendWrap: {
    alignSelf: "stretch", marginTop: 24,
    backgroundColor: "rgba(10,10,12,0.55)",
    borderRadius: 16, padding: 12, gap: 6,
  },
  legendItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 6,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendText: { color: TEXT, flex: 1, fontSize: 13, fontWeight: "600" },
  legendValue: {
    color: TEXT, fontSize: 13, fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0F0F12",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 32,
    borderWidth: 1, borderColor: BORDER,
    height: Math.round(SCREEN_H * 0.85),
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  sheetHandle: {
    alignSelf: "center", width: 44, height: 4, borderRadius: 2,
    backgroundColor: BORDER, marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  sheetTitle: { color: TEXT, fontSize: 20, fontWeight: "800", flex: 1, marginRight: 12 },
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SURFACE, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: BORDER, marginBottom: 10,
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 15, marginLeft: 8, padding: 0 },
  cityRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10,
  },
  cityRowActive: { backgroundColor: SURFACE },
  cityDot: { width: 10, height: 10, borderRadius: 5 },
  cityName: { color: TEXT, fontSize: 15, fontWeight: "600" },
  cityRegion: { color: TEXT_3, fontSize: 12, marginTop: 2 },
  cityIndex: {
    backgroundColor: SURFACE_2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  cityIndexText: { fontSize: 12, fontWeight: "700" },
  regionHeader: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: "transparent",
  },
  regionHeaderText: {
    color: TEXT_3,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sourceLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  sourceLinkText: {
    color: GOLD,
    fontSize: 13,
    textDecorationLine: "underline",
    flexShrink: 1,
  },
  cityEmpty: { paddingVertical: 24, alignItems: "center", gap: 6 },
  cityEmptyTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  cityEmptyText: { color: TEXT_3, fontSize: 12, textAlign: "center", lineHeight: 18 },

  familySub: {
    color: TEXT_3, fontSize: 12, marginTop: -8, marginBottom: 12,
    fontStyle: "italic", flex: 1, paddingRight: 8,
  },
  familySubRow: {
    flexDirection: "row", alignItems: "flex-start", marginBottom: 4,
  },
  familyInfoBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: SURFACE_2, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4, marginTop: -6,
  },
  familyInfoBtnText: { color: GOLD, fontSize: 11, fontWeight: "700" },

  incomeRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 10,
  },
  incomeIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: SURFACE_2, alignItems: "center", justifyContent: "center",
    marginRight: 12,
  },
  incomeLabel: { color: TEXT, fontSize: 15, fontWeight: "700" },
  incomeMeta: { color: TEXT_3, fontSize: 11, marginTop: 2 },
  incomeNet: { color: GOLD, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  incomeMetaSmall: { color: TEXT_3, fontSize: 10, marginTop: 2 },
  familyTotalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER,
  },
  familyTotalLabel: { color: TEXT_2, fontSize: 12, fontWeight: "600" },
  familyTotalValue: { fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
  fieldDeleteBtn: {
    width: 28, height: 28, borderRadius: 14, alignItems: "center",
    justifyContent: "center", marginLeft: 6,
  },

  adviceCard: {
    backgroundColor: SURFACE, borderRadius: 12, borderLeftWidth: 4,
    borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 10,
  },
  adviceHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  adviceTitle: { fontSize: 14, fontWeight: "800" },
  adviceMessage: { color: TEXT_2, fontSize: 13, lineHeight: 19 },

  exportBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 16,
  },
  exportBtnPrimary: { backgroundColor: GOLD },
  exportBtnTextDark: { color: "#000", fontSize: 14, fontWeight: "800" },

  previewBox: {
    backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 16, marginVertical: 14, alignItems: "center",
  },
  previewLabel: {
    color: TEXT_3, fontSize: 11, letterSpacing: 1.2,
    textTransform: "uppercase", fontWeight: "700", marginBottom: 6,
  },
  previewValue: { color: GOLD, fontSize: 26, fontWeight: "800" },

  primaryBtn: {
    backgroundColor: GOLD, borderRadius: 24, paddingVertical: 16,
    alignItems: "center", marginTop: 6,
  },
  primaryBtnText: { color: "#000", fontWeight: "800", fontSize: 15 },

  confirmBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  confirmBox: {
    width: "100%", maxWidth: 380, backgroundColor: "#141416",
    borderRadius: 20, padding: 22, borderWidth: 1, borderColor: BORDER,
  },
  confirmTitle: { color: TEXT, fontSize: 18, fontWeight: "800", marginBottom: 8 },
  confirmMessage: { color: TEXT_2, fontSize: 14, lineHeight: 20 },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  confirmCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, alignItems: "center", backgroundColor: "transparent",
  },
  confirmCancelText: { color: TEXT_2, fontWeight: "600", fontSize: 14 },
  confirmOkBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    alignItems: "center", backgroundColor: GOLD, marginTop: 10,
  },
  confirmOkText: { color: "#000", fontWeight: "800", fontSize: 14 },

  dropdownBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  dropdownSheet: {
    width: "100%", maxWidth: 380, backgroundColor: "#141416",
    borderRadius: 20, padding: 18, borderWidth: 1, borderColor: BORDER,
  },
  dropdownTitle: {
    color: TEXT_3, fontSize: 11, fontWeight: "700", letterSpacing: 1.2,
    textTransform: "uppercase", marginBottom: 12, paddingHorizontal: 4,
  },
  dropdownItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12,
    marginBottom: 4,
  },
  dropdownItemActive: { backgroundColor: SURFACE_2 },
  dropdownItemText: { color: TEXT, fontSize: 15, fontWeight: "600" },
  dropdownItemTextActive: { color: GOLD, fontWeight: "800" },
  dropdownItemHint: { color: TEXT_3, fontSize: 12, marginTop: 2 },

  sheetFooter: {
    paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4,
  },

  infoCloseBtn: {
    paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: GOLD, marginTop: 18,
  },
  infoCloseText: { color: "#000", fontWeight: "800", fontSize: 14 },

  variableDistribBox: {
    backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 14,
  },
  variableDistribLabel: {
    color: TEXT_3, fontSize: 11, letterSpacing: 1,
    textTransform: "uppercase", fontWeight: "700", marginBottom: 10,
  },
  distribPill: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE_2,
  },
  distribPillActive: { backgroundColor: GOLD, borderColor: GOLD },
  distribPillText: { color: TEXT_2, fontSize: 12, fontWeight: "600" },
  distribPillTextActive: { color: "#000", fontWeight: "800" },
});
