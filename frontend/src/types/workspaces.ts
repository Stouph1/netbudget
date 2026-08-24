// Types Workspaces Premium — partage de budget couple/famille.
//
// Chaque user Premium peut :
//  - Garder son compte perso (workspace_id = undefined)
//  - Créer ou rejoindre 1+ workspaces partagés
//
// Le storage layer (premiumStore) scope les payloads par workspace_id.
// Voir supabase/migrations/002_workspaces.sql pour le schéma DB.

export type WorkspaceKind = "couple" | "family" | "coloc" | "association" | "other";

export type WorkspaceRole = "owner" | "admin" | "member";

export type Workspace = {
  id: string;
  owner_id: string;
  name: string;
  kind: WorkspaceKind;
  description?: string | null;
  photo_url?: string | null;
  /**
   * Le contenu de l'espace est chiffré avec une clé d'espace.
   *
   * Absent sur les espaces créés avant le chiffrement : ils restent en clair
   * jusqu'à ce qu'ils soient convertis. L'interface doit donc traiter
   * `undefined` comme `false`, et non comme « on ne sait pas ».
   */
  encrypted?: boolean;
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
