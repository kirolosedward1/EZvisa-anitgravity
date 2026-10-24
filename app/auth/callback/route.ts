import { NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"
import { safeNext, publicOrigin } from "@/lib/auth/redirect"
import { isArabicPath } from "@/lib/auth/confirm-next"
import { localizePath } from "@/lib/route-path"
import { classifyAuthError, type AuthIssue } from "@/lib/auth/errors"

/**
 * Landing route for every auth link and OAuth return: ?code= (PKCE: magic link, sign-up confirmation, password reset,
 * Google/Apple), ?token_hash=&type= (templates that use {{ .TokenHash }}), or an error Supabase appended
 * (error, error_code, error_description). Signs the user in, then continues to ?next= (internal paths only), or to
 * /reset-password after a recovery link. Failures land on /login with a short message key (lib/auth/errors.ts).
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams } = url
  const next = safeNext(searchParams.get("next"))
  const type = searchParams.get("type") ?? ""
  const base = publicOrigin(request)
  const arabic = isArabicPath(next)

  const fail = (issue: AuthIssue) => {
    const to = new URL(arabic ? "/ar/login" : "/login", base)
    to.searchParams.set("error", issue)
    if (type) to.searchParams.set("type", type)
    if (next !== "/dashboard") to.searchParams.set("next", next)
    return NextResponse.redirect(to)
  }

  const errorCode = searchParams.get("error_code")
  const errorDescription = searchParams.get("error_description")
  const error = searchParams.get("error")
  if (error || errorCode || errorDescription) {
    return fail(classifyAuthError({ code: errorCode ?? undefined, message: errorDescription ?? error ?? undefined }))
  }

  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  let recovery = type === "recovery"

  const supabase = await createServerClient()
  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) return fail(classifyAuthError(exchangeError))
    if ((data as { redirectType?: string | null }).redirectType === "recovery") recovery = true
  } else if (tokenHash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
    if (verifyError) return fail(classifyAuthError(verifyError))
  } else {
    return fail("link-expired")
  }

  if (recovery) return NextResponse.redirect(new URL(localizePath("/reset-password", arabic), base))
  return NextResponse.redirect(new URL(next, base))
}
