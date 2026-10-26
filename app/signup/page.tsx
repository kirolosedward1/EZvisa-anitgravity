"use client"

import { useState, Suspense } from "react"
import { LocaleLink, useLocalizedHref } from "@/components/locale-link"
import { useSearchParams } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { SocialSignIn } from "@/components/auth/social-sign-in"
import { EmailSent, useCooldown } from "@/components/auth/email-sent"
import { useSiteLocale } from "@/components/locale-provider"
import { EMAIL_RE } from "@/lib/auth/errors"
import { authCallbackUrl } from "@/lib/auth/redirect"
import { translations } from "@/lib/translations"
import { authFormErrorText } from "@/lib/translations/auth-form"

function SignupForm() {
  const locale = useSiteLocale()
  const arabic = locale === "ar"
  const copy = translations[locale].authForm
  const searchParams = useSearchParams()
  const localize = useLocalizedHref()
  const rawNext = searchParams.get("next") || "/dashboard"
  const safe = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes(":") ? rawNext : "/dashboard"
  const next = localize(safe)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createBrowserClient()
  const cooldown = useCooldown()
  const [resending, setResending] = useState(false)

  const resend = async () => {
    setResending(true)
    await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: authCallbackUrl({ type: "signup", path: "/api/auth/callback", next }) },
    })
    setResending(false)
    cooldown.start()
  }

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
        emailRedirectTo: authCallbackUrl({ type: "signup", path: "/api/auth/callback", next }),
      },
    })

    if (error) {
      setError(authFormErrorText(locale, error))
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
      cooldown.start()
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md rounded-xl border border-border/50 bg-card p-8 shadow-lg">
        <EmailSent
          title={copy.checkEmailTitle}
          email={email.trim()}
          note={copy.verifyContinue}
          onResend={resend}
          resending={resending}
          left={cooldown.left}
          onChangeEmail={() => setSuccess(false)}
        />
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-8 rounded-xl border border-border/50 bg-card px-4 py-8 shadow-lg sm:p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{copy.signupTitle}</h1>
        <p className="text-muted-foreground mt-2">{copy.signupSubtitle}</p>
      </div>

      <div className="flex flex-col gap-5">
        <SocialSignIn
          next={next}
          appleLabel={copy.signUpApple}
          googleLabel={copy.signUpGoogle}
          linkingNote={copy.sameEmailFirst}
          divider={copy.orDivider}
          onAppleError={(message) => setError(authFormErrorText(locale, message))}
          onGoogleError={arabic ? (message) => setError(authFormErrorText("ar", message)) : undefined}
        />

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
      </div>

      <div className="text-center text-sm text-muted-foreground">
        {copy.haveAccount}{" "}
        <LocaleLink href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-primary hover:underline">
          {copy.signIn}
        </LocaleLink>
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
