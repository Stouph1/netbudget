// Onglet Budget : revenus, logement, prêts, dépenses par famille, projection
// mensuelle, conseils et camembert de répartition.
//
// Composant de PRÉSENTATION : tout l'état vit dans app/index.tsx et arrive par
// props explicites — aucun contexte nouveau.
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DonutChart, { DonutSegment } from "../../src/components/DonutChart";
import MonthlyBreakdown, { MonthRow } from "../../src/components/MonthlyBreakdown";
import ScopeSwitcher from "../../src/components/ScopeSwitcher";
import { StreakCard } from "../../src/components/StreakCard";
import { City } from "../../src/constants/cities";
import { CurrencyCode, getCurrency } from "../../src/utils/currency";
import { parseNumber } from "../../src/utils/finance";
import { loanProgress, remainingParts } from "../../src/utils/loanSchedule";
import { AdviceItem, interpolate } from "../../src/utils/advice";
import { averageMonthlyNet, IncomeSource, TYPE_ICON } from "../../src/utils/income";
import { getBudgetMixProfile } from "../../src/lib/adviceEngine";
import type { UserProfile } from "../../src/types/advice";
import {
  COLOR_LOYER,
  COLOR_PRETS,
  DANGER,
  FAMILY_META,
  FAMILY_ORDER,
  GOLD,
  MONTH_KEYS_SHORT,
  TEXT_2,
  TEXT_3,
} from "./constants";
import { displayItemLabel, loanMonthlyPayment } from "./helpers";
import { styles } from "./styles";
import { Field, Section } from "./ui";
import { useTourScroller, useTourTarget } from "../../src/components/tour/TourContext";
import type { ExpenseFamily, ExpenseItem, Loan, Translate } from "./types";

export default function BudgetScreen({
  t,
  fmt,
  currency,
  city,
  // Ratio budgétaire personnalisé (Premium) affiché dans l'en-tête
  budgetRatio,
  premiumProfile,
  adviceI18n,
  // Scope du budget (perso / espace partagé)
  showScopeBadge,
  activeWorkspaceId,
  resolvedScopeLabel,
  scopeSwitching,
  budgetSwitcherOpen,
  // Revenus
  incomes,
  tithePercent,
  totalBrutAnnuel,
  brutMensuel,
  monthlyTithe,
  netMensuel,
  // Logement / prêts
  rent,
  loans,
  humanRemaining,
  // Dépenses
  itemsByFamily,
  familyTotals,
  // Totaux
  rentNum,
  loansMonthly,
  totalExpenses,
  monthlyExpenses,
  remaining,
  remainingColor,
  // Projection mensuelle
  months,
  currentMonthIndex,
  annualIncome,
  annualExpenses,
  annualRemaining,
  // Conseils + camembert
  advice,
  segments,
  // Actions
  onBudgetScroll,
  onOpenRuleInfo,
  onOpenBudgetSwitcher,
  onCloseBudgetSwitcher,
  onAddIncome,
  onEditIncome,
  onDeleteIncome,
  onRentChange,
  onAddLoan,
  onEditLoan,
  onDeleteLoan,
  onOpenSchedule,
  onAddItem,
  onItemAmountChange,
  onItemLabelChange,
  onDeleteItem,
  onExportPdf,
}: {
  t: Translate;
  fmt: (v: number) => string;
  currency: CurrencyCode;
  city: City;
  budgetRatio: { besoins: number; envies: number; epargne: number; personalized: boolean };
  premiumProfile: UserProfile | null;
  adviceI18n: Parameters<typeof getBudgetMixProfile>[1];
  /** Badge de scope : visible seulement avec une session (`premiumUser`). */
  showScopeBadge: boolean;
  activeWorkspaceId: string | null;
  resolvedScopeLabel: string;
  /** Un changement de scope est en cours : on montre un spinner. */
  scopeSwitching: boolean;
  budgetSwitcherOpen: boolean;
  incomes: IncomeSource[];
  tithePercent: number;
  totalBrutAnnuel: number;
  brutMensuel: number;
  monthlyTithe: number;
  netMensuel: number;
  rent: string;
  loans: Loan[];
  humanRemaining: (p: Parameters<typeof remainingParts>[0]) => string;
  itemsByFamily: Record<ExpenseFamily, ExpenseItem[]>;
  familyTotals: Record<ExpenseFamily, number>;
  rentNum: number;
  loansMonthly: number;
  totalExpenses: number;
  monthlyExpenses: number;
  remaining: number;
  remainingColor: string;
  months: MonthRow[];
  currentMonthIndex: number;
  annualIncome: number;
  annualExpenses: number;
  annualRemaining: number;
  advice: AdviceItem[];
  segments: DonutSegment[];
  onBudgetScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onOpenRuleInfo: () => void;
  onOpenBudgetSwitcher: () => void;
  onCloseBudgetSwitcher: () => void;
  onAddIncome: () => void;
  onEditIncome: (src: IncomeSource) => void;
  onDeleteIncome: (id: string) => void;
  onRentChange: (next: string) => void;
  onAddLoan: () => void;
  onEditLoan: (loan: Loan) => void;
  onDeleteLoan: (id: string) => void;
  onOpenSchedule: (loan: Loan) => void;
  onAddItem: (family: ExpenseFamily) => void;
  onItemAmountChange: (id: string, value: string) => void;
  onItemLabelChange: (id: string, label: string) => void;
  onDeleteItem: (id: string) => void;
  onExportPdf: () => void;
}) {
  // Cibles de la visite guidée. Voir tourSteps.ts pour ce qu'elles racontent.
  const tourSummary = useTourTarget("budget:summary");
  const tourAddIncome = useTourTarget("budget:addIncome");
  const tourAddLoan = useTourTarget("budget:addLoan");
  const tourExport = useTourTarget("budget:export");
  // Permet à la visite d'aller chercher une cible sous le pli.
  const tourScroll = useTourScroller("budget");

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      ref={tourScroll.ref}
      onScroll={(e) => {
        // Deux consommateurs pour un seul événement : le suivi existant et la
        // visite guidée. Remplacer l'un par l'autre casserait silencieusement
        // celui qu'on n'a pas regardé.
        onBudgetScroll(e);
        tourScroll.onScroll(e);
      }}
      scrollEventThrottle={64}
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
          onPress={onOpenRuleInfo}
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
      {showScopeBadge ? (
        <TouchableOpacity
          style={styles.budgetScopeBadge}
          onPress={onOpenBudgetSwitcher}
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
          {scopeSwitching ? (
            <ActivityIndicator size="small" color={GOLD} />
          ) : (
            <Feather name="chevron-down" size={12} color={TEXT_3} />
          )}
        </TouchableOpacity>
      ) : null}
      <ScopeSwitcher
        visible={budgetSwitcherOpen}
        onClose={onCloseBudgetSwitcher}
      />

      <StreakCard
        figures={{
          net: netMensuel,
          expenses: monthlyExpenses,
          remaining: remaining,
        }}
        fmt={fmt}
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
        <View
          style={styles.topSummary}
          testID="top-summary"
          ref={tourSummary}
          collapsable={false}
        >
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
          // La vue enveloppe porte la cible de la visite guidée :
          // TouchableOpacity n'accepte pas `collapsable`, et sans lui Android
          // supprime la vue de l'arbre natif — measureInWindow ne renverrait
          // plus rien.
          <View ref={tourAddIncome} collapsable={false}>
            <TouchableOpacity
              onPress={onAddIncome}
              style={styles.addBtn}
              testID="add-income-button"
              activeOpacity={0.85}
            >
              <Feather name="plus" size={16} color="#000" />
              <Text style={styles.addBtnText}>{t("btn.add")}</Text>
            </TouchableOpacity>
          </View>
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
                onPress={() => onEditIncome(src)}
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
                  onPress={() => onDeleteIncome(src.id)}
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
          onChangeText={onRentChange}
          keyboardType="decimal-pad"
          placeholder="0"
          testID="rent-input"
        />
      </Section>

      {/* Prêts */}
      <Section
        title={t("section.loans.title")}
        action={
          <View ref={tourAddLoan} collapsable={false}>
          <TouchableOpacity
            onPress={onAddLoan}
            style={styles.addBtn}
            testID="add-loan-button"
            activeOpacity={0.8}
          >
            <Feather name="plus" size={16} color="#000" />
            <Text style={styles.addBtnText}>{t("btn.add")}</Text>
          </TouchableOpacity>
          </View>
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
                onPress={() => onEditLoan(l)}
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
                        onPress={() => onOpenSchedule(l)}
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
                  onPress={() => onDeleteLoan(l.id)}
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
                onPress={() => onAddItem(family)}
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
                  onChangeText={(v) => onItemAmountChange(it.id, v)}
                  onLabelChange={(v) => onItemLabelChange(it.id, v)}
                  onDelete={() => onDeleteItem(it.id)}
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
      <View ref={tourExport} collapsable={false} style={{ marginTop: 16 }}>
        <TouchableOpacity
          style={[styles.exportBtn, styles.exportBtnPrimary]}
          onPress={onExportPdf}
          testID="export-pdf"
          activeOpacity={0.85}
        >
          <Feather name="file-text" size={18} color="#000" />
          <Text style={styles.exportBtnTextDark}>{t("btn.exportPdf")}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
