import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import DonutChart, { DonutSegment } from "../src/components/DonutChart";
import MonthlyBreakdown, { MonthRow } from "../src/components/MonthlyBreakdown";
import { CITIES, City, INDEX_EXPLANATION } from "../src/constants/cities";
import {
  computeLoanMonthlyPayment,
  formatEuro,
  normalizeText,
  parseNumber,
} from "../src/utils/finance";
import { buildAdvice, AdviceItem } from "../src/utils/advice";
import { generatePdfHtml, generateShareCardHtml, PdfData } from "../src/utils/pdf";
import {
  IncomeSource,
  IncomeType,
  ProStatus,
  STATUS_LABEL,
  STATUS_DEFAULT_CHARGES,
  TYPE_LABEL,
  TYPE_ICON,
  TYPE_DEFAULT_CHARGES,
  TYPE_HINT,
  averageMonthlyNet,
  annualGross,
  monthlyNetSeries,
  defaultIncomeSource,
} from "../src/utils/income";
import { loadState, saveState } from "../src/utils/storage";

const MONTHS_LONG = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const MONTHS_SHORT = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
];

type Loan = {
  id: string;
  name: string;
  principal: string;
  ratePercent: string;
  years: string;
};

type ExpenseFamily = "besoins" | "loisirs" | "epargne";

type ExpenseItem = {
  id: string;
  family: ExpenseFamily;
  label: string;
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
  { id: "alimentation", family: "besoins", label: "Alimentation", icon: "shopping-cart", color: "#10B981", amount: "0" },
  { id: "transport", family: "besoins", label: "Transport", icon: "navigation", color: "#F59E0B", amount: "0" },
  { id: "sante", family: "besoins", label: "Santé / Mutuelle", icon: "heart", color: "#06B6D4", amount: "0" },
  { id: "energie", family: "besoins", label: "Énergie", icon: "zap", color: "#F97316", amount: "0" },
  { id: "eau", family: "besoins", label: "Eau", icon: "droplet", color: "#38BDF8", amount: "0" },
  { id: "abonnements", family: "besoins", label: "Abonnements (essentiels)", icon: "wifi", color: "#EC4899", amount: "0" },
  { id: "sorties", family: "loisirs", label: "Sorties / Restos", icon: "coffee", color: "#A855F7", amount: "0" },
  { id: "vacances", family: "loisirs", label: "Vacances", icon: "sun", color: "#C084FC", amount: "0" },
  { id: "streaming", family: "loisirs", label: "Streaming / Hobbies", icon: "play", color: "#D946EF", amount: "0" },
  { id: "livret", family: "epargne", label: "Livret A / LDDS", icon: "save", color: "#F59E0B", amount: "0" },
  { id: "pea", family: "epargne", label: "PEA", icon: "bar-chart-2", color: "#FBBF24", amount: "0" },
  { id: "cto", family: "epargne", label: "CTO", icon: "trending-up", color: "#FDE047", amount: "0" },
  { id: "av", family: "epargne", label: "Assurance vie", icon: "file-text", color: "#FCD34D", amount: "0" },
];

const FAMILY_PALETTE: Record<ExpenseFamily, string[]> = {
  besoins: ["#10B981", "#06B6D4", "#3B82F6", "#F97316", "#EC4899"],
  loisirs: ["#A855F7", "#C084FC", "#D946EF", "#8B5CF6", "#E879F9"],
  epargne: ["#F59E0B", "#FBBF24", "#FCD34D", "#FDE047", "#EAB308"],
};

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
};

export default function Index() {
  // Revenus
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Hydratation depuis AsyncStorage au démarrage
  const [hydrated, setHydrated] = useState(false);

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

  // Modal d'ajout d'une catégorie custom
  const [addItemFamily, setAddItemFamily] = useState<ExpenseFamily | null>(null);
  const [newItemLabel, setNewItemLabel] = useState<string>("");
  const [newItemAmount, setNewItemAmount] = useState<string>("0");

  // Ville
  const [city, setCity] = useState<City>(CITIES[0]);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [cityInfoOpen, setCityInfoOpen] = useState(false);

  // Prêts
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [form, setForm] = useState<Loan>({
    id: "", name: "", principal: "0", ratePercent: "0", years: "0",
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
          setExpenseItems(stored.expenseItems as ExpenseItem[]);
        }
        if (Array.isArray(stored.loans)) setLoans(stored.loans as Loan[]);
        if (stored.cityId) {
          const found = CITIES.find((c) => c.id === stored.cityId);
          if (found) setCity(found);
        }
      }
      setHydrated(true);
    })();
  }, []);

  // ---- Calculs revenus (multi-sources) ----
  const netSeries = useMemo(() => monthlyNetSeries(incomes), [incomes]);
  const netMensuel = useMemo(() => averageMonthlyNet(incomes), [incomes]);
  const totalBrutAnnuel = useMemo(() => annualGross(incomes), [incomes]);
  const netAnnuel = netMensuel * 12;
  const brutMensuel = totalBrutAnnuel / 12;

  const rentNum = parseNumber(rent);

  const loansMonthly = useMemo(
    () =>
      loans.reduce(
        (s, l) =>
          s +
          computeLoanMonthlyPayment(
            parseNumber(l.principal),
            parseNumber(l.ratePercent),
            parseNumber(l.years)
          ),
        0
      ),
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
      }),
    [netMensuel, rentNum, loansMonthly, familyTotals, remaining]
  );

  // Donut
  const segments: DonutSegment[] = useMemo(() => {
    const segs: DonutSegment[] = [];
    if (rentNum > 0) segs.push({ label: "Loyer", value: rentNum, color: COLOR_LOYER });
    if (loansMonthly > 0) segs.push({ label: "Prêts", value: loansMonthly, color: COLOR_PRETS });
    for (const it of expenseItems) {
      const v = parseNumber(it.amount);
      if (v > 0) segs.push({ label: it.label, value: v, color: it.color });
    }
    segs.push({ label: "Reste à vivre", value: remaining > 0 ? remaining : 0, color: GOLD });
    return segs;
  }, [rentNum, loansMonthly, expenseItems, remaining]);

  // Projection mensuelle : utilise directement la série de nets calculée par income.ts
  const months: MonthRow[] = useMemo(
    () =>
      netSeries.map((income, i) => ({
        index: i,
        name: MONTHS_LONG[i],
        shortName: MONTHS_SHORT[i],
        income,
        expenses: monthlyExpenses,
        remaining: income - monthlyExpenses,
      })),
    [netSeries, monthlyExpenses]
  );
  const annualIncome = months.reduce((s, m) => s + m.income, 0);
  const annualExpenses = monthlyExpenses * 12;
  const annualRemaining = annualIncome - annualExpenses;
  const currentMonthIndex = new Date().getMonth();

  const filteredCities = useMemo(() => {
    const q = normalizeText(citySearch);
    if (!q) return CITIES;
    return CITIES.filter((c) => {
      const haystack = normalizeText(`${c.name} ${c.region}`);
      return haystack.includes(q);
    });
  }, [citySearch]);

  // ----- Persistance : sauvegarde à chaque changement (après hydratation) -----
  useEffect(() => {
    if (!hydrated) return;
    saveState({
      incomes,
      rent,
      expenseItems,
      loans,
      cityId: city.id,
    });
  }, [hydrated, incomes, rent, expenseItems, loans, city]);

  function openAddLoan() {
    setEditingLoan(null);
    setForm({ id: "", name: "", principal: "0", ratePercent: "0", years: "0" });
    setLoanModalOpen(true);
  }
  function openEditLoan(loan: Loan) {
    setEditingLoan(loan);
    setForm(loan);
    setLoanModalOpen(true);
  }
  function saveLoan() {
    const principal = parseNumber(form.principal);
    const years = parseNumber(form.years);
    if (principal <= 0 || years <= 0) {
      setConfirm({
        open: true,
        title: "Informations incomplètes",
        message: "Renseignez au minimum le montant emprunté et la durée en années.",
        confirmLabel: "OK",
        onConfirm: () => {},
      });
      return;
    }
    if (editingLoan) {
      setLoans((ls) =>
        ls.map((l) => (l.id === editingLoan.id ? { ...form, id: editingLoan.id } : l))
      );
    } else {
      const id = Date.now().toString();
      setLoans((ls) => [...ls, { ...form, id, name: form.name || "Prêt" }]);
    }
    setLoanModalOpen(false);
  }
  function askDeleteLoan(id: string) {
    setConfirm({
      open: true,
      title: "Supprimer ce prêt ?",
      message: "Cette action est définitive.",
      danger: true,
      confirmLabel: "Supprimer",
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
        title: "Montant requis",
        message: "Indique un montant supérieur à 0.",
        confirmLabel: "OK",
        onConfirm: () => {},
      });
      return;
    }
    const final: IncomeSource = {
      ...incomeForm,
      label: incomeForm.label.trim() || TYPE_LABEL[incomeForm.type],
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
      title: "Supprimer cette source ?",
      message: "Tu pourras la rajouter plus tard.",
      danger: true,
      confirmLabel: "Supprimer",
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
      prev.map((it) => (it.id === id ? { ...it, label } : it))
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
        title: "Nom requis",
        message: "Donne un nom à ta nouvelle catégorie.",
        confirmLabel: "OK",
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
      Alert.alert("Document prêt", `Fichier généré : ${uri}`);
    }
  }

  async function exportPdf() {
    try {
      await shareGeneratedPdf(generatePdfHtml(buildPdfData()), "Mon budget NETbudget");
    } catch {
      Alert.alert("Erreur", "Impossible de générer le PDF.");
    }
  }

  async function shareCard() {
    try {
      await shareGeneratedPdf(
        generateShareCardHtml(buildPdfData()),
        "Ma carte budget NETbudget"
      );
    } catch {
      Alert.alert("Erreur", "Impossible de générer la carte.");
    }
  }

  async function shareSummary() {
    const lines = [
      `💸 Mon budget NETbudget — ${city.name}`,
      ``,
      `Net mensuel estimé : ${formatEuro(netMensuel)}`,
      `Loyer : ${formatEuro(rentNum)}`,
      `Prêts : ${formatEuro(loansMonthly)}`,
      `Besoins : ${formatEuro(familyTotals.besoins)}`,
      `Loisirs : ${formatEuro(familyTotals.loisirs)}`,
      `Épargne : ${formatEuro(familyTotals.epargne)}`,
      ``,
      `➡️ Reste à vivre : ${formatEuro(remaining)}`,
      ``,
      `Calculé avec NETbudget · règle 50/30/20`,
    ];
    try {
      await Share.share({ message: lines.join("\n") });
    } catch {
      // user cancelled, ignore
    }
  }

  function askResetAll() {
    setConfirm({
      open: true,
      title: "Réinitialiser ?",
      message: "Toutes les données saisies seront effacées.",
      danger: true,
      confirmLabel: "Réinitialiser",
      onConfirm: () => {
        setIncomes([defaultIncomeSource()]);
        setRent("0");
        setExpenseItems(DEFAULT_ITEMS.map((it) => ({ ...it })));
        setLoans([]);
        setCity(CITIES[0]);
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Budget France</Text>
              <Text style={styles.title}>NETbudget</Text>
            </View>
            <TouchableOpacity onPress={askResetAll} style={styles.resetBtn} testID="reset-button">
              <Feather name="refresh-ccw" size={16} color={TEXT_2} />
            </TouchableOpacity>
          </View>

          {/* Résumé rapide en haut */}
          <View style={styles.topSummary} testID="top-summary">
            <View style={styles.topSummaryRow}>
              <View style={styles.topSummaryBlock}>
                <Text style={styles.topSummaryLabel}>Net mensuel</Text>
                <Text style={styles.topSummaryValue}>{formatEuro(netMensuel)}</Text>
              </View>
              <View style={styles.topSummaryDivider} />
              <View style={styles.topSummaryBlock}>
                <Text style={styles.topSummaryLabel}>Dépenses</Text>
                <Text style={[styles.topSummaryValue, { color: TEXT_2 }]}>
                  {formatEuro(monthlyExpenses)}
                </Text>
              </View>
              <View style={styles.topSummaryDivider} />
              <View style={styles.topSummaryBlock}>
                <Text style={styles.topSummaryLabel}>Reste à vivre</Text>
                <Text style={[styles.topSummaryValue, { color: remainingColor }]} testID="top-reste-value">
                  {formatEuro(remaining)}
                </Text>
              </View>
            </View>
          </View>

          {/* Revenus — multi-sources */}
          <Section
            title="Revenus"
            action={
              <TouchableOpacity
                onPress={openAddIncome}
                style={styles.addBtn}
                testID="add-income-button"
                activeOpacity={0.85}
              >
                <Feather name="plus" size={16} color="#000" />
                <Text style={styles.addBtnText}>Ajouter</Text>
              </TouchableOpacity>
            }
          >
            <Text style={styles.familySub}>
              Salaire, freelance, locatif, dividendes… chacun avec son propre taux de charges.
            </Text>
            {incomes.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="briefcase" size={22} color={TEXT_3} />
                <Text style={styles.emptyTitle}>Aucun revenu</Text>
                <Text style={styles.emptyText}>
                  Ajoute ton salaire ou une autre source pour démarrer.
                </Text>
              </View>
            ) : (
              incomes.map((src) => {
                const monthly = averageMonthlyNet([src]);
                const freqLabel =
                  src.frequency === "monthly"
                    ? "Mensuel"
                    : src.frequency === "annual"
                      ? "Annuel"
                      : `Versé en ${MONTHS_SHORT[src.variableMonth ?? 0]}`;
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
                      <Text style={styles.incomeLabel}>{src.label || TYPE_LABEL[src.type]}</Text>
                      <Text style={styles.incomeMeta}>
                        {TYPE_LABEL[src.type]} · {freqLabel} · {parseNumber(src.chargesPercent)} % charges
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.incomeNet}>{formatEuro(monthly)}</Text>
                      <Text style={styles.incomeMetaSmall}>net / mois</Text>
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
                <Text style={styles.revenusLabel}>Total brut annuel</Text>
                <Text style={styles.revenusTotal} testID="total-brut-annuel">
                  {formatEuro(totalBrutAnnuel)}
                </Text>
              </View>
              <View style={styles.revenusRow}>
                <Text style={styles.revenusLabel}>Net mensuel estimé</Text>
                <Text style={[styles.revenusTotal, { color: GOLD }]} testID="net-mensuel-value">
                  {formatEuro(netMensuel)}
                </Text>
              </View>
              <View style={styles.revenusRow}>
                <Text style={styles.revenusLabel}>Brut mensuel moyen</Text>
                <Text style={styles.revenusTotalMuted}>{formatEuro(brutMensuel)}</Text>
              </View>
            </View>
          </Section>

          {/* Ville */}
          <Section title="Localisation">
            <TouchableOpacity
              style={styles.inputWrap}
              onPress={() => setCityPickerOpen(true)}
              testID="city-picker-button"
              activeOpacity={0.8}
            >
              <View style={styles.inputIcon}>
                <Feather name="map-pin" size={18} color={city.theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Ville</Text>
                <Text style={styles.inputValue}>{city.name}</Text>
              </View>
              <View style={[styles.indexBadge, { borderColor: city.theme.accent, borderWidth: 1 }]}>
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
              <Text style={styles.infoRowText}>À quoi sert cet indice ?</Text>
            </TouchableOpacity>
          </Section>

          {/* Logement */}
          <Section title="Logement">
            <Field
              label="Loyer mensuel (charges comprises)"
              icon={<Feather name="home" size={18} color={COLOR_LOYER} />}
              right="€"
              value={rent}
              onChangeText={setRent}
              keyboardType="decimal-pad"
              placeholder="0"
              testID="rent-input"
            />
          </Section>

          {/* Prêts */}
          <Section
            title="Prêts bancaires"
            action={
              <TouchableOpacity
                onPress={openAddLoan}
                style={styles.addBtn}
                testID="add-loan-button"
                activeOpacity={0.8}
              >
                <Feather name="plus" size={16} color="#000" />
                <Text style={styles.addBtnText}>Ajouter</Text>
              </TouchableOpacity>
            }
          >
            {loans.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="credit-card" size={24} color={TEXT_3} />
                <Text style={styles.emptyTitle}>Aucun prêt</Text>
                <Text style={styles.emptyText}>
                  Ajoutez vos crédits (immobilier, auto, conso…) pour calculer la mensualité automatiquement.
                </Text>
              </View>
            ) : (
              loans.map((l) => {
                const m = computeLoanMonthlyPayment(
                  parseNumber(l.principal),
                  parseNumber(l.ratePercent),
                  parseNumber(l.years)
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
                      <Text style={styles.loanName}>{l.name || "Prêt"}</Text>
                      <Text style={styles.loanMeta}>
                        {formatEuro(parseNumber(l.principal))} · {l.ratePercent || "0"}% · {l.years || "0"} ans
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.loanAmount}>{formatEuro(m)}</Text>
                      <Text style={styles.loanMetaSmall}>/ mois</Text>
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
                title={meta.label}
                action={
                  <TouchableOpacity
                    onPress={() => openAddItem(family)}
                    style={[styles.addBtn, { backgroundColor: meta.color }]}
                    testID={`add-item-${family}`}
                    activeOpacity={0.85}
                  >
                    <Feather name="plus" size={16} color="#000" />
                    <Text style={styles.addBtnText}>Ajouter</Text>
                  </TouchableOpacity>
                }
              >
                <Text style={styles.familySub}>{meta.sub}</Text>
                {items.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Feather name={meta.icon} size={22} color={TEXT_3} />
                    <Text style={styles.emptyTitle}>Aucune entrée</Text>
                    <Text style={styles.emptyText}>
                      Ajoute une catégorie avec le bouton « Ajouter ».
                    </Text>
                  </View>
                ) : (
                  items.map((it) => (
                    <Field
                      key={it.id}
                      label={it.label}
                      icon={<Feather name={it.icon} size={18} color={it.color} />}
                      right="€"
                      value={it.amount}
                      onChangeText={(t) => updateItemAmount(it.id, t)}
                      onLabelChange={(t) => updateItemLabel(it.id, t)}
                      onDelete={() => deleteItem(it.id)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      testID={`expense-${it.id}`}
                    />
                  ))
                )}
                <View style={styles.familyTotalRow}>
                  <Text style={styles.familyTotalLabel}>Total {meta.label.toLowerCase()}</Text>
                  <Text style={[styles.familyTotalValue, { color: meta.color }]}>
                    {formatEuro(familyTotals[family])}
                  </Text>
                </View>
              </Section>
            );
          })}

          {/* Total général */}
          <View style={styles.expensesTotalRow}>
            <Text style={styles.expensesTotalLabel}>Total dépenses mensuelles</Text>
            <Text style={styles.expensesTotalValue} testID="expenses-total">
              {formatEuro(rentNum + loansMonthly + totalExpenses)}
            </Text>
          </View>

          {/* Budget mois par mois */}
          <Section title="Budget mois par mois">
            <Text style={styles.familySub}>
              La fréquence de chaque source de revenu (mensuel, annuel, mois précis) se règle dans la fiche de la source.
            </Text>
            <MonthlyBreakdown
              months={months}
              currentMonthIndex={currentMonthIndex}
              annualRemaining={annualRemaining}
              annualIncome={annualIncome}
              annualExpenses={annualExpenses}
            />
          </Section>

          {/* === Conseils 50/30/20 === */}
          <Section title="Conseils d'optimisation">
            <Text style={styles.familySub}>
              Basés sur la règle 50/30/20 (Besoins · Loisirs · Épargne)
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
                    <Text style={[styles.adviceTitle, { color: accent }]}>{a.title}</Text>
                  </View>
                  <Text style={styles.adviceMessage}>{a.message}</Text>
                </View>
              );
            })}
          </Section>

          {/* === Résultat : camembert à la fin === */}
          <Section title="Répartition">
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
                  centerLabel="Reste à vivre"
                  centerValue={formatEuro(remaining)}
                  centerValueColor={remainingColor}
                />
                <View style={styles.legendWrap}>
                  {segments.map((s) => (
                    <View key={s.label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                      <Text style={styles.legendText}>{s.label}</Text>
                      <Text style={styles.legendValue}>{formatEuro(s.value)}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </View>
          </Section>

          {/* === Export & Partage === */}
          <View style={styles.exportRow}>
            <TouchableOpacity
              style={[styles.exportBtn, styles.exportBtnPrimary]}
              onPress={shareCard}
              testID="share-card"
              activeOpacity={0.85}
            >
              <Feather name="image" size={18} color="#000" />
              <Text style={styles.exportBtnTextDark}>Partager la carte</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportBtn, styles.exportBtnSecondary]}
              onPress={exportPdf}
              testID="export-pdf"
              activeOpacity={0.85}
            >
              <Feather name="file-text" size={18} color={GOLD} />
              <Text style={styles.exportBtnText}>PDF complet</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.shareTextBtn}
            onPress={shareSummary}
            testID="share-summary"
            activeOpacity={0.7}
          >
            <Feather name="share-2" size={14} color={TEXT_2} />
            <Text style={styles.shareTextBtnLabel}>Partager un résumé texte</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
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
          <Text style={styles.dismissKbBtnText}>Terminé</Text>
        </TouchableOpacity>
      )}

      {/* City Picker Modal */}
      <Modal
        visible={cityPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCityPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ width: "100%" }}
          >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Choisir une ville</Text>
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
                placeholder="Rechercher une ville…"
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
            <FlatList
              data={filteredCities}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 420 }}
              ListEmptyComponent={
                <View style={styles.cityEmpty} testID="city-empty">
                  <Feather name="search" size={20} color={TEXT_3} />
                  <Text style={styles.cityEmptyTitle}>Aucune ville trouvée</Text>
                  <Text style={styles.cityEmptyText}>
                    Essaie sans accents ni tirets (ex: « saint etienne »).
                  </Text>
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
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Indice coût de la vie</Text>
            <Text style={styles.confirmMessage}>{INDEX_EXPLANATION}</Text>
            <Text style={[styles.confirmMessage, { marginTop: 6, fontStyle: "italic" }]}>
              Dans cette app, l'indice est informatif : vos dépenses réelles (loyer, prêts, alimentation…)
              sont celles utilisées pour calculer le reste à vivre.
            </Text>
            <TouchableOpacity
              style={styles.confirmOkBtn}
              onPress={() => setCityInfoOpen(false)}
              testID="close-city-info"
            >
              <Text style={styles.confirmOkText}>Compris</Text>
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
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ width: "100%" }}
          >
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {editingIncome ? "Modifier la source" : "Nouvelle source de revenu"}
                </Text>
                <TouchableOpacity
                  onPress={() => { Keyboard.dismiss(); setIncomeModalOpen(false); }}
                  testID="close-income-modal"
                >
                  <Feather name="x" size={22} color={TEXT_2} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.pillSectionLabel}>Type de revenu</Text>
                <View style={styles.pillsGrid}>
                  {(Object.keys(TYPE_LABEL) as IncomeType[]).map((t) => (
                    <StatusPill
                      key={t}
                      label={TYPE_LABEL[t]}
                      active={incomeForm.type === t}
                      onPress={() => changeIncomeType(t)}
                      testID={`income-type-${t}`}
                    />
                  ))}
                </View>

                <Field
                  label="Nom"
                  icon={<Feather name="tag" size={18} color={GOLD} />}
                  value={incomeForm.label}
                  onChangeText={(t) => setIncomeForm((f) => ({ ...f, label: t }))}
                  placeholder={TYPE_LABEL[incomeForm.type]}
                  testID="income-label"
                />

                <Field
                  label="Montant brut"
                  icon={<Text style={styles.euroIcon}>€</Text>}
                  right="€"
                  value={incomeForm.amount}
                  onChangeText={(t) => setIncomeForm((f) => ({ ...f, amount: t }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  testID="income-amount"
                />

                <Text style={styles.pillSectionLabel}>Fréquence</Text>
                <View style={styles.pillsGrid}>
                  <StatusPill
                    label="Mensuel"
                    active={incomeForm.frequency === "monthly"}
                    onPress={() => setIncomeForm((f) => ({ ...f, frequency: "monthly" }))}
                    testID="income-freq-monthly"
                  />
                  <StatusPill
                    label="Annuel"
                    active={incomeForm.frequency === "annual"}
                    onPress={() => setIncomeForm((f) => ({ ...f, frequency: "annual" }))}
                    testID="income-freq-annual"
                  />
                  <StatusPill
                    label="Versé un mois précis"
                    active={incomeForm.frequency === "monthOnce"}
                    onPress={() =>
                      setIncomeForm((f) => ({
                        ...f,
                        frequency: "monthOnce",
                        variableMonth: f.variableMonth ?? 11,
                      }))
                    }
                    testID="income-freq-monthOnce"
                  />
                </View>
                {incomeForm.frequency === "monthOnce" && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, paddingVertical: 8 }}
                  >
                    {MONTHS_SHORT.map((m, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setIncomeForm((f) => ({ ...f, variableMonth: i }))}
                        style={[styles.distribPill, incomeForm.variableMonth === i && styles.distribPillActive]}
                        testID={`income-month-${i}`}
                      >
                        <Text style={[styles.distribPillText, incomeForm.variableMonth === i && styles.distribPillTextActive]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {incomeForm.type === "salaire" && (
                  <>
                    <Text style={styles.pillSectionLabel}>Statut professionnel</Text>
                    <View style={styles.pillsGrid}>
                      {(Object.keys(STATUS_LABEL) as ProStatus[]).map((s) => (
                        <StatusPill
                          key={s}
                          label={STATUS_LABEL[s]}
                          active={incomeForm.proStatus === s}
                          onPress={() => changeIncomeProStatus(s)}
                          testID={`income-status-${s}`}
                        />
                      ))}
                    </View>
                    <Text style={styles.pillSectionLabel}>Quotité de travail</Text>
                    <View style={styles.statusToggle}>
                      <StatusPill
                        label="Temps plein"
                        active={incomeForm.timeMode === "plein"}
                        onPress={() => setIncomeForm((f) => ({ ...f, timeMode: "plein" }))}
                        testID="income-time-plein"
                      />
                      <StatusPill
                        label="Temps partiel"
                        active={incomeForm.timeMode === "partiel"}
                        onPress={() => setIncomeForm((f) => ({ ...f, timeMode: "partiel" }))}
                        testID="income-time-partiel"
                      />
                    </View>
                  </>
                )}

                <Field
                  label="Taux de charges / prélèvements"
                  icon={<Feather name="percent" size={18} color={GOLD} />}
                  right="%"
                  value={incomeForm.chargesPercent}
                  onChangeText={(t) => setIncomeForm((f) => ({ ...f, chargesPercent: t }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  hintText={TYPE_HINT[incomeForm.type]}
                  testID="income-charges"
                />

                <TouchableOpacity
                  onPress={saveIncome}
                  style={styles.primaryBtn}
                  testID="save-income"
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>
                    {editingIncome ? "Enregistrer" : "Ajouter"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
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
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ width: "100%" }}
          >
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  Nouvelle catégorie · {addItemFamily ? FAMILY_META[addItemFamily].label : ""}
                </Text>
                <TouchableOpacity
                  onPress={() => setAddItemFamily(null)}
                  testID="close-add-item"
                >
                  <Feather name="x" size={22} color={TEXT_2} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Field
                  label="Nom"
                  icon={<Feather name="tag" size={18} color={GOLD} />}
                  value={newItemLabel}
                  onChangeText={setNewItemLabel}
                  placeholder="ex : Salle de sport"
                  testID="new-item-label"
                />
                <Field
                  label="Montant mensuel"
                  icon={<Text style={styles.euroIcon}>€</Text>}
                  right="€"
                  value={newItemAmount}
                  onChangeText={setNewItemAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  testID="new-item-amount"
                />
                <TouchableOpacity
                  onPress={saveNewItem}
                  style={styles.primaryBtn}
                  testID="save-new-item"
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>Ajouter</Text>
                </TouchableOpacity>
              </ScrollView>
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
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ width: "100%" }}
          >
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {editingLoan ? "Modifier le prêt" : "Nouveau prêt"}
                </Text>
                <TouchableOpacity onPress={() => setLoanModalOpen(false)} testID="close-loan-modal">
                  <Feather name="x" size={22} color={TEXT_2} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Field
                  label="Nom du prêt"
                  icon={<Feather name="tag" size={18} color={GOLD} />}
                  value={form.name}
                  onChangeText={(t) => setForm({ ...form, name: t })}
                  placeholder="ex: Crédit immobilier"
                  testID="loan-name-input"
                />
                <Field
                  label="Montant emprunté"
                  icon={<Text style={styles.euroIcon}>€</Text>}
                  right="€"
                  value={form.principal}
                  onChangeText={(t) => setForm({ ...form, principal: t })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  testID="loan-principal-input"
                />
                <Field
                  label="Taux d'intérêt annuel"
                  icon={<Feather name="percent" size={18} color={GOLD} />}
                  right="%"
                  value={form.ratePercent}
                  onChangeText={(t) => setForm({ ...form, ratePercent: t })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  testID="loan-rate-input"
                />
                <Field
                  label="Durée"
                  icon={<Feather name="calendar" size={18} color={GOLD} />}
                  right="ans"
                  value={form.years}
                  onChangeText={(t) => setForm({ ...form, years: t })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  testID="loan-years-input"
                />

                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Mensualité estimée</Text>
                  <Text style={styles.previewValue} testID="loan-preview-monthly">
                    {formatEuro(
                      computeLoanMonthlyPayment(
                        parseNumber(form.principal),
                        parseNumber(form.ratePercent),
                        parseNumber(form.years)
                      )
                    )}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={saveLoan}
                  testID="save-loan-button"
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>
                    {editingLoan ? "Enregistrer les modifications" : "Ajouter le prêt"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
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
                onPress={() => setConfirm({ ...confirm, open: false })}
                testID="confirm-cancel"
              >
                <Text style={styles.confirmCancelText}>Annuler</Text>
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
                  {confirm.confirmLabel || "Confirmer"}
                </Text>
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
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
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
}: {
  label: string;
  icon?: React.ReactNode;
  right?: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  placeholder?: string;
  testID?: string;
  hintText?: string;
  onDelete?: () => void;
  onLabelChange?: (next: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const handleFocus = () => {
    setFocused(true);
    if (value === "0") onChangeText("");
  };
  const handleBlur = () => {
    setFocused(false);
    if (value === "") onChangeText("0");
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
              placeholder="Renomme cette catégorie"
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
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

  topSummary: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 24,
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
    alignItems: "center", paddingVertical: 4,
  },
  revenusLabel: { color: TEXT_2, fontSize: 13 },
  revenusTotal: { color: TEXT, fontSize: 15, fontWeight: "700" },
  revenusTotalMuted: { color: TEXT_3, fontSize: 14, fontWeight: "500" },
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
    borderWidth: 1, borderColor: BORDER, maxHeight: "85%",
  },
  sheetHandle: {
    alignSelf: "center", width: 44, height: 4, borderRadius: 2,
    backgroundColor: BORDER, marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  sheetTitle: { color: TEXT, fontSize: 20, fontWeight: "800" },
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
  cityEmpty: { paddingVertical: 24, alignItems: "center", gap: 6 },
  cityEmptyTitle: { color: TEXT, fontSize: 14, fontWeight: "700" },
  cityEmptyText: { color: TEXT_3, fontSize: 12, textAlign: "center", lineHeight: 18 },

  familySub: {
    color: TEXT_3, fontSize: 12, marginTop: -8, marginBottom: 12,
    fontStyle: "italic",
  },

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

  exportRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  exportBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 16,
  },
  exportBtnPrimary: { backgroundColor: GOLD },
  exportBtnSecondary: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
  },
  exportBtnText: { color: GOLD, fontSize: 14, fontWeight: "800" },
  exportBtnTextDark: { color: "#000", fontSize: 14, fontWeight: "800" },
  shareTextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 10, paddingVertical: 12,
  },
  shareTextBtnLabel: { color: TEXT_2, fontSize: 13, fontWeight: "600" },

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
