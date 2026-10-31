"use client"

// Customers board: "Edit details" for name, phone and nationality on every case under this customer's email.
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil } from "lucide-react"
import { updateCustomerContact } from "@/app/admin/customers/contact-action"

export function CustomerContactEdit({ email, name, phone, nationality, cases, demo }: { email: string; name: string; phone: string; nationality: string; cases: number; demo: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [first = "", ...rest] = name.trim().split(/\s+/)
  const [v, setV] = useState({ firstName: first, lastName: rest.join(" "), phone, nationality, note: "" })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  return (
    <div className="stack" style={{ gap: 8 }}>
      <button type="button" className="btn outline sm" aria-expanded={open} onClick={() => setOpen((x) => !x)} style={{ alignSelf: "flex-start" }}><Pencil size={14} aria-hidden /> Edit contact details</button>
      {open ? (
        <form
          className="card form"
          style={{ padding: 14 }}
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const r = await updateCustomerContact({ email, ...v })
              setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error })
              if (r.ok) { setOpen(false); if (!demo) router.refresh() }
            })
          }}
        >
          <div className="grid-form">
            <label>First name<input className="inp" required maxLength={60} value={v.firstName} onChange={(e) => setV({ ...v, firstName: e.target.value })} /></label>
            <label>Last name<input className="inp" maxLength={60} value={v.lastName} onChange={(e) => setV({ ...v, lastName: e.target.value })} /></label>
            <label>Phone<input className="inp" inputMode="tel" maxLength={30} placeholder="+971 50 000 0000" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></label>
            <label>Nationality<input className="inp" maxLength={60} value={v.nationality} onChange={(e) => setV({ ...v, nationality: e.target.value })} /></label>
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }} className="muted">Why (for the audit log)<input className="inp" required minLength={3} maxLength={300} placeholder="e.g. Customer sent a new number on WhatsApp" value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} style={{ minWidth: 0 }} /></label>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>Saved on all {cases} {cases === 1 ? "case" : "cases"} for {email}. The email itself (how they sign in) does not change here.</p>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" className="btn primary sm" disabled={pending}>{pending ? "Saving" : "Save on every case"}</button>
            <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : null}
      {msg ? <div className={msg.ok ? "flash ok" : "flash err"} role="status"><span>{msg.text}</span></div> : null}
    </div>
  )
}
