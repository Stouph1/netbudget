// Clés d'espaces partagés : chargement, dépôt, cache de session.
//
// POURQUOI UN CACHE. Ouvrir la copie d'une clé d'espace demande un aller-retour
// réseau puis un déchiffrement. La couche de stockage y accède à chaque lecture
// et chaque écriture — des dizaines de fois au démarrage. Sans cache, changer
// d'espace rendrait l'app poussive pour rien : la clé d'un espace ne change
// jamais.
//
// Le cache vit en mémoire uniquement. Il disparaît à la fermeture de l'app,
// comme la clé personnelle sur le web : une clé d'espace déchiffrée est aussi
// sensible que celle qui l'a ouverte.

import { supabase } from "../supabase";
import { base64ToBytes, bytesToBase64 } from "./payload";
import { keyForUser } from "./vaultSession";
import { openForMember, sealForMember, type Sealed } from "./workspaceKey";

/** `userId:workspaceId` → clé de l'espace, pour la session en cours. */
const cache = new Map<string, Uint8Array>();

const cacheKey = (userId: string, workspaceId: string) => `${userId}:${workspaceId}`;

/** Colonne bytea : Supabase la renvoie en hexadécimal `\x…` ou en base64. */
function toBytes(raw: unknown): Uint8Array {
  if (typeof raw !== "string") return raw as Uint8Array;
  if (!raw.startsWith("\\x")) return base64ToBytes(raw);
  const hex = raw.slice(2);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Clé de l'espace pour ce membre, ou null.
 *
 * Null a trois causes qu'on ne cherche pas à distinguer ici : l'espace n'est
 * pas chiffré, le membre n'a pas encore sa copie, ou sa clé personnelle est
 * absente. Dans les trois cas l'appelant fait la même chose — il ne chiffre
 * pas et il n'écrit pas si l'espace est déclaré chiffré.
 */
export async function loadWorkspaceKey(
  userId: string,
  workspaceId: string,
): Promise<Uint8Array | null> {
  const hit = cache.get(cacheKey(userId, workspaceId));
  if (hit) return hit;

  const personal = keyForUser(userId);
  if (!personal) return null; // coffre personnel verrouillé : rien à ouvrir

  try {
    const { data, error } = await supabase
      .from("workspace_keys")
      .select("sealed_key, nonce")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;

    const sealed: Sealed = {
      ciphertext: toBytes(data.sealed_key as unknown),
      nonce: toBytes(data.nonce as unknown),
    };
    const key = await openForMember(sealed, personal);
    if (!key) return null;

    cache.set(cacheKey(userId, workspaceId), key);
    return key;
  } catch {
    return null;
  }
}

/**
 * Dépose la copie du membre. Appelé à la création d'un espace et à l'acceptation
 * d'une invitation.
 */
export async function storeWorkspaceKey(
  userId: string,
  workspaceId: string,
  workspaceKey: Uint8Array,
): Promise<{ ok: boolean; error?: string }> {
  const personal = keyForUser(userId);
  if (!personal) return { ok: false, error: "vault-locked" };

  try {
    const sealed = await sealForMember(workspaceKey, personal);
    const { error } = await supabase.from("workspace_keys").upsert(
      {
        workspace_id: workspaceId,
        user_id: userId,
        sealed_key: bytesToBase64(sealed.ciphertext),
        nonce: bytesToBase64(sealed.nonce),
      },
      { onConflict: "workspace_id,user_id" },
    );
    if (error) return { ok: false, error: error.message };

    cache.set(cacheKey(userId, workspaceId), workspaceKey);
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as { message?: string }).message };
  }
}

/** Oublie une clé d'espace — à la sortie d'un espace, ou à la déconnexion. */
export function forgetWorkspaceKey(userId: string, workspaceId?: string): void {
  if (workspaceId) {
    cache.delete(cacheKey(userId, workspaceId));
    return;
  }
  for (const k of [...cache.keys()]) {
    if (k.startsWith(`${userId}:`)) cache.delete(k);
  }
}

/** L'espace est-il déclaré chiffré côté serveur ? */
export async function isWorkspaceEncrypted(workspaceId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("workspaces")
      .select("encrypted")
      .eq("id", workspaceId)
      .maybeSingle();
    return data?.encrypted === true;
  } catch {
    return false;
  }
}
