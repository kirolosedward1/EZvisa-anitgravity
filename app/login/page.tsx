"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { DemoLoginButtons } from "@/components/auth/demo-login-buttons"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawNext = searchParams.get("next") || "/dashboard"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes(":") ? rawNext : "/dashboard"
  const urlError = searchParams.get("error")

  const [mode, setMode] = useState<"password" | "magic-link">("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(urlError || "")
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createBrowserClient()

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      router.push(next)
      router.refresh()
    }
  }

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setMagicLinkSent(false)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setMagicLinkSent(true)
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-border/60">
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Customer Portal</h2>
        <p className="text-muted-foreground text-xs md:text-sm mt-1.5">
          Sign in to track your visa cases, upload documents, and download completed files
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => { setMode("password"); setError(""); }}
          className={`flex-1 py-2 rounded-lg transition-all ${mode === "password" ? "bg-white dark:bg-slate-900 text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
        >
          Password Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode("magic-link"); setError(""); }}
          className={`flex-1 py-2 rounded-lg transition-all ${mode === "magic-link" ? "bg-white dark:bg-slate-900 text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
        >
          Email Magic Link
        </button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {magicLinkSent ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center space-y-3">
          <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto">
            ✓
          </div>
          <h3 className="font-bold text-sm text-foreground">Check your email</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We sent a secure 1-click sign-in link to <strong>{email}</strong>. Click the link in your inbox to access your dashboard instantly.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMagicLinkSent(false)}
            className="text-xs text-primary"
          >
            Resend or use another email
          </Button>
        </div>
      ) : mode === "password" ? (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full h-11 text-sm font-semibold rounded-xl" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In to Dashboard"
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleMagicLinkLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="magic-email" className="text-xs font-semibold">Your Application Email</Label>
            <Input
              id="magic-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Enter the email address you used when applying. We will send you an instant login link—no password needed.
            </p>
          </div>

          <Button type="submit" className="w-full h-11 text-sm font-semibold rounded-xl" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Magic Link...
              </>
            ) : (
              "Send Magic Sign-In Link"
            )}
          </Button>
        </form>
      )}

      {/* 1-Click Demo Logins for Dashboard Area */}
      <DemoLoginButtons next={next} />

      <div className="pt-2 border-t border-border/60 text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
          Sign up
        </Link>
        {" · "}
        <Link href="/apply" className="font-semibold text-primary hover:underline">
          Start New Application
        </Link>
      </div>
    </div>
  )
}


export default function LoginPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
