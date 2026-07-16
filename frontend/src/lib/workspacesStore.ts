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
): Promise<{ ok: boolean; workspace?: Workspace; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) {
    return { ok: false, error: "Non authentifié" };
  }
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: userData.user.id, name: name.trim(), kind })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, workspace: data as Workspace };
}

export async function deleteWorkspace(
  workspaceId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);
  if (error) return { ok: false, error: error.message };
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

export async function createInvite(
  workspaceId: string,
  email: string,
): Promise<{ ok: boolean; invite?: WorkspaceInvite; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) return { ok: false, error: "Non authentifié" };
  const token = genInviteToken();
  const { data, error } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      inviter_id: userData.user.id,
      email: email.trim().toLowerCase(),
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
export async function acceptInvite(
  token: string,
): Promise<{ ok: boolean; workspaceId?: string; error?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) return { ok: false, error: "Non authentifié" };

  // 1. Fetch invite via token
  const { data: invite, error: fetchErr } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (fetchErr || !invite) return { ok: false, error: "Invitation invalide" };
  if (invite.status !== "pending") {
    return { ok: false, error: `Invitation ${invite.status}` };
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Invitation expirée" };
  }

  // 2. Vérifier email match (via l'email JWT)
  const userEmail = userData.user.email?.toLowerCase() ?? "";
  if (invite.email.toLowerCase() !== userEmail) {
    return { ok: false, error: "Cette invitation est pour un autre email" };
  }

  // 3. Insert member
  const { error: memberErr } = await supabase.from("workspace_members").insert({
    workspace_id: invite.workspace_id,
    user_id: userData.user.id,
    role: "member",
  });
  if (memberErr) return { ok: false, error: memberErr.message };

  // 4. Mark invite as accepted
  await supabase
    .from("workspace_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: userData.user.id,
    })
    .eq("id", invite.id);

  return { ok: true, workspaceId: invite.workspace_id };
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
