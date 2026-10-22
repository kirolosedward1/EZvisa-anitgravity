"use client"

// Sign in: email + password, or a one-time email link. Google / Apple appear when enabled on the Supabase project.
// Same accounts and the same messages as the EZvisa app (mobile/components/AuthForm.tsx).
import { useRef, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DemoLoginButtons } from "@/components/auth/demo-login-buttons"
import { SocialButtons } from "@/components/auth/social-buttons"
import { AuthCard } from "@/components/auth/auth-card"
import { EmailSent, useCooldown } from "@/components/auth/email-sent"
import { AUTH_MESSAGE, classifyAuthError, EMAIL_RE, isAuthIssue, type AuthIssue } from "@/lib/auth/errors"
import { authCallbackUrl, safeNext } from "@/lib/auth/redirect"

function callbackNotice(error: string | null, type: string | null): { tone: "error" | "info"; text: string } | null {
  if (!error) return null
  if (!isAuthIssue(error)) return { tone: "error", text: AUTH_MESSAGE.unknown }
  // A sign-up link opened in another browser still confirms the email on the server; only the sign-in part needs this one.
  if (type === "signup" && error === "other-device") return { tone: "info", text: "Email confirmed. Sign in with your email and password." }
  return { tone: "error", text: AUTH_MESSAGE[error] }
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get("next"))
  const notice = callbackNotice(searchParams.get("error"), searchParams.get("type"))

  const [mode, setMode] = useState<"password" | "magic-link">(searchParams.get("type") === "magiclink" ? "magic-link" : "password")
  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string>(notice?.tone === "error" ? notice.text : "")
  const [info, setInfo] = useState<string>(notice?.tone === "info" ? notice.text : "")
  const [issue, setIssue] = useState<AuthIssue | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [busy, setBusy] = useState<"" | "password" | "magic" | "resend">("")
  const inFlight = useRef(false)
  const cooldown = useCooldown()

  const cleanEmail = email.trim().toLowerCase()
  const fail = (e: unknown) => {
    const k = classifyAuthError(e)
    setIssue(k)
    setError(AUTH_MESSAGE[k])
  }
  /** One request at a time; a double click can't send twice. */
  const guard = async (kind: typeof busy, fn: () => Promise<void>) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(kind)
    setError("")
    setInfo("")
    setIssue(null)
    try {
      await fn()
    } catch (e) {
      fail(e)
    } finally {
      inFlight.current = false
      setBusy("")
    }
  }

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(cleanEmail)) { setError(AUTH_MESSAGE["invalid-email"]); return }
    if (!password) { setError("Enter your password."); return }
    guard("password", async () => {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      if (error) throw error
      router.replace(next)
      router.refresh()
    })
  }

  const sendMagicLink = (kind: "magic" | "resend") =>
    guard(kind, async () => {
      if (!EMAIL_RE.test(cleanEmail)) { setError(AUTH_MESSAGE["invalid-email"]); return }
      const supabase = createBrowserClient()
      // An unknown email gets a new account (shouldCreateUser defaults to true), same as the app.
      const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail, options: { emailRedirectTo: authCallbackUrl({ type: "magiclink", next }) } })
      if (error) throw error
      setMagicLinkSent(true)
      cooldown.start()
    })

  const resendConfirmation = () =>
    guard("resend", async () => {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.resend({ type: "signup", email: cleanEmail, options: { emailRedirectTo: authCallbackUrl({ type: "signup", next }) } })
      if (error) throw error
      setInfo("Confirmation email sent again. Check your inbox.")
      cooldown.start()
    })

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to track your visa cases, upload documents and download your file. Use the same account as the EZvisa app.">
      <SocialButtons next={next} disabled={!!busy} onError={(m) => { setError(m); setInfo("") }} />

      <div className="flex rounded-xl bg-muted/50 p-1 text-xs font-semibold" role="tablist" aria-label="Sign-in method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "password"}
          onClick={() => { setMode("password"); setError(""); setIssue(null) }}
          className={`flex-1 py-2 rounded-lg transition-all ${mode === "password" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
        >
          Password
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "magic-link"}
          onClick={() => { setMode("magic-link"); setError(""); setIssue(null) }}
          className={`flex-1 py-2 rounded-lg transition-all ${mode === "magic-link" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
        >
          Email me a link
        </button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            {issue === "unconfirmed" && (
              <button type="button" className="block mt-1 font-semibold text-primary hover:underline" onClick={resendConfirmation} disabled={busy === "resend" || cooldown.left > 0}>
                {cooldown.left > 0 ? `Send the confirmation link again (${cooldown.left}s)` : "Send the confirmation link again"}
              </button>
            )}
          </AlertDescription>
        </Alert>
      )}
      {info && (
        <Alert>
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      )}

      {mode === "password" ? (
        <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-xs font-semibold">Email address</Label>
            <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError("") }} required />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
              <Link href={cleanEmail ? `/forgot-password?email=${encodeURIComponent(cleanEmail)}` : "/forgot-password"} className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError("") }} required />
          </div>
          <Button type="submit" className="w-full h-11 text-sm font-semibold rounded-xl" disabled={!!busy}>
            {busy === "password" ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</>) : "Sign in"}
          </Button>
        </form>
      ) : magicLinkSent ? (
        <EmailSent
          email={cleanEmail}
          note="Open it in this browser to sign in. The link works once and expires after a while."
          onResend={() => sendMagicLink("resend")}
          resending={busy === "resend"}
          left={cooldown.left}
          onChangeEmail={() => { setMagicLinkSent(false); setError("") }}
        />
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); sendMagicLink("magic") }} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="magic-email" className="text-xs font-semibold">Your application email</Label>
            <Input id="magic-email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError("") }} required />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Use the email from your application. We send a one-time sign-in link, no password needed.
            </p>
          </div>
          <Button type="submit" className="w-full h-11 text-sm font-semibold rounded-xl" disabled={!!busy}>
            {busy === "magic" ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending link…</>) : "Send sign-in link"}
          </Button>
        </form>
      )}

      <DemoLoginButtons next={next} />

      <div className="pt-2 border-t border-border/60 text-center text-xs text-muted-foreground">
        New here?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
          Create account
        </Link>
        {" · "}
        <Link href="/apply" className="font-semibold text-primary hover:underline">
          Start an application
        </Link>
      </div>
    </AuthCard>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
