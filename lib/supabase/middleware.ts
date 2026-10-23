import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Refreshes the Supabase session cookies for server-rendered signed-in pages. Server Components cannot write
 * cookies, so without this a refreshed (rotated) token was never saved and users were signed out once the access
 * token expired. Only refreshes: each page decides itself what to show when there is no user (the demo cookie
 * login has no Supabase user, so redirecting here would break it).
 */
export async function updateSession(request: NextRequest, response: NextResponse = NextResponse.next({ request })) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return response
  // Nothing to refresh for visitors who never signed in.
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return response

  let supabaseResponse = response
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  try {
    await supabase.auth.getUser()
  } catch {
    // Network trouble: serve the page; it handles a missing user.
  }
  return supabaseResponse
}
