/**
 * Public runtime config, inlined by Expo from EXPO_PUBLIC_* variables (.env).
 * These values are not secrets: the anon key is protected by RLS, and every
 * write goes through the API, which checks ownership with the service role.
 */
function read(name: string, value: string | undefined): string {
  if (!value) {
    console.warn(`[config] ${name} is not set — copy mobile/.env.example to mobile/.env`)
    return ""
  }
  return value.replace(/\/$/, "")
}

export const config = {
  supabaseUrl: read("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: read("EXPO_PUBLIC_SUPABASE_ANON_KEY", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  apiUrl: read("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL) || "https://www.ezvisa.net",
  siteUrl: "https://www.ezvisa.net",
  supportEmail: "support@ezvisa.net",
  whatsappNumber: "971547109533",
}

export const isConfigured = !!(config.supabaseUrl && config.supabaseAnonKey)
