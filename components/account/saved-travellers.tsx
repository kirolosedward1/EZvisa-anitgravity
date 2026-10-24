"use client"

// Account → Saved travellers: the people the customer applied for (public.travellers), with add / edit / remove.
// Rows are created automatically when an application is paid (lib/travellers.ts); this is where a typo gets fixed
// or a person removed. The same list feeds the "Who is travelling?" drop-down on the website and in the app.
import { useState } from "react"
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CitizenshipPicker } from "@/components/citizenship-picker"
import { CountryFlag } from "@/components/country-flag"
import { PhoneField } from "@/components/phone-field"
import { useTravellers } from "@/lib/travellers-client"
import { citizenshipName, toCitizenshipIso } from "@/lib/nationalities"
import { TRAVELLER_RELATIONSHIPS, UAE_EMIRATES, maskPassport, travellerName, type Traveller, type TravellerRelationship } from "@/lib/shared/wizard-contract"
import { cn } from "@/lib/utils"

const RELATION_LABEL: Record<TravellerRelationship, string> = { self: "You", spouse: "Spouse", other: "Other" }
const EMPTY = { firstName: "", lastName: "", relationship: "other" as TravellerRelationship, nationality: "", dateOfBirth: "", passportNumber: "", passportExpiry: "", phone: "", cityOfResidence: "" }
type Draft = typeof EMPTY

const toDraft = (t: Traveller): Draft => ({
  firstName: t.firstName ?? "", lastName: t.lastName ?? "", relationship: t.relationship,
  nationality: toCitizenshipIso(t.nationality), dateOfBirth: t.dateOfBirth ?? "", passportNumber: t.passportNumber ?? "",
  passportExpiry: t.passportExpiry ?? "", phone: t.phone ?? "", cityOfResidence: t.cityOfResidence ?? "",
})
const fmtDate = (iso?: string) => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "")

export function SavedTravellers() {
  const { travellers, loaded, refresh } = useTravellers()
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null)
  const [removing, setRemoving] = useState<Traveller | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [phoneValid, setPhoneValid] = useState(true)

  const open = (t?: Traveller) => {
    setError("")
    setPhoneValid(true)
    setEditing({ id: t?.id ?? null, draft: t ? toDraft(t) : { ...EMPTY } })
  }
  const setDraft = (patch: Partial<Draft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e))

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return
    const d = editing.draft
    if (!d.firstName.trim() || !d.lastName.trim()) return setError("Enter the traveller's first and last name.")
    if (d.phone && !phoneValid) return setError("Enter a valid phone number for the selected country.")
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
      if (!res.ok) return setError(json.error || "Could not save the traveller. Please try again.")
      setEditing(null)
      refresh()
    } catch {
      setError("You seem to be offline. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!removing) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/travellers/${encodeURIComponent(removing.id)}`, { method: "DELETE", credentials: "same-origin" })
      if (!res.ok) return setError("Could not remove the traveller. Please try again.")
      setRemoving(null)
      refresh()
    } catch {
      setError("You seem to be offline. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {!loaded ? (
        <div className="flex items-center gap-3 px-5 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading saved travellers…
        </div>
      ) : travellers.length ? (
        <ul className="divide-y divide-border">
          {travellers.map((t) => (
            <li key={t.id} className="flex items-center gap-4 px-5 py-4">
              <CountryFlag country={t.nationality} title={t.nationality} className="size-9" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{travellerName(t)}</span>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{RELATION_LABEL[t.relationship]}</span>
                </span>
                <span className="ltr-isolate truncate text-xs text-muted-foreground">
                  {[t.nationality, maskPassport(t.passportNumber), t.dateOfBirth ? `Born ${fmtDate(t.dateOfBirth)}` : ""].filter(Boolean).join(" · ") || "Name only"}
                </span>
              </span>
              <Button type="button" variant="ghost" size="sm" className="rounded-full text-primary hover:bg-secondary hover:text-primary" onClick={() => open(t)}>
                <Pencil className="size-4" aria-hidden="true" /> Edit
              </Button>
              <Button type="button" variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-destructive/5 hover:text-destructive" aria-label={`Remove ${travellerName(t)}`} onClick={() => { setError(""); setRemoving(t) }}>
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-5" aria-hidden="true" />
          </span>
          <p className="max-w-sm text-sm text-muted-foreground">No saved travellers yet. Everyone you apply for is added here after payment, so the next application starts filled in.</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">Shown in the &ldquo;Who is travelling?&rdquo; drop-down on the website and in the app.</p>
        <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full hover:bg-secondary hover:text-foreground" onClick={() => open()}>
          <Plus className="size-4" aria-hidden="true" /> Add traveller
        </Button>
      </div>

      {/* Add / edit */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && !busy && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
          {editing ? (
            <form onSubmit={save} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <DialogTitle className="panel-title panel-title-lg text-foreground">{editing.id ? "Edit traveller" : "Add traveller"}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">Exactly as in the passport. Saved to your account on the website and in the app.</DialogDescription>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-first">First name</Label>
                  <Input id="trav-first" value={editing.draft.firstName} onChange={(e) => setDraft({ firstName: e.target.value })} autoComplete="off" autoFocus />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-last">Last name</Label>
                  <Input id="trav-last" value={editing.draft.lastName} onChange={(e) => setDraft({ lastName: e.target.value })} autoComplete="off" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-relationship">Who is this?</Label>
                  <Select value={editing.draft.relationship} onValueChange={(v) => setDraft({ relationship: v as TravellerRelationship })}>
                    <SelectTrigger id="trav-relationship" className="h-12 w-full rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {TRAVELLER_RELATIONSHIPS.map((r) => <SelectItem key={r} value={r} className="rounded-lg">{RELATION_LABEL[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Nationality</Label>
                  <CitizenshipPicker value={editing.draft.nationality} onChange={(iso) => setDraft({ nationality: iso })} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-dob">Date of birth</Label>
                  <Input id="trav-dob" type="date" value={editing.draft.dateOfBirth} onChange={(e) => setDraft({ dateOfBirth: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-city">Emirate</Label>
                  <Select value={editing.draft.cityOfResidence || "none"} onValueChange={(v) => setDraft({ cityOfResidence: v === "none" ? "" : v })}>
                    <SelectTrigger id="trav-city" className="h-12 w-full rounded-xl"><SelectValue placeholder="Select emirate" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="rounded-lg">Not set</SelectItem>
                      {UAE_EMIRATES.map((e) => <SelectItem key={e} value={e} className="rounded-lg">{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-passport">Passport number</Label>
                  <Input id="trav-passport" value={editing.draft.passportNumber} onChange={(e) => setDraft({ passportNumber: e.target.value.toUpperCase() })} placeholder="e.g. N1234567" autoCapitalize="characters" autoCorrect="off" spellCheck={false} className="uppercase" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="trav-expiry">Passport expiry</Label>
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
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" className="rounded-full hover:bg-secondary hover:text-foreground" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
                <Button type="submit" className="rounded-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  {editing.id ? "Save changes" : "Add traveller"}
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
              <DialogTitle className="panel-title panel-title-lg text-foreground">Remove {removing ? travellerName(removing) : "traveller"}?</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                They disappear from the &ldquo;Who is travelling?&rdquo; drop-down. Applications already made are not changed.
              </DialogDescription>
            </div>
            {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
            <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end")}>
              <Button type="button" variant="ghost" className="rounded-full hover:bg-secondary hover:text-foreground" onClick={() => setRemoving(null)} disabled={busy}>Cancel</Button>
              <Button type="button" variant="destructive" className="rounded-full" onClick={remove} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                Remove
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
