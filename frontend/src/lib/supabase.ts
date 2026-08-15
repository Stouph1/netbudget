// Client Supabase pour NETbudget Premium.
// Anon key + URL sont publics — RLS et JWT scopent les accès côté serveur.
// Le service_role key NE DOIT JAMAIS être ici (server-only).

import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";
import { secureSessionStorage } from "./secureStorage";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase env vars. Check frontend/.env contains EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Keychain / EncryptedSharedPreferences : le refresh_token ne doit pas
    // dormir en clair dans AsyncStorage (sauvegarde ADB, appareil rooté).
    storage: secureSessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    // PKCE : un code d'autorisation intercepté est inutilisable sans le
    // code_verifier généré localement (défense contre le détournement de
    // deep link, les custom schemes n'étant pas vérifiables sur Android).
    flowType: "pkce",
    // Sur MOBILE : pas de lecture d'URL, on gère via deep links côté natif.
    //
    // Sur WEB : indispensable. Après un retour de Google, la session arrive
    // dans l'URL de callback ; sans cette option Supabase l'ignore et
    // l'utilisateur revient sur l'app toujours déconnecté, sans le moindre
    // message. C'était le cas ici.
    detectSessionInUrl: Platform.OS === "web",
  },
});
