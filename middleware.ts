import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/** /ar and /ar/* render the same pages. Locale is the URL, not a cookie. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname !== "/ar" && !pathname.startsWith("/ar/")) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = pathname.replace(/^\/ar/, "") || "/"
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-ez-locale", "ar")
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/ar", "/ar/:path*"],
}
