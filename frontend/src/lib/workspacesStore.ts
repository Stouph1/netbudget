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
import { bytesToBase64, base64ToBytes } from "./crypto/payload";
import { keyForUser } from "./crypto/vaultSession";
import {
  generateWorkspaceKey,
  openFromInvite,
  sealForInvite,
} from "./crypto/workspaceKey";
import {
  forgetWorkspaceKey,
  loadWorkspaceKey,
  storeWorkspaceKey,
} from "./crypto/workspaceVault";

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

  const workspace = data as Workspace;

  // Espace chiffré si — et seulement si — son créateur a activé le chiffrement.
  // Le lui imposer sinon reviendrait à créer un espace que personne ne peut
  // lire, faute de clé personnelle pour ranger la copie.
  if (keyForUser(userData.user.id)) {
    const wsKey = await generateWorkspaceKey();
    const stored = await storeWorkspaceKey(userData.user.id, workspace.id, wsKey);
    if (stored.ok) {
      // Le drapeau vient APRÈS le dépôt de la clé. Dans l'autre sens, un échec
      // de dépôt laisserait un espace marqué chiffré dont personne n'aurait la
      // clé : plus aucune écriture possible, et rien pour l'expliquer.
      await supabase.from("workspaces").update({ encrypted: true }).eq("id", workspace.id);
      workspace.encrypted = true;
    }
  }

  return { ok: true, workspace };
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

  // Quitter un espace, c'est jeter sa copie de la clé. Sans ça, la clé
  // resterait en base et en mémoire : l'accès survivrait au départ, ce qui
  // n'est pas ce que l'utilisateur croit avoir fait.
  await supabase
    .from("workspace_keys")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userData.user.id);
  forgetWorkspaceKey(userData.user.id, workspaceId);

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

  // La clé de l'espace voyage AVEC l'invitation, emballée par une clé dérivée
  // du code. C'est ce qui permet à l'invité de lire immédiatement, sans
  // attendre qu'un membre déjà présent rouvre l'application.
  let sealedKey: string | null = null;
  let sealedNonce: string | null = null;
  const wsKey = await loadWorkspaceKey(userData.user.id, workspaceId);
  if (wsKey) {
    const sealed = await sealForInvite(wsKey, token);
    sealedKey = bytesToBase64(sealed.ciphertext);
    sealedNonce = bytesToBase64(sealed.nonce);
  }

  const { data, error } = await supabase
    .from("workspace_invites")
    .insert({
      workspace_id: workspaceId,
      inviter_id: userData.user.id,
      email: note,
      token,
      status: "pending",
      sealed_key: sealedKey,
      sealed_nonce: sealedNonce,
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

  const workspaceId = (data as string) ?? undefined;

  // L'adhésion est faite. On récupère maintenant la clé de l'espace depuis
  // l'invitation, en l'ouvrant avec le code que l'utilisateur vient de saisir.
  //
  // Un échec ici n'annule PAS l'adhésion : la personne est bien membre, elle
  // verra simplement l'espace comme verrouillé. Revenir en arrière serait pire
  // — elle aurait consommé son code pour rien.
  if (workspaceId) {
    await claimWorkspaceKey(workspaceId, token);
  }

  return { ok: true, workspaceId };
}

/**
 * Ouvre la clé d'espace déposée dans l'invitation et en range sa propre copie.
 *
 * Silencieux à dessein : appelé juste après l'adhésion, il ne doit jamais faire
 * échouer celle-ci. Les cas d'échec — espace non chiffré, coffre personnel
 * verrouillé, invitation sans clé — se traduisent tous par un espace affiché
 * comme verrouillé, ce que l'interface sait expliquer.
 */
async function claimWorkspaceKey(workspaceId: string, token: string): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId || !keyForUser(userId)) return;

    const { data } = await supabase
      .from("workspace_invites")
      .select("sealed_key, sealed_nonce")
      .eq("token", token)
      .maybeSingle();
    if (!data?.sealed_key || !data?.sealed_nonce) return; // espace non chiffré

    const wsKey = await openFromInvite(
      {
        ciphertext: base64ToBytes(String(data.sealed_key)),
        nonce: base64ToBytes(String(data.sealed_nonce)),
      },
      token,
    );
    if (!wsKey) return;

    await storeWorkspaceKey(userId, workspaceId, wsKey);
  } catch {
    // Voir le commentaire ci-dessus : jamais bloquant.
  }
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
