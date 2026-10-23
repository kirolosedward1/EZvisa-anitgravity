"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { parsePhoneNumberFromString } from "libphonenumber-js"
import {
  Camera,
  ChevronRight,
  FileText,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Phone,
  Plus,
  Receipt,
  Trash2,
  UserRound,
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
import { CountryFlag } from "@/components/country-flag"
import { PhoneField } from "@/components/phone-field"
import { createBrowserClient } from "@/lib/supabase/client"
import { removeAvatar, uploadAvatar, useAvatarUrl } from "@/lib/avatar"
import { AvatarPhoto } from "@/components/avatar-photo"
import { citizenshipName, toCitizenshipIso } from "@/lib/nationalities"
import { SCHENGEN_META } from "@/lib/countries"
import { EMAIL_RE } from "@/lib/auth/errors"
import { SUPPORT_EMAIL, WHATSAPP_NUMBER } from "@/lib/shared/wizard-contract"
import type { PillTone } from "@/lib/application-status"
import { cn } from "@/lib/utils"

export type AccountProfile = {
  id: string
  email: string
  name: string
  phone: string
  citizenship: string
  providers: string[]
  createdAt: string | null
  userMetadata: Record<string, unknown>
}

export type AccountApplication = {
  id: string
  country: string
  reference: string
  status: { label: string; tone: PillTone }
  href: string
  receipt: { amount: number; paidAt: string | null } | null
}

type Edit = null | "name" | "email" | "phone" | "citizenship" | "password"

const MIN_PASSWORD = 8
const TONE: Record<PillTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-amber-500/10 text-amber-700",
  info: "bg-primary/10 text-primary",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
}
const PROVIDER_LABEL: Record<string, string> = { email: "Email", google: "Google", apple: "Apple" }

const whatsappHref = (text: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
const displayPhone = (e164: string) => parsePhoneNumberFromString(e164 || "")?.formatInternational() || e164
const initialsOf = (name: string, email: string) => {
  const parts = (name || email.split("@")[0]).split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (name && parts[1] ? parts[1][0] : "")).toUpperCase() || "E"
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 px-1">
        <h2 className="panel-title text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">{children}</div>
    </section>
  )
}

function DetailRow({ icon: Icon, label, value, action = "Edit", onClick }: { icon: LucideIcon; label: string; value: React.ReactNode; action?: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="truncate text-sm font-medium text-foreground">{value}</span>
      </span>
      {onClick ? <span className="shrink-0 text-sm font-medium text-primary">{action}</span> : null}
    </>
  )
  const row = "flex w-full items-center gap-4 px-5 py-4 text-left"
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(row, "transition-colors hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none")}>
      {body}
    </button>
  ) : (
    <div className={row}>{body}</div>
  )
}

export function AccountView({ profile, applications }: { profile: AccountProfile; applications: AccountApplication[] }) {
  const router = useRouter()
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

  const [deleteStep, setDeleteStep] = useState<null | "ask" | "sure" | "failed">(null)
  const [deleting, setDeleting] = useState(false)

  const hasPassword = profile.providers.includes("email")
  const citizenshipIso = toCitizenshipIso(profile.citizenship)
  const receipts = applications.filter((a) => a.receipt)
  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : ""

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
      if (name.length < 2) return setError("Enter your full name.")
      payload = { data: { full_name: name } }
    } else if (edit === "phone") {
      if (value && !phoneValid) return setError("Enter a valid phone number for the selected country.")
      payload = { data: { phone: value } }
    } else if (edit === "citizenship") {
      if (!value) return setError("Choose your citizenship.")
      payload = { data: { citizenship: value } }
    } else if (edit === "email") {
      const email = value.trim().toLowerCase()
      if (!EMAIL_RE.test(email)) return setError("Enter a valid email address.")
      if (email === profile.email.toLowerCase()) return setEdit(null)
      payload = { email }
      done = `Check ${email} and open the link to confirm the change. Until then you sign in with ${profile.email}.`
    } else if (edit === "password") {
      if (value.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`)
      if (value !== confirm) return setError("The passwords don't match.")
      payload = { password: value }
      done = "Password updated."
    } else return
    setBusy(true)
    const { error: updateError } = await createBrowserClient().auth.updateUser(payload)
    setBusy(false)
    if (updateError) return setError(updateError.message)
    router.refresh()
    if (done) setNote(done)
    else setEdit(null)
  }

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    setPhotoError("")
    setPhotoBusy(true)
    try {
      await uploadAvatar(file)
      router.refresh()
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "We couldn't save your photo.")
    } finally {
      setPhotoBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const dropPhoto = async () => {
    setPhotoError("")
    setPhotoBusy(true)
    try {
      await removeAvatar()
      router.refresh()
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "We couldn't remove your photo.")
    } finally {
      setPhotoBusy(false)
    }
  }

  /** The app's delete-account edge function: removes the account and personal data, keeps payment records. */
  const deleteNow = async () => {
    setDeleting(true)
    try {
      const supabase = createBrowserClient()
      const { data, error: fnError } = await supabase.functions.invoke("delete-account", { body: { confirm: "DELETE" } })
      if (fnError || !(data as { deleted?: boolean } | null)?.deleted) throw new Error("not deleted")
      await supabase.auth.signOut().catch(() => {})
      window.location.assign("/?account=deleted")
    } catch {
      setDeleteStep("failed")
      setDeleting(false)
    }
  }

  const titles: Record<Exclude<Edit, null>, string> = {
    name: "Name",
    email: "Email",
    phone: "Phone number",
    citizenship: "Citizenship",
    password: hasPassword ? "Change password" : "Set a password",
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[320px_1fr] lg:items-start">
      <h1 className="sr-only">Account</h1>

      {/* Profile card */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-28">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-xs">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={photo ? "Change or remove your photo" : "Add a profile photo"}
              disabled={photoBusy}
            >
              <span className="relative flex size-24 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-semibold text-primary-foreground ring-4 ring-background">
                <AvatarPhoto src={photo} initials={initialsOf(profile.name, profile.email)} className="absolute inset-0" />
                {photoBusy ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-foreground/40">
                    <Loader2 className="size-6 animate-spin text-primary-foreground" aria-hidden="true" />
                  </span>
                ) : null}
              </span>
              <span className="absolute bottom-0 end-0 flex size-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
                {photo ? <Camera className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48 rounded-xl p-1.5">
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg" onSelect={() => fileRef.current?.click()}>
                <Camera className="size-4 text-muted-foreground" aria-hidden="true" />
                {photo ? "Choose new photo" : "Add photo"}
              </DropdownMenuItem>
              {profile.userMetadata.avatar_path ? (
                <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg text-destructive focus:text-destructive" onSelect={dropPhoto}>
                  <Trash2 className="size-4" aria-hidden="true" />
                  Remove photo
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pickPhoto(e.target.files?.[0])} />

          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-xl font-semibold tracking-tight text-foreground">{profile.name || profile.email.split("@")[0]}</p>
            <p className="ltr-isolate truncate text-sm text-muted-foreground">{profile.email}</p>
            {memberSince ? <p className="text-xs text-muted-foreground">Member since {memberSince}</p> : null}
          </div>
          {photoError ? <p className="text-sm text-destructive" role="alert">{photoError}</p> : null}
          <p className="text-xs text-muted-foreground">Your photo and details are the same in the EZvisa app.</p>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-xs">
          <a href={whatsappHref("Hi EZvisa, I need help with my account.")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true"><path fill="#1A7F37" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.84 9.84 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.24 8.24 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.28Z" /></svg>
            WhatsApp support
            <ChevronRight className="ms-auto size-4 text-muted-foreground" aria-hidden="true" />
          </a>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            <Mail className="size-4 text-primary" aria-hidden="true" />
            Email {SUPPORT_EMAIL}
            <ChevronRight className="ms-auto size-4 text-muted-foreground" aria-hidden="true" />
          </a>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
              <LogOut className="size-4 text-muted-foreground" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-8">
        <Section title="Account details" description="Used to prefill new applications on the website and in the app.">
          <div className="divide-y divide-border">
            <DetailRow icon={UserRound} label="Name" value={profile.name || "Not added"} action={profile.name ? "Edit" : "Add"} onClick={() => open("name")} />
            <DetailRow icon={Mail} label="Email" value={<span className="ltr-isolate">{profile.email}</span>} onClick={() => open("email")} />
            <DetailRow icon={Phone} label="Phone number" value={profile.phone ? <span className="ltr-isolate">{displayPhone(profile.phone)}</span> : "Not added"} action={profile.phone ? "Edit" : "Add"} onClick={() => open("phone")} />
            <DetailRow
              icon={Globe}
              label="Citizenship"
              value={citizenshipIso ? <span className="inline-flex items-center gap-2"><CountryFlag iso={citizenshipIso} />{citizenshipName(citizenshipIso)}</span> : "Not added"}
              action={citizenshipIso ? "Edit" : "Add"}
              onClick={() => open("citizenship")}
            />
          </div>
        </Section>

        <Section title="Sign-in">
          <div className="divide-y divide-border">
            <DetailRow icon={KeyRound} label="Sign-in methods" value={profile.providers.map((p) => PROVIDER_LABEL[p] ?? p).join(" · ")} />
            <DetailRow icon={KeyRound} label="Password" value={hasPassword ? "••••••••" : "Not set. You sign in with " + profile.providers.map((p) => PROVIDER_LABEL[p] ?? p).join(" or ")} action={hasPassword ? "Change" : "Set"} onClick={() => open("password")} />
          </div>
        </Section>

        <Section title="Application history">
          {applications.length ? (
            <ul className="divide-y divide-border">
              {applications.map((a) => (
                <li key={a.id}>
                  <Link href={a.href} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/60">
                    <CountryFlag iso={SCHENGEN_META[a.country]?.iso} country={a.country} className="size-9" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-semibold text-foreground">{a.country}</span>
                      <span className="ltr-isolate text-xs tabular-nums text-muted-foreground">{a.reference}</span>
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", TONE[a.status.tone])}>{a.status.label}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <p className="text-sm text-muted-foreground">No applications yet.</p>
              <Button asChild className="rounded-full">
                <Link href="/apply">Start an application</Link>
              </Button>
            </div>
          )}
        </Section>

        {receipts.length ? (
          <Section title="Receipts" description="From your payment record. Open one to print or save it as a PDF.">
            <ul className="divide-y divide-border">
              {receipts.map((a) => (
                <li key={a.id}>
                  <Link href={`/receipt/${a.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/60">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                      <Receipt className="size-4" aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-semibold text-foreground">
                        Receipt · <span className="ltr-isolate tabular-nums">{a.reference}</span>
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{a.country}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{a.receipt?.amount.toFixed(0)} AED</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section title="Delete account" description="Removes your account, uploaded documents and personal details. Payment records are kept for the period the law requires.">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <p className="text-sm text-muted-foreground">This can't be undone.</p>
            <Button type="button" variant="outline" className="shrink-0 rounded-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive" onClick={() => setDeleteStep("ask")}>
              Delete account
            </Button>
          </div>
        </Section>
      </div>

      {/* Edit a detail */}
      <Dialog open={edit !== null} onOpenChange={(o) => !o && !busy && setEdit(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          {edit ? (
            <form onSubmit={save} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <DialogTitle className="panel-title panel-title-lg text-foreground">{titles[edit]}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {edit === "email" ? "We'll send a confirmation link to the new address." : edit === "password" ? `At least ${MIN_PASSWORD} characters.` : "Saved to your account on the website and in the app."}
                </DialogDescription>
              </div>

              {note ? (
                <p className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success" role="status">{note}</p>
              ) : (
                <>
                  {edit === "name" ? (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="account-name">Full name</Label>
                      <Input id="account-name" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="name" autoFocus />
                    </div>
                  ) : null}
                  {edit === "email" ? (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="account-email">Email</Label>
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
                      <Label>Citizenship</Label>
                      <CitizenshipPicker value={value} onChange={setValue} />
                    </div>
                  ) : null}
                  {edit === "password" ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="account-password">New password</Label>
                        <Input id="account-password" type="password" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="new-password" autoFocus />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="account-password-confirm">Confirm password</Label>
                        <Input id="account-password-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
                      </div>
                    </>
                  ) : null}
                  {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
                </>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" className="rounded-full hover:bg-secondary hover:text-foreground" onClick={() => setEdit(null)} disabled={busy}>
                  {note ? "Done" : "Cancel"}
                </Button>
                {note ? null : (
                  <Button type="submit" className="rounded-full" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                    Save
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
              <DialogTitle className="panel-title panel-title-lg text-foreground">{deleteStep === "sure" ? "Are you sure?" : deleteStep === "failed" ? "We couldn't delete it right now" : "Delete your account?"}</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {deleteStep === "sure"
                  ? "This permanently deletes your account, uploaded documents and personal details. It can't be undone."
                  : deleteStep === "failed"
                    ? "Send us the request and we'll delete your account and personal data within 30 days."
                    : "Your account, uploaded documents and personal details are removed. Payment records are kept as required by law."}
              </DialogDescription>
            </div>
            <div className="flex flex-col gap-2">
              {deleteStep === "ask" ? (
                <Button type="button" variant="destructive" className="rounded-full" onClick={() => setDeleteStep("sure")}>Continue</Button>
              ) : null}
              {deleteStep === "sure" ? (
                <Button type="button" variant="destructive" className="rounded-full" onClick={deleteNow} disabled={deleting}>
                  {deleting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  {deleting ? "Deleting…" : "Delete permanently"}
                </Button>
              ) : null}
              {deleteStep === "failed" ? (
                <>
                  <Button asChild variant="outline" className="rounded-full hover:bg-secondary hover:text-foreground">
                    <a href={whatsappHref(`Please delete my EZvisa account (${profile.email}).`)} target="_blank" rel="noopener noreferrer">Request by WhatsApp</a>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full hover:bg-secondary hover:text-foreground">
                    <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Delete my EZvisa account")}&body=${encodeURIComponent(`Please delete my EZvisa account and personal data.\nAccount email: ${profile.email}`)}`}>Request by email</a>
                  </Button>
                </>
              ) : null}
              <Button type="button" variant="ghost" className="rounded-full hover:bg-secondary hover:text-foreground" onClick={() => setDeleteStep(null)} disabled={deleting}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
