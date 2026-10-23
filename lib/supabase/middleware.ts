// Optional session refresher for a root middleware/proxy (not wired today: the dashboard pages redirect to /login
// themselves). Tracking links (/track/<token>) are secret URLs and must never require a session.
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { supabaseServerEnv } from "@/lib/supabase/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })
  const { url, key } = supabaseServerEnv()

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith("/dashboard") && !request.cookies.get("ez_demo_session")) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
