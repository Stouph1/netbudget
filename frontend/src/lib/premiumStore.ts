// Store Premium : lit/écrit les payloads dans `encrypted_payloads` côté Supabase
// avec un cache local AsyncStorage pour l'offline.
//
// Architecture cible :
//    payload = JSON → encrypt (libsodium) → base64 → bytea Supabase
// Actuellement (Phase 3, avant Phase 5 E2E) :
//    payload = JSON → JSON.stringify → base64 → bytea Supabase (PAS de vraie crypto)
//
// Le stub `encryptStub` / `decryptStub` sera remplacé par libsodium en Phase 5
// SANS toucher au reste du code (interface stable).

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserProfile } from "../types/advice";
import { EMPTY_S1_PAYLOAD, type S1Payload } from "../types/premium";
import { supabase } from "./supabase";

const CACHE_KEY_PREFIX = "netbudget:premium:cache:";

// ============================================================================
// Encryption stub — REMPLACER en Phase 5 par libsodium XChaCha20-Poly1305
// ============================================================================

// Nonce fictif tant qu'on n'a pas libsodium — vrai nonce = 24 bytes random.
const STUB_NONCE = new Uint8Array(24);

function encryptStub(plaintext: string): { ciphertext: Uint8Array; nonce: Uint8Array } {
  // Phase 3 : on encode juste en UTF-8. Phase 5 : chiffrement authentifié.
  return {
    ciphertext: new TextEncoder().encode(plaintext),
    nonce: STUB_NONCE,
  };
}

function decryptStub(ciphertext: Uint8Array): string {
  return new TextDecoder().decode(ciphertext);
}

// ============================================================================
// Cache local — pour affichage instantané au boot, sync differ derrière
// ============================================================================

async function readCache<T>(payloadKey: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY_PREFIX + payloadKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeCache<T>(payloadKey: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY_PREFIX + payloadKey, JSON.stringify(data));
  } catch {}
}

// ============================================================================
// Read / Write générique vers encrypted_payloads
// ============================================================================

// Convert Uint8Array to base64 (for storage in bytea)
function u8ToBase64(u8: Uint8Array): string {
  let bin = "";
  for (const b of u8) bin += String.fromCharCode(b);
  return globalThis.btoa(bin);
}

function base64ToU8(b64: string): Uint8Array {
  const bin = globalThis.atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

async function readPayload<T>(
  payloadKey: string,
  userId: string,
  fallback: T,
): Promise<T> {
  // 1. Try local cache first (offline OK)
  const cached = await readCache<T>(payloadKey);

  // 2. Try Supabase in parallel
  try {
    const { data, error } = await supabase
      .from("encrypted_payloads")
      .select("ciphertext")
      .eq("user_id", userId)
      .eq("payload_key", payloadKey)
      .maybeSingle();

    if (error) {
      // Erreur réseau → on retourne le cache si dispo
      return cached ?? fallback;
    }

    if (!data) {
      // Pas de blob distant → cache local ou vide
      return cached ?? fallback;
    }

    // Supabase renvoie bytea comme string base64 "\x..." — normaliser
    const raw = data.ciphertext as unknown;
    const bytes =
      typeof raw === "string"
        ? // formats possibles : "\\x48656c6c6f" (hex) ou base64
          raw.startsWith("\\x")
          ? hexToU8(raw.slice(2))
          : base64ToU8(raw)
        : (raw as Uint8Array);

    const plaintext = decryptStub(bytes);
    const parsed = JSON.parse(plaintext) as T;

    // Rafraîchir le cache
    await writeCache(payloadKey, parsed);
    return parsed;
  } catch {
    return cached ?? fallback;
  }
}

function hexToU8(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function writePayload<T>(
  payloadKey: string,
  userId: string,
  data: T,
): Promise<{ ok: boolean; error?: string }> {
  // 1. Cache immédiatement (UI-first)
  await writeCache(payloadKey, data);

  // 2. Encrypt + push vers Supabase
  try {
    const plaintext = JSON.stringify(data);
    const { ciphertext, nonce } = encryptStub(plaintext);

    const { error } = await supabase.from("encrypted_payloads").upsert(
      {
        user_id: userId,
        payload_key: payloadKey,
        ciphertext: u8ToBase64(ciphertext),
        nonce: u8ToBase64(nonce),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,payload_key" },
    );

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { ok: false, error: err.message };
  }
}

// ============================================================================
// API S1 — surface consommée par les écrans
// ============================================================================

export async function loadS1(userId: string): Promise<S1Payload> {
  return readPayload<S1Payload>("s1", userId, EMPTY_S1_PAYLOAD);
}

export async function saveS1(
  userId: string,
  payload: S1Payload,
): Promise<{ ok: boolean; error?: string }> {
  return writePayload<S1Payload>("s1", userId, payload);
}

// ============================================================================
// API Profil advice — pour personnaliser les conseils Premium
// ============================================================================

const EMPTY_PROFILE: UserProfile = {};

export async function loadAdviceProfile(userId: string): Promise<UserProfile> {
  return readPayload<UserProfile>("advice_profile", userId, EMPTY_PROFILE);
}

export async function saveAdviceProfile(
  userId: string,
  profile: UserProfile,
): Promise<{ ok: boolean; error?: string }> {
  return writePayload<UserProfile>("advice_profile", userId, profile);
}
