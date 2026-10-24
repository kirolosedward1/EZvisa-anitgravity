"use client"

// Sign in with Apple. The artwork is Apple's own button (appleid.auth.js): official logo, official label,
// black on a light surface and white on a dark one. The click does not use Apple's JS session. It starts the
// same Supabase OAuth round trip as Google and comes back through /auth/callback.
import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { authCallbackUrl } from "@/lib/auth/redirect"
import { APPLE_SIGN_IN_LABEL } from "@/lib/auth/apple-profile"
import { NOT_SET_UP, enabledProviders, socialMessage } from "@/lib/auth/providers"
import { authMessage, classifyAuthError, isNetworkError } from "@/lib/auth/errors"
import { useSiteLocale } from "@/components/locale-provider"
import { cn } from "@/lib/utils"

const SCRIPT = {
  en: "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
  ar: "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/ar_SA/appleid.auth.js",
} as const

const BUTTON_ID = "appleid-signin"

type AppleAuthJs = { auth?: { renderButton?: (options?: Record<string, unknown>) => void } }

let activeAppleLocale: keyof typeof SCRIPT | null = null
let appleScriptInflight: { locale: keyof typeof SCRIPT; promise: Promise<void> } | null = null

/** Loads Apple's button bundle for this locale. A later locale loads its own bundle over the first. */
function loadAppleButton(locale: keyof typeof SCRIPT): Promise<void> {
  const apple = (window as Window & { AppleID?: AppleAuthJs }).AppleID
  if (activeAppleLocale === locale && apple?.auth?.renderButton) return Promise.resolve()
  if (appleScriptInflight?.locale === locale) return appleScriptInflight.promise
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT[locale]
    script.async = true
    script.dataset.appleSignin = locale
    script.onload = () => {
      activeAppleLocale = locale
      resolve()
    }
    script.onerror = () => {
      if (appleScriptInflight?.locale === locale) appleScriptInflight = null
      reject(new Error("apple-script"))
    }
    document.head.appendChild(script)
  })
  appleScriptInflight = { locale, promise }
  return promise
}

function useAppleColor(): "black" | "white" {
  const [color, setColor] = useState<"black" | "white">("black")
  useEffect(() => {
    const root = document.documentElement
    const read = () => setColor(root.classList.contains("dark") ? "white" : "black")
    read()
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])
  return color
}

/**
 * Same height (h-12), corner radius (rounded-xl) and width as Continue with Google.
 * Apple's script paints the logo and the label on top; the button underneath is the control.
 */
export function AppleSignInButton({
  next = "/dashboard",
  onError,
}: {
  next?: string
  /** When given, errors are reported to the page instead of under the button. */
  onError?: (message: string) => void
}) {
  const locale = useSiteLocale()
  const label = APPLE_SIGN_IN_LABEL[locale]
  const color = useAppleColor()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const ink = color === "white" ? "#000000" : "#ffffff"
  const fill = color === "white" ? "#ffffff" : "#000000"

  useEffect(() => {
    let alive = true
    const paint = () => {
      const apple = (window as Window & { AppleID?: AppleAuthJs }).AppleID
      apple?.auth?.renderButton?.({
        id: BUTTON_ID,
        color,
        type: "sign-in",
        border: false,
        mode: "center-align",
        height: 48,
        width: "100%",
        borderRadius: 42,
      })
    }
    loadAppleButton(locale)
      .then(() => {
        if (!alive) return
        paint()
      })
      .catch(() => {
        // The labelled button underneath still starts the same OAuth round trip.
      })
    const node = document.getElementById(BUTTON_ID)
    const observer = node ? new ResizeObserver(() => paint()) : null
    if (node) observer?.observe(node)
    return () => {
      alive = false
      observer?.disconnect()
    }
  }, [locale, color])

  const fail = (message: string) => {
    if (onError) onError(message)
    else setError(message)
    setLoading(false)
  }

  const reported = (raw: string, code?: string | null) => {
    if (code && classifyAuthError({ code }) === "disabled") return NOT_SET_UP("apple")
    return socialMessage("apple", raw)
  }

  const signIn = async () => {
    setLoading(true)
    setError("")
    try {
      const known = await enabledProviders()
      if (known && known.apple === false) {
        fail(NOT_SET_UP("apple"))
        return
      }
      const { error: authError } = await createBrowserClient().auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: authCallbackUrl({ next }), scopes: "name email" },
      })
      if (authError) fail(reported(authError.message, authError.code))
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? String((e as { code?: unknown }).code ?? "") : ""
      fail(isNetworkError(e) ? authMessage(e) : reported(e instanceof Error ? e.message : String(e), code))
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className={cn("relative h-12 w-full", loading && "opacity-70")}>
        <button
          type="button"
          className="absolute inset-0 flex h-12 w-full items-center justify-center rounded-xl px-12 text-base font-medium leading-none tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait"
          style={{ backgroundColor: fill, color: ink }}
          aria-label={label}
          aria-busy={loading}
          onClick={signIn}
          disabled={loading}
        >
          {label}
        </button>
        {/* Apple's HIG button, clipped to the same box as the Google button. Clicks pass through to the control. */}
        <div
          id={BUTTON_ID}
          data-color={color}
          data-type="sign in"
          data-border="false"
          data-mode="center-align"
          data-height="48"
          data-width="100%"
          data-border-radius="42"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
          aria-hidden="true"
        />
      </div>
      {error ? <p className="text-center text-xs text-destructive" role="alert">{error}</p> : null}
    </div>
  )
}
