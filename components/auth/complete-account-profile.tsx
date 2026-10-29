"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { AccountDetailsFields } from "@/components/auth/account-details-fields"
import { Button } from "@/components/ui/button"
import { useSiteLocale } from "@/components/locale-provider"
import { useLocalizedHref } from "@/components/locale-link"
import { createBrowserClient } from "@/lib/supabase/client"
import { accountBirthDate, accountDetails, accountDetailsError } from "@/lib/auth/account-details"
import { metadataFullName } from "@/lib/auth/apple-profile"
import { authFormErrorText } from "@/lib/translations/auth-form"

/** Social providers do not reliably supply a birthday. Complete the authenticated profile before continuing. */
export function CompleteAccountProfile({ next }: { next: string }) {
  const locale = useSiteLocale()
  const t = (en: string, ar: string) => locale === "ar" ? ar : en
  const router = useRouter()
  const localize = useLocalizedHref()
  const [name, setName] = useState("")
  const [birthdate, setBirthdate] = useState("")
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const inFlight = useRef(false)
  const login = localize(`/login?next=${encodeURIComponent(`/signup?profile=complete&next=${encodeURIComponent(next)}`)}`)

  useEffect(() => {
    let alive = true
    setError("")
    async function load() {
      try {
        const { data, error: authError } = await createBrowserClient().auth.getUser()
        if (!alive) return
        if (!data.user && (!authError || authError.name === "AuthSessionMissingError")) {
          router.replace(login)
          return
        }
        if (authError) throw authError
        if (!data.user) return
        const fullName = metadataFullName(data.user.user_metadata, data.user.email)
        const dob = accountBirthDate(data.user.user_metadata?.date_of_birth)
        if (accountDetails(fullName, dob).data) {
          router.replace(next)
          return
        }
        setName(fullName)
        setBirthdate(dob)
        setReady(true)
      } catch (cause) {
        if (alive) setError(authFormErrorText(locale, cause))
      }
    }
    void load()
    return () => { alive = false }
  }, [attempt, login, locale, next, router])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
    const details = accountDetails(name, birthdate)
    if (details.error) return setError(accountDetailsError(locale, details.error))
    inFlight.current = true
    setBusy(true)
    setError("")
    try {
      const { error: authError } = await createBrowserClient().auth.updateUser({ data: details.data })
      if (authError) throw authError
      router.replace(next)
      router.refresh()
    } catch (cause) {
      setError(authFormErrorText(locale, cause))
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return <div className="space-y-7">
    <div><h1 className="text-3xl font-semibold">{t("A little about you", "بعض التفاصيل عنك")}</h1><p className="mt-3 text-muted-foreground">{t("Add your name and date of birth to finish your account profile.", "أضف اسمك وتاريخ ميلادك لإكمال ملف حسابك.")}</p></div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {ready ? <form onSubmit={save} noValidate className="space-y-5">
      <AccountDetailsFields name={name} birthdate={birthdate} onName={value => { setName(value); setError("") }} onBirthdate={value => { setBirthdate(value); setError("") }} />
      <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}{t("Save and continue", "احفظ وتابع")}</Button>
    </form> : error ? <Button variant="outline" onClick={() => setAttempt(n => n + 1)}>{t("Try again", "حاول مرة أخرى")}</Button> : <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />{t("Loading your profile…", "جارٍ تحميل ملفك…")}</p>}
  </div>
}
