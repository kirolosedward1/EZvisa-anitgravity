"use client"

// Google sign-in through Supabase OAuth (PKCE). The round trip returns to /auth/callback. Apple lives in
// components/auth/apple-sign-in.tsx (Apple's own button artwork). See lib/auth/providers.ts.
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/client"
import { authCallbackUrl } from "@/lib/auth/redirect"
import { ALWAYS_OFFERED, enabledProviders, socialMessage, NOT_SET_UP, PROVIDER_LABEL, type Providers, type SocialProvider } from "@/lib/auth/providers"
import { authMessage, isNetworkError } from "@/lib/auth/errors"

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.26-2.09 3.55-5.17 3.55-8.87z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  )
}

const MARK = { google: GoogleMark }

export function SocialButtons({ next, onError, disabled }: { next?: string; onError: (message: string) => void; disabled?: boolean }) {
  // null = settings not read (yet, or unreachable): the always-offered providers still show and just try.
  const [enabled, setEnabled] = useState<Providers | null>(null)
  const [busy, setBusy] = useState<SocialProvider | "">("")

  useEffect(() => {
    let alive = true
    enabledProviders().then((p) => alive && setEnabled(p))
    return () => { alive = false }
  }, [])

  const shown = (["google"] as const).filter((p) => ALWAYS_OFFERED.includes(p) || enabled?.[p])
  if (shown.length === 0) return null

  const start = async (provider: SocialProvider) => {
    if (enabled && enabled[provider] === false) {
      onError(NOT_SET_UP(provider))
      return
    }
    setBusy(provider)
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authCallbackUrl({ next }),
          queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
        },
      })
      if (error) throw error
      // The browser is now navigating to the provider; keep the spinner on.
    } catch (e) {
      onError(isNetworkError(e) ? authMessage(e) : socialMessage(provider, e instanceof Error ? e.message : String(e)))
      setBusy("")
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {shown.map((provider) => {
          const Mark = MARK[provider]
          return (
            <Button key={provider} type="button" variant="outline" className="w-full h-11 rounded-xl font-semibold" disabled={disabled || !!busy} onClick={() => start(provider)}>
              {busy === provider ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mark className="h-4 w-4" />}
              Continue with {PROVIDER_LABEL[provider]}
            </Button>
          )
        })}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}
