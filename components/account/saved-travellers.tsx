"use client"

// Account → Saved travellers: the people the customer applied for (public.travellers), with add / edit / remove.
// Rows are created automatically when an application is paid (lib/travellers.ts); this is where a typo gets fixed
// or a person removed. The same list feeds the "Who is travelling?" drop-down on the website and in the app.
import { useState, type ReactNode } from "react"
import { Loader2, Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CitizenshipPicker } from "@/components/citizenship-picker"
import { PhoneField } from "@/components/phone-field"
import { DashPill } from "@/components/dashboard/dash-pill"
import { useSiteLocale } from "@/components/locale-provider"
import { useTravellers } from "@/lib/travellers-client"
import { citizenshipName, citizenshipNameAr, toCitizenshipIso } from "@/lib/nationalities"
import { MONTHS_AR } from "@/lib/dates"
import { applicationsFor, initialsOf, isUnder18, passportState } from "@/lib/account-travellers"
import { TRAVELLER_RELATIONSHIPS, UAE_EMIRATES, travellerName, type Traveller, type TravellerRelationship } from "@/lib/shared/wizard-contract"
import { customerText, type CustomerKey } from "@/lib/translations/customer"

const RELATION_KEY: Record<TravellerRelationship, CustomerKey> = { self: "trav.self", spouse: "trav.spouse", other: "trav.other" }
const EMPTY = { firstName: "", lastName: "", relationship: "other" as TravellerRelationship, nationality: "", dateOfBirth: "", passportNumber: "", passportExpiry: "", phone: "", cityOfResidence: "" }
type Draft = typeof EMPTY

const toDraft = (t: Traveller): Draft => ({
  firstName: t.firstName ?? "", lastName: t.lastName ?? "", relationship: t.relationship,
  nationality: toCitizenshipIso(t.nationality), dateOfBirth: t.dateOfBirth ?? "", passportNumber: t.passportNumber ?? "",
  passportExpiry: t.passportExpiry ?? "", phone: t.phone ?? "", cityOfResidence: t.cityOfResidence ?? "",
})
/** "2031", or "Mar 2027" when the month matters (expiring soon). */
const expiryLabel = (iso: string, withMonth: boolean, arabic: boolean) => {
  const [y, m] = iso.split("-").map(Number)
  if (!withMonth) return String(y)
  return arabic ? `${MONTHS_AR[m - 1]} ${y}` : new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
}

/**
 * Saved travellers card body. applicantNames are the traveller names on the customer's applications, for the
 * "3 applications" count. demo: the demo accounts never write, so the dialogs explain that instead of saving.
 */
export function SavedTravellers({ applicantNames = [], demo = false, header }: { applicantNames?: string[]; demo?: boolean; header: (add: () => void) => ReactNode }) {
  const locale = useSiteLocale()
  const arabic = locale === "ar"
  const t = (key: CustomerKey, values?: Record<string, string | number>) => customerText(locale, key, values)
  const { travellers, loaded, refresh } = useTravellers()
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null)
  const [removing, setRemoving] = useState<Traveller | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [phoneValid, setPhoneValid] = useState(true)

  const open = (tr?: Traveller) => {
    setError("")
    setPhoneValid(true)
    setEditing({ id: tr?.id ?? null, draft: tr ? toDraft(tr) : { ...EMPTY } })
  }
  const setDraft = (patch: Partial<Draft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e))

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return
    const d = editing.draft
    if (!d.firstName.trim() || !d.lastName.trim()) return setError(t("trav.errName"))
    if (d.phone && !phoneValid) return setError(t("acct.errPhone"))
    if (demo) return setError(t("acct.demoNote"))
    setBusy(true)
    setError("")
    try {
      const body = { ...d, nationality: d.nationality ? citizenshipName(d.nationality) : "" }
      const res = await fetch(editing.id ? `/api/travellers/${encodeURIComponent(editing.id)}` : "/api/travellers", {
        method: editing.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) return setError((!arabic && json.error) || t("trav.errSave"))
      setEditing(null)
      refresh()
    } catch {
      setError(t("trav.errOffline"))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!removing) return
    if (demo) return setError(t("acct.demoNote"))
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/travellers/${encodeURIComponent(removing.id)}`, { method: "DELETE", credentials: "same-origin" })
      if (!res.ok) return setError(t("trav.errRemove"))
      setRemoving(null)
      refresh()
    } catch {
      setError(t("trav.errOffline"))
    } finally {
      setBusy(false)
    }
  }

  const askRemove = () => {
    const current = travellers.find((tr) => tr.id === editing?.id)
    if (!current) return
    setEditing(null)
    setError("")
    setRemoving(current)
  }

  return (
    <>
      {header(() => open())}
      {!loaded ? (
        <div className="flex items-center gap-3 border-t border-[#eef1f6] px-6 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {t("trav.loading")}
        </div>
      ) : travellers.length ? (
        <ul>
          {travellers.map((tr) => {
            const name = travellerName(tr)
            const passport = passportState(tr.passportExpiry)
            const count = applicationsFor(name, applicantNames)
            const nationality = arabic ? citizenshipNameAr(tr.nationality) : tr.nationality
            const facts = [
              nationality,
              tr.passportExpiry ? t("trav.passportEnds", { date: expiryLabel(tr.passportExpiry, passport !== "ok", arabic) }) : "",
              isUnder18(tr.dateOfBirth) ? t("trav.under18") : count ? (count === 1 ? t("trav.apps1") : t("trav.appsN", { n: count })) : "",
            ].filter(Boolean)
            return (
              <li key={tr.id} className="flex items-center gap-3.5 border-t border-[#eef1f6] px-6 py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#edf4ff] text-[13px] font-semibold text-primary" aria-hidden="true">
                  {initialsOf(name) || "?"}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{name}</span>
                    {passport === "soon" || passport === "expired" ? (
                      <DashPill tone={passport === "expired" ? "danger" : "warning"}>{t(passport === "expired" ? "trav.expired" : "trav.expiresSoon")}</DashPill>
                    ) : tr.relationship !== "other" ? (
                      <DashPill tone={tr.relationship === "self" ? "info" : "neutral"} dot={false}>{t(RELATION_KEY[tr.relationship])}</DashPill>
                    ) : null}
                  </span>
                  <span className="text-[13px] leading-snug text-muted-foreground">{facts.join(" · ") || t("trav.nameOnly")}</span>
                </span>
                <Button type="button" variant="ghost" size="sm" className="shrink-0 text-primary hover:bg-[#edf4ff] hover:text-primary" onClick={() => open(tr)} aria-label={t("acct.actionFor", { action: t("acct.edit"), field: name })}>
                  {t("acct.edit")}
                </Button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 border-t border-[#eef1f6] px-6 py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-[#edf4ff] text-primary">
            <Users className="size-5" aria-hidden="true" />
          </span>
          <p className="max-w-sm text-sm text-muted-foreground">{t("trav.empty")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => open()}>
            <Plus className="size-4" aria-hidden="true" /> {t("trav.add")}
          </Button>
        </div>
      )}

      {/* Add / edit */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && !busy && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
          {editing ? (
            <form onSubmit={save} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <DialogTitle className="panel-title panel-title-lg text-foreground">{t(editing.id ? "trav.editTitle" : "trav.add")}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">{t("trav.dlgBody")}</DialogDescription>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-first">{t("trav.first")}</Label>
                  <Input id="trav-first" value={editing.draft.firstName} onChange={(e) => setDraft({ firstName: e.target.value })} autoComplete="off" autoFocus />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-last">{t("trav.last")}</Label>
                  <Input id="trav-last" value={editing.draft.lastName} onChange={(e) => setDraft({ lastName: e.target.value })} autoComplete="off" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-relationship">{t("trav.who")}</Label>
                  <Select value={editing.draft.relationship} onValueChange={(v) => setDraft({ relationship: v as TravellerRelationship })}>
                    <SelectTrigger id="trav-relationship" className="h-12 w-full rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {TRAVELLER_RELATIONSHIPS.map((r) => <SelectItem key={r} value={r} className="rounded-lg">{t(RELATION_KEY[r])}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t("trav.nationality")}</Label>
                  <CitizenshipPicker value={editing.draft.nationality} onChange={(iso) => setDraft({ nationality: iso })} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-dob">{t("trav.dob")}</Label>
                  <Input id="trav-dob" type="date" value={editing.draft.dateOfBirth} onChange={(e) => setDraft({ dateOfBirth: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-city">{t("trav.emirate")}</Label>
                  <Select value={editing.draft.cityOfResidence || "none"} onValueChange={(v) => setDraft({ cityOfResidence: v === "none" ? "" : v })}>
                    <SelectTrigger id="trav-city" className="h-12 w-full rounded-xl"><SelectValue placeholder={t("trav.emiratePick")} /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="rounded-lg">{t("trav.notSet")}</SelectItem>
                      {UAE_EMIRATES.map((e) => <SelectItem key={e} value={e} className="rounded-lg">{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-passport">{t("trav.passport")}</Label>
                  <Input id="trav-passport" value={editing.draft.passportNumber} onChange={(e) => setDraft({ passportNumber: e.target.value.toUpperCase() })} placeholder={t("trav.passportEg")} autoCapitalize="characters" autoCorrect="off" spellCheck={false} className="uppercase" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-expiry">{t("trav.expiry")}</Label>
                  <Input id="trav-expiry" type="date" value={editing.draft.passportExpiry} onChange={(e) => setDraft({ passportExpiry: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <PhoneField
                    id="trav-phone"
                    value={editing.draft.phone}
                    onChange={(e164, valid) => {
                      setDraft({ phone: e164 })
                      setPhoneValid(valid || e164 === "")
                    }}
                  />
                </div>
              </div>
              {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                {editing.id ? (
                  <button type="button" onClick={askRemove} disabled={busy} className="me-auto rounded text-sm font-medium text-destructive hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive">
                    {t("trav.removeLink")}
                  </button>
                ) : null}
                <Button type="button" variant="ghost" className="rounded-full hover:bg-secondary hover:text-foreground" onClick={() => setEditing(null)} disabled={busy}>{t("acct.cancel")}</Button>
                <Button type="submit" className="rounded-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  {t(editing.id ? "trav.saveChanges" : "trav.add")}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Remove */}
      <Dialog open={removing !== null} onOpenChange={(o) => !o && !busy && setRemoving(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <DialogTitle className="panel-title panel-title-lg text-foreground">{t("trav.removeTitle", { name: removing ? travellerName(removing) : "" })}</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {t("trav.removeBody")}
              </DialogDescription>
            </div>
            {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" className="rounded-full hover:bg-secondary hover:text-foreground" onClick={() => setRemoving(null)} disabled={busy}>{t("acct.cancel")}</Button>
              <Button type="button" variant="destructive" className="rounded-full" onClick={remove} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {t("trav.removeBtn")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
