import { createBrowserClient as createClient } from "@supabase/ssr"

export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co"
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key"
  return createClient(url, key)
}

export { createBrowserClient as createClient }
