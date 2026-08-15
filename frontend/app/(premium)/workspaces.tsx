// Écran Workspaces — gestion des scopes partagés (couple / famille / coloc).
//
// Affiche :
//  - Section "Compte perso" (toujours dispo, non-supprimable)
//  - Liste des workspaces où l'user est membre
//  - Bouton "+ Créer un espace"
//  - Sur chaque workspace : bouton pour switcher, voir membres, inviter, quitter
//  - Bouton "Rejoindre via un code" pour accepter une invitation

import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { confirmDialog, notify } from "../../src/utils/notify";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Share,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "react-native";
import { useLang } from "../../src/contexts/LangContext";
import { useSession } from "../../src/contexts/SessionContext";
import type { Lang } from "../../src/i18n/translations";
import { useActiveScope } from "../../src/hooks/useActiveScope";
import { pickAndUploadWorkspacePhoto } from "../../src/lib/photos";
import {
  acceptInvite,
  createInvite,
  createWorkspace,
  deleteWorkspace,
  leaveWorkspace,
  listMembersWithProfiles,
  listPendingInvites,
  type MemberWithProfile,
  listMyWorkspaces,
} from "../../src/lib/workspacesStore";
import type {
  Workspace,
  WorkspaceKind,
  WorkspaceMember,
} from "../../src/types/workspaces";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const SURFACE_2 = "#0F1B33";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const MINT = "#10B981";
const DANGER = "#DC2626";
const BORDER = "rgba(255,255,255,0.08)";
const MONO_FONT = Platform.OS === "ios" ? "Menlo" : "monospace";

// Le libellé est une CLÉ de traduction, résolue à l'affichage via t().
const KIND_OPTIONS: {
  value: WorkspaceKind;
  labelKey: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { value: "couple", labelKey: "ws.kind.couple", icon: "heart" },
  { value: "family", labelKey: "ws.kind.family", icon: "users" },
  { value: "coloc", labelKey: "ws.kind.coloc", icon: "home" },
  { value: "association", labelKey: "ws.kind.association", icon: "award" },
  { value: "other", labelKey: "ws.kind.other", icon: "more-horizontal" },
];

// Locale d'affichage des dates, dérivée de la langue de l'app.
const DATE_LOCALES: Record<Lang, string> = {
  fr: "fr-FR",
  en: "en-GB",
  es: "es-ES",
  pt: "pt-PT",
  de: "de-DE",
  it: "it-IT",
  ar: "ar",
  ja: "ja-JP",
};

// Suit la hauteur du clavier pour que les sheets flottent au-dessus
// (même pattern que GoalEditor — KeyboardAvoidingView pousse les sheets
// au-dessus de la status bar, on gère à la main).
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  return height;
}

export default function WorkspacesScreen() {
  const { t } = useLang();
  const { user } = useSession();
  const { workspaceId: activeId, setScope } = useActiveScope();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [detailWs, setDetailWs] = useState<Workspace | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const list = await listMyWorkspaces();
    setWorkspaces(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const onSwitchScope = useCallback(
    async (id: string | null, name?: string | null, kind?: WorkspaceKind | null) => {
      await setScope(id, name, kind);
      // Feedback rapide
      notify(
        t(id ? "ws.switched.space.title" : "ws.switched.personal.title"),
        t(id ? "ws.switched.space.msg" : "ws.switched.personal.msg"),
      );
    },
    [setScope, t],
  );

  const activeLabel =
    activeId === null
      ? t("ws.personalShort")
      : workspaces.find((w) => w.id === activeId)?.name ?? t("ws.deletedSpace");

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <Feather name="lock" size={32} color={TEXT_3} />
          <Text style={styles.emptyTitle}>{t("common.premiumRequired")}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.emptyBtn}
          >
            <Text style={styles.emptyBtnText}>{t("common.back")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={TEXT_1} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("ws.title")}</Text>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <TouchableOpacity onPress={reload} hitSlop={10}>
            <Feather name="refresh-cw" size={18} color={TEXT_2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
            router.navigate({ pathname: "/", params: { tab: "premium" } } as never)
          }
            hitSlop={10}
          >
            <Feather name="home" size={18} color={TEXT_2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <TouchableOpacity
          style={styles.activeCard}
          onPress={() => router.push("/(premium)/s1-epargne" as never)}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeLabel}>{t("ws.activeScope")}</Text>
              <Text style={styles.activeName}>{activeLabel}</Text>
              <Text style={styles.activeHint}>{t("ws.activeHint")}</Text>
            </View>
            <Feather name="chevron-right" size={22} color={TEXT_3} />
          </View>
        </TouchableOpacity>

        {/* Perso */}
        <ScopeCard
          name={t("ws.personalAccount")}
          subtitle={t("ws.personalSubtitle")}
          icon="user"
          active={activeId === null}
          onSwitch={() => onSwitchScope(null)}
        />

        {/* Workspaces */}
        {loading ? (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator color={GOLD} />
          </View>
        ) : workspaces.length === 0 ? null : (
          workspaces.map((ws) => (
            <ScopeCard
              key={ws.id}
              name={ws.name}
              subtitle={
                ws.description ||
                (() => {
                  const opt = KIND_OPTIONS.find((k) => k.value === ws.kind);
                  return opt ? t(opt.labelKey) : ws.kind;
                })()
              }
              icon={KIND_OPTIONS.find((k) => k.value === ws.kind)?.icon ?? "users"}
              photoUrl={ws.photo_url}
              active={activeId === ws.id}
              onSwitch={() => onSwitchScope(ws.id, ws.name, ws.kind)}
              onDetail={() => setDetailWs(ws)}
              isOwner={ws.owner_id === user.id}
            />
          ))
        )}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setCreateOpen(true)}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={18} color="#000" />
          <Text style={styles.primaryBtnText}>{t("ws.create")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setJoinOpen(true)}
          activeOpacity={0.85}
        >
          <Feather name="link" size={16} color={GOLD} />
          <Text style={styles.secondaryBtnText}>{t("ws.joinWithCode")}</Text>
        </TouchableOpacity>
      </ScrollView>

      <CreateModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async (ws) => {
          setCreateOpen(false);
          await reload();
          // Ouvre directement le détail : l'user peut inviter tout de suite
          // et récupérer le code d'invitation à partager.
          setDetailWs(ws);
        }}
      />

      <JoinModal
        visible={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={async () => {
          setJoinOpen(false);
          await reload();
        }}
      />

      {detailWs ? (
        <WorkspaceDetailModal
          workspace={detailWs}
          currentUserId={user.id}
          onClose={() => setDetailWs(null)}
          onDeleted={async () => {
            if (activeId === detailWs.id) await setScope(null);
            setDetailWs(null);
            await reload();
          }}
          onLeft={async () => {
            if (activeId === detailWs.id) await setScope(null);
            setDetailWs(null);
            await reload();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ============================================================================
// Scope card (Perso ou workspace)
// ============================================================================

function ScopeCard({
  name,
  subtitle,
  icon,
  photoUrl,
  active,
  onSwitch,
  onDetail,
  isOwner,
}: {
  name: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  photoUrl?: string | null;
  active: boolean;
  onSwitch: () => void;
  onDetail?: () => void;
  isOwner?: boolean;
}) {
  const { t } = useLang();
  return (
    <View style={[styles.scopeCard, active && styles.scopeCardActive]}>
      <View style={styles.scopeIconWrap}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={{ width: 40, height: 40, borderRadius: 20 }}
          />
        ) : (
          <Feather name={icon} size={20} color={active ? "#000" : GOLD} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.scopeName}>{name}</Text>
          {isOwner ? (
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>
                {t("ws.owner").toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.scopeSubtitle}>{subtitle}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {onDetail ? (
          <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("settings.title")} onPress={onDetail} hitSlop={10} style={styles.scopeBtn}>
            <Feather name="settings" size={16} color={TEXT_2} />
          </TouchableOpacity>
        ) : null}
        {active ? (
          <View style={[styles.scopeBtn, styles.scopeBtnActive]}>
            <Feather name="check" size={16} color="#000" />
          </View>
        ) : (
          <TouchableOpacity
            onPress={onSwitch}
            hitSlop={10}
            style={[styles.scopeBtn, { backgroundColor: SURFACE_2 }]}
            activeOpacity={0.85}
          >
            <Text style={styles.scopeBtnText}>{t("ws.activate")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// Modal "Créer un espace"
// ============================================================================

function CreateModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (ws: Workspace) => void;
}) {
  const { t } = useLang();
  const keyboardHeight = useKeyboardHeight();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<WorkspaceKind>("family");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setName("");
      setDescription("");
      setKind("family");
      setBusy(false);
    }
  }, [visible]);

  async function submit() {
    if (!name.trim()) {
      notify(t("ws.err.nameMissing.title"), t("ws.err.nameMissing.msg"));
      return;
    }
    setBusy(true);
    const result = await createWorkspace(name.trim(), kind, description);
    setBusy(false);
    if (!result.ok || !result.workspace) {
      notify(t("common.error"), result.error ?? t("ws.err.createFailed"));
      return;
    }
    onCreated(result.workspace);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: 36, marginBottom: keyboardHeight }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t("ws.new.title")}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("common.close")} onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={TEXT_2} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{t("ws.field.name")}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t("ws.name.placeholder")}
            placeholderTextColor={TEXT_3}
            autoFocus
          />

          <Text style={styles.label}>{t("ws.field.description")}</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder={t("ws.description.placeholder")}
            placeholderTextColor={TEXT_3}
            maxLength={80}
          />

          <Text style={styles.label}>{t("ws.field.kind")}</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            {KIND_OPTIONS.map((k) => {
              const active = k.value === kind;
              return (
                <TouchableOpacity
                  key={k.value}
                  onPress={() => setKind(k.value)}
                  style={[styles.kindChip, active && styles.kindChipActive]}
                  activeOpacity={0.85}
                >
                  <Feather name={k.icon} size={14} color={active ? "#000" : TEXT_2} />
                  <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>
                    {t(k.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 20 }]}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Feather name="plus" size={18} color="#000" />
                <Text style={styles.primaryBtnText}>{t("ws.create.submit")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// Modal "Rejoindre via un code"
// ============================================================================

function JoinModal({
  visible,
  onClose,
  onJoined,
}: {
  visible: boolean;
  onClose: () => void;
  onJoined: () => void;
}) {
  const { t } = useLang();
  const keyboardHeight = useKeyboardHeight();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setToken("");
      setBusy(false);
    }
  }, [visible]);

  async function submit() {
    if (!token.trim()) {
      notify(t("ws.err.codeMissing.title"), t("ws.err.codeMissing.msg"));
      return;
    }
    setBusy(true);
    const result = await acceptInvite(token.trim());
    setBusy(false);
    if (!result.ok) {
      notify(t("ws.err.joinFailed"), result.error ?? t("common.unknownError"));
      return;
    }
    notify(t("ws.joined.title"), t("ws.joined.msg"));
    onJoined();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: 36, marginBottom: keyboardHeight }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t("ws.join.title")}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("common.close")} onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={TEXT_2} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sheetIntro}>{t("ws.join.intro")}</Text>

          <Text style={styles.label}>{t("ws.field.code")}</Text>
          <TextInput
            style={[styles.input, { fontFamily: MONO_FONT, fontSize: 12 }]}
            value={token}
            onChangeText={setToken}
            placeholder="abc123XYZ..."
            placeholderTextColor={TEXT_3}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 20 }]}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Feather name="log-in" size={18} color="#000" />
                <Text style={styles.primaryBtnText}>{t("ws.join.submit")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// Modal "Détail de l'espace" (membres, inviter, quitter/supprimer)
// ============================================================================

function WorkspaceDetailModal({
  workspace,
  currentUserId,
  onClose,
  onDeleted,
  onLeft,
}: {
  workspace: Workspace;
  currentUserId: string;
  onClose: () => void;
  onDeleted: () => void;
  onLeft: () => void;
}) {
  const { lang, t, tp } = useLang();
  const keyboardHeight = useKeyboardHeight();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    workspace.photo_url ?? null,
  );
  const [busyPhoto, setBusyPhoto] = useState(false);
  const isOwner = workspace.owner_id === currentUserId;
  const maxSheetHeight =
    Dimensions.get("window").height - 80 - keyboardHeight;

  async function changePhoto() {
    if (!isOwner) return;
    setBusyPhoto(true);
    const result = await pickAndUploadWorkspacePhoto(workspace.id);
    setBusyPhoto(false);
    if (result.ok) {
      setPhotoUrl(result.url);
    } else if (result.reason === "permission") {
      notify(t("common.photos"), t("common.photosPermission"));
    } else if (result.reason === "error") {
      notify(
        t("common.uploadFailed"),
        result.message ?? t("common.unknownError"),
      );
    }
  }

  // Invitations déjà envoyées et encore valables : on doit pouvoir les
  // repartager sans en générer une nouvelle.
  const [openInvites, setOpenInvites] = useState<
    { id: string; email: string; token: string; expires_at: string }[]
  >([]);

  const reloadInvites = useCallback(async () => {
    const list = await listPendingInvites(workspace.id);
    setOpenInvites(list);
  }, [workspace.id]);

  useEffect(() => {
    (async () => {
      const m = await listMembersWithProfiles(workspace.id);
      setMembers(m);
      await reloadInvites();
      setLoading(false);
    })();
  }, [workspace.id, reloadInvites]);

  // Partage du lien d'invitation via la feuille système (WhatsApp, Mail, SMS).
  // Le lien profond ouvre l'app directement sur l'écran « rejoindre » ; le code
  // reste écrit en clair pour ceux qui n'ont pas encore installé l'app.
  async function shareInvite(token: string) {
    const link = Linking.createURL("/(premium)/workspaces", { queryParams: { join: token } });
    const name = workspace.name ?? t("ws.share.fallbackName");
    try {
      await Share.share({
        message: tp("ws.share.message", { name, token, link }),
        title: tp("ws.share.title", { name }),
      });
    } catch {
      // partage annulé
    }
  }

  // Génère un code d'invitation. L'e-mail n'est plus demandé : il rendait
  // l'invitation ingérable (Apple masque l'adresse, Google en renvoie une
  // autre, fautes de frappe) alors que le code seul suffit — 256 bits,
  // usage unique, expiration 14 jours.
  async function sendInvite() {
    setBusy(true);
    const result = await createInvite(workspace.id);
    setBusy(false);
    if (!result.ok || !result.invite) {
      notify(t("common.error"), inviteErrorLabel(result.error));
      return;
    }
    setPendingToken(result.invite.token);
    Keyboard.dismiss();
    void reloadInvites();
  }

  // Traduit les codes techniques renvoyés par le store.
  function inviteErrorLabel(code?: string): string {
    switch (code) {
      case "invalid_invite":
        return t("ws.err.inviteInvalid");
      case "unauthenticated":
        return t("ws.err.notSignedIn");
      case "not_deployed":
        return t("ws.err.inviteNotReady");
      default:
        return code || t("ws.err.inviteFailed");
    }
  }

  // confirmDialog et NON Alert.alert : sur le web, un Alert à boutons est un
  // no-op silencieux — le clic ne déclenchait strictement rien.
  function confirmDelete() {
    confirmDialog(
      t("ws.delete.title"),
      tp("ws.delete.msg", { name: workspace.name }),
      t("btn.delete"),
      async () => {
        const r = await deleteWorkspace(workspace.id);
        if (!r.ok) {
          notify(
            t("common.error"),
            r.error === "not_owner"
              ? t("ws.err.deleteNotOwner")
              : (r.error ?? t("ws.err.deleteFailed")),
          );
          return;
        }
        onDeleted();
      },
      { cancelLabel: t("btn.cancel"), destructive: true },
    );
  }


  function confirmLeave() {
    confirmDialog(
      t("ws.leave.title"),
      t("ws.leave.msg"),
      t("ws.leave.confirm"),
      async () => {
        const r = await leaveWorkspace(workspace.id);
        if (!r.ok) {
          notify(t("common.error"), r.error ?? t("ws.err.leaveFailed"));
          return;
        }
        onLeft();
      },
      { cancelLabel: t("btn.cancel"), destructive: true },
    );
  }


  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight: maxSheetHeight, marginBottom: keyboardHeight }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <TouchableOpacity
                onPress={changePhoto}
                activeOpacity={isOwner ? 0.8 : 1}
                disabled={!isOwner || busyPhoto}
              >
                <View style={styles.wsPhoto}>
                  {busyPhoto ? (
                    <ActivityIndicator color={GOLD} size="small" />
                  ) : photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={styles.wsPhotoImg} />
                  ) : (
                    <Feather name="image" size={18} color={TEXT_3} />
                  )}
                  {isOwner ? (
                    <View style={styles.wsPhotoEditBadge}>
                      <Feather name="camera" size={9} color="#000" />
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {workspace.name}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("common.close")} onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={TEXT_2} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>
              {t("ws.members")} {loading ? "…" : `(${members.length})`}
            </Text>
            {loading ? (
              <ActivityIndicator color={GOLD} />
            ) : (
              members.map((m) => {
                const displayName =
                  m.user_id === currentUserId
                    ? t("ws.you")
                    : m.username ?? m.first_name ?? m.user_id.slice(0, 8) + "…";
                return (
                  <View key={m.user_id} style={styles.memberRow}>
                    <View style={styles.memberAvatar}>
                      {m.avatar_url ? (
                        <Image
                          source={{ uri: m.avatar_url }}
                          style={styles.memberAvatarImg}
                        />
                      ) : (
                        <Feather
                          name={m.role === "owner" ? "star" : "user"}
                          size={14}
                          color={m.role === "owner" ? GOLD : TEXT_2}
                        />
                      )}
                    </View>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>
                        {m.role === "owner" ? t("ws.role.owner") : t("ws.role.member")}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}

            {isOwner ? (
              <>
                <Text style={[styles.label, { marginTop: 16 }]}>
                  {t("ws.invite.title")}
                </Text>
                <Text style={styles.tokenHint}>{t("ws.invite.howto")}</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.iconBtn, { flex: 1, flexDirection: "row", gap: 8 }]}
                    onPress={sendInvite}
                    disabled={busy}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={t("ws.invite.generate")}
                  >
                    {busy ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <>
                        <Feather name="link" size={17} color="#000" />
                        <Text style={styles.iconBtnText}>{t("ws.invite.generate")}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Invitations en attente : repartageables à tout moment */}
                {openInvites.length > 0 ? (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Text style={styles.tokenLabel}>{t("ws.invite.pending")}</Text>
                    {openInvites.map((inv) => (
                      <View key={inv.id} style={styles.inviteRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.inviteEmail} numberOfLines={1}>
                            {inv.email}
                          </Text>
                          <Text style={styles.inviteMeta}>
                            {tp("ws.invite.expires", {
                              date: new Date(inv.expires_at).toLocaleDateString(
                                DATE_LOCALES[lang],
                              ),
                            })}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={async () => {
                            await Clipboard.setStringAsync(inv.token);
                            notify(t("ws.copied.title"), t("ws.copied.msg"));
                          }}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={tp("ws.invite.copyA11y", {
                            email: inv.email,
                          })}
                        >
                          <Feather name="copy" size={17} color={TEXT_2} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => shareInvite(inv.token)}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={tp("ws.invite.shareA11y", {
                            email: inv.email,
                          })}
                        >
                          <Feather name="share-2" size={17} color={GOLD} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}

                {pendingToken ? (
                  <View style={styles.tokenBox}>
                    <Text style={styles.tokenLabel}>{t("ws.token.label")}</Text>
                    <Text selectable style={styles.tokenValue}>
                      {pendingToken}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                      <TouchableOpacity
                        style={styles.tokenActionBtn}
                        activeOpacity={0.85}
                        onPress={async () => {
                          await Clipboard.setStringAsync(pendingToken);
                          notify(t("ws.copied.title"), t("ws.copied.msg"));
                        }}
                      >
                        <Feather name="copy" size={15} color={GOLD} />
                        <Text style={styles.tokenActionText}>{t("ws.token.copy")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.tokenActionBtn, styles.tokenActionPrimary]}
                        activeOpacity={0.85}
                        onPress={() => shareInvite(pendingToken)}
                      >
                        <Feather name="share-2" size={15} color="#000" />
                        <Text style={[styles.tokenActionText, { color: "#000" }]}>
                          {t("ws.token.share")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.tokenHint}>{t("ws.token.hint")}</Text>
                  </View>
                ) : null}

                <View style={{ height: 20 }} />
                <TouchableOpacity
                  onPress={confirmDelete}
                  style={styles.dangerBtn}
                  activeOpacity={0.85}
                >
                  <Feather name="trash-2" size={16} color="#fff" />
                  <Text style={styles.dangerBtnText}>{t("ws.deleteSpaceBtn")}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={confirmLeave}
                style={[styles.dangerBtn, { marginTop: 20 }]}
                activeOpacity={0.85}
              >
                <Feather name="log-out" size={16} color="#fff" />
                <Text style={styles.dangerBtnText}>{t("ws.leaveSpaceBtn")}</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

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

  activeCard: {
    padding: 16,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 24,
  },
  activeLabel: {
    color: TEXT_3,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  activeName: {
    color: GOLD,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  activeHint: { color: TEXT_2, fontSize: 12, marginTop: 8, lineHeight: 18 },

  scopeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
  },
  scopeCardActive: { borderColor: GOLD, backgroundColor: SURFACE_2 },
  scopeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE_2,
    alignItems: "center",
    justifyContent: "center",
  },
  scopeName: { color: TEXT_1, fontSize: 15, fontWeight: "600" },
  scopeSubtitle: { color: TEXT_3, fontSize: 12, marginTop: 2 },
  scopeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
  scopeBtnActive: { backgroundColor: GOLD },
  scopeBtnText: { color: TEXT_1, fontSize: 12, fontWeight: "600" },
  ownerBadge: {
    backgroundColor: GOLD,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ownerBadgeText: { color: "#000", fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  primaryBtnText: { color: "#000", fontSize: 15, fontWeight: "700" },

  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 10,
  },
  secondaryBtnText: { color: GOLD, fontSize: 14, fontWeight: "600" },

  // ============ Modals ============
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: MIDNIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: BORDER,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: BORDER,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: { color: TEXT_1, fontSize: 18, fontWeight: "600", flexShrink: 1 },

  wsPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  wsPhotoImg: { width: 40, height: 40, borderRadius: 20 },
  wsPhotoEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: MIDNIGHT,
  },
  sheetIntro: { color: TEXT_2, fontSize: 13, lineHeight: 20, marginBottom: 8 },

  label: {
    color: TEXT_2,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: SURFACE,
    color: TEXT_1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 44,
  },
  kindChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  kindChipActive: { backgroundColor: GOLD, borderColor: GOLD },
  kindChipText: { color: TEXT_2, fontSize: 13, fontWeight: "500" },
  kindChipTextActive: { color: "#000", fontWeight: "700" },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  memberId: { color: TEXT_1, fontSize: 13, flex: 1, fontFamily: MONO_FONT },
  memberName: { color: TEXT_1, fontSize: 14, flex: 1, fontWeight: "600" },
  memberAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: SURFACE_2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  memberAvatarImg: { width: 30, height: 30, borderRadius: 15 },
  roleBadge: {
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleBadgeText: {
    color: TEXT_2,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },

  tokenBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: MINT,
  },
  tokenLabel: {
    color: MINT,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tokenValue: {
    color: TEXT_1,
    fontSize: 12,
    fontFamily: MONO_FONT,
    lineHeight: 18,
    marginBottom: 8,
  },
  iconBtnText: { color: "#000", fontSize: 14, fontWeight: "700" },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: MIDNIGHT,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  inviteEmail: { color: TEXT_1, fontSize: 13.5, fontWeight: "600" },
  inviteMeta: { color: TEXT_3, fontSize: 11.5, marginTop: 2 },
  tokenActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.4)",
  },
  tokenActionPrimary: { backgroundColor: GOLD, borderColor: GOLD },
  tokenActionText: { color: GOLD, fontSize: 13, fontWeight: "700" },
  tokenHint: { color: TEXT_3, fontSize: 12, lineHeight: 17 },

  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DANGER,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dangerBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  emptyTitle: { color: TEXT_1, fontSize: 16, fontWeight: "600", marginTop: 16, textAlign: "center" },
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
