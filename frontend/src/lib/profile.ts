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

export function validateUsername(username: string): string | null {
  const clean = username.trim();
  if (clean.length < 3 || clean.length > 24) {
    return "Le nom doit faire entre 3 et 24 caractères.";
  }
  if (!/^[a-zA-Z0-9_.\-]+$/.test(clean)) {
    return "Lettres, chiffres, points, tirets et underscores uniquement.";
  }
  return null;
}

export async function updateUsername(
  userId: string,
  username: string,
): Promise<{ ok: boolean; error?: string }> {
  const clean = username.trim();
  const invalid = validateUsername(clean);
  if (invalid) return { ok: false, error: invalid };
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

// ============================================================================
// Détails complets (inscription) — prénom, nom, dîme
// ============================================================================

export type ProfileDetails = {
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  tithe_enabled: boolean;
  tithe_percent: number;
};

export async function loadProfileDetails(
  userId: string,
): Promise<ProfileDetails> {
  const { data } = await supabase
    .from("profiles")
    .select("username, first_name, last_name, avatar_url, tithe_enabled, tithe_percent")
    .eq("id", userId)
    .maybeSingle();
  return {
    username: (data?.username as string | null) ?? null,
    first_name: (data?.first_name as string | null) ?? null,
    last_name: (data?.last_name as string | null) ?? null,
    avatar_url: (data?.avatar_url as string | null) ?? null,
    tithe_enabled: (data?.tithe_enabled as boolean | null) ?? false,
    tithe_percent: Number(data?.tithe_percent ?? 10),
  };
}

// Enregistre l'acceptation RGPD (horodatée) — preuve de consentement.
// Appelé une fois après la première connexion (la case était obligatoire).
export async function recordConsent(userId: string): Promise<void> {
  await supabase
    .from("profiles")
    .update({ consent_at: new Date().toISOString() })
    .eq("id", userId)
    .is("consent_at", null);
}

export async function updateProfileDetails(
  userId: string,
  details: {
    username: string;
    first_name?: string;
    last_name?: string;
    tithe_enabled?: boolean;
    tithe_percent?: number;
    country?: string;
    region?: string;
    city?: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  const cleanUsername = details.username.trim();
  const invalid = validateUsername(cleanUsername);
  if (invalid) return { ok: false, error: invalid };
  if (
    details.tithe_percent !== undefined &&
    (details.tithe_percent < 0 || details.tithe_percent > 100)
  ) {
    return { ok: false, error: "Le pourcentage de dîme doit être entre 0 et 100." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username: cleanUsername,
      first_name: details.first_name?.trim() || null,
      last_name: details.last_name?.trim() || null,
      ...(details.tithe_enabled !== undefined
        ? { tithe_enabled: details.tithe_enabled }
        : {}),
      ...(details.tithe_percent !== undefined
        ? { tithe_percent: details.tithe_percent }
        : {}),
      ...(details.country !== undefined ? { country: details.country || null } : {}),
      ...(details.region !== undefined ? { region: details.region || null } : {}),
      ...(details.city !== undefined ? { city: details.city?.trim() || null } : {}),
    })
    .eq("id", userId);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ce nom d'utilisateur est déjà pris." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
