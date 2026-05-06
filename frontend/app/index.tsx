import React, { useMemo, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DonutChart, { DonutSegment } from "../src/components/DonutChart";
import MonthlyBreakdown, { MonthRow } from "../src/components/MonthlyBreakdown";
import { CITIES, City, INDEX_EXPLANATION } from "../src/constants/cities";
import {
  computeLoanMonthlyPayment,
  formatEuro,
  normalizeText,
  parseNumber,
} from "../src/utils/finance";

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

type Expenses = {
  alimentation: string;
  transport: string;
  loisirs: string;
  sante: string;
  abonnements: string;
  energie: string;
  autres: string;
};

const EXPENSE_KEYS: (keyof Expenses)[] = [
  "alimentation", "transport", "loisirs", "sante",
  "abonnements", "energie", "autres",
];

const EXPENSE_META: Record<
  keyof Expenses,
  { label: string; icon: keyof typeof Feather.glyphMap; color: string; hint: string }
> = {
  alimentation: { label: "Alimentation", icon: "shopping-cart", color: "#10B981", hint: "courses, marché, restaurants" },
  transport: { label: "Transport", icon: "navigation", color: "#F59E0B", hint: "carburant, péages, transports en commun" },
  loisirs: { label: "Loisirs", icon: "music", color: "#A855F7", hint: "sorties, sport, vacances" },
  sante: { label: "Santé", icon: "heart", color: "#06B6D4", hint: "mutuelle, pharmacie, médecin" },
  abonnements: { label: "Abonnements", icon: "wifi", color: "#EC4899", hint: "internet, mobile, streaming" },
  energie: { label: "Énergie & Eau", icon: "zap", color: "#F97316", hint: "électricité, gaz, eau" },
  autres: { label: "Autres", icon: "more-horizontal", color: "#6B7280", hint: "tout le reste" },
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

// Estimations approximatives — l'utilisateur peut ajuster manuellement
const CHARGES_DEFAULT_CADRE = 25;
const CHARGES_DEFAULT_NON_CADRE = 22;

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
  const [salaryMode, setSalaryMode] = useState<"annual" | "monthly">("annual");
  const [baseAnnual, setBaseAnnual] = useState<string>("0");
  const [variableAnnual, setVariableAnnual] = useState<string>("0");
  const [isCadre, setIsCadre] = useState<boolean>(false);
  const [chargesPercent, setChargesPercent] = useState<string>(
    String(CHARGES_DEFAULT_NON_CADRE)
  );
  const [variableMonth, setVariableMonth] = useState<"monthly" | number>("monthly");

  // Logement
  const [rent, setRent] = useState<string>("0");

  // Dépenses mensuelles détaillées
  const [expenses, setExpenses] = useState<Expenses>({
    alimentation: "0",
    transport: "0",
    loisirs: "0",
    sante: "0",
    abonnements: "0",
    energie: "0",
    autres: "0",
  });

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

  // ---- Calculs ----
  const baseInputNum = parseNumber(baseAnnual);
  const variableAnnualNum = parseNumber(variableAnnual);
  // En mode mensuel, le salaire saisi est multiplié par 12 pour reconstituer l'annuel
  const baseAnnualNum =
    salaryMode === "monthly" ? baseInputNum * 12 : baseInputNum;
  const totalBrutAnnuel = baseAnnualNum + variableAnnualNum;
  const chargesPercentNum = Math.max(0, Math.min(60, parseNumber(chargesPercent)));
  const netRatio = 1 - chargesPercentNum / 100;
  const netAnnuel = totalBrutAnnuel * netRatio;
  const netMensuel = netAnnuel / 12;
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

  const expensesByKey: Record<keyof Expenses, number> = useMemo(
    () => ({
      alimentation: parseNumber(expenses.alimentation),
      transport: parseNumber(expenses.transport),
      loisirs: parseNumber(expenses.loisirs),
      sante: parseNumber(expenses.sante),
      abonnements: parseNumber(expenses.abonnements),
      energie: parseNumber(expenses.energie),
      autres: parseNumber(expenses.autres),
    }),
    [expenses]
  );
  const totalExpenses = Object.values(expensesByKey).reduce((a, b) => a + b, 0);

  const monthlyExpenses = rentNum + loansMonthly + totalExpenses;
  const remaining = netMensuel - monthlyExpenses;
  const remainingColor = remaining >= 0 ? GOLD : DANGER;

  // Donut
  const segments: DonutSegment[] = useMemo(() => {
    const segs: DonutSegment[] = [];
    if (rentNum > 0) segs.push({ label: "Loyer", value: rentNum, color: COLOR_LOYER });
    if (loansMonthly > 0) segs.push({ label: "Prêts", value: loansMonthly, color: COLOR_PRETS });
    for (const k of EXPENSE_KEYS) {
      const v = expensesByKey[k];
      if (v > 0) segs.push({ label: EXPENSE_META[k].label, value: v, color: EXPENSE_META[k].color });
    }
    segs.push({ label: "Reste à vivre", value: remaining > 0 ? remaining : 0, color: GOLD });
    return segs;
  }, [rentNum, loansMonthly, expensesByKey, remaining]);

  // Projection mensuelle
  const baseNetMensuelOnly = (baseAnnualNum * netRatio) / 12;
  const variableNetAnnuel = variableAnnualNum * netRatio;

  const months: MonthRow[] = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        let income = baseNetMensuelOnly;
        if (variableMonth === "monthly") income += variableNetAnnuel / 12;
        else if (variableMonth === i) income += variableNetAnnuel;
        return {
          index: i,
          name: MONTHS_LONG[i],
          shortName: MONTHS_SHORT[i],
          income,
          expenses: monthlyExpenses,
          remaining: income - monthlyExpenses,
        };
      }),
    [baseNetMensuelOnly, variableNetAnnuel, variableMonth, monthlyExpenses]
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
  function askResetAll() {
    setConfirm({
      open: true,
      title: "Réinitialiser ?",
      message: "Toutes les données saisies seront effacées.",
      danger: true,
      confirmLabel: "Réinitialiser",
      onConfirm: () => {
        setSalaryMode("annual");
        setBaseAnnual("0");
        setVariableAnnual("0");
        setIsCadre(false);
        setChargesPercent(String(CHARGES_DEFAULT_NON_CADRE));
        setVariableMonth("monthly");
        setRent("0");
        setExpenses({
          alimentation: "0", transport: "0", loisirs: "0", sante: "0",
          abonnements: "0", energie: "0", autres: "0",
        });
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

          {/* Revenus */}
          <Section title="Revenus bruts">
            <View style={styles.modeToggleRow}>
              <StatusPill
                label="Annuel"
                active={salaryMode === "annual"}
                onPress={() => setSalaryMode("annual")}
                testID="mode-annual"
              />
              <StatusPill
                label="Mensuel"
                active={salaryMode === "monthly"}
                onPress={() => setSalaryMode("monthly")}
                testID="mode-monthly"
              />
            </View>
            <Field
              label={
                salaryMode === "annual"
                  ? "Salaire de base annuel brut"
                  : "Salaire de base mensuel brut"
              }
              icon={<Ionicons name="wallet-outline" size={18} color={GOLD} />}
              right="€"
              value={baseAnnual}
              onChangeText={setBaseAnnual}
              keyboardType="decimal-pad"
              placeholder="0"
              testID="salary-input"
            />
            <Field
              label="Variable / Primes (annuel)"
              icon={<Feather name="trending-up" size={18} color={GOLD} />}
              right="€"
              value={variableAnnual}
              onChangeText={setVariableAnnual}
              keyboardType="decimal-pad"
              placeholder="0"
              testID="variable-input"
            />
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
                <Text style={styles.revenusLabel}>Brut mensuel (÷12)</Text>
                <Text style={styles.revenusTotalMuted}>{formatEuro(brutMensuel)}</Text>
              </View>
              <View style={styles.statusToggle}>
                <StatusPill
                  label="Non-cadre"
                  active={!isCadre}
                  onPress={() => {
                    setIsCadre(false);
                    setChargesPercent(String(CHARGES_DEFAULT_NON_CADRE));
                  }}
                  testID="toggle-non-cadre"
                />
                <StatusPill
                  label="Cadre"
                  active={isCadre}
                  onPress={() => {
                    setIsCadre(true);
                    setChargesPercent(String(CHARGES_DEFAULT_CADRE));
                  }}
                  testID="toggle-cadre"
                />
              </View>
              <Field
                label="Taux de charges salariales"
                icon={<Feather name="percent" size={18} color={GOLD} />}
                right="%"
                value={chargesPercent}
                onChangeText={setChargesPercent}
                keyboardType="decimal-pad"
                placeholder="22"
                hintText="Ajuste pour coller à ta fiche de paie (entre 0 et 60%)."
                testID="charges-input"
              />
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

          {/* Dépenses mensuelles */}
          <Section title="Dépenses mensuelles">
            {EXPENSE_KEYS.map((k) => {
              const meta = EXPENSE_META[k];
              return (
                <Field
                  key={k}
                  label={meta.label}
                  icon={<Feather name={meta.icon} size={18} color={meta.color} />}
                  right="€"
                  value={expenses[k]}
                  onChangeText={(t) => setExpenses({ ...expenses, [k]: t })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  hintText={meta.hint}
                  testID={`expense-${k}`}
                />
              );
            })}
            <View style={styles.expensesTotalRow}>
              <Text style={styles.expensesTotalLabel}>Total dépenses mensuelles</Text>
              <Text style={styles.expensesTotalValue} testID="expenses-total">
                {formatEuro(rentNum + loansMonthly + totalExpenses)}
              </Text>
            </View>
          </Section>

          {/* Budget mois par mois */}
          <Section title="Budget mois par mois">
            <View style={styles.variableDistribBox}>
              <Text style={styles.variableDistribLabel}>Versement du variable</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
              >
                <TouchableOpacity
                  onPress={() => setVariableMonth("monthly")}
                  style={[styles.distribPill, variableMonth === "monthly" && styles.distribPillActive]}
                  testID="variable-monthly"
                >
                  <Text style={[styles.distribPillText, variableMonth === "monthly" && styles.distribPillTextActive]}>
                    Mensualisé
                  </Text>
                </TouchableOpacity>
                {MONTHS_SHORT.map((m, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setVariableMonth(i)}
                    style={[styles.distribPill, variableMonth === i && styles.distribPillActive]}
                    testID={`variable-month-${i}`}
                  >
                    <Text style={[styles.distribPillText, variableMonth === i && styles.distribPillTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.hint}>
                {variableMonth === "monthly"
                  ? "Le variable est réparti sur 12 mois."
                  : `Le variable sera versé en ${MONTHS_LONG[variableMonth as number]}.`}
              </Text>
            </View>

            <MonthlyBreakdown
              months={months}
              currentMonthIndex={currentMonthIndex}
              annualRemaining={annualRemaining}
              annualIncome={annualIncome}
              annualExpenses={annualExpenses}
            />
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

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* City Picker Modal */}
      <Modal
        visible={cityPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCityPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Choisir une ville</Text>
              <TouchableOpacity onPress={() => setCityPickerOpen(false)} testID="close-city-picker">
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
                testID="city-search-input"
              />
            </View>
            <FlatList
              data={filteredCities}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
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
                  icon={<Feather name="dollar-sign" size={18} color={GOLD} />}
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
          <Text style={styles.inputLabel}>{label}</Text>
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
            testID={testID}
          />
        </View>
        {right && <Text style={styles.inputRight}>{right}</Text>}
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
  statusToggle: { flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 12 },
  modeToggleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
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
