// Lecture/écriture des infos de base du profil (username, avatar).
// La table profiles est créée par la migration 001, username par la 006.

import { supabase } from "./supabase";

export type ProfileBasics = {
  username: string | null;
  avatar_url: string | null;
};

export async function loadProfileBasics(userId: string): Promise<ProfileBasics> {
  const { data } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  return {
    username: (data?.username as string | null) ?? null,
    avatar_url: (data?.avatar_url as string | null) ?? null,
  };
}

export async function updateUsername(
  userId: string,
  username: string,
): Promise<{ ok: boolean; error?: string }> {
  const clean = username.trim();
  if (clean.length < 3 || clean.length > 24) {
    return { ok: false, error: "Le nom doit faire entre 3 et 24 caractères." };
  }
  if (!/^[a-zA-Z0-9_.\-]+$/.test(clean)) {
    return {
      ok: false,
      error: "Lettres, chiffres, points, tirets et underscores uniquement.",
    };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ username: clean })
    .eq("id", userId);
  if (error) {
    // Violation de l'index unique → nom déjà pris
    if (error.code === "23505") {
      return { ok: false, error: "Ce nom d'utilisateur est déjà pris." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
