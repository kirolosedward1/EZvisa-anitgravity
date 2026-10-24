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
import { GoogleSignInButton } from "@/components/auth/google-sign-in"
import { useSiteLocale } from "@/components/locale-provider"
import { EMAIL_RE } from "@/lib/auth/errors"
import { ltr } from "@/lib/bidi"
import { translations } from "@/lib/translations"
import { authFormErrorText } from "@/lib/translations/auth-form"

function SignupForm() {
  const locale = useSiteLocale()
  const arabic = locale === "ar"
  const copy = translations[locale].authForm
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawNext = searchParams.get("next") || "/dashboard"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes(":") ? rawNext : "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createBrowserClient()
  const loginHref = `${arabic ? "/ar" : ""}/login?next=${encodeURIComponent(next)}`

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = email.trim()
    if (!EMAIL_RE.test(clean)) {
      setError(copy.errors["invalid-email"])
      return
    }
    if (password.length < 6) {
      setError(copy.passwordTooShort)
      return
    }
    setIsLoading(true)
    setError("")

    const { error } = await supabase.auth.signUp({
      email: clean,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setError(authFormErrorText(locale, error))
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md space-y-6 p-8 bg-card rounded-xl shadow-lg border border-border/50 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-emerald-600">{copy.checkEmailTitle}</h1>
        <p className="text-muted-foreground">
          {copy.verificationSent} <span dir="ltr">{ltr(email.trim())}</span>. {copy.verifyContinue}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.push(arabic ? "/ar/login" : "/login")}>{copy.backToLogin}</Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-8 p-8 bg-card rounded-xl shadow-lg border border-border/50">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{copy.signupTitle}</h1>
        <p className="text-muted-foreground mt-2">{copy.signupSubtitle}</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-6" noValidate>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{copy.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              inputMode="email"
              placeholder={copy.emailPlaceholder}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError("") }}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{copy.passwordLabel}</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError("") }}
              required
              minLength={6}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {copy.signingUp}
            </>
          ) : (
            copy.createAccount
          )}
        </Button>
      </form>

      <GoogleSignInButton
        next={next}
        label={copy.signUpGoogle}
        onError={arabic ? (message) => setError(authFormErrorText("ar", message)) : undefined}
      />

      <div className="text-center text-sm text-muted-foreground">
        {copy.haveAccount}{" "}
        <Link href={loginHref} className="font-medium text-primary hover:underline">
          {copy.signIn}
        </Link>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" /></div>}>
        <SignupForm />
      </Suspense>
    </div>
  )
}
