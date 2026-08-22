// Helpers d'auth pour NETbudget Premium.
//
// 3 méthodes de connexion :
//  - Apple Sign In (iOS natif)         → signInWithApple()
//  - Google Sign In (Android natif)    → signInWithGoogle()  [phase suivante]
//  - Email magic link (fallback)       → signInWithEmailMagicLink()
//
// La session est gérée par supabase-js et persistée dans AsyncStorage.
// Utiliser useSession() (voir src/contexts/SessionContext.tsx) côté UI.

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { NativeModules, Platform, TurboModuleRegistry } from "react-native";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";

export type AuthResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      /**
       * `redirecting` : le navigateur part chez le fournisseur, la page
       * courante va disparaître. Ce n'est ni un succès ni une erreur — l'UI ne
       * doit rien afficher.
       */
      reason: "cancelled" | "unavailable" | "error" | "redirecting";
      message?: string;
      /** Clé i18n d'un message actionnable, quand la cause est identifiée. */
      messageKey?: string;
    };

/**
 * Le module natif de Google Sign-In est-il réellement embarqué ?
 *
 * `TurboModuleRegistry.get()` — sans « Enforcing » — renvoie null au lieu de
 * lever quand le module manque. C'est la seule façon de poser la question sans
 * déclencher l'erreur qu'on cherche justement à éviter.
 *
 * Faux dans Expo Go et sur le web : le module doit être compilé dans le
 * binaire, ce qui suppose un development build.
 */
export function isGoogleSignInAvailable(): boolean {
  if (Platform.OS === "web") return false;
  try {
    return (
      TurboModuleRegistry.get("RNGoogleSignin") != null ||
      // Repli pour l'ancienne architecture, où le module vit dans NativeModules.
      (NativeModules as Record<string, unknown>).RNGoogleSignin != null
    );
  } catch {
    return false;
  }
}

/**
 * Traduit les codes d'erreur de Google Sign-In en causes réelles.
 *
 * Sans ça, l'app affiche « DEVELOPER_ERROR » ou un code numérique : ni
 * l'utilisateur ni le développeur ne savent quoi faire. Ces trois cas couvrent
 * la quasi-totalité des échecs en production.
 */
function googleErrorKey(code: string): string | undefined {
  // 10 / DEVELOPER_ERROR : l'empreinte SHA-1 de la signature du build n'est pas
  // déclarée dans Google Cloud Console, ou le client OAuth ne correspond pas au
  // nom de package. C'est TOUJOURS une erreur de configuration, jamais de
  // l'utilisateur — et elle ne se voit qu'en build signé.
  if (code === "10" || code === "DEVELOPER_ERROR") return "home.err.google.config";
  // 2 / PLAY_SERVICES_NOT_AVAILABLE : appareil Android sans services Google.
  if (code === "2" || code === "PLAY_SERVICES_NOT_AVAILABLE")
    return "home.err.google.playServices";
  // 8 / IN_PROGRESS : un appui répété pendant que la fenêtre s'ouvre.
  if (code === "8" || code === "IN_PROGRESS") return "home.err.google.inProgress";
  return undefined;
}

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

    // Nonce anti-rejeu : Apple signe le HASH, Supabase vérifie contre le brut.
    // Sans lui, un identityToken intercepté est rejouable pendant sa validité.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return { ok: false, reason: "error", message: "No identity token from Apple." };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: rawNonce,
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

// Google Sign In natif (Android + iOS) via @react-native-google-signin.
// ATTENTION : module NATIF — indisponible dans Expo Go et sur le web
// (il faut un development build : `eas build --profile development`).
// Le require est dynamique pour ne pas crasher Expo Go au chargement.
export async function signInWithGoogle(): Promise<AuthResult> {
  // WEB : le module natif n'existe pas dans un navigateur. On passe par le
  // flux OAuth de Supabase, qui redirige vers Google puis revient sur l'app
  // avec la session dans l'URL (d'où `detectSessionInUrl` côté web).
  //
  // Sans cette branche, l'appel échouait silencieusement et le bouton semblait
  // mort — l'erreur partait dans un Alert.alert, lui-même inopérant sur web.
  if (Platform.OS === "web") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Retour sur la page d'où l'on vient, quel que soit le port de dev.
        redirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
        // Laisse choisir le compte au lieu de reprendre le dernier utilisé —
        // sinon impossible de tester avec deux comptes.
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) return { ok: false, reason: "error", message: error.message };
    // À partir d'ici le navigateur quitte la page ; il n'y a pas de suite.
    return { ok: false, reason: "redirecting" };
  }

  // Le try/catch autour du require ne suffisait PAS : sur la nouvelle
  // architecture, charger le module appelle `TurboModuleRegistry.getEnforcing`,
  // dont l'échec traverse le pont natif et n'est pas rattrapable en JS. Dans
  // Expo Go, l'app affichait donc un écran rouge au lieu d'un message.
  // On vérifie donc la présence du module SANS le charger.
  if (!isGoogleSignInAvailable()) {
    return {
      ok: false,
      reason: "unavailable",
      messageKey: "home.err.google.needsBuild",
    };
  }

  let GoogleSignin: {
    configure: (opts: { webClientId?: string; iosClientId?: string }) => void;
    hasPlayServices: () => Promise<boolean>;
    signIn: () => Promise<{ data?: { idToken?: string | null } | null }>;
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
  } catch {
    return {
      ok: false,
      reason: "unavailable",
      messageKey: "home.err.google.needsBuild",
    };
  }

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!webClientId) {
    return {
      ok: false,
      reason: "unavailable",
      message:
        "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID manquant dans .env (Google Cloud Console → OAuth Web client).",
    };
  }

  try {
    GoogleSignin.configure({ webClientId, iosClientId });
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices();
    }
    const result = await GoogleSignin.signIn();
    const idToken = result?.data?.idToken;
    if (!idToken) {
      // signIn() résout sans idToken quand l'utilisateur annule
      return { ok: false, reason: "cancelled" };
    }
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });
    if (error || !data.user) {
      return { ok: false, reason: "error", message: error?.message };
    }
    return { ok: true, userId: data.user.id };
  } catch (e: unknown) {
    const err = e as { code?: string | number; message?: string };
    const code = String(err.code ?? "");
    // 12501 / SIGN_IN_CANCELLED — annulation utilisateur
    if (code === "12501" || code === "SIGN_IN_CANCELLED") {
      return { ok: false, reason: "cancelled" };
    }
    return {
      ok: false,
      reason: "error",
      messageKey: googleErrorKey(code),
      // Le détail technique reste disponible : c'est ce qui permet de
      // diagnostiquer un cas non répertorié sans reproduire soi-même.
      message: err.message ?? code,
    };
  }
}

// Création de compte par e-mail + mot de passe.
// Selon la config Supabase, une confirmation par e-mail peut être requise :
// dans ce cas session = null → l'UI doit dire "vérifie ta boîte mail".
export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<AuthResult | { ok: false; reason: "confirm_email" }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false, reason: "error", message: error.message };
    if (data.user && !data.session) {
      // Compte créé, confirmation e-mail exigée par Supabase
      return { ok: false, reason: "confirm_email" };
    }
    if (!data.user) return { ok: false, reason: "error", message: "Inscription échouée." };
    return { ok: true, userId: data.user.id };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { ok: false, reason: "error", message: err.message };
  }
}

// Connexion par e-mail + mot de passe.
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.user) {
      return { ok: false, reason: "error", message: error?.message };
    }
    return { ok: true, userId: data.user.id };
  } catch (e: unknown) {
    const err = e as { message?: string };
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
        // Deep link construit par Expo depuis le scheme d'app.json — jamais
        // codé en dur. ⚠️ Un custom scheme n'est PAS vérifiable sur Android :
        // avant de câbler ce flux dans un écran, passer aux App Links vérifiés
        // (https://www.netbudget.app/auth-callback + assetlinks.json).
        // Le flux PKCE (voir supabase.ts) limite déjà l'impact d'une
        // interception : le code seul est inexploitable.
        emailRedirectTo: Linking.createURL("/auth-callback"),
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

// ============================================================================
// Mot de passe : oubli, réinitialisation, changement
//
// Sans ces trois fonctions, un utilisateur qui oublie son mot de passe est
// définitivement dehors — il n'a aucun recours dans l'app, et nous n'avons
// aucun moyen propre de l'aider (nous ne connaissons pas son mot de passe, et
// c'est heureux).
// ============================================================================

/** Où le lien de l'e-mail doit ramener, selon la plateforme. */
function recoveryRedirect(): string {
  // Web : la page courante, où `detectSessionInUrl` récupérera le jeton.
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/reset-password`;
  }
  // Mobile : deep link construit depuis le scheme d'app.json.
  return Linking.createURL("/reset-password");
}

/**
 * Envoie le lien de réinitialisation.
 *
 * Renvoie `ok` même quand l'adresse est inconnue : dire « ce compte n'existe
 * pas » permettrait à n'importe qui de tester des adresses pour savoir qui est
 * inscrit. Supabase ne le révèle pas non plus, et on ne le contredit pas.
 */
export async function sendPasswordReset(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: recoveryRedirect() },
    );
    // Une erreur de limitation de débit doit remonter : elle est actionnable
    // (« réessaie dans une minute »), contrairement à « adresse inconnue ».
    if (error && /rate|limit|seconds/i.test(error.message)) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as { message?: string }).message };
  }
}

/**
 * Définit un nouveau mot de passe.
 *
 * Deux usages, même appel côté Supabase :
 *  - après un lien de récupération, la session temporaire l'autorise ;
 *  - depuis les réglages, la session normale suffit.
 */
export async function updatePassword(
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as { message?: string }).message };
  }
}

/**
 * Change le mot de passe en vérifiant d'abord l'actuel.
 *
 * Supabase n'exige pas l'ancien mot de passe : une session suffit. C'est trop
 * permissif — un téléphone déverrouillé laissé sur une table permettrait de
 * changer le mot de passe et de verrouiller le propriétaire dehors. On le
 * revérifie donc explicitement.
 */
export async function changePasswordWithCurrent(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string; wrongCurrent?: boolean }> {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (!email) return { ok: false, error: "no-session" };

  const check = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (check.error) return { ok: false, wrongCurrent: true };

  return updatePassword(newPassword);
}

/**
 * Le compte a-t-il un mot de passe NetBudget ?
 *
 * Faux pour un compte créé via Apple ou Google : l'authentification appartient
 * au fournisseur, il n'y a rien à changer de notre côté. On lit les identités
 * liées plutôt que le seul `provider`, car un compte peut en cumuler plusieurs.
 */
export async function hasPasswordIdentity(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getUser();
    const identities = data.user?.identities ?? [];
    return identities.some((i) => i.provider === "email");
  } catch {
    return false;
  }
}

/** Une session de récupération est-elle active (retour du lien e-mail) ? */
export async function hasRecoverySession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return data.session != null;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Suppression DÉFINITIVE du compte (RGPD art. 17 / exigence App Store).
//
// Deux voies, dans cet ordre :
//  1. la fonction SQL `delete_own_account()` (migration 012) — elle s'exécute
//     en SECURITY DEFINER et ne peut supprimer que auth.uid(). Rien à déployer
//     en plus : une migration appliquée suffit, et ça marche pour toujours.
//  2. l'Edge Function `delete-account`, en repli, pour les projets où elle est
//     déjà déployée (elle purge aussi les photos des espaces possédés).
//
// Les fichiers Storage de l'utilisateur sont purgés côté client AVANT la
// suppression : après, la session n'existe plus et les policies l'interdisent.
export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  const finishLocally = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(
        keys.filter(
          (k) =>
            k.startsWith("netbudget:premium") ||
            k.startsWith("netbudget:bday") ||
            k.startsWith("netbudget:events"),
        ),
      );
    } catch {}
    await supabase.auth.signOut();
  };

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { ok: false, error: "Tu n'es pas connecté." };

    // Purge de l'avatar tant qu'on a encore les droits (best-effort).
    try {
      const { data: files } = await supabase.storage.from("avatars").list(userId);
      if (files?.length) {
        await supabase.storage
          .from("avatars")
          .remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch {}

    // 1. Voie principale : fonction SQL.
    const rpc = await supabase.rpc("delete_own_account");
    if (!rpc.error) {
      await finishLocally();
      return { ok: true };
    }

    // 2. Repli : Edge Function (projets où elle est déployée).
    const fn = await supabase.functions.invoke("delete-account", { method: "POST" });
    if (!fn.error) {
      const res = fn.data as { ok?: boolean; error?: string } | null;
      if (res?.ok) {
        await finishLocally();
        return { ok: true };
      }
    }

    // Les deux ont échoué : message actionnable plutôt qu'un jargon technique.
    const rpcMsg = rpc.error.message ?? "";
    const missing =
      rpcMsg.includes("does not exist") ||
      rpcMsg.includes("PGRST202") ||
      rpcMsg.includes("Could not find the function");
    return {
      ok: false,
      error: missing
        ? "La suppression n'est pas encore activée côté serveur (migration 012 à appliquer). Écris-nous à contact@netbudget.app : ton compte sera supprimé sous 30 jours."
        : `La suppression a échoué : ${rpcMsg}. Réessaie, ou écris-nous à contact@netbudget.app.`,
    };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { ok: false, error: err.message ?? "Erreur inconnue." };
  }
}

