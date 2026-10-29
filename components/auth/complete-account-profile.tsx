"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { AccountDetailsFields } from "@/components/auth/account-details-fields"
import { AgeConfirmation } from "@/components/auth/age-confirmation"
import { AvatarPhoto } from "@/components/avatar-photo"
import { useAvatarUrl } from "@/lib/avatar"
import { Button } from "@/components/ui/button"
import { useSiteLocale } from "@/components/locale-provider"
import { useLocalizedHref } from "@/components/locale-link"
import { createBrowserClient } from "@/lib/supabase/client"
import { accountBirthDate, registrationDetails, accountDetailsError, hasAdultConfirmation } from "@/lib/auth/account-details"
import { metadataFullName } from "@/lib/auth/apple-profile"
import { socialMetadataPatch } from "@/lib/auth/social-profile"
import { authFormErrorText } from "@/lib/translations/auth-form"

/** Providers supply identity details; the customer explicitly confirms their birthdate and minimum age. */
export function CompleteAccountProfile({ next, onComplete }: { next: string; onComplete?: () => void }) {
  const locale = useSiteLocale()
  const t = (en: string, ar: string) => locale === "ar" ? ar : en
  const router = useRouter()
  const localize = useLocalizedHref()
  const [name, setName] = useState("")
  const [birthdate, setBirthdate] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const photo = useAvatarUrl(user)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const inFlight = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
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
        if (hasAdultConfirmation(data.user)) {
          if (onCompleteRef.current) onCompleteRef.current()
          else router.replace(next)
          return
        }
        const meta = { ...data.user.user_metadata, ...socialMetadataPatch(data.user) }
        setUser({ ...data.user, user_metadata: meta })
        setName(metadataFullName(meta, data.user.email))
        setBirthdate(accountBirthDate(meta.date_of_birth))
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
    const details = registrationDetails(name, birthdate, confirmed)
    if (details.error) return setError(accountDetailsError(locale, details.error))
    inFlight.current = true
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, birthdate, confirmed }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (result.field) { setError(accountDetailsError(locale, result.field)); return }
        throw new Error(result.error || t("We couldn’t save your profile. Please try again.", "تعذّر حفظ ملفك. حاول مرة أخرى."))
      }
      // Refresh browser subscribers as well as server cookies, so the wizard can stay open.
      await createBrowserClient().auth.refreshSession()
      if (onCompleteRef.current) onCompleteRef.current()
      else { router.replace(next); router.refresh() }
    } catch (cause) {
      setError(authFormErrorText(locale, cause))
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return <div className="space-y-6">
    {!onComplete ? <div><h1 className="text-3xl font-semibold">{t("One last detail", "تفصيل أخير")}</h1><p className="mt-3 leading-relaxed text-muted-foreground">{t("Confirm your details to finish setting up your account. You must be 18 or older.", "أكد بياناتك لإكمال إعداد حسابك. يجب أن يكون عمرك 18 عامًا أو أكثر.")}</p></div> : null}
    {user ? <div className="flex items-center gap-3 border-b border-border pb-5">
      <AvatarPhoto src={photo} initials={name.slice(0, 1).toUpperCase() || "E"} className="size-12 shrink-0 bg-secondary text-primary" />
      <div className="min-w-0"><p className="font-medium">{name || t("Your account", "حسابك")}</p><p className="break-all text-sm text-muted-foreground" dir="ltr">{user.email}</p></div>
    </div> : null}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {ready ? <form onSubmit={save} noValidate className="space-y-5">
      <AccountDetailsFields name={name} birthdate={birthdate} onName={value => { setName(value); setError("") }} onBirthdate={value => { setBirthdate(value); setConfirmed(false); setError("") }} />
      <AgeConfirmation checked={confirmed} onChange={value => { setConfirmed(value); setError("") }} disabled={busy} />
      <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}{t("Confirm and continue", "أكد وتابع")}</Button>
    </form> : error ? <Button variant="outline" onClick={() => setAttempt(n => n + 1)}>{t("Try again", "حاول مرة أخرى")}</Button> : <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" />{t("Loading your profile…", "جارٍ تحميل ملفك…")}</p>}
  </div>
}
