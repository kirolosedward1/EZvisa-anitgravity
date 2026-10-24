"use client"

// Sign in with Apple. The glyph is Apple's logo-only artwork, copied verbatim from the large logo in
// appleid.cdn-apple.com/.../appleid.auth.js (viewBox "9 0 21 44"). It is not redrawn. The label uses the
// site font at the same size and weight as Continue with Google (text-sm / font-semibold, 14px / 600).
// Black on a light page, white when <html> has .dark. The click is Supabase OAuth back through /auth/callback.
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { authCallbackUrl } from "@/lib/auth/redirect"
import { APPLE_SIGN_IN_LABEL } from "@/lib/auth/apple-profile"
import { NOT_SET_UP, enabledProviders, socialMessage } from "@/lib/auth/providers"
import { authMessage, classifyAuthError, isNetworkError } from "@/lib/auth/errors"
import { useSiteLocale } from "@/components/locale-provider"
import { cn } from "@/lib/utils"

/** Apple's official logo-only glyph. Fill follows the button text color. */
export function AppleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="9 0 21 44" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        fillRule="nonzero"
        d="M19.8196726,13.1384615 C20.902953,13.1384615 22.2608678,12.406103 23.0695137,11.4296249 C23.8018722,10.5446917 24.3358837,9.30883662 24.3358837,8.07298156 C24.3358837,7.9051494 24.3206262,7.73731723 24.2901113,7.6 C23.0847711,7.64577241 21.6353115,8.4086459 20.7656357,9.43089638 C20.0790496,10.2090273 19.4534933,11.4296249 19.4534933,12.6807374 C19.4534933,12.8638271 19.4840083,13.0469167 19.4992657,13.1079466 C19.5755531,13.1232041 19.6976128,13.1384615 19.8196726,13.1384615 Z M16.0053051,31.6 C17.4852797,31.6 18.1413509,30.6082645 19.9875048,30.6082645 C21.8641736,30.6082645 22.2761252,31.5694851 23.923932,31.5694851 C25.5412238,31.5694851 26.6245041,30.074253 27.6467546,28.6095359 C28.7910648,26.9312142 29.2640464,25.2834075 29.2945613,25.2071202 C29.1877591,25.1766052 26.0904927,23.9102352 26.0904927,20.3552448 C26.0904927,17.2732359 28.5316879,15.8848061 28.6690051,15.7780038 C27.0517133,13.4588684 24.5952606,13.3978385 23.923932,13.3978385 C22.1082931,13.3978385 20.6283185,14.4963764 19.6976128,14.4963764 C18.6906198,14.4963764 17.36322,13.4588684 15.7917006,13.4588684 C12.8012365,13.4588684 9.765,15.9305785 9.765,20.5993643 C9.765,23.4982835 10.8940528,26.565035 12.2824825,28.548506 C13.4725652,30.2268277 14.5100731,31.6 16.0053051,31.6 Z"
      />
    </svg>
  )
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
 * Same height (h-12 / 48px), corner radius (rounded-xl) and width as the Google button.
 * HIG colors are literal black and white, so they are set inline rather than with bg-black / text-white tokens.
 */
export function AppleSignInButton({
  next = "/dashboard",
  label,
  onError,
}: {
  next?: string
  /** Visible label. Defaults to "Sign in with Apple" / «تسجيل الدخول باستخدام Apple». */
  label?: string
  /** When given, errors are reported to the page instead of under the button. */
  onError?: (message: string) => void
}) {
  const locale = useSiteLocale()
  const text = label ?? APPLE_SIGN_IN_LABEL[locale]
  const color = useAppleColor()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const ink = color === "white" ? "#000000" : "#ffffff"
  const fill = color === "white" ? "#ffffff" : "#000000"

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
      <button
        type="button"
        className={cn(
          "inline-flex h-12 w-full items-center justify-center gap-3 whitespace-nowrap rounded-xl px-3 text-sm font-semibold leading-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait",
          loading && "opacity-70",
        )}
        style={{ backgroundColor: fill, color: ink }}
        aria-label={text}
        aria-busy={loading}
        onClick={signIn}
        disabled={loading}
      >
        {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <AppleLogo className="h-5 w-auto" />}
        {text}
      </button>
      {error ? <p className="text-center text-xs text-destructive" role="alert">{error}</p> : null}
    </div>
  )
}
