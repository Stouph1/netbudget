import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Keyboard,
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
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as StoreReview from "expo-store-review";
import * as Application from "expo-application";
import { checkForUpdate, type UpdateInfo } from "../src/utils/appUpdate";
import { remainingParts } from "../src/utils/loanSchedule";
import LoanScheduleModal from "../src/components/LoanScheduleModal";
import PremiumHomePanel from "../src/components/PremiumHomePanel";
import EventsPanel, { eventNeedsAttention } from "../src/components/EventsPanel";
import { useSession } from "../src/contexts/SessionContext";
import { deleteAccount } from "../src/lib/auth";
import { notify } from "../src/utils/notify";
import BirthdayCelebration from "../src/components/BirthdayCelebration";
import { TierUnlock } from "../src/components/TierUnlock";
import { useTierUnlock } from "../src/hooks/useTierUnlock";
import { useIsTester } from "../src/hooks/useIsTester";
import { useTesterConsent } from "../src/hooks/useTesterConsent";
import { TesterConsent } from "../src/components/TesterConsent";
import { limitsFor, type Tier } from "../src/lib/entitlements";
import { loadTier, refreshTier } from "../src/lib/tier";
import {
  onTierOverrideChange,
  setTierOverride,
  tierOverride,
} from "../src/lib/tierOverride";
import { useTourRunner } from "../src/hooks/useTourRunner";
import { useWhatsNew } from "../src/hooks/useWhatsNew";
import { WhatsNewSheet } from "../src/components/WhatsNewSheet";
import { TourOverlay } from "../src/components/tour/TourOverlay";
import { useTour } from "../src/components/tour/TourContext";
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
} from "../src/lib/adviceEngine";
import {
  addSavedAdvice,
  loadCelebrations,
  loadAdviceProfile,
  loadEvents,
} from "../src/lib/premiumStore";
import { loadProfileDetails, updateGiving } from "../src/lib/profile";
import type { UserProfile } from "../src/types/advice";
import {
  ensureMonthlyRemindersScheduled,
  getMonthlyEnabled,
  pickMonthlyVariants,
  setMonthlyReminderEnabled,
  setupNotificationHandler,
} from "../src/utils/notifications";
import { CITIES, City } from "../src/constants/cities";
import { parseNumber } from "../src/utils/finance";
import {
  CurrencyCode,
  DEFAULT_CURRENCY,
  formatCurrency,
  getCurrency,
} from "../src/utils/currency";
import { interpolate } from "../src/utils/advice";
import {
  getRates,
  convert,
  isFresh,
} from "../src/utils/exchangeRates";
import {
  Lang,
  DEFAULT_LANG,
  t as tr,
} from "../src/i18n/translations";
import { generatePdfHtml, PdfData } from "../src/utils/pdf";
import {
  IncomeSource,
  IncomeType,
  ProStatus,
  STATUS_DEFAULT_CHARGES,
  TYPE_DEFAULT_CHARGES,
  defaultIncomeSource,
} from "../src/utils/income";
import { loadState, saveState } from "../src/utils/storage";

import {
  DEFAULT_ITEMS,
  FAMILY_PALETTE,
  TAB_ORDER,
} from "./_budget/constants";
import type {
  ConfirmState,
  ExpenseFamily,
  ExpenseItem,
  Loan,
  Tab,
} from "./_budget/types";
import {
  backfillItemLabels,
  convertOne,
  isoToMonthInput,
  loanMonthlyPayment,
} from "./_budget/helpers";
import { SCREEN_H, styles } from "./_budget/styles";
import SettingsScreen from "./_budget/SettingsScreen";
import ConverterScreen from "./_budget/ConverterScreen";
import TabBar from "./_budget/TabBar";
import BudgetScreen from "./_budget/BudgetScreen";
import { useConverter } from "./_budget/useConverter";
import { useBudgetPersistence } from "./_budget/useBudgetPersistence";
import { useBudgetTotals } from "./_budget/useBudgetTotals";
import {
  filterCitiesInCountry,
  filterCountries,
  resolveProfileCity,
  suggestCitiesGlobally,
} from "./_budget/citySearch";
import CurrencySheetModal from "./_budget/modals/CurrencySheetModal";
import LanguageSheetModal from "./_budget/modals/LanguageSheetModal";
import CityPickerModal from "./_budget/modals/CityPickerModal";
import CityInfoModal from "./_budget/modals/CityInfoModal";
import RatioInfoModal from "./_budget/modals/RatioInfoModal";
import IncomeModal from "./_budget/modals/IncomeModal";
import AddItemModal from "./_budget/modals/AddItemModal";
import LoanModal from "./_budget/modals/LoanModal";
import ConfirmModal from "./_budget/modals/ConfirmModal";
import UpdateModal from "./_budget/modals/UpdateModal";


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

  // Navigation par onglet (bottom tabs) — cf. TAB_ORDER dans _budget/constants.
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

  // Convertisseur de devise (tranche autonome — cf. _budget/useConverter)
  const {
    convFrom,
    setConvFrom,
    convTo,
    setConvTo,
    convAmount,
    setConvAmount,
    rates,
    ratesLoading,
    convPickerFor,
    setConvPickerFor,
    convHistory,
    setConvHistory,
    convResult,
    swapConv,
    restoreHistory,
    refreshRates,
  } = useConverter(tab);

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
        notify(
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
  // Prénom du profil, pour ne pas faire ressaisir au testeur ce qu'on sait
  // déjà. Il reste modifiable : c'est son nom complet qu'on lui demande.
  const [premiumProfileName, setPremiumProfileName] = useState<string | null>(null);
  // Palier réel, utilisé par l'écran d'approbation pour nommer la formule
  // testée dans le texte du contrat.
  const [testerTier, setTesterTier] = useState<Tier>("free");
  // Palier forcé pour les tests. Lu au montage : le réglage survit à un
  // redémarrage, sinon on le repose à chaque essai.
  const [forcedTier, setForcedTier] = useState<Tier | null>(null);
  useEffect(() => {
    return onTierOverrideChange(() => setForcedTier(tierOverride()));
  }, []);
  // Ville libre saisie dans le profil (« Rouen »), à faire correspondre au
  // référentiel de villes pour l'indice de coût de la vie.
  const [profileCity, setProfileCity] = useState<string | null>(null);
  // Points rouges de la tab bar : un signal par onglet (événement en retard /
  // J-7 sous-financé sur Événements, fête d'anniversaire prête sur Profil).
  const [tabBadges, setTabBadges] = useState<Partial<Record<Tab, boolean>>>({});
  // Anniversaire : cartes de célébration (une fois par an, le jour J)
  const [bdayCards, setBdayCards] = useState<BirthdayCard[] | null>(null);
  const [bdayOpen, setBdayOpen] = useState(false);
  const tierUnlock = useTierUnlock();
  const isTester = useIsTester();
  // L'approbation du contrat passe AVANT tout le reste : avant la fête, avant
  // les nouveautés, avant la visite. Un testeur qui commence à utiliser l'app
  // avant d'avoir approuvé, c'est un test mené sans accord.
  const consent = useTesterConsent({ isTester });
  // Ordre de priorité entre les trois plein-écrans possibles au lancement :
  // la fête d'abord (elle répond à « mon paiement a-t-il marché ? »), les
  // nouveautés ensuite, la visite guidée en dernier.
  const whatsNew = useWhatsNew({
    blocked: consent.needed || tierUnlock.visible || bdayOpen,
  });
  // La visite attend que la fête de déverrouillage soit passée : deux
  // plein-écrans empilés, c'est quelqu'un qui ferme les deux sans lire.
  // La visite guidée a besoin de savoir quel onglet est RÉELLEMENT affiché :
  // elle attend d'y être avant de mesurer sa cible, au lieu de parier sur un
  // délai. Sans ça, le projecteur se posait au bon endroit du mauvais écran.
  const { setActiveTab } = useTour();
  useEffect(() => {
    setActiveTab(tab);
  }, [tab, setActiveTab]);

  const tour = useTourRunner({
    blocked: consent.needed || tierUnlock.visible || bdayOpen || whatsNew.visible,
    // La visite ouvre elle-même l'onglet dont elle parle.
    onNavigate: (next) => {
      if ((TAB_ORDER as string[]).includes(next)) setTab(next as Tab);
    },
  });
  // Source du dépôt pour la fête en cours : "birthday" | "child:Nom" | "pet:Nom"
  const [bdaySource, setBdaySource] = useState("birthday");
  // Dons & cadeaux : part des revenus réservée (dons, dîme, zakat, soutien
  // familial). 0 = inactif. Avec un compte, la valeur vient du profil ; sans
  // compte, du stockage local. Modifiable depuis les Réglages dans les deux cas.
  const [tithePercent, setTithePercent] = useState(0);
  const setGiving = useCallback(
    async (enabled: boolean, percent: number) => {
      const pct = enabled ? Math.min(100, Math.max(0, percent)) : 0;
      setTithePercent(pct); // optimiste : le budget se recalcule tout de suite
      if (premiumUser?.id) {
        const r = await updateGiving(premiumUser.id, enabled, enabled ? percent : 0);
        if (!r.ok) notify(t("signup.giving.title"), r.error ?? t("signup.giving.pctError"));
      }
      // Toujours en local aussi : l'app doit retrouver le réglage hors ligne,
      // et un utilisateur sans compte n'a que ça.
      const stored = await loadState();
      await saveState({ ...(stored ?? {}), titheEnabled: enabled, tithePercent: percent });
    },
    [premiumUser?.id, t],
  );
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
    //
    // RÉSERVÉ À LA FORMULE FAMILLE. C'est la seule fonctionnalité de l'app qui
    // suive plusieurs personnes d'un même foyer, avec leurs dates et leurs
    // âges : elle appartient à la formule qui décrit un foyer.
    //
    // On coupe AUSSI la notification programmée, pas seulement l'écran : une
    // fête qui ne s'ouvre pas mais dont on reçoit l'annonce la veille est un
    // rappel de ce qu'on n'a pas.
    const tier = await loadTier();
    setTesterTier(tier);
    setPremiumProfileName(details.first_name ?? null);
    const birthdaysOpen = limitsFor(tier).birthdays;
    const year = new Date().getFullYear();
    let opened = false;
    if (birthdaysOpen && details.birthdate) {
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
    if (birthdaysOpen && !opened && premiumUser?.id) {
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
  /**
   * Rejoue une fête d'anniversaire, pour la phase de test.
   *
   * Elle ne se déclenche autrement qu'un seul jour par an et par personne :
   * sans ce raccourci, un testeur ne pourrait tout simplement pas la voir, et
   * on découvrirait ses défauts en production, un 14 mars, chez un client.
   *
   * On utilise les VRAIES données quand elles existent — le prénom du profil,
   * la date de l'enfant — et un jeu de secours sinon. Une fête de test remplie
   * de « Prénom » ne dirait rien du rendu réel.
   */
  const replayBirthday = useCallback(
    async (kind: "self" | "child" | "pet") => {
      if (!premiumUser?.id) return;
      const perso = await loadAdviceProfile(premiumUser.id, null);
      const details = await loadProfileDetails(premiumUser.id).catch(() => null);
      const celebs = await loadCelebrations(premiumUser.id).catch(() => []);

      if (kind === "self") {
        const age = details?.birthdate ? computeAge(new Date(details.birthdate)) : 30;
        setBdaySource("birthday");
        setBdayCards(buildBirthdayCards(age, details?.first_name ?? "", perso, adviceI18n));
      } else if (kind === "child") {
        const child = celebs.find((c) => c.kind === "child");
        const age = child ? computeAge(new Date(child.birthdate)) : 8;
        setBdaySource(`child:${child?.name ?? ""}`);
        setBdayCards(buildChildBirthdayCards(age, child?.name ?? "", perso, adviceI18n));
      } else {
        const pet = celebs.find((c) => c.kind !== "child");
        setBdaySource(`pet:${pet?.name ?? ""}`);
        setBdayCards(buildPetBirthdayCards(pet?.name ?? "", pet?.species ?? "other", adviceI18n));
      }
      setBdayOpen(true);
    },
    [premiumUser?.id, adviceI18n],
  );

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

  // Localisation : le PROFIL est la source de vérité dès qu'un compte existe
  // (règle de résolution ville → région → pays dans _budget/citySearch).
  const profileCityResolved = useMemo(
    () =>
      resolveProfileCity(
        !!premiumUser?.id,
        profileCity,
        premiumProfile?.region,
        premiumProfile?.country,
      ),
    [premiumUser?.id, profileCity, premiumProfile?.region, premiumProfile?.country],
  );

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
        // Sans compte, c'est la seule source des dons. Avec compte, le profil
        // écrasera cette valeur quand il aura répondu.
        if (stored.titheEnabled && typeof stored.tithePercent === "number") {
          setTithePercent(stored.tithePercent);
        }
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

  // ---- Dérivations chiffrées du budget (cf. _budget/useBudgetTotals) ----
  const {
    netMensuel,
    totalBrutAnnuel,
    monthlyTithe,
    brutMensuel,
    rentNum,
    loansMonthly,
    itemsByFamily,
    familyTotals,
    totalExpenses,
    monthlyExpenses,
    remaining,
    remainingColor,
    advice,
    segments,
    months,
    annualIncome,
    annualExpenses,
    annualRemaining,
    currentMonthIndex,
  } = useBudgetTotals({
    incomes,
    tithePercent,
    rent,
    loans,
    expenseItems,
    budgetRatio,
    t,
    lang,
  });

  const filteredCountries = useMemo(() => filterCountries(citySearch), [citySearch]);
  const globalCitySuggestions = useMemo(
    () => suggestCitiesGlobally(citySearch),
    [citySearch],
  );
  const filteredCities = useMemo(
    () => filterCitiesInCountry(citySearch, pickerCountry),
    [citySearch, pickerCountry],
  );

  // Persistance du budget : scope actif, sauvegarde, historique mensuel
  // (cf. _budget/useBudgetPersistence — l'hydratation initiale reste ci-dessus).
  const {
    budgetScope,
    budgetScopeTarget,
    budgetSwitcherOpen,
    setBudgetSwitcherOpen,
  } = useBudgetPersistence({
    hydrated,
    userId: premiumUser?.id,
    activeWorkspaceId,
    incomes,
    setIncomes,
    rent,
    setRent,
    expenseItems,
    setExpenseItems,
    loans,
    setLoans,
    city,
    currency,
    lang,
    netMensuel,
    monthlyExpenses,
    remaining,
    rentNum,
    loansMonthly,
    familyTotals,
    t,
  });

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
      notify(t("doc.ready.title"), interpolate(t("doc.ready.msg"), { uri }));
    }
  }

  async function exportPdf() {
    try {
      await shareGeneratedPdf(generatePdfHtml(buildPdfData()), "Mon budget NETbudget");
    } catch {
      notify(t("err.pdf.title"), t("err.pdf.msg"));
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
        <BudgetScreen
          t={t}
          fmt={fmt}
          currency={currency}
          city={city}
          budgetRatio={budgetRatio}
          premiumProfile={premiumProfile}
          adviceI18n={adviceI18n}
          showScopeBadge={!!premiumUser}
          activeWorkspaceId={activeWorkspaceId}
          resolvedScopeLabel={resolvedScopeLabel}
          scopeSwitching={budgetScope !== budgetScopeTarget}
          budgetSwitcherOpen={budgetSwitcherOpen}
          incomes={incomes}
          tithePercent={tithePercent}
          totalBrutAnnuel={totalBrutAnnuel}
          brutMensuel={brutMensuel}
          monthlyTithe={monthlyTithe}
          netMensuel={netMensuel}
          rent={rent}
          loans={loans}
          humanRemaining={humanRemaining}
          itemsByFamily={itemsByFamily}
          familyTotals={familyTotals}
          rentNum={rentNum}
          loansMonthly={loansMonthly}
          totalExpenses={totalExpenses}
          monthlyExpenses={monthlyExpenses}
          remaining={remaining}
          remainingColor={remainingColor}
          months={months}
          currentMonthIndex={currentMonthIndex}
          annualIncome={annualIncome}
          annualExpenses={annualExpenses}
          annualRemaining={annualRemaining}
          advice={advice}
          segments={segments}
          onBudgetScroll={onBudgetScroll}
          onOpenRuleInfo={() => setRuleInfoOpen(true)}
          onOpenBudgetSwitcher={() => setBudgetSwitcherOpen(true)}
          onCloseBudgetSwitcher={() => setBudgetSwitcherOpen(false)}
          onAddIncome={openAddIncome}
          onEditIncome={openEditIncome}
          onDeleteIncome={askDeleteIncome}
          onRentChange={setRent}
          onAddLoan={openAddLoan}
          onEditLoan={openEditLoan}
          onDeleteLoan={askDeleteLoan}
          onOpenSchedule={setScheduleLoan}
          onAddItem={openAddItem}
          onItemAmountChange={updateItemAmount}
          onItemLabelChange={updateItemLabel}
          onDeleteItem={deleteItem}
          onExportPdf={exportPdf}
        />
        </View>

        {/* ====== Converter tab (Google Translate style) ====== */}
        <View style={{ width: screenW, position: "absolute", left: screenW * 3, top: 0, bottom: 0 }}>
          <ConverterScreen
            convFrom={convFrom}
            convTo={convTo}
            convAmount={convAmount}
            convResult={convResult}
            rates={rates}
            ratesLoading={ratesLoading}
            convHistory={convHistory}
            t={t}
            onAmountChange={setConvAmount}
            onOpenPicker={setConvPickerFor}
            onSwap={swapConv}
            onRefreshRates={() => refreshRates(true)}
            onRestoreHistory={restoreHistory}
            onClearHistory={() => setConvHistory([])}
          />
        </View>

        {/* ====== Settings tab ====== */}
        <View style={{ width: screenW, position: "absolute", left: 0, top: 0, bottom: 0 }}>
          <SettingsScreen
            currency={currency}
            lang={lang}
            city={city}
            monthlyReminder={monthlyReminder}
            tithePercent={tithePercent}
            onChangeGiving={(enabled, pct) => void setGiving(enabled, pct)}
            locationFromProfile={!!premiumUser?.id}
            canDeleteAccount={!!premiumUser}
            t={t}
            onOpenCurrencyPicker={() => setCurrencyPickerOpen(true)}
            onOpenLangPicker={() => setLangPickerOpen(true)}
            onOpenCityPicker={() => {
              setPickerCountry(city.countryCode);
              setPickerStep("country");
              setCitySearch("");
              setCityPickerOpen(true);
            }}
            onOpenCityInfo={() => setCityInfoOpen(true)}
            onToggleMonthlyReminder={toggleMonthlyReminder}
            onResetAll={askResetAll}
            onDeleteAccount={askDeleteAccount}
            onReplayTour={() => void tour.replay()}
            isTester={isTester}
            onReplayBirthday={(kind) => void replayBirthday(kind)}
            forcedTier={forcedTier}
            onForceTier={(tier) => {
              void setTierOverride(tier).then(() => {
                setForcedTier(tier);
                // On rediffuse le palier : les écrans déjà montés (pastille,
                // gardes, tuiles) se remettent à jour sans relancer l'app.
                // Un palier forcé est écrit localement : aucun webhook à attendre, une
                // seule lecture suffit.
                void refreshTier(undefined, 1);
                reloadPremiumProfile();
              });
            }}
          />
        </View>

        {/* ====== Premium / Profil tab (style Instagram : tout à droite) ====== */}
        <View style={{ width: screenW, position: "absolute", left: screenW * 4, top: 0, bottom: 0 }}>
          <View style={[styles.header, { paddingHorizontal: 20 }]}>
            <View>
              <Text style={styles.eyebrow}>{t("tab.premium")}</Text>
              <Text style={styles.title}>NETbudget</Text>
            </View>
          </View>
          <PremiumHomePanel onGoBudget={() => setTab("budget")} />
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
      <CurrencySheetModal
        visible={convPickerFor !== null}
        title={`${convPickerFor === "from" ? t("converter.from") : t("converter.to")} · ${t("modal.chooseCurrency")}`}
        selected={convPickerFor === "from" ? convFrom : convTo}
        sheetHeight={sheetHeight}
        closeTestID="close-conv-picker"
        optionTestIDPrefix="conv-currency-"
        onSelect={(code) => {
          if (convPickerFor === "from") setConvFrom(code);
          else setConvTo(code);
          setConvPickerFor(null);
        }}
        onClose={() => setConvPickerFor(null)}
      />

      {/* Language Picker Modal */}
      <LanguageSheetModal
        visible={langPickerOpen}
        lang={lang}
        sheetHeight={sheetHeight}
        t={t}
        onSelect={(next) => {
          setLang(next);
          setLangPickerOpen(false);
        }}
        onClose={() => setLangPickerOpen(false)}
      />

      {/* Currency Picker Modal */}
      <CurrencySheetModal
        visible={currencyPickerOpen}
        title={t("modal.chooseCurrency")}
        selected={currency}
        sheetHeight={sheetHeight}
        closeTestID="close-currency-picker"
        optionTestIDPrefix="currency-option-"
        onSelect={(code) => {
          setCurrencyPickerOpen(false);
          void changeCurrency(code);
        }}
        onClose={() => setCurrencyPickerOpen(false)}
      />

      {/* Déverrouillage d'abonnement : une seule fois par palier atteint.
          Monté ici, sur l'écran d'accueil, parce que c'est là qu'on revient
          après l'achat — et parce qu'il doit passer AVANT tout le reste. */}
      {tierUnlock.tier ? (
        <TierUnlock
          tier={tierUnlock.tier}
          visible={tierUnlock.visible}
          onClose={() => void tierUnlock.dismiss()}
        />
      ) : null}

      <TesterConsent
        visible={consent.needed}
        tier={testerTier}
        defaultName={premiumProfileName}
        busy={consent.busy}
        onAccept={(name) => void consent.submit(name, true)}
        onDecline={() => void consent.submit("", false)}
      />

      <WhatsNewSheet
        visible={whatsNew.visible}
        version={whatsNew.version}
        onClose={() => void whatsNew.dismiss()}
      />

      {/* Visite guidée : posée en dernier pour passer au-dessus de la barre
          d'onglets, qui est justement ce qu'elle désigne. */}
      <TourOverlay />

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

      <TabBar
        tab={tab}
        tabBadges={tabBadges}
        swipeX={swipeX}
        screenW={screenW}
        bottomInset={insets.bottom}
        t={t}
        onSelectTab={setTab}
        onSlideToIndex={setTabFromIndex}
      />

      {/* City Picker Modal (2-step : pays → ville) */}
      <CityPickerModal
        visible={cityPickerOpen}
        city={city}
        pickerStep={pickerStep}
        pickerCountry={pickerCountry}
        citySearch={citySearch}
        filteredCountries={filteredCountries}
        globalCitySuggestions={globalCitySuggestions}
        filteredCities={filteredCities}
        sheetHeight={sheetHeight}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        t={t}
        onCitySearchChange={setCitySearch}
        onPickCountry={(code) => {
          setPickerCountry(code);
          setPickerStep("city");
          setCitySearch("");
        }}
        onBackToCountry={() => { setPickerStep("country"); setCitySearch(""); }}
        onPickCity={(next) => {
          setCity(next);
          setCityPickerOpen(false);
          setCitySearch("");
        }}
        onClose={() => setCityPickerOpen(false)}
      />

      {/* City Info Modal */}
      <CityInfoModal
        visible={cityInfoOpen}
        t={t}
        onClose={() => setCityInfoOpen(false)}
      />

      {/* Ratio budgétaire — Info Modal (personnalisée si Premium loggé) */}
      <RatioInfoModal
        visible={ruleInfoOpen}
        premiumProfile={premiumProfile}
        adviceI18n={adviceI18n}
        t={t}
        onClose={() => setRuleInfoOpen(false)}
      />

      {/* Income Source Modal (Add / Edit) */}
      <IncomeModal
        visible={incomeModalOpen}
        editingIncome={editingIncome}
        incomeForm={incomeForm}
        setIncomeForm={setIncomeForm}
        currency={currency}
        tithePercent={tithePercent}
        sheetHeight={sheetHeight}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        t={t}
        onChangeType={changeIncomeType}
        onChangeProStatus={changeIncomeProStatus}
        onSave={saveIncome}
        onClose={() => setIncomeModalOpen(false)}
      />

      {/* Add Custom Expense Item Modal */}
      <AddItemModal
        family={addItemFamily}
        newItemLabel={newItemLabel}
        newItemAmount={newItemAmount}
        currency={currency}
        sheetHeight={sheetHeight}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        t={t}
        onLabelChange={setNewItemLabel}
        onAmountChange={setNewItemAmount}
        onSave={saveNewItem}
        onClose={() => setAddItemFamily(null)}
      />

      {/* Loan Modal */}
      <LoanModal
        visible={loanModalOpen}
        editingLoan={editingLoan}
        form={form}
        setForm={setForm}
        loanStartText={loanStartText}
        setLoanStartText={setLoanStartText}
        currency={currency}
        sheetHeight={sheetHeight}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        t={t}
        fmt={fmt}
        humanRemaining={humanRemaining}
        onSave={saveLoan}
        onClose={() => setLoanModalOpen(false)}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        confirm={confirm}
        t={t}
        onCloseKeepingState={() => setConfirm({ ...confirm, open: false })}
      />

      {/* Modal : nouvelle version disponible sur l'App Store */}
      <UpdateModal
        updateInfo={updateInfo}
        t={t}
        onDismiss={() => setUpdateInfo(null)}
      />
    </SafeAreaView>
  );
}







