"use client"

import { CompleteAccountProfile } from "@/components/auth/complete-account-profile"
import { GoogleSignInPopupButton } from "@/components/auth/google-popup-sign-in"
import { hasAdultConfirmation } from "@/lib/auth/account-details"
import { useRef, useState } from "react"
import { Eye, EyeOff, Loader2, UserRound } from "lucide-react"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useViewer, ViewerAvatar } from "@/components/user-menu"
import { useSiteLocale } from "@/components/locale-provider"
import { LocaleLink } from "@/components/locale-link"
import { TravellerSelect } from "@/components/apply/traveller-select"
import { createBrowserClient } from "@/lib/supabase/client"
import { classifyAuthError, EMAIL_RE } from "@/lib/auth/errors"
import { loginErrorText } from "@/lib/auth/login-notice"
import { TRAVELLER_NONE } from "@/lib/travellers-client"
import type { Traveller } from "@/lib/shared/wizard-contract"

function WizardSignIn() {
  const locale = useSiteLocale()
  const t = (en: string, ar: string) => locale === "ar" ? ar : en
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const inFlight = useRef(false)

  async function signIn(event: React.FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
    if (!EMAIL_RE.test(email.trim())) return setError(loginErrorText(locale, "invalid-email"))
    if (!password) return setError(loginErrorText(locale, "password-required"))
    inFlight.current = true
    setBusy(true)
    setError("")
    try {
      const { error: authError } = await createBrowserClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (authError) throw authError
      // Auth subscribers switch this dialog to saved travellers. Never navigate or reload the wizard.
      setPassword("")
    } catch (cause) {
      setError(loginErrorText(locale, classifyAuthError(cause)))
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return <>
    <GoogleSignInPopupButton arabic={locale === "ar"} fallbackNext={locale === "ar" ? "/ar/apply?resume=1" : "/apply?resume=1"} />
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      {t("or with email", "أو بالبريد الإلكتروني")}
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
    <form onSubmit={signIn} noValidate className="flex flex-col gap-5">
      <div className="space-y-2">
        <Label htmlFor="wizard-sign-in-email">{t("Email", "البريد الإلكتروني")}</Label>
        <Input id="wizard-sign-in-email" type="email" autoComplete="username" inputMode="email" dir="ltr" value={email} onChange={e => { setEmail(e.target.value); setError("") }} className="h-12" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wizard-sign-in-password">{t("Password", "كلمة المرور")}</Label>
        <div className="relative">
          <Input id="wizard-sign-in-password" type={visible ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => { setPassword(e.target.value); setError("") }} className="h-12 pe-12" required />
          <button type="button" onClick={() => setVisible(v => !v)} aria-label={t(visible ? "Hide password" : "Show password", visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور")} aria-pressed={visible} className="absolute end-0 top-0 flex size-12 items-center justify-center rounded-lg text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy} className="h-12 w-full">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {t(busy ? "Signing in…" : "Sign in", busy ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول")}
      </Button>
    </form>
    <div className="flex flex-wrap justify-between gap-3 text-xs">
      <LocaleLink href="/forgot-password" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">{t("Forgot password? (new tab)", "نسيت كلمة المرور؟ (علامة تبويب جديدة)")}</LocaleLink>
      <LocaleLink href="/login?next=%2Fapply%3Fresume%3D1" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">{t("More sign-in options (new tab)", "طرق دخول أخرى (علامة تبويب جديدة)")}</LocaleLink>
    </div>
    <DialogClose asChild><button type="button" className="min-h-11 text-sm text-muted-foreground hover:text-primary">{t("Continue without signing in", "المتابعة بدون تسجيل الدخول")}</button></DialogClose>
  </>
}

export function WizardAccount({ travellers, loaded, error, refresh, value, onChoose }: {
  travellers: Traveller[]
  loaded: boolean
  error: boolean
  refresh: () => void
  value: string
  onChoose: (traveller: Traveller | null) => void
}) {
  const { viewer, ready } = useViewer()
  const arabic = useSiteLocale() === "ar"
  const t = (en: string, ar: string) => arabic ? ar : en
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState(value)
  const needsProfile = !!viewer && !viewer.demo && !hasAdultConfirmation(viewer.user)
  const selected = travellers.find(traveller => traveller.id === choice)

  return <Dialog open={open} onOpenChange={next => { setOpen(next); if (next) setChoice(value) }}>
    <DialogTrigger asChild>
      <button type="button" disabled={!ready} aria-label={t(viewer ? "Account and saved travellers" : "Sign in to your account", viewer ? "الحساب والمسافرون المحفوظون" : "تسجيل الدخول إلى حسابك")} className={viewer
        ? "relative flex size-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        : "relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"}>
        {viewer ? <ViewerAvatar viewer={viewer} className="size-full text-sm font-semibold" /> : <UserRound size={19} aria-hidden="true" />}
      </button>
    </DialogTrigger>
    <DialogContent dir={arabic ? "rtl" : "ltr"} className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-6 sm:max-w-[440px] sm:p-8">
      <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary"><UserRound size={22} aria-hidden="true" /></div>
      <div className="space-y-3 pe-3">
        <DialogTitle className="text-2xl font-medium leading-tight">{needsProfile ? t("Complete your account", "أكمل حسابك") : t(viewer ? "Your saved travellers" : "Sign in to EZvisa", viewer ? "المسافرون المحفوظون" : "تسجيل الدخول إلى إيزي فيزا")}</DialogTitle>
        <DialogDescription className="leading-relaxed">{needsProfile ? t("Account holders must be 18 or older. Confirm your details to continue.", "يجب أن يكون عمر صاحب الحساب 18 عامًا أو أكثر. أكد بياناتك للمتابعة.") : viewer ? t("Choose who’s travelling to fill their details. Your destination and trip stay the same.", "اختر المسافر لتعبئة بياناته. تبقى الوجهة والرحلة كما هما.") : t("Use your saved traveller details. Your answers stay here while you sign in.", "استخدم بيانات المسافرين المحفوظة. تبقى إجاباتك هنا أثناء تسجيل الدخول.")}</DialogDescription>
      </div>
      {needsProfile ? <CompleteAccountProfile next={arabic ? "/ar/apply?resume=1" : "/apply?resume=1"} onComplete={refresh} /> : viewer ? <>
        <p className="break-all border-b border-border pb-4 text-sm text-muted-foreground" dir="ltr">{viewer.demo ? t("Demo account", "حساب تجريبي") : viewer.email}</p>
        {!loaded ? <p role="status" className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 size={17} className="animate-spin" aria-hidden="true" />{t("Loading saved travellers…", "جارٍ تحميل المسافرين…")}</p> : error ? <div role="alert" className="space-y-3 text-sm"><p>{t("We couldn’t load your travellers. You can retry or enter the details yourself.", "تعذّر تحميل المسافرين. يمكنك إعادة المحاولة أو إدخال البيانات بنفسك.")}</p><Button variant="outline" onClick={refresh}>{t("Try again", "حاول مرة أخرى")}</Button></div> : travellers.length ? <>
          <TravellerSelect id="wizard-account-traveller" travellers={travellers} value={choice} onChange={traveller => setChoice(traveller?.id ?? TRAVELLER_NONE)} helper={{ en: "This fills the main traveller. You can review and edit the details before payment.", ar: "ستُملأ بيانات المسافر الرئيسي. يمكنك مراجعتها وتعديلها قبل الدفع." }} />
          <Button className="h-12 w-full" disabled={!selected && choice !== TRAVELLER_NONE} onClick={() => { onChoose(selected ?? null); setOpen(false) }}>{t("Use this traveller", "استخدم هذا المسافر")}</Button>
        </> : <p className="py-2 text-sm leading-relaxed text-muted-foreground">{t("No saved travellers yet. Continue with the details in your application.", "لا يوجد مسافرون محفوظون بعد. تابع بإدخال البيانات في طلبك.")}</p>}
        <DialogClose asChild><Button variant="ghost" className="min-h-11">{t("Back to application", "العودة إلى الطلب")}</Button></DialogClose>
      </> : <WizardSignIn />}
    </DialogContent>
  </Dialog>
}
