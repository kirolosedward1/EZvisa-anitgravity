"use client"

// "Edit on behalf of the customer" (Case board, Application details). A reason is required; every change is logged
// with the old and new values.
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { editApplication } from "@/app/admin/cases/[id]/edit-action"
import type { EditableFields } from "@/lib/staff/editable"
import { EMPLOYMENT, FUNDING, MARITAL, PURPOSES, SCHENGEN } from "@/lib/shared/wizard-contract"

type K = keyof EditableFields
const SELECTS: Partial<Record<K, { value: string; label: string }[]>> = {
  destination: SCHENGEN.map((c) => ({ value: c, label: c })),
  purposeOfTrip: PURPOSES,
  maritalStatus: MARITAL,
  spouseAccompanying: [{ value: "yes", label: "Yes, on this application" }, { value: "no", label: "No" }],
  employmentStatus: EMPLOYMENT,
  fundingSource: FUNDING,
  isFirstSchengenVisa: [{ value: "yes", label: "Yes, first visa" }, { value: "no", label: "No, had one before" }],
  previousRefusals: [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }],
}
const LABELS: Record<K, string> = {
  firstName: "First name", lastName: "Last name", dateOfBirth: "Date of birth", nationality: "Nationality", phone: "Phone (WhatsApp)",
  destination: "Destination", purposeOfTrip: "Purpose", travelStartDate: "Entry", travelEndDate: "Exit", maritalStatus: "Marital status",
  spouseAccompanying: "Spouse travelling", employmentStatus: "Employment", companyName: "Employer or company", jobTitle: "Job title",
  employmentStartDate: "In this job since", fundingSource: "Who pays", isFirstSchengenVisa: "First Schengen visa", previousRefusals: "Refused before",
  passportNumber: "Passport number", passportExpiry: "Passport expiry",
}
const TYPE: Partial<Record<K, string>> = { dateOfBirth: "date", travelStartDate: "date", travelEndDate: "date", passportExpiry: "date", employmentStartDate: "month" }

export function EditApplication({ caseId, initial, paid, demo, defaultOpen = false }: { caseId: string; initial: EditableFields; paid: boolean; demo: boolean; defaultOpen?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [v, setV] = useState(initial)
  const [note, setNote] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  if (!open) {
    return (
      <div className="stack" style={{ gap: 6 }}>
        <button type="button" className="btn outline sm" style={{ alignSelf: "flex-start" }} onClick={() => { setOpen(true); setMsg(null) }}>Edit on behalf of the customer</button>
        {msg ? <div className={msg.ok ? "flash ok" : "flash err"} role="status"><span>{msg.text}</span></div> : null}
      </div>
    )
  }
  return (
    <form
      className="reject"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await editApplication({ id: caseId, answers: v, note })
          setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error })
          if (r.ok) {
            setOpen(false)
            setNote("")
            if (!demo) router.refresh()
          }
        })
      }}
    >
      <div className="grid-form">
        {(Object.keys(LABELS) as K[]).map((k) => {
          const options = SELECTS[k]
          const locked = paid && k === "spouseAccompanying"
          return (
            <label key={k}>
              {LABELS[k]}
              {options ? (
                <select className="sel" value={v[k]} disabled={locked} onChange={(e) => setV({ ...v, [k]: e.target.value })}>
                  {k !== "destination" ? <option value="">Not answered</option> : null}
                  {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input className="inp" type={TYPE[k] ?? "text"} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} required={k === "firstName"} />
              )}
              {locked ? <span className="muted" style={{ fontSize: 11 }}>Fixed after payment (it changes the fee)</span> : null}
            </label>
          )
        })}
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
        Why are you changing it? (audit log)
        <input className="inp" required minLength={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Customer called with the new travel dates" style={{ minWidth: 0 }} />
      </label>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>The email they sign in with is not changed here. Edits are logged with your name; the customer sees the new details on their dashboard.</p>
      {msg && !msg.ok ? <div className="flash err" role="alert"><span>{msg.text}</span></div> : null}
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="btn primary sm" disabled={pending || note.trim().length < 3}>Save changes</button>
        <button type="button" className="btn ghost sm" onClick={() => { setOpen(false); setV(initial) }}>Cancel</button>
      </div>
    </form>
  )
}
