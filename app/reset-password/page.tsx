"use client"

// After a reset link: the user is signed in (by /auth/callback) and picks a new password. Same as the app's /auth/reset.
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthCard } from "@/components/auth/auth-card"
import { AUTH_MESSAGE, classifyAuthError, MIN_PASSWORD } from "@/lib/auth/errors"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [sessionEmail, setSessionEmail] = useState<string | null | undefined>(undefined)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getSession().then(({ data }) => setSessionEmail(data.session?.user.email ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSessionEmail(session?.user.email ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inFlight.current) return
    if (password.length < MIN_PASSWORD) { setError(AUTH_MESSAGE["weak-password"]); return }
    inFlight.current = true
    setBusy(true)
    setError("")
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.replace("/dashboard")
      router.refresh()
    } catch (err) {
      setError(AUTH_MESSAGE[classifyAuthError(err)])
      inFlight.current = false
      setBusy(false)
    }
  }

  if (sessionEmail === undefined) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    )
  }

  if (sessionEmail === null) {
    return (
      <AuthCard title="Reset password" subtitle="Open the reset link from your email in this browser. Links work once and expire after a while.">
        <Button asChild className="w-full h-11 text-sm font-semibold rounded-xl">
          <Link href="/forgot-password">Send a new reset link</Link>
        </Button>
        <div className="text-center text-xs text-muted-foreground">
          <Link href="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Choose a new password" subtitle={sessionEmail}>
      <form onSubmit={save} className="flex flex-col gap-4" noValidate>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-xs font-semibold">New password</Label>
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setError("") }} required minLength={MIN_PASSWORD} autoFocus aria-describedby="password-hint" />
          <p id="password-hint" className="text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
        </div>
        <Button type="submit" className="w-full h-11 text-sm font-semibold rounded-xl" disabled={busy}>
          {busy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>) : "Save password"}
        </Button>
        <Button asChild type="button" variant="ghost" className="w-full text-xs text-muted-foreground">
          <Link href="/dashboard">Not now</Link>
        </Button>
      </form>
    </AuthCard>
  )
}
