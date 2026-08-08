// Bottom-sheet léger pour changer de scope (Perso / workspace) SANS quitter
// l'écran courant. Réutilisé depuis S1, Conseils, et le panel Profil — évite
// à l'user de repasser par l'écran Workspaces juste pour switcher.
//
// Gérer/inviter/supprimer un workspace reste dans l'écran Workspaces complet ;
// ce composant ne fait QUE lister + activer.

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useActiveScope } from "../hooks/useActiveScope";
import { listMyWorkspaces } from "../lib/workspacesStore";
import type { Workspace, WorkspaceKind } from "../types/workspaces";

const MIDNIGHT = "#0F172A";
const SURFACE = "#1A2238";
const SURFACE_2 = "#0F1B33";
const TEXT_1 = "#FFFFFF";
const TEXT_2 = "#94A3B8";
const TEXT_3 = "#8193AC";
const GOLD = "#4ADE80";
const BORDER = "rgba(255,255,255,0.08)";

const KIND_ICON: Record<WorkspaceKind, keyof typeof Feather.glyphMap> = {
  couple: "heart",
  family: "users",
  coloc: "home",
  association: "award",
  other: "more-horizontal",
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ScopeSwitcher({ visible, onClose }: Props) {
  const { workspaceId, setScope } = useActiveScope();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const list = await listMyWorkspaces();
    setWorkspaces(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload]);

  async function activate(id: string | null, name?: string | null, kind?: WorkspaceKind | null) {
    await setScope(id, name, kind);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Changer de scope</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Fermer" onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={TEXT_2} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.row, workspaceId === null && styles.rowActive]}
            onPress={() => activate(null)}
            activeOpacity={0.85}
          >
            <View style={styles.iconWrap}>
              <Feather name="user" size={18} color={workspaceId === null ? "#000" : GOLD} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>Compte personnel</Text>
              <Text style={styles.rowSubtitle}>Tes données privées</Text>
            </View>
            {workspaceId === null ? <Feather name="check" size={18} color={GOLD} /> : null}
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator color={GOLD} style={{ marginVertical: 20 }} />
          ) : (
            workspaces.map((ws) => {
              const active = workspaceId === ws.id;
              return (
                <TouchableOpacity
                  key={ws.id}
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => activate(ws.id, ws.name, ws.kind)}
                  activeOpacity={0.85}
                >
                  <View style={styles.iconWrap}>
                    {ws.photo_url ? (
                      <Image source={{ uri: ws.photo_url }} style={styles.iconImg} />
                    ) : (
                      <Feather
                        name={KIND_ICON[ws.kind] ?? "users"}
                        size={18}
                        color={active ? "#000" : GOLD}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{ws.name}</Text>
                    {ws.description ? (
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {ws.description}
                      </Text>
                    ) : null}
                  </View>
                  {active ? <Feather name="check" size={18} color={GOLD} /> : null}
                </TouchableOpacity>
              );
            })
          )}

          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() => {
              onClose();
              router.push("/(premium)/workspaces" as never);
            }}
            activeOpacity={0.85}
          >
            <Feather name="settings" size={16} color={TEXT_2} />
            <Text style={styles.manageBtnText}>Gérer mes espaces</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: MIDNIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { color: TEXT_1, fontSize: 17, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 8,
  },
  rowActive: { borderColor: GOLD, backgroundColor: SURFACE_2 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE_2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconImg: { width: 36, height: 36, borderRadius: 18 },
  rowName: { color: TEXT_1, fontSize: 14, fontWeight: "600" },
  rowSubtitle: { color: TEXT_3, fontSize: 11, marginTop: 2 },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  manageBtnText: { color: TEXT_2, fontSize: 13, fontWeight: "600" },
});
