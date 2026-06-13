import { createBrowserClient } from "@supabase/ssr"

/**
 * Creates a Supabase client for browser/client-side usage
 * Note: SUPABASE_ANON_KEY is intentionally public - it's Supabase's "publishable" key
 * designed for client-side use with Row Level Security (RLS)
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
