// Types Workspaces Premium — partage de budget couple/famille.
//
// Chaque user Premium peut :
//  - Garder son compte perso (workspace_id = undefined)
//  - Créer ou rejoindre 1+ workspaces partagés
//
// Le storage layer (premiumStore) scope les payloads par workspace_id.
// Voir supabase/migrations/002_workspaces.sql pour le schéma DB.

export type WorkspaceKind = "couple" | "family" | "coloc" | "other";

export type WorkspaceRole = "owner" | "admin" | "member";

export type Workspace = {
  id: string;
  owner_id: string;
  name: string;
  kind: WorkspaceKind;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMember = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
};

export type InviteStatus = "pending" | "accepted" | "cancelled" | "expired";

export type WorkspaceInvite = {
  id: string;
  workspace_id: string;
  inviter_id: string;
  email: string;
  token: string;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  accepted_by?: string;
};

// Contexte actif (sélectionné par l'user dans l'app)
export type ActiveScope =
  | { kind: "personal" }
  | { kind: "workspace"; workspace: Workspace };
