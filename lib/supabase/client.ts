import { createBrowserClient as createClient } from "@supabase/ssr"

export function createBrowserClient() {
  // Vercel names these NEXT_PUBLIC_ezvisaSUPABASE_* (see CLAUDE.md); both names are referenced literally so Next inlines them.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_ezvisaSUPABASE_URL || "https://placeholder-project.supabase.co"
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_ezvisaSUPABASE_ANON_KEY || "placeholder-anon-key"
  return createClient(url, key)
}

export { createBrowserClient as createClient }
