"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { authCallbackUrl } from "@/lib/auth/redirect"
import { socialMessage } from "@/lib/auth/providers"
import { authMessage, isNetworkError } from "@/lib/auth/errors"

/** The official multicolour Google "G" mark. */
export function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/**
 * "Continue with Google" through Supabase OAuth; returns via /auth/callback to `next`.
 * Shown by default. Set NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=false to hide it.
 */
export function GoogleSignInButton({
  next = "/dashboard",
  label = "Continue with Google",
  className,
  onError,
}: {
  next?: string
  label?: string
  className?: string
  /** When given, errors are reported to the page instead of under the button. */
  onError?: (message: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "false") return null

  const fail = (message: string) => {
    if (onError) onError(message)
    else setError(message)
    setLoading(false)
  }

  const signIn = async () => {
    setLoading(true)
    setError("")
    try {
      const supabase = createBrowserClient()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: authCallbackUrl({ next }), queryParams: { prompt: "select_account" } },
      })
      if (authError) fail(socialMessage("google", authError.message))
      // On success the browser is leaving for Google: keep the spinner.
    } catch (e) {
      fail(isNetworkError(e) ? authMessage(e) : socialMessage("google", e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className={cn("h-12 w-full gap-3 rounded-xl border-border bg-background text-sm font-semibold text-foreground shadow-xs hover:bg-secondary", className)}
        onClick={signIn}
        disabled={loading}
      >
        {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <GoogleLogo className="size-5" />}
        {label}
      </Button>
      {error ? <p className="text-center text-xs text-destructive" role="alert">{error}</p> : null}
    </div>
  )
}
