"use client"

import { WhatsAppIcon } from "@/components/icons/whatsapp-icon"
import { useEffect, useRef, useState } from "react"
import { LocaleLink } from "@/components/locale-link"
import { useSiteLocale } from "@/components/locale-provider"
import { localizePath, signOutAction } from "@/lib/route-path"
import { getWhatsAppUrl } from "@/lib/whatsapp"
import { useRouter } from "next/navigation"
import { parsePhoneNumberFromString } from "libphonenumber-js"
import {
  Bell,
  Camera,
  CalendarDays,
  ChevronRight,
  Globe,
  KeyRound,
  Languages,
  Link2,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Receipt,
  Smartphone,
  Sparkles,
  Trash2,
  UserRound,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CitizenshipPicker } from "@/components/citizenship-picker"
import { SavedTravellers } from "@/components/account/saved-travellers"
import { CountryFlag } from "@/components/country-flag"
import { DashPill } from "@/components/dashboard/dash-pill"
import { PhoneField } from "@/components/phone-field"
import { createBrowserClient } from "@/lib/supabase/client"
import { removeAvatar, uploadAvatar, useAvatarUrl } from "@/lib/avatar"
import { AvatarPhoto } from "@/components/avatar-photo"
import { citizenshipName, citizenshipNameAr, toCitizenshipIso } from "@/lib/nationalities"
import { SCHENGEN_META } from "@/lib/countries"
import { EMAIL_RE } from "@/lib/auth/errors"
import { isAppleRelayEmail } from "@/lib/auth/apple-profile"
import { SUPPORT_EMAIL } from "@/lib/shared/wizard-contract"
import { accountAge } from "@/lib/auth/account-details"
import { formatDisplayDate, formatArabicDate, MONTHS_AR } from "@/lib/dates"
import { formatAedLabel } from "@/lib/currency"
import { customerText, type CustomerKey } from "@/lib/translations/customer"
import { cn } from "@/lib/utils"

export type NotificationPrefs = { whatsapp: boolean; push: boolean; tips: boolean }
export const DEFAULT_NOTIFICATIONS: NotificationPrefs = { whatsapp: true, push: true, tips: false }

export type AccountProfile = {
  id: string
  email: string
  emailVerified: boolean
  name: string
  phone: string
  citizenship: string
  birthdate?: string
  providers: string[]
  createdAt: string | null
  /** Hide My Email (@privaterelay.appleid.com). The address is real; Apple forwards mail to it. */
  privateRelay?: boolean
  /** Saved on the auth profile (user_metadata.notifications), so the website and the app read the same choice. */
  notifications: NotificationPrefs
  userMetadata: Record<string, unknown>
  /** Demo accounts never write: dialogs and toggles say so instead of saving. */
  demo?: boolean
}

export type AccountApplication = {
  id: string
  country: string
  reference: string
  /** The traveller's name on the application, for the saved travellers' application counts. */
  traveller: string
  receipt: { amount: number; paidAt: string | null } | null
}

type Edit = null | "name" | "email" | "phone" | "citizenship" | "password"
type SectionId = "details" | "travellers" | "notifications" | "security" | "receipts"

const MIN_PASSWORD = 8
const PROVIDER_LABEL: Record<string, string> = { google: "Google", apple: "Apple" }

const displayPhone = (e164: string) => parsePhoneNumberFromString(e164 || "")?.formatInternational() || e164
const initialsOf = (name: string, email: string) => {
  if (!name.trim() && isAppleRelayEmail(email)) return "A"
  const parts = (name || email.split("@")[0]).split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (name && parts[1] ? parts[1][0] : "")).toUpperCase() || "E"
}

/** White card with a title, an optional line under it and an optional action on the right. */
function SettingsCard({ id, title, body, action, children }: { id: SectionId; title: string; body?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="ez-dash-card scroll-mt-28 overflow-hidden">
      <SettingsCardHeader id={id} title={title} body={body} action={action} />
      {children}
    </section>
  )
}

function SettingsCardHeader({ id, title, body, action }: { id: SectionId; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-4 pt-5 sm:px-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id={`${id}-title`} className="ez-dash-section text-foreground">{title}</h2>
        {body ? <p className="text-sm text-muted-foreground">{body}</p> : null}
      </div>
      {action}
    </div>
  )
}

/** Ruled row: grey icon tile, label over value (or title over hint), and an action on the end. */
function SettingRow({ icon: Icon, iconNode, label, value, strong = "value", end }: { icon?: LucideIcon; iconNode?: React.ReactNode; label: React.ReactNode; value: React.ReactNode; strong?: "label" | "value"; end?: React.ReactNode }) {
  const small = "text-xs text-muted-foreground"
  const big = "text-sm font-medium text-foreground"
  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3.5 border-t border-[#eef1f6] px-5 py-3.5 sm:px-6">
      <span className="flex size-9 items-center justify-center rounded-[9px] bg-[#f1f5fc] text-muted-foreground" aria-hidden="true">
        {iconNode ?? (Icon ? <Icon className="size-[17px]" /> : null)}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={strong === "label" ? big : small}>{label}</span>
        <span className={cn("min-w-0", strong === "label" ? small : big)}>{value}</span>
      </span>
      {end}
    </div>
  )
}

function RowButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="h-[34px] px-2.5 text-primary hover:bg-[#edf4ff] hover:text-primary" onClick={onClick} aria-label={label}>
      {children}
    </Button>
  )
}

function Toggle({ checked, label, onChange, disabled }: { checked: boolean; label: string; onChange: (next: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-[42px] shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60",
        checked ? "bg-primary" : "bg-[#c9d4e5]",
      )}
    >
      <span className={cn("absolute top-[3px] size-[18px] rounded-full bg-white shadow-sm transition-[inset-inline-start]", checked ? "start-[21px]" : "start-[3px]")} aria-hidden="true" />
    </button>
  )
}

export function AccountView({ profile, applications }: { profile: AccountProfile; applications: AccountApplication[] }) {
  const router = useRouter()
  const locale = useSiteLocale()
  const arabic = locale === "ar"
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  const signOut = signOutAction(arabic)
  const photo = useAvatarUrl({ id: profile.id, user_metadata: profile.userMetadata })
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState("")

  const [edit, setEdit] = useState<Edit>(null)
  const [value, setValue] = useState("")
  const [confirm, setConfirm] = useState("")
  const [phoneValid, setPhoneValid] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [note, setNote] = useState("")

  const [prefs, setPrefs] = useState<NotificationPrefs>(profile.notifications)
  const [prefsBusy, setPrefsBusy] = useState(false)
  const [prefsStatus, setPrefsStatus] = useState("")

  const [deleteStep, setDeleteStep] = useState<null | "ask" | "sure" | "failed">(null)
  const [deleting, setDeleting] = useState(false)

  const receipts = applications.filter((a) => a.receipt)
  const sections: { id: SectionId; key: CustomerKey; icon: LucideIcon }[] = [
    { id: "details", key: "acct.navDetails", icon: UserRound },
    { id: "travellers", key: "acct.navTravellers", icon: Users },
    { id: "notifications", key: "acct.navNotifications", icon: Bell },
    { id: "security", key: "acct.navSecurity", icon: KeyRound },
    ...(receipts.length ? [{ id: "receipts" as const, key: "acct.navReceipts" as const, icon: Receipt }] : []),
  ]
  const [active, setActive] = useState<SectionId>("details")

  // Highlight the last section whose top has passed the upper third of the screen (the first one at the very top).
  useEffect(() => {
    const ids = sections.map((s) => s.id)
    let frame = 0
    const update = () => {
      frame = 0
      let current = ids[0]
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top
        if (top !== undefined && top <= window.innerHeight / 3) current = id
      }
      // At the bottom of the page the last sections can't reach the line: pick the last one.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = ids[ids.length - 1]
      setActive(current)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipts.length])

  const hasPassword = profile.providers.includes("email")
  const social = profile.providers.filter((p) => p !== "email").map((p) => PROVIDER_LABEL[p] ?? p)
  const providerList = (list: string[]) => list.join(arabic ? " و" : " and ")
  const citizenshipIso = toCitizenshipIso(profile.citizenship)
  const age = accountAge(profile.birthdate)
  const memberSince = profile.createdAt
    ? arabic
      ? `${MONTHS_AR[new Date(profile.createdAt).getMonth()]} ${new Date(profile.createdAt).getFullYear()}`
      : new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : ""
  const displayName = profile.name.trim() ? profile.name : profile.privateRelay ? t("acct.appleAccount") : profile.email.split("@")[0]

  const open = (next: Exclude<Edit, null>) => {
    setError("")
    setNote("")
    setConfirm("")
    setPhoneValid(true)
    setValue(next === "name" ? profile.name : next === "email" ? profile.email : next === "phone" ? profile.phone : next === "citizenship" ? citizenshipIso : "")
    setEdit(next)
  }

  const save = async (event?: React.FormEvent) => {
    event?.preventDefault()
    setError("")
    let payload: Parameters<ReturnType<typeof createBrowserClient>["auth"]["updateUser"]>[0]
    let done = ""
    if (edit === "name") {
      const name = value.trim().replace(/\s+/g, " ")
      if (name.length < 2) return setError(t("acct.errName"))
      payload = { data: { full_name: name } }
    } else if (edit === "phone") {
      if (value && !phoneValid) return setError(t("acct.errPhone"))
      payload = { data: { phone: value } }
    } else if (edit === "citizenship") {
      if (!value) return setError(t("acct.errCitizenship"))
      payload = { data: { citizenship: value } }
    } else if (edit === "email") {
      const email = value.trim().toLowerCase()
      if (!EMAIL_RE.test(email)) return setError(t("acct.errEmail"))
      if (email === profile.email.toLowerCase()) return setEdit(null)
      payload = { email }
      done = t("acct.emailSent", { email, current: profile.email })
    } else if (edit === "password") {
      if (value.length < MIN_PASSWORD) return setError(t("acct.errPasswordShort", { n: MIN_PASSWORD }))
      if (value !== confirm) return setError(t("acct.errPasswordMatch"))
      payload = { password: value }
      done = t("acct.passwordDone")
    } else return
    if (profile.demo) return setError(t("acct.demoNote"))
    setBusy(true)
    const { error: updateError } = await createBrowserClient().auth.updateUser(payload)
    setBusy(false)
    if (updateError) return setError(arabic ? t("acct.saveFailed") : updateError.message)
    router.refresh()
    if (done) setNote(done)
    else setEdit(null)
  }

  const setPref = async (key: keyof NotificationPrefs, on: boolean) => {
    const previous = prefs
    const next = { ...prefs, [key]: on }
    setPrefs(next)
    setPrefsStatus("")
    if (profile.demo) return setPrefsStatus(t("acct.demoNote"))
    setPrefsBusy(true)
    const { error: updateError } = await createBrowserClient().auth.updateUser({ data: { notifications: next } })
    setPrefsBusy(false)
    if (updateError) {
      setPrefs(previous)
      return setPrefsStatus(t("acct.notifFailed"))
    }
    setPrefsStatus(t("acct.notifSaved"))
  }

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    setPhotoError("")
    if (profile.demo) return setPhotoError(t("acct.demoNote"))
    setPhotoBusy(true)
    try {
      await uploadAvatar(file)
      router.refresh()
    } catch (e) {
      setPhotoError(!arabic && e instanceof Error ? e.message : t("acct.photoFailed"))
    } finally {
      setPhotoBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const dropPhoto = async () => {
    setPhotoError("")
    if (profile.demo) return setPhotoError(t("acct.demoNote"))
    setPhotoBusy(true)
    try {
      await removeAvatar()
      router.refresh()
    } catch (e) {
      setPhotoError(!arabic && e instanceof Error ? e.message : t("acct.photoRemoveFailed"))
    } finally {
      setPhotoBusy(false)
    }
  }

  /** The app's delete-account edge function: removes the account and personal data, keeps payment records. */
  const deleteNow = async () => {
    if (profile.demo) return setDeleteStep("failed")
    setDeleting(true)
    try {
      const supabase = createBrowserClient()
      const { data, error: fnError } = await supabase.functions.invoke("delete-account", { body: { confirm: "DELETE" } })
      if (fnError || !(data as { deleted?: boolean } | null)?.deleted) throw new Error("not deleted")
      await supabase.auth.signOut().catch(() => {})
      window.location.assign(localizePath("/?account=deleted", arabic))
    } catch {
      setDeleteStep("failed")
      setDeleting(false)
    }
  }

  const titles: Record<Exclude<Edit, null>, string> = {
    name: t("acct.dlgName"),
    email: t("acct.dlgEmail"),
    phone: t("acct.dlgPhone"),
    citizenship: t("acct.dlgCitizenship"),
    password: t(hasPassword ? "acct.dlgPasswordChange" : "acct.dlgPasswordSet"),
  }
  const editButton = (field: Exclude<Edit, null>, label: string, filled = true) => {
    const action = t(field === "password" ? (filled ? "acct.change" : "acct.set") : filled ? "acct.edit" : "acct.add")
    return <RowButton label={t("acct.actionFor", { action, field: label })} onClick={() => open(field)}>{action}</RowButton>
  }
  const otherLanguageHref = arabic ? "/account" : "/ar/account"

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="ez-dash-h1 text-foreground">{t("acct.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("acct.intro")}</p>
        </div>
        <Button asChild variant="outline" className="h-[42px] border-[#dee5f0] bg-white px-[18px] text-sm hover:bg-[#f1f5fc] hover:text-foreground">
          <LocaleLink href="/dashboard">
            {t("acct.viewApps")}
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </LocaleLink>
        </Button>
      </header>

      <div className="grid items-start gap-7 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24">
          <section className="ez-dash-card flex flex-col items-center gap-3 px-5 py-6 text-center sm:flex-row sm:text-start lg:flex-col lg:text-center" aria-label={displayName}>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={t(photo ? "acct.photoChange" : "acct.photoAdd")}
                disabled={photoBusy}
              >
                <span className="relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-[#edf4ff] text-xl font-semibold text-primary">
                  <AvatarPhoto src={photo} initials={<span aria-hidden="true">{initialsOf(profile.name, profile.email)}</span>} className="absolute inset-0" />
                  {photoBusy ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-foreground/40">
                      <Loader2 className="size-6 animate-spin text-primary-foreground" aria-hidden="true" />
                    </span>
                  ) : null}
                </span>
                <span className="absolute bottom-0 end-0 flex size-7 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
                  {photo ? <Camera className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 rounded-xl p-1.5">
                <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg" onSelect={() => fileRef.current?.click()}>
                  <Camera className="size-4 text-muted-foreground" aria-hidden="true" />
                  {t(photo ? "acct.photoChoose" : "acct.photoAddShort")}
                </DropdownMenuItem>
                {profile.userMetadata.avatar_path ? (
                  <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg text-destructive focus:text-destructive" onSelect={dropPhoto}>
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t("acct.photoRemove")}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pickPhoto(e.target.files?.[0])} />

            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-base font-semibold text-foreground">{displayName}</p>
              <p className="ltr-isolate truncate text-[13px] text-muted-foreground">{profile.email}</p>
              {profile.privateRelay ? <p className="text-xs leading-relaxed text-muted-foreground">{t("acct.appleRelay")}</p> : null}
              {memberSince ? <p className="text-xs text-muted-foreground">{t("acct.memberSince", { date: memberSince })}</p> : null}
              {photoError ? <p className="text-xs text-destructive" role="alert">{photoError}</p> : null}
            </div>
          </section>

          <nav aria-label={t("acct.sections")} className="ez-dash-card flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
            {sections.map(({ id, key, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={active === id ? "location" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
                  active === id ? "bg-[#edf4ff] text-primary" : "text-foreground hover:bg-[#f1f5fc]",
                )}
              >
                <Icon className="size-[17px]" aria-hidden="true" />
                {t(key)}
              </a>
            ))}
            <span className="mx-3 my-1 hidden h-px bg-[#eef1f6] lg:block" aria-hidden="true" />
            <form action={signOut} method="POST" className="hidden lg:block">
              <button type="submit" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-[#f1f5fc] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary">
                <LogOut className="size-[17px] rtl:-scale-x-100" aria-hidden="true" />
                {t("acct.signOut")}
              </button>
            </form>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <SettingsCard id="details" title={t("acct.navDetails")} body={t("acct.detailsBody")}>
            <SettingRow icon={UserRound} label={t("acct.name")} value={profile.name || t("acct.notAdded")} end={editButton("name", t("acct.dlgName"), !!profile.name)} />
            <SettingRow
              icon={Mail}
              label={t("acct.email")}
              value={
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="ltr-isolate truncate">{profile.email}</span>
                  <DashPill tone={profile.emailVerified ? "success" : "warning"} dot={false}>{t(profile.emailVerified ? "acct.verified" : "acct.unverified")}</DashPill>
                </span>
              }
              end={editButton("email", t("acct.dlgEmail"))}
            />
            {profile.birthdate ? (
              <SettingRow
                icon={CalendarDays}
                label={t("acct.dob")}
                value={<>{arabic ? formatArabicDate(profile.birthdate) : formatDisplayDate(profile.birthdate)}{age !== null ? <span className="ms-2 text-xs font-normal text-muted-foreground">{t("acct.age", { n: age })}</span> : null}</>}
                end={<span className="max-w-[84px] text-end text-xs leading-snug text-muted-foreground sm:max-w-none">{t("acct.dobSupport")}</span>}
              />
            ) : null}
            <SettingRow icon={Phone} label={t("acct.phone")} value={profile.phone ? <span className="ltr-isolate">{displayPhone(profile.phone)}</span> : t("acct.notAdded")} end={editButton("phone", t("acct.dlgPhone"), !!profile.phone)} />
            <SettingRow
              icon={Globe}
              iconNode={citizenshipIso ? <CountryFlag iso={citizenshipIso} className="size-5" /> : undefined}
              label={t("acct.citizenship")}
              value={citizenshipIso ? (arabic ? citizenshipNameAr(citizenshipIso) : citizenshipName(citizenshipIso)) : t("acct.notAdded")}
              end={editButton("citizenship", t("acct.dlgCitizenship"), !!citizenshipIso)}
            />
          </SettingsCard>

          <section id="travellers" aria-labelledby="travellers-title" className="ez-dash-card scroll-mt-28 overflow-hidden">
            <SavedTravellers
              demo={profile.demo}
              applicantNames={applications.map((a) => a.traveller)}
              header={(add) => (
                <SettingsCardHeader
                  id="travellers"
                  title={t("acct.navTravellers")}
                  body={t("trav.body")}
                  action={
                    <Button type="button" variant="outline" className="h-[38px] border-[#dee5f0] bg-white px-3.5 text-sm hover:bg-[#f1f5fc] hover:text-foreground" onClick={add}>
                      <Plus className="size-4" aria-hidden="true" /> {t("trav.add")}
                    </Button>
                  }
                />
              )}
            />
          </section>

          <SettingsCard id="notifications" title={t("acct.navNotifications")} body={t("acct.notifBody")}>
            {([
              { key: "whatsapp", icon: MessageCircle, title: "acct.notifWhatsapp", hint: "acct.notifWhatsappBody" },
              { key: "push", icon: Smartphone, title: "acct.notifPush", hint: "acct.notifPushBody" },
              { key: "tips", icon: Sparkles, title: "acct.notifTips", hint: "acct.notifTipsBody" },
            ] as const).map((row) => (
              <SettingRow
                key={row.key}
                icon={row.icon}
                strong="label"
                label={t(row.title)}
                value={t(row.hint)}
                end={<Toggle checked={prefs[row.key]} label={t(row.title)} disabled={prefsBusy} onChange={(on) => setPref(row.key, on)} />}
              />
            ))}
            <p className="min-h-0 px-6 pb-3 text-xs text-muted-foreground empty:hidden" role="status" aria-live="polite">{prefsStatus}</p>
          </SettingsCard>

          <SettingsCard id="security" title={t("acct.navSecurity")}>
            <SettingRow
              icon={KeyRound}
              strong="label"
              label={t("acct.password")}
              value={hasPassword ? t("acct.passwordOn") : t("acct.passwordOff", { providers: providerList(social) })}
              end={editButton("password", t("acct.password"), hasPassword)}
            />
            {social.length ? <SettingRow icon={Link2} strong="label" label={t("acct.connected")} value={t("acct.connectedList", { providers: providerList(social) })} /> : null}
            <SettingRow
              icon={Languages}
              strong="label"
              label={t("acct.language")}
              value={t("acct.languageBody")}
              end={
                <a href={otherLanguageHref} lang={arabic ? "en" : "ar"} hrefLang={arabic ? "en" : "ar"} className="inline-flex h-[34px] items-center rounded-lg px-2.5 text-sm font-medium text-primary transition-colors hover:bg-[#edf4ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  {t("acct.languageSwitch")}
                </a>
              }
            />
          </SettingsCard>

          {receipts.length ? (
            <SettingsCard id="receipts" title={t("acct.navReceipts")} body={t("acct.receiptsBody")}>
              <ul>
                {receipts.map((a) => (
                  <li key={a.id} className="border-t border-[#eef1f6]">
                    <LocaleLink href={`/receipt/${a.id}`} className="grid grid-cols-[36px_minmax(0,1fr)_auto_16px] items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-[#f6f8fc] sm:px-6">
                      <CountryFlag iso={SCHENGEN_META[a.country]?.iso} country={a.country} className="size-9" />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {t("acct.receipt")} · <span className="ltr-isolate tabular-nums">{a.reference}</span>
                        </span>
                        <span className="truncate text-xs text-muted-foreground">{arabic ? SCHENGEN_META[a.country]?.ar || a.country : a.country}</span>
                      </span>
                      <span className="text-sm font-medium tabular-nums text-foreground">{formatAedLabel(Math.round(a.receipt?.amount ?? 0), locale)}</span>
                      <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            </SettingsCard>
          ) : null}

          <section aria-label={t("acct.deleteLink")} className="flex flex-col gap-3 px-1 pt-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <p className="text-[13px] leading-relaxed text-muted-foreground">{t("acct.deleteBody")}</p>
            <button type="button" onClick={() => setDeleteStep("ask")} className="shrink-0 self-start rounded text-sm font-medium text-[#b42318] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318] sm:self-auto">
              {t("acct.deleteLink")}
            </button>
          </section>

          <form action={signOut} method="POST" className="lg:hidden">
            <Button type="submit" variant="outline" className="h-[42px] w-full border-[#dee5f0] bg-white text-sm hover:bg-[#f1f5fc] hover:text-foreground">
              <LogOut className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              {t("acct.signOut")}
            </Button>
          </form>
        </div>
      </div>

      {/* Edit a detail */}
      <Dialog open={edit !== null} onOpenChange={(o) => !o && !busy && setEdit(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          {edit ? (
            <form onSubmit={save} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <DialogTitle className="panel-title panel-title-lg text-foreground">{titles[edit]}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {edit === "email" ? t("acct.dlgEmailBody") : edit === "password" ? t("acct.dlgPasswordBody", { n: MIN_PASSWORD }) : t("acct.dlgSavedBody")}
                </DialogDescription>
              </div>

              {note ? (
                <p className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success" role="status">{note}</p>
              ) : (
                <>
                  {edit === "name" ? (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="account-name">{t("acct.fullName")}</Label>
                      <Input id="account-name" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="name" autoFocus />
                    </div>
                  ) : null}
                  {edit === "email" ? (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="account-email">{t("acct.email")}</Label>
                      <Input id="account-email" type="email" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="email" autoFocus />
                    </div>
                  ) : null}
                  {edit === "phone" ? (
                    <PhoneField
                      id="account-phone"
                      value={profile.phone}
                      onChange={(e164, valid) => {
                        setValue(e164)
                        setPhoneValid(valid || e164 === "")
                      }}
                    />
                  ) : null}
                  {edit === "citizenship" ? (
                    <div className="flex flex-col gap-2">
                      <Label>{t("acct.citizenship")}</Label>
                      <CitizenshipPicker value={value} onChange={setValue} />
                    </div>
                  ) : null}
                  {edit === "password" ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="account-password">{t("acct.newPassword")}</Label>
                        <Input id="account-password" type="password" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="new-password" autoFocus />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="account-password-confirm">{t("acct.confirmPassword")}</Label>
                        <Input id="account-password-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
                      </div>
                    </>
                  ) : null}
                  {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
                </>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" className="rounded-full hover:bg-secondary hover:text-foreground" onClick={() => setEdit(null)} disabled={busy}>
                  {t(note ? "acct.done" : "acct.cancel")}
                </Button>
                {note ? null : (
                  <Button type="submit" className="rounded-full" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                    {t("acct.save")}
                  </Button>
                )}
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete account: two steps, then the WhatsApp / email request if the function fails (same as the app). */}
      <Dialog open={deleteStep !== null} onOpenChange={(o) => !o && !deleting && setDeleteStep(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <DialogTitle className="panel-title panel-title-lg text-foreground">{t(deleteStep === "sure" ? "acct.delSure" : deleteStep === "failed" ? "acct.delFailed" : "acct.delAsk")}</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {t(deleteStep === "sure" ? "acct.delSureBody" : deleteStep === "failed" ? "acct.delFailedBody" : "acct.delAskBody")}
              </DialogDescription>
            </div>
            <div className="flex flex-col gap-2">
              {deleteStep === "ask" ? (
                <Button type="button" variant="destructive" className="rounded-full" onClick={() => setDeleteStep("sure")}>{t("acct.continue")}</Button>
              ) : null}
              {deleteStep === "sure" ? (
                <Button type="button" variant="destructive" className="rounded-full" onClick={deleteNow} disabled={deleting}>
                  {deleting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  {t(deleting ? "acct.deleting" : "acct.delNow")}
                </Button>
              ) : null}
              {deleteStep === "failed" ? (
                <>
                  <Button asChild variant="outline" className="rounded-full hover:bg-secondary hover:text-foreground">
                    <a href={getWhatsAppUrl(`Please delete my EZvisa account (${profile.email}).`, arabic)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="size-4" />{t("acct.delWhatsapp")}</a>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full hover:bg-secondary hover:text-foreground">
                    <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Delete my EZvisa account")}&body=${encodeURIComponent(`Please delete my EZvisa account and personal data.\nAccount email: ${profile.email}`)}`}>{t("acct.delEmail")}</a>
                  </Button>
                </>
              ) : null}
              <Button type="button" variant="ghost" className="rounded-full hover:bg-secondary hover:text-foreground" onClick={() => setDeleteStep(null)} disabled={deleting}>
                {t("acct.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
