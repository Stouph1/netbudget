// Panel "Profil / Accueil Premium" — contenu partagé entre :
//  - le 4e onglet de la tab bar (index.tsx, style Instagram : profil à droite)
//  - la route /(premium)/home (icônes maison des écrans Premium)
//
// Deux états :
//  - Non connecté → écran de connexion façon TikTok : l'app marche sans compte,
//    le compte sert aux features Premium (sync, workspaces, conseils).
//  - Connecté → profil (avatar photo uploadable), scope actif, overview S1,
//    tuiles de navigation.

import { Feather } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import ScopeSwitcher from "./ScopeSwitcher";
import { useLang } from "../contexts/LangContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { useSession } from "../contexts/SessionContext";
import { useActiveScope } from "../hooks/useActiveScope";
import { signInWithApple, signInWithGoogle, signOut } from "../lib/auth";
import {
  loadConsentAccepted,
  recordConsent,
  saveConsentAccepted,
} from "../lib/profile";
import { confirmDialog, notify } from "../utils/notify";
import { openExternal } from "../utils/openExternal";
import { pickAndUploadAvatar } from "../lib/photos";
import {
  loadBudgetHistory,
  loadS1,
  seedDemoBudgetHistory,
  type BudgetHistoryPoint,
} from "../lib/premiumStore";
import { loadProfileBasics } from "../lib/profile";
import type { S1Payload } from "../types/premium";

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


// Les noms de mois viennent du catalogue de traductions (month.short.N /
// month.long.N), déjà traduits dans les 8 langues.
function monthLabel(month: string, t: (key: string) => string): string {
  const idx = parseInt(month.slice(5), 10) - 1;
  if (idx < 0 || idx > 11) return month;
  return t(`month.short.${idx}`);
}

type Props = {
  // Naviguer vers le tab Budget (depuis le tab: setTab; depuis la route: back)
  onGoBudget?: () => void;
  // __DEV__ uniquement : rejoue la fête d'anniversaire (ignore le verrou annuel)
  onDevReplayBirthday?: () => void;
};

export default function PremiumHomePanel({ onGoBudget, onDevReplayBirthday }: Props) {
  const { t, tp } = useLang();
  // Devise active (le « € » était codé en dur : changer de devise n'avait
  // aucun effet sur cet écran).
  const { fmt: formatEuro, currency } = useCurrency();
  const { user, loading: sessionLoading } = useSession();
  const { workspaceId, scopeLabel, scopeLabelIsKey, loading: scopeLoading } = useActiveScope();
  // Le scope perso renvoie une CLÉ i18n, un espace nommé renvoie son nom.
  const resolvedScopeLabel = scopeLabelIsKey ? t(scopeLabel) : scopeLabel;
  const [s1, setS1] = useState<S1Payload | null>(null);
  const [history, setHistory] = useState<BudgetHistoryPoint[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [busyAuth, setBusyAuth] = useState(false);
  // RGPD : la case doit être cochée AVANT toute création de compte.
  // Le consentement est un CHOIX de l'utilisateur, pas un état d'écran. Il
  // vivait en mémoire : partir vers l'écran e-mail, revenir, ou simplement
  // relancer l'app décochait la case et il fallait tout recommencer.
  // L'horodatage légal reste posé côté serveur par recordConsent() au moment
  // de la création du compte — persister la case ne change que la friction.
  const [consentOk, setConsentOkState] = useState(false);
  useEffect(() => {
    let alive = true;
    loadConsentAccepted().then((v) => {
      if (alive) setConsentOkState(v);
    });
    return () => {
      alive = false;
    };
  }, []);
  const setConsentOk = useCallback((next: boolean) => {
    setConsentOkState(next);
    void saveConsentAccepted(next);
  }, []);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || scopeLoading) return;
      let cancelled = false;
      (async () => {
        const [payload, basics, hist] = await Promise.all([
          loadS1(user.id, workspaceId, currency),
          loadProfileBasics(user.id),
          loadBudgetHistory(user.id, workspaceId),
        ]);
        if (!cancelled) {
          setS1(payload);
          setAvatarUrl(basics.avatar_url);
          setUsername(basics.username);
          setHistory(hist);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.id, workspaceId, scopeLoading]),
  );

  const editUsername = useCallback(() => {
    if (!user?.id) return;
    // Écran unique inscription/édition : photo, pseudo, nom, prénom, âge, dîme.
    router.push(
      (username
        ? "/(premium)/complete-profile?edit=1"
        : "/(premium)/complete-profile") as never,
    );
  }, [user?.id, username]);

  const changeAvatar = useCallback(async () => {
    if (!user?.id) return;
    setBusyAvatar(true);
    const result = await pickAndUploadAvatar(user.id);
    setBusyAvatar(false);
    if (result.ok) {
      setAvatarUrl(result.url);
    } else if (result.reason === "permission") {
      notify(t("common.photos"), t("common.photosPermission"));
    } else if (result.reason === "error") {
      notify(
        t("common.uploadFailed"),
        result.message ?? t("common.unknownError"),
      );
    }
  }, [user?.id, t]);

  // Après n'importe quel provider : consentement horodaté (la case était
  // obligatoire) puis inscription incomplète → écran dédié
  async function afterSignIn(userId: string) {
    await recordConsent(userId);
    const basics = await loadProfileBasics(userId);
    if (!basics.username) {
      router.push("/(premium)/complete-profile" as never);
    }
  }

  function requireConsent(): boolean {
    if (consentOk) return true;
    notify(t("home.consent.required.title"), t("home.consent.required.msg"));
    return false;
  }

  async function handleApple() {
    if (!requireConsent()) return;
    setBusyAuth(true);
    const result = await signInWithApple();
    setBusyAuth(false);
    if (!result.ok && result.reason !== "cancelled") {
      notify(t("home.err.signin"), result.message ?? result.reason);
      return;
    }
    if (result.ok) await afterSignIn(result.userId);
  }

  async function handleGoogle() {
    if (!requireConsent()) return;
    setBusyAuth(true);
    const result = await signInWithGoogle();
    // Sur le web, la page part chez Google : on laisse l'indicateur tourner
    // plutôt que de faire clignoter le bouton avant que l'écran disparaisse.
    if (!result.ok && result.reason === "redirecting") return;
    setBusyAuth(false);
    if (!result.ok && result.reason !== "cancelled") {
      // Quand la cause est identifiée (config OAuth, Play Services), on dit
      // quoi faire plutôt que d'afficher « DEVELOPER_ERROR ».
      notify(
        t("home.err.signinGoogle"),
        result.messageKey
          ? t(result.messageKey)
          : (result.message ?? result.reason),
      );
      return;
    }
    if (result.ok) await afterSignIn(result.userId);
  }

  if (sessionLoading || scopeLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  // ==========================================================================
  // Non connecté — sign-in optionnel façon TikTok
  // ==========================================================================
  if (!user) {
    return (
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
        <View style={styles.signinHero}>
          <View style={styles.signinIconWrap}>
            <Feather name="user" size={36} color={GOLD} />
          </View>
          <Text style={styles.signinTitle}>{t("home.signin.title")}</Text>
          <Text style={styles.signinBody}>{t("home.signin.body1")}</Text>
          <Text style={[styles.signinBody, { marginTop: 10 }]}>
            {t("home.signin.body2")}
          </Text>

          {/* Consentement RGPD — obligatoire avant toute création de compte */}
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => setConsentOk(!consentOk)}
            activeOpacity={0.8}
          >
            <View style={[styles.consentBox, consentOk && styles.consentBoxOn]}>
              {consentOk ? <Feather name="check" size={13} color="#000" /> : null}
            </View>
            <Text style={styles.consentText}>
              {t("home.consent.prefix")}
              <Text
                style={styles.consentLink}
                onPress={() => openExternal("https://www.netbudget.app/privacy")}
              >
                {t("home.consent.privacy")}
              </Text>
              {t("home.consent.mid")}
              <Text
                style={styles.consentLink}
                onPress={() => openExternal("https://www.netbudget.app/terms")}
              >
                {t("home.consent.terms")}
              </Text>
              {t("home.consent.suffix")}
            </Text>
          </TouchableOpacity>

          {busyAuth ? (
            <View style={{ height: 52, marginTop: 12, justifyContent: "center" }}>
              <ActivityIndicator color={GOLD} />
            </View>
          ) : (
            <View
              style={{ width: "100%", marginTop: 12, gap: 10, opacity: consentOk ? 1 : 0.45 }}
            >
              {/* 1. Apple (iOS uniquement — exigence App Store) */}
              {Platform.OS === "ios" ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={
                    AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                  }
                  buttonStyle={
                    AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  }
                  cornerRadius={12}
                  style={{ width: "100%", height: 52 }}
                  onPress={handleApple}
                />
              ) : null}

              {/* 2. Google (Android + iOS — development build requis) */}
              <TouchableOpacity
                style={styles.providerBtn}
                onPress={handleGoogle}
                activeOpacity={0.85}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.1 3.56-5.18 3.56-8.81z" />
                  <Path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1C3.24 21.3 7.31 24 12 24z" />
                  <Path fill="#FBBC05" d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4.01-3.1z" />
                  <Path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.23 0 12 0 7.31 0 3.24 2.7 1.27 6.62l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
                </Svg>
                <Text style={styles.providerBtnText}>{t("home.signin.google")}</Text>
              </TouchableOpacity>

              {/* 3. E-mail + mot de passe (création de compte ou connexion) */}
              <TouchableOpacity
                style={styles.providerBtn}
                onPress={() => {
                  if (!requireConsent()) return;
                  router.push("/(premium)/email-auth" as never);
                }}
                activeOpacity={0.85}
              >
                <Feather name="mail" size={17} color={TEXT_1} />
                <Text style={styles.providerBtnText}>
                  {t("home.signin.email")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.signinFootnote}>{t("home.signin.footnote")}</Text>
        </View>
      </ScrollView>
    );
  }

  // ==========================================================================
  // Connecté — profil + overview + navigation
  // ==========================================================================
  const activeGoals = s1?.goals.filter((g) => !g.extraP) ?? [];
  const target = activeGoals.reduce((s, g) => s + g.targetAmount, 0);
  const current = activeGoals.reduce((s, g) => s + g.currentAmount, 0);
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
      {!username ? (
        <TouchableOpacity
          style={styles.completeBanner}
          onPress={() => router.push("/(premium)/complete-profile" as never)}
          activeOpacity={0.85}
        >
          <Feather name="alert-circle" size={18} color="#000" />
          <View style={{ flex: 1 }}>
            <Text style={styles.completeBannerTitle}>{t("home.complete.title")}</Text>
            <Text style={styles.completeBannerText}>{t("home.complete.body")}</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#000" />
        </TouchableOpacity>
      ) : null}

      {/* Profil */}
      <View style={styles.profileCard}>
        <TouchableOpacity
          onPress={changeAvatar}
          activeOpacity={0.8}
          disabled={busyAvatar}
        >
          <View style={styles.avatar}>
            {busyAvatar ? (
              <ActivityIndicator color={GOLD} />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Feather name="user" size={26} color={GOLD} />
            )}
            <View style={styles.avatarEditBadge}>
              <Feather name="camera" size={10} color="#000" />
            </View>
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={editUsername} activeOpacity={0.7}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.profileName} numberOfLines={1}>
                {username ?? t("home.chooseUsername")}
              </Text>
              <Feather name="edit-2" size={11} color={TEXT_3} />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {user.email ?? t("home.emailHidden")}
          </Text>
          <TouchableOpacity
            style={styles.scopeInline}
            onPress={() => setSwitcherOpen(true)}
            activeOpacity={0.8}
          >
            <Feather
              name={workspaceId ? "users" : "user"}
              size={12}
              color={GOLD}
            />
            <Text style={styles.scopeInlineText}>{resolvedScopeLabel}</Text>
            <Feather name="chevron-down" size={12} color={TEXT_3} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() =>
            // confirmDialog : Alert.alert à boutons est muet sur le web.
            confirmDialog(
              t("home.signout.title"),
              t("home.signout.msg"),
              t("home.signout.title"),
              () => void signOut(),
              { cancelLabel: t("btn.cancel"), destructive: true },
            )
          }
          accessibilityRole="button"
          accessibilityLabel={t("home.signout.title")}
          hitSlop={10}
        >
          <Feather name="log-out" size={18} color={TEXT_3} />
        </TouchableOpacity>
      </View>

      {/* Overview S1 */}
      <TouchableOpacity
        style={styles.overviewCard}
        onPress={() => router.push("/(premium)/s1-epargne" as never)}
        activeOpacity={0.85}
      >
        <Text style={styles.overviewLabel}>
          {tp("home.savings", { scope: resolvedScopeLabel })}
        </Text>
        <View style={styles.overviewRow}>
          <Text style={styles.overviewCurrent}>{formatEuro(current)}</Text>
          <Text style={styles.overviewTarget}>/ {formatEuro(target)}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.overviewMeta}>
          {tp(activeGoals.length > 1 ? "home.goals.many" : "home.goals.one", {
            count: activeGoals.length,
            pct: pct.toFixed(0),
          })}
        </Text>
      </TouchableOpacity>

      {/* Tuiles navigation */}
      <View style={styles.tilesRow}>
        <Tile
          icon="target"
          label={t("home.tile.goals")}
          onPress={() => router.push("/(premium)/s1-epargne" as never)}
        />
        <Tile
          icon="compass"
          label={t("home.tile.coach")}
          onPress={() => router.push("/(premium)/advice" as never)}
        />
      </View>
      <View style={styles.tilesRow}>
        <Tile
          icon="users"
          label={t("home.tile.spaces")}
          onPress={() => router.push("/(premium)/workspaces" as never)}
        />
        <Tile
          icon="pie-chart"
          label={t("tab.budget")}
          onPress={() => (onGoBudget ? onGoBudget() : router.back())}
        />
      </View>
      <View style={styles.tilesRow}>
        <Tile
          icon="bookmark"
          label={t("home.tile.saved")}
          onPress={() => router.push("/(premium)/saved-advice" as never)}
        />
        <Tile
          icon="gift"
          label={t("home.tile.birthdays")}
          onPress={() => router.push("/(premium)/celebrations" as never)}
        />
      </View>
      <View style={styles.tilesRow}>
        <Tile
          icon="calendar"
          label={t("home.tile.events")}
          onPress={() => router.push("/(premium)/events" as never)}
        />
      </View>
      {__DEV__ && onDevReplayBirthday ? (
        <TouchableOpacity
          onPress={onDevReplayBirthday}
          style={{ alignSelf: "center", marginBottom: 12 }}
          hitSlop={8}
        >
          <Text style={styles.historyDemoBtn}>DEV · rejouer la fête 🎂</Text>
        </TouchableOpacity>
      ) : null}

      {/* Évolution du budget — historique mensuel du scope actif */}
      <BudgetHistoryCard
        points={history}
        scopeLabel={resolvedScopeLabel}
        onSeedDemo={
          __DEV__
            ? async () => {
                if (!user?.id) return;
                setHistory(await seedDemoBudgetHistory(user.id, workspaceId));
              }
            : undefined
        }
      />

      <ScopeSwitcher
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
      />
    </ScrollView>
  );
}

// ============================================================================
// Évolution du budget — graphe interactif (12 derniers mois) :
//  - tap sur un mois → fiche détail (net, dépenses, reste + ventilation)
//  - "Comparer" → tap sur un 2e mois → comparatif ligne par ligne avec écarts
// Les points sont enregistrés automatiquement par le tab Budget.
// ============================================================================

function monthFullLabel(month: string, t: (key: string) => string): string {
  const idx = parseInt(month.slice(5), 10) - 1;
  const name = idx >= 0 && idx <= 11 ? t(`month.long.${idx}`) : month;
  return `${name} ${month.slice(0, 4)}`;
}

// Ligne de détail/comparaison. goodUp : une hausse est-elle une bonne
// nouvelle (net, épargne, reste à vivre) ou une mauvaise (dépenses, loyer) ?
type CompareRow = {
  label: string;
  a?: number;
  b?: number;
  goodUp: boolean;
  indent?: boolean;
  strong?: boolean;
};

function buildRows(
  a: BudgetHistoryPoint,
  b: BudgetHistoryPoint | undefined,
  t: (key: string) => string,
): CompareRow[] {
  const rows: CompareRow[] = [
    { label: t("top.netMonthly"), a: a.net, b: b?.net, goodUp: true, strong: true },
    { label: t("home.row.totalExpenses"), a: a.expenses, b: b?.expenses, goodUp: false, strong: true },
    { label: t("top.remaining"), a: a.remaining, b: b?.remaining, goodUp: true, strong: true },
  ];
  const ba = a.breakdown;
  const bb = b?.breakdown;
  if (ba || bb) {
    rows.push({ label: t("donut.rent"), a: ba?.rent, b: bb?.rent, goodUp: false });
    rows.push({ label: t("donut.loans"), a: ba?.loans, b: bb?.loans, goodUp: false });
    rows.push({ label: t("family.besoins.label"), a: ba?.besoins, b: bb?.besoins, goodUp: false });
    rows.push({ label: t("family.loisirs.label"), a: ba?.loisirs, b: bb?.loisirs, goodUp: false });
    rows.push({ label: t("family.epargne.short"), a: ba?.epargne, b: bb?.epargne, goodUp: true });
    // Lignes détaillées : union des postes des deux mois
    const labels = new Map<string, { label: string; family: string }>();
    for (const it of ba?.items ?? []) labels.set(it.id, it);
    for (const it of bb?.items ?? []) if (!labels.has(it.id)) labels.set(it.id, it);
    for (const [id, meta] of labels) {
      rows.push({
        label: meta.label,
        a: ba ? (ba.items.find((i) => i.id === id)?.amount ?? 0) : undefined,
        b: b ? (bb ? (bb.items.find((i) => i.id === id)?.amount ?? 0) : undefined) : undefined,
        goodUp: meta.family === "epargne",
        indent: true,
      });
    }
  }
  return rows;
}

function DeltaText({ row }: { row: CompareRow }) {
  const { fmt: formatEuro, currency } = useCurrency();
  if (row.a === undefined || row.b === undefined) {
    return <Text style={styles.rowDeltaNeutral}>—</Text>;
  }
  const delta = row.b - row.a;
  if (delta === 0) return <Text style={styles.rowDeltaNeutral}>=</Text>;
  const good = delta > 0 ? row.goodUp : !row.goodUp;
  return (
    <Text style={[styles.rowDelta, { color: good ? MINT : "#F87171" }]}>
      {delta > 0 ? "+" : "−"}{formatEuro(Math.abs(delta))}
    </Text>
  );
}

function BudgetHistoryCard({
  points,
  scopeLabel,
  onSeedDemo,
}: {
  points: BudgetHistoryPoint[];
  scopeLabel: string;
  onSeedDemo?: () => void; // __DEV__ uniquement — absent en prod
}) {
  const { t, tp } = useLang();
  const { fmt: formatEuro, currency } = useCurrency();
  const [selected, setSelected] = useState<string | null>(null);
  const [compare, setCompare] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const last = points.slice(-12);
  const selectedPoint = last.find((p) => p.month === selected) ?? null;
  const comparePoint = last.find((p) => p.month === compare) ?? null;

  function tapMonth(month: string) {
    if (picking && selected && month !== selected) {
      setCompare(month);
      setPicking(false);
      return;
    }
    if (month === selected) {
      setSelected(null);
      setCompare(null);
      setPicking(false);
      return;
    }
    setSelected(month);
    setCompare(null);
    setPicking(false);
  }

  const header = (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={[styles.overviewLabel, { flex: 1 }]}>
        {tp("home.history.title", { scope: scopeLabel })}
      </Text>
      {onSeedDemo ? (
        <TouchableOpacity onPress={onSeedDemo} hitSlop={8}>
          <Text style={styles.historyDemoBtn}>DEV · démo</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (last.length === 0) {
    return (
      <View style={styles.historyCard}>
        {header}
        <Text style={styles.historyEmpty}>{t("home.history.empty")}</Text>
      </View>
    );
  }

  const max = Math.max(...last.map((p) => Math.max(p.net, p.expenses)), 1);
  const latest = last[last.length - 1];
  const prev = last.length > 1 ? last[last.length - 2] : null;
  const trendDelta = prev ? latest.remaining - prev.remaining : null;

  return (
    <View style={styles.historyCard}>
      {header}

      <View style={styles.historyChart}>
        {last.map((p) => {
          const isSel = p.month === selected;
          const isCmp = p.month === compare;
          return (
            <TouchableOpacity
              key={p.month}
              style={[
                styles.historyCol,
                (isSel || isCmp) && styles.historyColSelected,
              ]}
              onPress={() => tapMonth(p.month)}
              activeOpacity={0.7}
            >
              <View style={styles.historyBars}>
                <View
                  style={[
                    styles.historyBar,
                    {
                      height: `${Math.max(3, (p.net / max) * 100)}%`,
                      backgroundColor: GOLD,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.historyBar,
                    {
                      height: `${Math.max(3, (p.expenses / max) * 100)}%`,
                      backgroundColor: "#F87171",
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.historyMonth,
                  (isSel || isCmp) && { color: GOLD, fontWeight: "700" },
                ]}
                numberOfLines={1}
              >
                {monthLabel(p.month, t)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.historyLegend}>
        <View style={[styles.legendDot, { backgroundColor: GOLD }]} />
        <Text style={styles.legendText}>{t("home.legend.net")}</Text>
        <View
          style={[styles.legendDot, { backgroundColor: "#F87171", marginLeft: 14 }]}
        />
        <Text style={styles.legendText}>{t("top.expenses")}</Text>
        <Text style={[styles.legendText, { marginLeft: "auto", color: TEXT_3 }]}>
          {t("home.legend.tapHint")}
        </Text>
      </View>

      {!selectedPoint ? (
        <Text style={styles.historyMeta}>
          {tp("home.remaining", { amount: formatEuro(latest.remaining) })}
          {trendDelta !== null && prev
            ? tp("home.remaining.delta", {
                delta: `${trendDelta >= 0 ? "+" : "−"}${formatEuro(Math.abs(trendDelta))}`,
                month: monthLabel(prev.month, t),
              })
            : ""}
        </Text>
      ) : (
        <View style={styles.monthDetail}>
          {/* En-tête de la fiche mois / comparaison */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.monthDetailTitle}>
              {monthFullLabel(selectedPoint.month, t)}
              {comparePoint ? ` → ${monthFullLabel(comparePoint.month, t)}` : ""}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSelected(null);
                setCompare(null);
                setPicking(false);
              }}
              hitSlop={10}
              style={{ marginLeft: "auto" }}
            >
              <Feather name="x" size={16} color={TEXT_3} />
            </TouchableOpacity>
          </View>

          {picking ? (
            <Text style={styles.pickingHint}>{t("home.compare.hint")}</Text>
          ) : null}

          {/* Colonnes */}
          {comparePoint ? (
            <View style={styles.rowHeader}>
              <View style={{ flex: 1 }} />
              <Text style={styles.rowHeaderCell}>
                {monthLabel(selectedPoint.month, t)}
              </Text>
              <Text style={styles.rowHeaderCell}>
                {monthLabel(comparePoint.month, t)}
              </Text>
              <Text style={styles.rowHeaderCell}>{t("home.col.delta")}</Text>
            </View>
          ) : null}

          {buildRows(selectedPoint, comparePoint ?? undefined, t).map((row, i) => (
            <View key={`${row.label}-${i}`} style={styles.detailRow}>
              <Text
                style={[
                  styles.detailRowLabel,
                  row.indent && { paddingLeft: 14, color: TEXT_3 },
                  row.strong && { fontWeight: "700", color: TEXT_1 },
                ]}
                numberOfLines={1}
              >
                {row.label}
              </Text>
              <Text style={styles.detailRowValue}>
                {row.a !== undefined ? formatEuro(row.a) : "—"}
              </Text>
              {comparePoint ? (
                <>
                  <Text style={styles.detailRowValue}>
                    {row.b !== undefined ? formatEuro(row.b) : "—"}
                  </Text>
                  <View style={styles.detailRowDeltaCell}>
                    <DeltaText row={row} />
                  </View>
                </>
              ) : null}
            </View>
          ))}

          {!selectedPoint.breakdown && !comparePoint?.breakdown ? (
            <Text style={styles.historyEmpty}>{t("home.detail.partial")}</Text>
          ) : null}

          {/* Action comparer */}
          {!comparePoint && !picking && last.length > 1 ? (
            <TouchableOpacity
              style={styles.compareBtn}
              onPress={() => setPicking(true)}
              activeOpacity={0.85}
            >
              <Feather name="repeat" size={14} color={GOLD} />
              <Text style={styles.compareBtnText}>{t("home.compare.btn")}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

function Tile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.85}>
      <Feather name={icon} size={22} color={GOLD} />
      <Text style={styles.tileLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },

  signinHero: {
    alignItems: "center",
    padding: 24,
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 20,
  },
  signinIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: SURFACE_2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  signinTitle: {
    color: TEXT_1,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  signinBody: {
    color: TEXT_2,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 22,
    paddingHorizontal: 2,
  },
  consentBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: SURFACE_2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  consentBoxOn: { backgroundColor: GOLD, borderColor: GOLD },
  consentText: { color: TEXT_2, fontSize: 12, lineHeight: 18, flex: 1, textAlign: "left" },
  consentLink: { color: GOLD, textDecorationLine: "underline" },

  providerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 12,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  providerBtnText: { color: TEXT_1, fontSize: 15, fontWeight: "600" },

  signinFootnote: {
    color: TEXT_3,
    fontSize: 11,
    marginTop: 16,
    textAlign: "center",
    lineHeight: 16,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SURFACE_2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  avatarEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: MIDNIGHT,
  },
  profileName: { color: TEXT_1, fontSize: 15, fontWeight: "700", flexShrink: 1 },
  profileEmail: { color: TEXT_3, fontSize: 12, marginTop: 2 },

  completeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: GOLD,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  completeBannerTitle: { color: "#000", fontSize: 14, fontWeight: "800" },
  completeBannerText: { color: "rgba(0,0,0,0.7)", fontSize: 12, marginTop: 2 },
  scopeInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  scopeInlineText: { color: GOLD, fontSize: 12, fontWeight: "700" },

  overviewCard: {
    padding: 20,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  overviewLabel: {
    color: TEXT_2,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overviewRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 8 },
  overviewCurrent: {
    color: TEXT_1,
    fontSize: 28,
    fontWeight: "700",
    fontFamily: MONO_FONT,
  },
  overviewTarget: {
    color: TEXT_3,
    fontSize: 16,
    marginLeft: 8,
    marginBottom: 3,
    fontFamily: MONO_FONT,
  },
  overviewMeta: { color: TEXT_2, fontSize: 12, marginTop: 8 },
  progressBar: {
    marginTop: 12,
    height: 6,
    backgroundColor: SURFACE_2,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: MINT },

  historyCard: {
    padding: 20,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 4,
    marginBottom: 16,
  },
  historyDemoBtn: {
    color: TEXT_3,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
  },
  historyEmpty: {
    color: TEXT_3,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  historyChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    marginTop: 16,
    gap: 6,
  },
  historyCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 1,
  },
  historyColSelected: {
    borderColor: GOLD,
    backgroundColor: "rgba(74,222,128,0.08)",
  },
  historyBars: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
  },
  historyBar: {
    width: 7,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  historyMonth: {
    color: TEXT_3,
    fontSize: 9,
    marginTop: 6,
  },
  historyLegend: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendText: { color: TEXT_2, fontSize: 11 },
  historyMeta: {
    color: TEXT_2,
    fontSize: 12,
    marginTop: 10,
    fontFamily: MONO_FONT,
  },
  monthDetail: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  monthDetailTitle: {
    color: TEXT_1,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  pickingHint: {
    color: GOLD,
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 2,
  },
  rowHeaderCell: {
    width: 72,
    textAlign: "right",
    color: TEXT_3,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  detailRowLabel: { flex: 1, color: TEXT_2, fontSize: 12 },
  detailRowValue: {
    width: 72,
    textAlign: "right",
    color: TEXT_1,
    fontSize: 12,
    fontFamily: MONO_FONT,
  },
  detailRowDeltaCell: { width: 72, alignItems: "flex-end" },
  rowDelta: { fontSize: 12, fontWeight: "700", fontFamily: MONO_FONT },
  rowDeltaNeutral: { color: TEXT_3, fontSize: 12, fontFamily: MONO_FONT },
  compareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
  },
  compareBtnText: { color: GOLD, fontSize: 13, fontWeight: "600" },

  tilesRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  tile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 22,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tileLabel: { color: TEXT_1, fontSize: 13, fontWeight: "600" },
});
