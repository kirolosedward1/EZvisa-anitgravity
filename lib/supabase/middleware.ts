import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Refreshes the Supabase session cookies for server-rendered signed-in pages. Server Components cannot write
 * cookies, so without this a refreshed (rotated) token was never saved and users were signed out once the access
 * token expired. Only refreshes: each page decides itself what to show when there is no user (the demo cookie
 * login has no Supabase user, so redirecting here would break it).
 */
export async function updateSession(
  request: NextRequest,
  /** Builds the response (a plain next() or the /ar rewrite). Called after the refresh so the page renders with the
   *  refreshed cookies (the request headers are read at that point). */
  makeResponse: (request: NextRequest) => NextResponse = (req) => NextResponse.next({ request: req }),
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // Nothing to refresh without config or for visitors who never signed in.
  if (!url || !key || !request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return makeResponse(request)

  let refreshed: { name: string; value: string; options: Record<string, unknown> }[] = []
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // For this render (request) and for the browser (response, set below).
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        refreshed = cookiesToSet as typeof refreshed
      },
    },
  })

  try {
    await supabase.auth.getUser()
  } catch {
    // Network trouble: serve the page; it handles a missing user.
  }
  const response = makeResponse(request)
  refreshed.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
