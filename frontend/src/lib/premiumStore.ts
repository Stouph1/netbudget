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

// Scope de cache : "perso" ou "ws:<uuid>"
function cacheKey(payloadKey: string, workspaceId: string | null): string {
  const scope = workspaceId ? `ws:${workspaceId}` : "perso";
  return `${CACHE_KEY_PREFIX}${scope}:${payloadKey}`;
}

async function readCache<T>(
  payloadKey: string,
  workspaceId: string | null,
): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(payloadKey, workspaceId));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeCache<T>(
  payloadKey: string,
  workspaceId: string | null,
  data: T,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      cacheKey(payloadKey, workspaceId),
      JSON.stringify(data),
    );
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
  workspaceId: string | null = null,
): Promise<T> {
  // 1. Try local cache first (offline OK)
  const cached = await readCache<T>(payloadKey, workspaceId);

  // 2. Try Supabase in parallel
  try {
    let query = supabase
      .from("encrypted_payloads")
      .select("ciphertext")
      .eq("payload_key", payloadKey);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    } else {
      // Perso : filtre user_id ET workspace_id IS NULL
      query = query.eq("user_id", userId).is("workspace_id", null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) return cached ?? fallback;
    if (!data) return cached ?? fallback;

    const raw = data.ciphertext as unknown;
    const bytes =
      typeof raw === "string"
        ? raw.startsWith("\\x")
          ? hexToU8(raw.slice(2))
          : base64ToU8(raw)
        : (raw as Uint8Array);

    const plaintext = decryptStub(bytes);
    const parsed = JSON.parse(plaintext) as T;

    await writeCache(payloadKey, workspaceId, parsed);
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
  workspaceId: string | null = null,
): Promise<{ ok: boolean; error?: string }> {
  // 1. Cache immédiatement (UI-first)
  await writeCache(payloadKey, workspaceId, data);

  // 2. Encrypt + push vers Supabase
  try {
    const plaintext = JSON.stringify(data);
    const { ciphertext, nonce } = encryptStub(plaintext);

    // Upsert avec unique constraint sur (user_id, coalesce(workspace_id, sentinel), payload_key)
    // Pour perso, workspace_id = NULL. Pour partagé, workspace_id = uuid.
    // La contrainte unique DB (index encrypted_payloads_scope_key_idx) gère les deux cas.
    const payload = {
      user_id: userId,
      workspace_id: workspaceId,
      payload_key: payloadKey,
      ciphertext: u8ToBase64(ciphertext),
      nonce: u8ToBase64(nonce),
      updated_at: new Date().toISOString(),
    };

    // Sur upsert Supabase, il faut spécifier onConflict correspondant à un index unique.
    // Comme l'index utilise coalesce, on gère manuellement : select puis update ou insert.
    let query = supabase
      .from("encrypted_payloads")
      .select("id")
      .eq("user_id", userId)
      .eq("payload_key", payloadKey);
    query = workspaceId
      ? query.eq("workspace_id", workspaceId)
      : query.is("workspace_id", null);
    const { data: existing } = await query.maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("encrypted_payloads")
        .update(payload)
        .eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("encrypted_payloads").insert(payload);
      if (error) return { ok: false, error: error.message };
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

export async function loadS1(
  userId: string,
  workspaceId: string | null = null,
): Promise<S1Payload> {
  return readPayload<S1Payload>("s1", userId, EMPTY_S1_PAYLOAD, workspaceId);
}

export async function saveS1(
  userId: string,
  payload: S1Payload,
  workspaceId: string | null = null,
): Promise<{ ok: boolean; error?: string }> {
  return writePayload<S1Payload>("s1", userId, payload, workspaceId);
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
