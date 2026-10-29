"use client"

// Google sign-in in a popup window, for places that must not navigate away (the application wizard keeps the
// visitor's answers on the page). The popup runs the usual Supabase OAuth round trip through /auth/callback and
// lands on /auth/popup-done, which tells this window and closes. Same origin, so the session cookies are shared:
// this window only has to load them into its Supabase client, which updates every useViewer() subscriber.
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoogleLogo } from "@/components/auth/google-sign-in"
import { createBrowserClient } from "@/lib/supabase/client"
import { authCallbackUrl } from "@/lib/auth/redirect"
import { socialMessage } from "@/lib/auth/providers"
import { authMessage, isNetworkError } from "@/lib/auth/errors"
import { POPUP_DONE_PATH, POPUP_SIGNED_IN } from "@/lib/auth/popup"

const POPUP_NAME = "ezvisa-google-sign-in"
let listening = false

/** Load the session the popup stored into this window's client. setSession emits SIGNED_IN to every subscriber. */
async function adoptPopupSession() {
  const supabase = createBrowserClient()
  const { data } = await supabase.auth.getSession()
  const session = data.session
  if (session) await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })
}

/**
 * Once per page. Google's sign-in pages cut `window.opener`, so the popup also announces itself on a
 * BroadcastChannel and through a storage event; whichever arrives first wins and the rest are harmless.
 */
function listenForPopup() {
  if (listening || typeof window === "undefined") return
  listening = true
  const done = () => { void adoptPopupSession() }
  window.addEventListener("message", (event) => {
    if (event.origin === window.location.origin && event.data?.type === POPUP_SIGNED_IN) done()
  })
  window.addEventListener("storage", (event) => {
    if (event.key === POPUP_SIGNED_IN) done()
  })
  if ("BroadcastChannel" in window) new BroadcastChannel(POPUP_SIGNED_IN).onmessage = done
}

function openCentredPopup(): Window | null {
  const width = 500
  const height = 640
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2)
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2)
  return window.open("about:blank", POPUP_NAME, `popup=yes,width=${width},height=${height},left=${left},top=${top}`)
}

export function GoogleSignInPopupButton({ arabic, fallbackNext }: {
  arabic: boolean
  /** Where a full-page sign-in returns when the browser blocks the popup. */
  fallbackNext: string
}) {
  const [waiting, setWaiting] = useState(false)
  const [error, setError] = useState("")
  const t = (en: string, ar: string) => (arabic ? ar : en)

  // Coming back to this window (popup finished or closed) re-enables the button. A signed-in viewer replaces it anyway.
  useEffect(() => {
    if (!waiting) return
    const reset = () => setWaiting(false)
    window.addEventListener("focus", reset)
    return () => window.removeEventListener("focus", reset)
  }, [waiting])

  if (process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "false") return null

  const signIn = async () => {
    setError("")
    listenForPopup()
    // Opened synchronously inside the click, or popup blockers stop it. The Google URL is filled in below.
    const popup = openCentredPopup()
    setWaiting(true)
    try {
      const { data, error: authError } = await createBrowserClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authCallbackUrl({ next: popup ? POPUP_DONE_PATH : fallbackNext }),
          scopes: "openid email profile",
          queryParams: { prompt: "select_account" },
          skipBrowserRedirect: true,
        },
      })
      if (authError || !data.url) throw authError ?? new Error("No sign-in address")
      if (popup && !popup.closed) {
        popup.location.href = data.url
        popup.focus()
      } else {
        // Popup blocked: sign in on this page. The wizard restores the saved draft on return.
        window.location.assign(data.url)
      }
    } catch (cause) {
      popup?.close()
      setWaiting(false)
      setError(isNetworkError(cause) ? authMessage(cause) : socialMessage("google", cause instanceof Error ? cause.message : String(cause)))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" className="h-12 w-full gap-3" onClick={signIn} disabled={waiting}>
        {waiting ? <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden="true" /> : <GoogleLogo className="size-5 shrink-0" />}
        {waiting ? t("Finish signing in in the Google window", "أكمل تسجيل الدخول في نافذة Google") : t("Continue with Google", "المتابعة باستخدام Google")}
      </Button>
      {error ? <p role="alert" className="text-center text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
