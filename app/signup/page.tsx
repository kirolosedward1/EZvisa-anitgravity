"use client"
import { AuthSplitLayout } from "@/components/auth/auth-split-layout"

import { useRef, useState, Suspense } from "react"
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
import { authCallbackUrl, safeNext } from "@/lib/auth/redirect"
import { AccountDetailsFields } from "@/components/auth/account-details-fields"
import { AgeConfirmation } from "@/components/auth/age-confirmation"
import { CompleteAccountProfile } from "@/components/auth/complete-account-profile"
import { registrationDetails, accountDetailsError } from "@/lib/auth/account-details"
import { translations } from "@/lib/translations"
import { authFormErrorText } from "@/lib/translations/auth-form"

function SignupForm() {
  const locale = useSiteLocale()
  const arabic = locale === "ar"
  const copy = translations[locale].authForm
  const searchParams = useSearchParams()
  const localize = useLocalizedHref()
  const rawNext = searchParams.get("next") || "/dashboard"
  const safe = safeNext(rawNext)
  const next = localize(safe)

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [birthdate, setBirthdate] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inFlight = useRef(false)

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
    if (inFlight.current) return
    const details = registrationDetails(name, birthdate, confirmed)
    if (details.error) {
      setError(accountDetailsError(locale, details.error))
      return
    }
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
    inFlight.current = true
    setError("")

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, birthdate, confirmed, email: clean, password, next, locale }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (result.field) { setError(accountDetailsError(locale, result.field)); return }
        throw new Error(result.error || copy.errors.unknown)
      }
      setSuccess(true)
      cooldown.start()
    } catch (cause) {
      setError(authFormErrorText(locale, cause))
    } finally {
      inFlight.current = false
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full">
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
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{copy.signupTitle}</h1>
        <p className="text-muted-foreground mt-2">{copy.signupSubtitle}</p>
      </div>

      <div className="flex flex-col gap-5">
        <SocialSignIn
          next={localize(`/signup?profile=complete&next=${encodeURIComponent(next)}`)}
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
          <AccountDetailsFields name={name} birthdate={birthdate} onName={value => { setName(value); setError("") }} onBirthdate={value => { setBirthdate(value); setConfirmed(false); setError("") }} />
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

        <AgeConfirmation checked={confirmed} onChange={value => { setConfirmed(value); setError("") }} disabled={isLoading} />
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

function SignupContent() {
  const searchParams = useSearchParams()
  const localize = useLocalizedHref()
  if (searchParams.get("profile") === "complete") {
    return <CompleteAccountProfile next={localize(safeNext(searchParams.get("next")))} />
  }
  return <SignupForm />
}

export default function SignupPage() {
  return (
    <AuthSplitLayout variant="signup">
      <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" /></div>}>
        <SignupContent />
      </Suspense>
    </AuthSplitLayout>
  )
}
