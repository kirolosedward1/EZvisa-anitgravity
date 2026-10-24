"use client"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { useSiteLocale } from "@/components/locale-provider"
import { EMAIL_RE } from "@/lib/auth/errors"
import { translations } from "@/lib/translations"
import { authFormErrorText } from "@/lib/translations/auth-form"

function ForgotPasswordForm() {
  const locale = useSiteLocale()
  const arabic = locale === "ar"
  const copy = translations[locale].authForm
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createBrowserClient()
  const loginHref = `${arabic ? "/ar" : ""}/login`

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = email.trim()
    if (!EMAIL_RE.test(clean)) {
      setError(copy.errors["invalid-email"])
      return
    }
    setIsLoading(true)
    setError("")

    const { error } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (error) {
      setError(authFormErrorText(locale, error))
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8 p-8 bg-card rounded-xl shadow-lg border border-border/50">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{copy.resetTitle}</h1>
          <p className="text-muted-foreground mt-2">{copy.resetSubtitle}</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200">
              <AlertDescription>{copy.resetSent}</AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full" asChild>
              <Link href={loginHref}>{copy.backToLogin}</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{copy.sending}</> : copy.sendReset}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[100dvh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" /></div>}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
