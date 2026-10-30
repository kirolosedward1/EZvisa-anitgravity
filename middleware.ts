import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

/** Signed-in, server-rendered pages: refresh the Supabase session cookies before the page renders. */
const SESSION_PATHS = ["/dashboard", "/account", "/continue", "/appointment", "/trip", "/receipt"]

/**
 * Staff console. /admin/* is never served directly (it answers as a missing page); staff open /staff/..., which is
 * rewritten to /admin/... with a fresh session. app/admin/layout.tsx then shows the console only to signed-in staff
 * (lib/admin-auth.ts) and a missing page to everyone else, so the console's existence is not revealed.
 */
function staffConsole(request: NextRequest): Promise<NextResponse> | NextResponse | null {
  const { pathname } = request.nextUrl
  const bare = pathname.replace(/^\/ar(?=\/|$)/, "")
  // The console has no Arabic version: /ar/staff is missing too.
  if (bare === "/admin" || bare.startsWith("/admin/") || (bare !== pathname && (bare === "/staff" || bare.startsWith("/staff/")))) {
    return NextResponse.rewrite(new URL("/__not-found", request.url), { status: 404 })
  }
  if (pathname !== "/staff" && !pathname.startsWith("/staff/")) return null
  const url = request.nextUrl.clone()
  url.pathname = pathname.replace(/^\/staff/, "/admin")
  return updateSession(request, (req) => {
    const response = NextResponse.rewrite(url, { request: { headers: req.headers } })
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
    response.headers.set("Referrer-Policy", "no-referrer")
    response.headers.set("Cache-Control", "no-store")
    return response
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const staff = staffConsole(request)
  if (staff) return staff

  const needsSession = (path: string) => SESSION_PATHS.some((p) => path === p || path.startsWith(`${p}/`))

  /** /ar and /ar/* render the same pages. Locale is the URL, not a cookie. */
  if (pathname === "/ar" || pathname.startsWith("/ar/")) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/ar/, "") || "/"
    const rewrite = (req: NextRequest) => {
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set("x-ez-locale", "ar")
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    }
    return needsSession(url.pathname) ? updateSession(request, rewrite) : rewrite(request)
  }

  if (needsSession(pathname)) {
    return updateSession(request)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/staff",
    "/staff/:path*",
    "/ar",
    "/ar/:path*",
    "/dashboard/:path*",
    "/account/:path*",
    "/continue/:path*",
    "/appointment/:path*",
    "/trip/:path*",
    "/receipt/:path*",
  ],
}
