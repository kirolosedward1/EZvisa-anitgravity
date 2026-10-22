import { createBrowserClient as createClient } from "@supabase/ssr"

/**
 * Public Supabase settings as the browser bundle sees them. Vercel names these NEXT_PUBLIC_ezvisaSUPABASE_* (see
 * CLAUDE.md); both names are referenced literally so Next inlines them.
 */
export function supabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_ezvisaSUPABASE_URL || ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_ezvisaSUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_ezvisaSUPABASE_PUBLISHABLE_KEY || ""
  return { url: url || "https://placeholder-project.supabase.co", key: key || "placeholder-anon-key", configured: !!url && !!key }
}

export function createBrowserClient() {
  const { url, key } = supabasePublicEnv()
  return createClient(url, key)
}

export { createBrowserClient as createClient }
