"use client"

// Create an account (email + password, at least 8 characters, same rule as the app). Google / Apple appear when
// enabled on the Supabase project. The confirmation email returns to /auth/callback?type=signup.
import { useRef, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SocialButtons } from "@/components/auth/social-buttons"
import { AuthCard } from "@/components/auth/auth-card"
import { EmailSent, useCooldown } from "@/components/auth/email-sent"
import { AUTH_MESSAGE, classifyAuthError, EMAIL_RE, MIN_PASSWORD, type AuthIssue } from "@/lib/auth/errors"
import { authCallbackUrl, safeNext } from "@/lib/auth/redirect"

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get("next"))

  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [issue, setIssue] = useState<AuthIssue | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState<"" | "signup" | "resend">("")
  const inFlight = useRef(false)
  const cooldown = useCooldown()
  const cleanEmail = email.trim().toLowerCase()

  const fail = (k: AuthIssue) => { setIssue(k); setError(AUTH_MESSAGE[k]) }
  const guard = async (kind: typeof busy, fn: () => Promise<void>) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(kind)
    setError("")
    setIssue(null)
    try {
      await fn()
    } catch (e) {
      fail(classifyAuthError(e))
    } finally {
      inFlight.current = false
      setBusy("")
    }
  }

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(cleanEmail)) { fail("invalid-email"); return }
    if (password.length < MIN_PASSWORD) { fail("weak-password"); return }
    guard("signup", async () => {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password, options: { emailRedirectTo: authCallbackUrl({ type: "signup", next }) } })
      if (error) throw error
      // With email confirmation on, an existing address returns a user with no identities (no email is sent).
      if (data.user && data.user.identities?.length === 0) { fail("exists"); return }
      if (data.session) {
        router.replace(next)
        router.refresh()
        return
      }
      setSent(true)
      cooldown.start()
    })
  }

  const resend = () =>
    guard("resend", async () => {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.resend({ type: "signup", email: cleanEmail, options: { emailRedirectTo: authCallbackUrl({ type: "signup", next }) } })
      if (error) throw error
      cooldown.start()
    })

  if (sent) {
    return (
      <AuthCard title="Confirm your email">
        <EmailSent email={cleanEmail} note="Open it in this browser to confirm your account. Then you're signed in." onResend={resend} resending={busy === "resend"} left={cooldown.left} onChangeEmail={() => { setSent(false); setError("") }} />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="text-center text-xs text-muted-foreground">
          Already confirmed?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}&email=${encodeURIComponent(cleanEmail)}`} className="font-semibold text-primary hover:underline">Sign in</Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Create your account" subtitle="Track your application, upload documents and download your file. One account for ezvisa.net and the EZvisa app.">
      <SocialButtons next={next} disabled={!!busy} onError={setError} />

      <form onSubmit={handleSignup} className="flex flex-col gap-4" noValidate>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error}
              {issue === "exists" && (
                <Link href={`/login?next=${encodeURIComponent(next)}&email=${encodeURIComponent(cleanEmail)}`} className="block mt-1 font-semibold text-primary hover:underline">
                  Sign in instead
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-xs font-semibold">Email address</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError("") }} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setError("") }} required minLength={MIN_PASSWORD} aria-describedby="password-hint" />
          <p id="password-hint" className="text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
        </div>
        <Button type="submit" className="w-full h-11 text-sm font-semibold rounded-xl" disabled={!!busy}>
          {busy === "signup" ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</>) : "Create account"}
        </Button>
      </form>

      <div className="pt-2 border-t border-border/60 text-center text-xs text-muted-foreground">
        Have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </AuthCard>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <SignupForm />
    </Suspense>
  )
}
