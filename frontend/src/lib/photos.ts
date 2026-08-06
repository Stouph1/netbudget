// Upload de photos (avatar profil + photo workspace) vers Supabase Storage.
//
// Flow : expo-image-picker (galerie, crop carré, compressé) → fetch(uri)
// → arrayBuffer → supabase.storage.upload (upsert) → URL publique + cache-bust.
//
// Bucket "avatars" (public en lecture) :
//   avatars/<user_id>/avatar.jpg
//   avatars/workspaces/<workspace_id>/photo.jpg

import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";

type UploadResult =
  | { ok: true; url: string }
  | { ok: false; reason: "cancelled" | "permission" | "error"; message?: string };

async function pickImage(): Promise<
  | { ok: true; uri: string }
  | { ok: false; reason: "cancelled" | "permission" }
> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: "permission" };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,     // crop carré natif
    aspect: [1, 1],
    quality: 0.7,            // compression — avatars, pas besoin de plus
    exif: false,
  });
  if (result.canceled || !result.assets?.[0]?.uri) {
    return { ok: false, reason: "cancelled" };
  }
  return { ok: true, uri: result.assets[0].uri };
}

async function uploadTo(path: string, uri: string): Promise<UploadResult> {
  try {
    const resp = await fetch(uri);
    const arrayBuffer = await resp.arrayBuffer();
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, arrayBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (error) return { ok: false, reason: "error", message: error.message };

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust : le path est stable (upsert), les caches d'images gardent
    // l'ancienne version sinon.
    const url = `${data.publicUrl}?v=${Date.now()}`;
    return { ok: true, url };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { ok: false, reason: "error", message: err.message };
  }
}

// Choisit une image et la définit comme avatar du user. Persiste l'URL
// dans profiles.avatar_url et la retourne.
export async function pickAndUploadAvatar(userId: string): Promise<UploadResult> {
  const picked = await pickImage();
  if (!picked.ok) return { ok: false, reason: picked.reason };

  const uploaded = await uploadTo(`${userId}/avatar.jpg`, picked.uri);
  if (!uploaded.ok) return uploaded;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: uploaded.url })
    .eq("id", userId);
  if (error) return { ok: false, reason: "error", message: error.message };

  return uploaded;
}

// Choisit une image et la définit comme photo du workspace (owner/admin only,
// vérifié par la policy storage + RLS workspaces).
export async function pickAndUploadWorkspacePhoto(
  workspaceId: string,
): Promise<UploadResult> {
  const picked = await pickImage();
  if (!picked.ok) return { ok: false, reason: picked.reason };

  const uploaded = await uploadTo(
    `workspaces/${workspaceId}/photo.jpg`,
    picked.uri,
  );
  if (!uploaded.ok) return uploaded;

  const { error } = await supabase
    .from("workspaces")
    .update({ photo_url: uploaded.url })
    .eq("id", workspaceId);
  if (error) return { ok: false, reason: "error", message: error.message };

  return uploaded;
}

export async function loadAvatarUrl(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();
  return (data?.avatar_url as string | null) ?? null;
}
