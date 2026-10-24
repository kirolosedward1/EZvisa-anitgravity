import { NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"
import { publicOrigin } from "@/lib/auth/redirect"
import { classifyAuthError, type AuthIssue } from "@/lib/auth/errors"
import { callbackFailureTarget, callbackLanding, isArabicPath } from "@/lib/auth/confirm-next"

/**
 * OAuth and older email links land here with ?code= or ?token_hash=.
 * /auth/confirm now signs the user in first and may still send them on with neither.
 * A live session continues to the validated next; link-expired is only for a visitor who is not signed in.
 */
export async function handleAuthCallback(request: Request): Promise<NextResponse> {
  const url = new URL(request.url)
  const { searchParams } = url
  const type = searchParams.get("type") ?? ""
  const next = searchParams.get("next")
  const opts = {
    locale: searchParams.get("locale"),
    requestArabic: request.headers.get("x-ez-locale") === "ar" || isArabicPath(url.pathname),
  }
  const base = publicOrigin(request)
  const send = (path: string) => NextResponse.redirect(new URL(path, base))
  const fail = (issue: AuthIssue) => send(callbackFailureTarget(issue, next, type, opts))

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
    let signedIn = false
    try {
      const { data, error: userError } = await supabase.auth.getUser()
      signedIn = !userError && !!data.user
    } catch {
      signedIn = false
    }
    if (!signedIn) return fail("link-expired")
  }

  return send(callbackLanding(next, recovery ? "recovery" : type, opts))
}
