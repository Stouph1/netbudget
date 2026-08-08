// API workspaces : create / list / invite / accept / leave.
//
// Toutes les opérations traversent Supabase (protégées par RLS).
// Les payloads (S1, advice profile, etc.) ne sont PAS gérés ici — ils
// vivent dans premiumStore.ts qui prend maintenant un workspaceId optionnel.

import * as Crypto from "expo-crypto";
import type {
  Workspace,
  WorkspaceInvite,
  WorkspaceKind,
  WorkspaceMember,
} from "../types/workspaces";
import { supabase } from "./supabase";

// ============================================================================
// Workspaces CRUD
// ============================================================================

export async function listMyWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Workspace[];
}

export async function createWorkspace(
  name: string,
  kind: WorkspaceKind = "family",
  description?: string,
): Promise<{ ok: boolean; workspace?: Workspace; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) {
    return { ok: false, error: "Non authentifié" };
  }
  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      owner_id: userData.user.id,
      name: name.trim(),
      kind,
      description: description?.trim() || null,
    })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, workspace: data as Workspace };
}

export async function updateWorkspaceDescription(
  workspaceId: string,
  description: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("workspaces")
    .update({ description: description.trim() || null })
    .eq("id", workspaceId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteWorkspace(
  workspaceId: string,
): Promise<{ ok: boolean; error?: string }> {
  // Voie principale : fonction serveur qui vérifie la propriété puis supprime.
  // Elle évite les subtilités de RLS où un DELETE filtré ne supprime rien SANS
  // renvoyer d'erreur — l'utilisateur croyait alors que ça avait marché.
  const rpc = await supabase.rpc("delete_own_workspace", { ws_id: workspaceId });
  if (!rpc.error) return { ok: true };

  // Repli : suppression directe, avec vérification explicite du résultat.
  const { data, error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    // 0 ligne supprimée = la policy a filtré. Ne jamais annoncer un succès.
    return { ok: false, error: "not_owner" };
  }
  return { ok: true };
}

// ============================================================================
// Members
// ============================================================================

export async function listMembers(
  workspaceId: string,
): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId);
  if (error) return [];
  return (data ?? []) as WorkspaceMember[];
}

// Membre enrichi du profil public (username, avatar, prénom) — lisible entre
// co-membres grâce à la policy "profiles select workspace comembers" (migr. 007).
export type MemberWithProfile = WorkspaceMember & {
  username: string | null;
  avatar_url: string | null;
  first_name: string | null;
};

export async function listMembersWithProfiles(
  workspaceId: string,
): Promise<MemberWithProfile[]> {
  const members = await listMembers(workspaceId);
  if (members.length === 0) return [];

  const ids = members.map((m) => m.user_id);
  // Vue à colonnes réduites : `profiles` exposait aussi nom, date de
  // naissance, ville, statut pro et dîme aux co-membres (migration 011).
  const { data } = await supabase
    .from("member_profiles")
    .select("id, username, avatar_url, first_name")
    .in("id", ids);

  const profileById = new Map(
    (data ?? []).map((p) => [p.id as string, p]),
  );
  return members.map((m) => {
    const p = profileById.get(m.user_id);
    return {
      ...m,
      username: (p?.username as string | null) ?? null,
      avatar_url: (p?.avatar_url as string | null) ?? null,
      first_name: (p?.first_name as string | null) ?? null,
    };
  });
}

export async function leaveWorkspace(
  workspaceId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) return { ok: false, error: "Non authentifié" };
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userData.user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================================================
// Invitations
// ============================================================================

// Génère un token opaque (256 bits base64url) pour l'invitation.
// expo-crypto : source d'aléa native fiable, dispo aussi dans Expo Go
// (globalThis.crypto.getRandomValues n'existe pas dans Expo Go → crash).
function genInviteToken(): string {
  const bytes = Crypto.getRandomBytes(32);
  let b64 = "";
  for (const b of bytes) b64 += String.fromCharCode(b);
  return globalThis.btoa(b64).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Crée un code d'invitation à usage unique.
 *
 * L'e-mail est FACULTATIF et purement mémo (« à qui ai-je donné ce code ? ») :
 * il ne conditionne plus l'acceptation. L'exiger rendait les invitations
 * ingérables — connexion Apple avec e-mail masqué, adresse Google différente
 * de celle saisie, faute de frappe — et l'invité restait bloqué sans
 * comprendre. La sécurité repose sur le code : 256 bits d'entropie, usage
 * unique, expiration à 14 jours, révocable.
 */
export async function createInvite(
  workspaceId: string,
  email?: string,
): Promise<{ ok: boolean; invite?: WorkspaceInvite; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) return { ok: false, error: "unauthenticated" };
  const token = genInviteToken();
  const note = email?.trim().toLowerCase() || null;
  const { data, error } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      inviter_id: userData.user.id,
      email: note,
      token,
      status: "pending",
    })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, invite: data as WorkspaceInvite };
}

export async function cancelInvite(
  inviteId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("workspace_invites")
    .update({ status: "cancelled" })
    .eq("id", inviteId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Accepte une invite via son token — utilisé sur deep link ou saisie manuelle.
// Doit :
//  1. Vérifier que le token existe, status = pending, non expiré
//  2. Vérifier que l'email invité match l'auth.uid()
//  3. Insérer dans workspace_members
//  4. Marquer l'invite comme accepted
// Invitations encore valables d'un espace (pour les repartager sans en
// recréer une). La policy SELECT limite déjà aux invitations que l'appelant a
// le droit de voir (inviteur ou destinataire).
export async function listPendingInvites(
  workspaceId: string,
): Promise<{ id: string; email: string; token: string; expires_at: string }[]> {
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("id, email, token, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as { id: string; email: string; token: string; expires_at: string }[];
}

export async function acceptInvite(
  token: string,
): Promise<{ ok: boolean; workspaceId?: string; error?: string }> {
  // La validation (token, statut, expiration, correspondance d'email) est
  // faite EN BASE par la fonction SECURITY DEFINER accept_invite : les
  // contrôles côté client sont contournables en appelant PostgREST direct,
  // et workspace_members n'a volontairement aucune policy INSERT.
  const { data, error } = await supabase.rpc("accept_invite", {
    invite_token: token,
  });
  if (error) {
    // Codes d'erreur techniques : l'écran les traduit pour l'utilisateur.
    const raw = error.message ?? "";
    const code = raw.includes("invalid_invite")
      ? "invalid_invite"
      : raw.includes("unauthenticated")
        ? "unauthenticated"
        : raw.includes("Could not find the function")
          ? "not_deployed"
          : raw;
    return { ok: false, error: code };
  }
  return { ok: true, workspaceId: (data as string) ?? undefined };
}

export async function listMyPendingInvites(): Promise<WorkspaceInvite[]> {
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as WorkspaceInvite[];
}
