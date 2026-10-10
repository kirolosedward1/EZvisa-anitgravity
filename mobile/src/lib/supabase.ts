import "react-native-url-polyfill/auto"
import { createClient } from "@supabase/supabase-js"
import { AppState, Platform } from "react-native"

import { config } from "./config"
import { secureStorage } from "./secure-storage"

/**
 * Same Supabase project as the website, so one account works on both.
 * Used only for authentication; application data goes through /api/mobile/v1.
 */
export const supabase = createClient(
  config.supabaseUrl || "https://not-configured.supabase.co",
  config.supabaseAnonKey || "not-configured",
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)

// Refresh tokens only while the app is in the foreground (Supabase RN guidance).
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh()
    else supabase.auth.stopAutoRefresh()
  })
}
