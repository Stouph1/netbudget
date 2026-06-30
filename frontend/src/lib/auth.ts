// Helpers d'auth pour NETbudget Premium.
//
// 3 méthodes de connexion :
//  - Apple Sign In (iOS natif)         → signInWithApple()
//  - Google Sign In (Android natif)    → signInWithGoogle()  [phase suivante]
//  - Email magic link (fallback)       → signInWithEmailMagicLink()
//
// La session est gérée par supabase-js et persistée dans AsyncStorage.
// Utiliser useSession() (voir src/contexts/SessionContext.tsx) côté UI.

import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { supabase } from "./supabase";

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "cancelled" | "unavailable" | "error"; message?: string };

// Apple Sign In natif iOS.
// Apple ne donne nom/email qu'à la PREMIÈRE connexion ; on les capture ici
// et on les pousse côté profiles si besoin (Apple ne les redonne jamais).
export async function signInWithApple(): Promise<AuthResult> {
  if (Platform.OS !== "ios") {
    return { ok: false, reason: "unavailable", message: "Apple Sign In is iOS-only." };
  }

  try {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      return { ok: false, reason: "unavailable" };
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { ok: false, reason: "error", message: "No identity token from Apple." };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });

    if (error || !data.user) {
      return { ok: false, reason: "error", message: error?.message };
    }

    // Capture du nom Apple (seulement à la 1re connexion) pour le profile
    if (credential.fullName) {
      const displayName = [
        credential.fullName.givenName,
        credential.fullName.familyName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (displayName) {
        await supabase
          .from("profiles")
          .update({ display_name: displayName })
          .eq("id", data.user.id);
      }
    }

    return { ok: true, userId: data.user.id };
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "ERR_REQUEST_CANCELED") {
      return { ok: false, reason: "cancelled" };
    }
    return { ok: false, reason: "error", message: err.message };
  }
}

// Email magic link : envoie un lien dans la boîte mail. L'utilisateur clique,
// retombe sur l'app via deep link, et la session est créée.
export async function signInWithEmailMagicLink(
  email: string,
): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Deep link de retour vers l'app. Le scheme "frontend" est défini
        // dans app.json (à confirmer / harmoniser plus tard).
        emailRedirectTo: "frontend://auth-callback",
      },
    });
    if (error) {
      return { ok: false, reason: "error", message: error.message };
    }
    // Le user n'est pas encore connecté — il doit cliquer le lien.
    return { ok: false, reason: "error", message: "magic-link-sent" };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { ok: false, reason: "error", message: err.message };
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
