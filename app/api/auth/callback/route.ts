import { NextResponse } from "next/server"
import { publicOrigin } from "@/lib/auth/redirect"

/** Older sign-up emails pointed here; the real handler is /auth/callback. Keeps every query parameter. */
export function GET(request: Request) {
  const url = new URL(request.url)
  return NextResponse.redirect(new URL(`/auth/callback${url.search}`, publicOrigin(request)), 307)
}
