import { createServerClient as createClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export function supabaseServerEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_ezvisaSUPABASE_URL || ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_ezvisaSUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_ezvisaSUPABASE_PUBLISHABLE_KEY || ""
  return { url: url || "https://placeholder-project.supabase.co", key: key || "placeholder-anon-key", configured: !!url && !!key }
}

export async function createServerClient() {
  const cookieStore = await cookies()
  const { url, key } = supabaseServerEnv()

  return createClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Can be ignored in Server Component
        }
      },
    },
  })
}

export { createServerClient as createClient }
