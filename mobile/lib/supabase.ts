import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_ENABLED } from "./config";
import type { Database } from "./database.types";

export type DB = SupabaseClient<Database>;
export const supabase: DB | null = SUPABASE_ENABLED
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { storage: Platform.OS === "web" && typeof window === "undefined" ? undefined : AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: "pkce" },
    })
  : null;
