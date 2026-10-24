import { NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createServerClient, supabaseServerEnv } from "@/lib/supabase/server"
import { publicOrigin } from "@/lib/auth/redirect"
import {
  appAuthCallback,
  confirmDestination,
  confirmFailureTarget,
  isEmailOtpType,
  type ConfirmOtpType,
} from "@/lib/auth/confirm-next"

export const dynamic = "force-dynamic"

/**
 * Email links land here (https://www.ezvisa.net/auth/confirm?token_hash=&type=&next=) instead of the
 * supabase.co verify URL. verifyOtp consumes the hash once and sets the session cookie, then we continue
 * to a same-origin `next` (an absolute https://www.ezvisa.net or https://ezvisa.net URL is reduced to its
 * path), or to /reset-password for a recovery link. A failed check with an /ar next goes to /ar/login.
 *
 * When `next` is the app callback (ezvisa://auth/callback), this does not call verifyOtp. It forwards the
 * still-unused hash to Supabase's verify endpoint with that redirect, so the app receives its PKCE code the
 * same way it does today. The 8-digit code (verifyOtp with `token` and `email`) is not read here.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get("token_hash") ?? ""
  const type = url.searchParams.get("type") ?? ""
  const rawNext = url.searchParams.get("next")
  const arabic = requestIsArabic(request)
  const base = publicOrigin(request)

  const fail = () => NextResponse.redirect(new URL(confirmFailureTarget(rawNext, type, arabic), base))

  if (!isEmailOtpType(type) || !isTokenHash(tokenHash)) return fail()

  const destination = confirmDestination(type, rawNext, arabic)
  const app = appAuthCallback(destination)
  if (app) {
    const bounce = supabaseVerifyRedirect(tokenHash, type, app)
    if (!bounce) return fail()
    return NextResponse.redirect(bounce)
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash })
  if (error) return fail()
  return NextResponse.redirect(new URL(destination, base))
}

function requestIsArabic(request: Request): boolean {
  if (request.headers.get("x-ez-locale") === "ar") return true
  const path = new URL(request.url).pathname
  return path === "/ar" || path.startsWith("/ar/")
}

/** The emailed hash, not the 8-digit code. Whitespace cannot smuggle a second URL. */
function isTokenHash(value: string): boolean {
  return value.length > 0 && value.length <= 2000 && !/[\s\u0000-\u001f\u007f]/.test(value)
}

/** Supabase GET /verify treats `token` as the hash and then redirects to `redirect_to` (the app). */
function supabaseVerifyRedirect(tokenHash: string, type: ConfirmOtpType, redirectTo: string): URL | null {
  const { url, configured } = supabaseServerEnv()
  if (!configured) return null
  let verify: URL
  try {
    verify = new URL("/auth/v1/verify", url)
  } catch {
    return null
  }
  const local = verify.hostname === "localhost" || verify.hostname === "127.0.0.1"
  if (verify.username || verify.password) return null
  if (verify.protocol !== "https:" && !(verify.protocol === "http:" && local)) return null
  verify.search = ""
  verify.searchParams.set("token", tokenHash)
  verify.searchParams.set("type", type)
  verify.searchParams.set("redirect_to", redirectTo)
  return verify
}
