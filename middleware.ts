import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/** /ar and /ar/* render the same pages with the Arabic language cookie set. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname !== "/ar" && !pathname.startsWith("/ar/")) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = pathname.replace(/^\/ar/, "") || "/"
  const response = NextResponse.rewrite(url)
  response.cookies.set("ez_lang", "ar", { path: "/", maxAge: 60 * 60 * 24 * 365 })
  return response
}

export const config = {
  matcher: ["/ar", "/ar/:path*"],
}
