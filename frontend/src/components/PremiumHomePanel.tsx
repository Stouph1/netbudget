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
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ScopeSwitcher from "./ScopeSwitcher";
import { useSession } from "../contexts/SessionContext";
import { useActiveScope } from "../hooks/useActiveScope";
import { signInWithApple, signOut } from "../lib/auth";
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
const TEXT_3 = "#64748B";
const GOLD = "#4ADE80";
const MINT = "#10B981";
const BORDER = "rgba(255,255,255,0.08)";
const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

function formatEuro(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

const MONTHS_FR = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

function monthLabel(month: string): string {
  const idx = parseInt(month.slice(5), 10) - 1;
  return MONTHS_FR[idx] ?? month;
}

type Props = {
  // Naviguer vers le tab Budget (depuis le tab: setTab; depuis la route: back)
  onGoBudget?: () => void;
};

export default function PremiumHomePanel({ onGoBudget }: Props) {
  const { user, loading: sessionLoading } = useSession();
  const { workspaceId, scopeLabel, loading: scopeLoading } = useActiveScope();
  const [s1, setS1] = useState<S1Payload | null>(null);
  const [history, setHistory] = useState<BudgetHistoryPoint[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [busyAuth, setBusyAuth] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || scopeLoading) return;
      let cancelled = false;
      (async () => {
        const [payload, basics, hist] = await Promise.all([
          loadS1(user.id, workspaceId),
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
      Alert.alert(
        "Photos",
        "Autorise l'accès à tes photos dans les réglages du téléphone.",
      );
    } else if (result.reason === "error") {
      Alert.alert("Upload échoué", result.message ?? "Erreur inconnue");
    }
  }, [user?.id]);

  async function handleApple() {
    setBusyAuth(true);
    const result = await signInWithApple();
    setBusyAuth(false);
    if (!result.ok && result.reason !== "cancelled") {
      Alert.alert("Connexion", result.message ?? result.reason);
      return;
    }
    if (result.ok) {
      // Première connexion (ou inscription incomplète) → écran d'inscription
      const basics = await loadProfileBasics(result.userId);
      if (!basics.username) {
        router.push("/(premium)/complete-profile" as never);
      }
    }
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
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View style={styles.signinHero}>
          <View style={styles.signinIconWrap}>
            <Feather name="user" size={36} color={GOLD} />
          </View>
          <Text style={styles.signinTitle}>Ton espace NetBudget</Text>
          <Text style={styles.signinBody}>
            Pas besoin de compte pour utiliser NetBudget — ton budget reste
            100% sur ton téléphone.
          </Text>
          <Text style={[styles.signinBody, { marginTop: 10 }]}>
            Un compte débloque les fonctions Premium : synchronisation
            chiffrée, budgets partagés en couple ou en famille, et conseils
            personnalisés.
          </Text>

          {Platform.OS === "ios" ? (
            busyAuth ? (
              <View style={{ height: 52, marginTop: 24, justifyContent: "center" }}>
                <ActivityIndicator color={GOLD} />
              </View>
            ) : (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                }
                cornerRadius={12}
                style={{ width: "100%", height: 52, marginTop: 24 }}
                onPress={handleApple}
              />
            )
          ) : (
            <Text style={[styles.signinBody, { marginTop: 24, fontStyle: "italic" }]}>
              La connexion Google arrive bientôt sur Android.
            </Text>
          )}

          <Text style={styles.signinFootnote}>
            Gratuit pendant le développement. Aucune donnée n'est partagée sans
            ton accord.
          </Text>
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
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      {!username ? (
        <TouchableOpacity
          style={styles.completeBanner}
          onPress={() => router.push("/(premium)/complete-profile" as never)}
          activeOpacity={0.85}
        >
          <Feather name="alert-circle" size={18} color="#000" />
          <View style={{ flex: 1 }}>
            <Text style={styles.completeBannerTitle}>Finalise ton inscription</Text>
            <Text style={styles.completeBannerText}>
              Pseudo, photo et profil — 1 minute pour débloquer tes conseils.
            </Text>
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
                {username ?? "Choisir un nom d'utilisateur"}
              </Text>
              <Feather name="edit-2" size={11} color={TEXT_3} />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {user.email ?? "email masqué"}
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
            <Text style={styles.scopeInlineText}>{scopeLabel}</Text>
            <Feather name="chevron-down" size={12} color={TEXT_3} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Déconnexion", "Te déconnecter de ton compte ?", [
              { text: "Annuler", style: "cancel" },
              { text: "Déconnexion", style: "destructive", onPress: () => signOut() },
            ])
          }
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
        <Text style={styles.overviewLabel}>Épargne · {scopeLabel}</Text>
        <View style={styles.overviewRow}>
          <Text style={styles.overviewCurrent}>{formatEuro(current)}</Text>
          <Text style={styles.overviewTarget}>/ {formatEuro(target)}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.overviewMeta}>
          {activeGoals.length} objectif{activeGoals.length > 1 ? "s" : ""} ·{" "}
          {pct.toFixed(0)}%
        </Text>
      </TouchableOpacity>

      {/* Tuiles navigation */}
      <View style={styles.tilesRow}>
        <Tile
          icon="target"
          label="S1 · Épargne"
          onPress={() => router.push("/(premium)/s1-epargne" as never)}
        />
        <Tile
          icon="compass"
          label="Conseils"
          onPress={() => router.push("/(premium)/advice" as never)}
        />
      </View>
      <View style={styles.tilesRow}>
        <Tile
          icon="users"
          label="Workspaces"
          onPress={() => router.push("/(premium)/workspaces" as never)}
        />
        <Tile
          icon="pie-chart"
          label="Budget"
          onPress={() => (onGoBudget ? onGoBudget() : router.back())}
        />
      </View>

      {/* Évolution du budget — historique mensuel du scope actif */}
      <BudgetHistoryCard
        points={history}
        scopeLabel={scopeLabel}
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

// Graphe barres simple (12 derniers mois) : net vs dépenses, par scope.
// Les points sont enregistrés automatiquement par le tab Budget.
function BudgetHistoryCard({
  points,
  scopeLabel,
  onSeedDemo,
}: {
  points: BudgetHistoryPoint[];
  scopeLabel: string;
  onSeedDemo?: () => void; // __DEV__ uniquement — absent en prod
}) {
  const last = points.slice(-12);

  const header = (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={[styles.overviewLabel, { flex: 1 }]}>
        Évolution du budget · {scopeLabel}
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
        <Text style={styles.historyEmpty}>
          {"L'historique se construit tout seul, mois après mois, dès que le tab Budget est rempli dans ce scope. Reviens le mois prochain pour voir la tendance."}
        </Text>
      </View>
    );
  }

  const max = Math.max(...last.map((p) => Math.max(p.net, p.expenses)), 1);
  const latest = last[last.length - 1];
  const prev = last.length > 1 ? last[last.length - 2] : null;
  const delta = prev ? latest.remaining - prev.remaining : null;

  return (
    <View style={styles.historyCard}>
      {header}

      <View style={styles.historyChart}>
        {last.map((p) => (
          <View key={p.month} style={styles.historyCol}>
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
            <Text style={styles.historyMonth} numberOfLines={1}>
              {monthLabel(p.month)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.historyLegend}>
        <View style={[styles.legendDot, { backgroundColor: GOLD }]} />
        <Text style={styles.legendText}>Net</Text>
        <View
          style={[styles.legendDot, { backgroundColor: "#F87171", marginLeft: 14 }]}
        />
        <Text style={styles.legendText}>Dépenses</Text>
      </View>

      <Text style={styles.historyMeta}>
        Reste à vivre : {formatEuro(latest.remaining)}
        {delta !== null && prev
          ? ` · ${delta >= 0 ? "+" : "−"}${formatEuro(Math.abs(delta))} vs ${monthLabel(prev.month)}`
          : ""}
      </Text>
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
  historyCol: { flex: 1, alignItems: "center", height: "100%" },
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
