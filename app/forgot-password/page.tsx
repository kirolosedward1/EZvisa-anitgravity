"use client"

// Password reset email. The link returns to /auth/callback?type=recovery, which signs the user in and opens /reset-password.
import { useRef, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthCard } from "@/components/auth/auth-card"
import { EmailSent, useCooldown } from "@/components/auth/email-sent"
import { AUTH_MESSAGE, classifyAuthError, EMAIL_RE } from "@/lib/auth/errors"
import { authCallbackUrl } from "@/lib/auth/redirect"

function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const cooldown = useCooldown()
  const cleanEmail = email.trim().toLowerCase()

  const send = async () => {
    if (inFlight.current) return
    if (!EMAIL_RE.test(cleanEmail)) { setError(AUTH_MESSAGE["invalid-email"]); return }
    inFlight.current = true
    setBusy(true)
    setError("")
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: authCallbackUrl({ type: "recovery" }) })
      if (error) throw error
      setSent(true)
      cooldown.start()
    } catch (e) {
      setError(AUTH_MESSAGE[classifyAuthError(e)])
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <AuthCard title={sent ? "Check your email" : "Reset password"} subtitle={sent ? undefined : "We'll email you a link to choose a new one."}>
      {sent ? (
        <EmailSent email={cleanEmail} note="If there's an account for this email, the link is on its way. Open it in this browser." onResend={send} resending={busy} left={cooldown.left} onChangeEmail={() => { setSent(false); setError("") }} />
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex flex-col gap-4" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-xs font-semibold">Email address</Label>
            <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError("") }} required autoFocus={!email} />
          </div>
          <Button type="submit" className="w-full h-11 text-sm font-semibold rounded-xl" disabled={busy}>
            {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>) : "Send reset link"}
          </Button>
        </form>
      )}
      {error && sent && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="text-center text-xs text-muted-foreground">
        <Link href={cleanEmail ? `/login?email=${encodeURIComponent(cleanEmail)}` : "/login"} className="font-semibold text-primary hover:underline">Back to sign in</Link>
      </div>
    </AuthCard>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
