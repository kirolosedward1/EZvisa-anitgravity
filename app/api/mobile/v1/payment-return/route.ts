import { NextResponse, type NextRequest } from "next/server"
import { isAllowedAppReturnUrl } from "@/lib/mobile/return-url"

export const dynamic = "force-dynamic"

/**
 * Ziina redirects here after checkout (it only accepts https URLs). We bounce
 * the browser back into the app. The app then asks the API for the real
 * payment status — the `status` query param is only a hint for the UI.
 */
export function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to") || ""
  const status = request.nextUrl.searchParams.get("status") || "unknown"
  if (!isAllowedAppReturnUrl(to)) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  const target = new URL(to)
  target.searchParams.set("status", ["success", "cancelled", "failed"].includes(status) ? status : "unknown")
  return NextResponse.redirect(target.toString(), 302)
}
