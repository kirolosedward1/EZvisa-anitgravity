import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ENABLED } from "./config";
import { secureStorage, forgetSessionAfterReinstall } from "./secureStorage";
import type { Database } from "./database.types";

export type DB = SupabaseClient<Database>;
/** Same key supabase-js derives by default (sb-<project ref>-auth-token); named here so start-up can find it. With a
 *  custom auth domain (e.g. auth.ezvisa.net, so Google shows ezvisa.net) EXPO_PUBLIC_SUPABASE_REF keeps the old key,
 *  so nobody is signed out by the switch. */
const host = SUPABASE_ENABLED ? new URL(SUPABASE_URL).hostname : "";
const REF = host.endsWith(".supabase.co") ? host.split(".")[0] : process.env.EXPO_PUBLIC_SUPABASE_REF || host.split(".")[0];
export const AUTH_STORAGE_KEY = SUPABASE_ENABLED ? `sb-${REF}-auth-token` : "";
const ready = SUPABASE_ENABLED ? forgetSessionAfterReinstall([AUTH_STORAGE_KEY, `${AUTH_STORAGE_KEY}-code-verifier`, `${AUTH_STORAGE_KEY}-user`]) : Promise.resolve();
const storage = {
  getItem: async (k: string) => { await ready; return secureStorage.getItem(k); },
  setItem: async (k: string, v: string) => { await ready; return secureStorage.setItem(k, v); },
  removeItem: async (k: string) => { await ready; return secureStorage.removeItem(k); },
};
const ssr = Platform.OS === "web" && typeof window === "undefined";

export const supabase: DB | null = SUPABASE_ENABLED
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { storage: ssr ? undefined : storage, storageKey: AUTH_STORAGE_KEY, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: "pkce" },
    })
  : null;

// Refresh tokens only while the app is in the foreground (the timer can't run reliably in the background on iOS/Android).
// The web build handles this itself through visibilitychange.
if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", (s) => { if (s === "active") supabase.auth.startAutoRefresh(); else supabase.auth.stopAutoRefresh(); });
}
