import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

/** Signed-in, server-rendered pages: refresh the Supabase session cookies before the page renders. */
const SESSION_PATHS = ["/dashboard", "/account", "/continue", "/trip", "/receipt"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
    "/ar",
    "/ar/:path*",
    "/dashboard/:path*",
    "/account/:path*",
    "/continue/:path*",
    "/trip/:path*",
    "/receipt/:path*",
  ],
}
