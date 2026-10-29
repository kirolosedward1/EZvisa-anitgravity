"use client"
import { AuthSplitLayout } from "@/components/auth/auth-split-layout"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocalizedHref } from "@/components/locale-link"
import { LangText } from "@/components/lang-text"
import { useSiteLocale } from "@/components/locale-provider"
import { classifyAuthError } from "@/lib/auth/errors"
import { translations } from "@/lib/translations"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const localize = useLocalizedHref()
  const locale = useSiteLocale()
  const copy = translations[locale].auth
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createBrowserClient()


  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setError(locale === "ar" ? copy.errors[classifyAuthError(error)] : error.message)
      setIsLoading(false)
    } else {
      router.push(localize("/dashboard"))
      router.refresh()
    }
  }

  return (
    <AuthSplitLayout variant="recovery">
      <div className="w-full space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <LangText en={translations.en.authForm.newPasswordTitle} ar={translations.ar.authForm.newPasswordTitle} />
          </h1>
          <p className="text-muted-foreground mt-2">
            <LangText en={translations.en.auth.newPasswordLead} ar={translations.ar.auth.newPasswordLead} />
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">
              <LangText en={translations.en.auth.newPasswordLabel} ar={translations.ar.auth.newPasswordLabel} />
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />{copy.updating}</> : copy.updatePassword}
          </Button>
        </form>
      </div>
    </AuthSplitLayout>
  )
}
