"use client"

// Sign in: Google, email + password, or a one-time email link. Same accounts and messages as the EZvisa app.
import { Suspense, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, Eye, EyeOff, Loader2, Lock, Mail, PlayCircle } from "lucide-react"

import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthSplitLayout } from "@/components/auth/auth-split-layout"
import { GoogleSignInButton } from "@/components/auth/google-sign-in"
import { DemoLoginButtons } from "@/components/auth/demo-login-buttons"
import { EmailSent, useCooldown } from "@/components/auth/email-sent"
import { classifyAuthError, EMAIL_RE, type AuthIssue } from "@/lib/auth/errors"
import { issueFromClientMessage, loginErrorText, loginInfoText, noticeFromQuery, type LoginErrorCode } from "@/lib/auth/login-notice"
import { authCallbackUrl, safeNext } from "@/lib/auth/redirect"
import { cn } from "@/lib/utils"
import { useSiteLocale } from "@/components/locale-provider"

type Mode = "password" | "link"

function IconInput({ icon: Icon, className, ...props }: React.ComponentProps<typeof Input> & { icon: typeof Mail }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input className={cn("h-12 rounded-xl ps-10 text-sm", className)} {...props} />
    </div>
  )
}

function LoginForm() {
  const arabic = useSiteLocale() === "ar"
  const t = (en: string, ar: string) => (arabic ? ar : en)
  const sayError = (code: LoginErrorCode) => t(loginErrorText("en", code), loginErrorText("ar", code))
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get("next"))
  const notice = noticeFromQuery(searchParams.get("error"), searchParams.get("type"), searchParams.get("error_code"))

  const [mode, setMode] = useState<Mode>(searchParams.get("type") === "magiclink" ? "link" : "password")
  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(notice?.tone === "error" ? sayError(notice.code) : "")
  const [info, setInfo] = useState(notice?.tone === "info" ? t(loginInfoText("en", notice.code), loginInfoText("ar", notice.code)) : "")
  const [issue, setIssue] = useState<AuthIssue | null>(notice?.tone === "error" ? notice.code : null)
  const [linkSent, setLinkSent] = useState(false)
  const [busy, setBusy] = useState<"" | "password" | "link" | "resend">("")
  const inFlight = useRef(false)
  const cooldown = useCooldown()
  const cleanEmail = email.trim().toLowerCase()

  /** One request at a time, so a double click can't send twice. */
  const run = async (kind: typeof busy, fn: () => Promise<void>) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(kind)
    setError("")
    setInfo("")
    setIssue(null)
    try {
      await fn()
    } catch (e) {
      const k = classifyAuthError(e)
      setIssue(k)
      setError(sayError(k))
    } finally {
      inFlight.current = false
      setBusy("")
    }
  }

  const signIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(cleanEmail)) return setError(sayError("invalid-email"))
    if (!password) return setError(sayError("password-required"))
    run("password", async () => {
      const { error } = await createBrowserClient().auth.signInWithPassword({ email: cleanEmail, password })
      if (error) throw error
      router.replace(next)
      router.refresh()
    })
  }

  const sendLink = (kind: "link" | "resend") => {
    if (!EMAIL_RE.test(cleanEmail)) return setError(sayError("invalid-email"))
    run(kind, async () => {
      const { error } = await createBrowserClient().auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo: authCallbackUrl({ type: "magiclink", next }) },
      })
      if (error) throw error
      setLinkSent(true)
      cooldown.start()
    })
  }

  const resendConfirmation = () =>
    run("resend", async () => {
      const { error } = await createBrowserClient().auth.resend({
        type: "signup",
        email: cleanEmail,
        options: { emailRedirectTo: authCallbackUrl({ type: "signup", next }) },
      })
      if (error) throw error
      setInfo(t(loginInfoText("en", "confirmation-resent"), loginInfoText("ar", "confirmation-resent")))
      cooldown.start()
    })

  const switchMode = (m: Mode) => {
    setMode(m)
    setError("")
    setIssue(null)
    setLinkSent(false)
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">{t("Welcome back", "مرحبًا بعودتك")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("Sign in to track your application, upload documents and download your visa file.", "سجّل الدخول لمتابعة طلبك ورفع المستندات وتنزيل ملف التأشيرة.")}
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <GoogleSignInButton next={next} label={t("Continue with Google", "المتابعة عبر Google")} onError={(m) => { const k = issueFromClientMessage(m); setIssue(k); setError(sayError(k)); setInfo("") }} />

        <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {t("or sign in with email", "أو سجّل الدخول بالبريد")}
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-2 rounded-xl bg-secondary p-1 text-sm font-medium" role="tablist" aria-label={t("Sign-in method", "طريقة تسجيل الدخول")}>
          {(["password", "link"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={cn(
                "rounded-lg py-2 transition-colors",
                mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "password" ? t("Password", "كلمة المرور") : t("Email link", "رابط بالبريد")}
            </button>
          ))}
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>
              {error}
              {issue === "unconfirmed" && (
                <button
                  type="button"
                  className="mt-1 block font-semibold text-primary hover:underline disabled:opacity-60"
                  onClick={resendConfirmation}
                  disabled={busy === "resend" || cooldown.left > 0}
                >
                  {cooldown.left > 0 ? t(`Send the confirmation link again (${cooldown.left}s)`, `أعد إرسال رابط التأكيد (${cooldown.left} ث)`) : t("Send the confirmation link again", "أعد إرسال رابط التأكيد")}
                </button>
              )}
            </AlertDescription>
          </Alert>
        )}
        {info && (
          <Alert className="rounded-xl border-primary/20 bg-primary/5">
            <AlertDescription className="text-foreground">{info}</AlertDescription>
          </Alert>
        )}

        {mode === "password" ? (
          <form onSubmit={signIn} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("Email", "البريد الإلكتروني")}</Label>
              <IconInput
                icon={Mail}
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("Password", "كلمة المرور")}</Label>
                <Link
                  href={cleanEmail ? `/forgot-password?email=${encodeURIComponent(cleanEmail)}` : "/forgot-password"}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t("Forgot password?", "نسيت كلمة المرور؟")}
                </Link>
              </div>
              <div className="relative">
                <IconInput
                  icon={Lock}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError("") }}
                  className="pe-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label={showPassword ? t("Hide password", "إخفاء كلمة المرور") : t("Show password", "إظهار كلمة المرور")}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="mt-1 h-12 w-full rounded-xl text-sm font-semibold" disabled={!!busy}>
              {busy === "password" ? (<><Loader2 className="size-4 animate-spin" aria-hidden="true" />{t("Signing in…", "جارٍ تسجيل الدخول…")}</>) : t("Sign in", "تسجيل الدخول")}
            </Button>
          </form>
        ) : linkSent ? (
          <EmailSent
            email={cleanEmail}
            note={t("Open it in this browser to sign in. The link works once and expires after a while.", "افتحه في هذا المتصفح لتسجيل الدخول. يعمل الرابط مرة واحدة وتنتهي صلاحيته بعد وقت.")}
            onResend={() => sendLink("resend")}
            resending={busy === "resend"}
            left={cooldown.left}
            onChangeEmail={() => { setLinkSent(false); setError("") }}
          />
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); sendLink("link") }} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="link-email">{t("Email", "البريد الإلكتروني")}</Label>
              <IconInput
                icon={Mail}
                id="link-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                aria-describedby="link-hint"
                required
              />
              <p id="link-hint" className="text-xs leading-relaxed text-muted-foreground">
                {t("Use the email from your application. We'll send a one-time sign-in link, no password needed.", "استخدم البريد الذي قدّمت به الطلب. سنرسل رابط دخول لمرة واحدة، من دون كلمة مرور.")}
              </p>
            </div>
            <Button type="submit" className="mt-1 h-12 w-full rounded-xl text-sm font-semibold" disabled={!!busy}>
              {busy === "link" ? (<><Loader2 className="size-4 animate-spin" aria-hidden="true" />{t("Sending link…", "جارٍ إرسال الرابط…")}</>) : t("Email me a sign-in link", "أرسل لي رابط الدخول")}
            </Button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground text-balance">
        {t("New to EZvisa?", "جديد على إيزي فيزا؟")}{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
          {t("Create an account", "أنشئ حسابًا")}
        </Link>
        {t(" or ", " أو ")}
        <Link href="/apply" className="font-semibold text-primary hover:underline">
          {t("start an application", "ابدأ طلبًا")}
        </Link>
      </p>

      <details className="group rounded-2xl border border-border/70 bg-background">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <PlayCircle className="size-4 text-primary" aria-hidden="true" />
            {t("Explore with a demo account", "جرّب بحساب تجريبي")}
          </span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="px-2 pb-2">
          <DemoLoginButtons next={next} />
        </div>
      </details>
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuthSplitLayout>
      <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" /></div>}>
        <LoginForm />
      </Suspense>
    </AuthSplitLayout>
  )
}
