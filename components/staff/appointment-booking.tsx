"use client"

// Help-request row action on the Appointments board: book on the centre's site, then save the slot here.
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveAppointment } from "@/app/admin/appointments/actions"
import { assignCases } from "@/app/admin/cases/actions"
import { CENTRES } from "@/lib/staff/centres"

export function BookAndSave({ caseId, defaultCentre, canAssignSelf, me, demo }: { caseId: string; defaultCentre: string | null; canAssignSelf: boolean; me: string | null; demo: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState("")
  const [time, setTime] = useState("10:30")
  const [centre, setCentre] = useState(defaultCentre || CENTRES[0].name)
  const [reference, setReference] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>, close = false) =>
    start(async () => {
      const r = await fn()
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error })
      if (r.ok) {
        if (close) setOpen(false)
        if (!demo) router.refresh()
      }
    })
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {canAssignSelf && me ? <button type="button" className="btn ghost sm" disabled={pending} onClick={() => run(() => assignCases({ ids: [caseId], staffId: me }))}>Assign to me</button> : null}
        <button type="button" className="btn outline sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>Book and save</button>
      </div>
      {open ? (
        <form
          className="reject"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => saveAppointment({ id: caseId, date, time, centre, reference }), true)
          }}
        >
          <div className="grid-form">
            <label>Date<input className="inp" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label>Time<input className="inp" type="time" required value={time} onChange={(e) => setTime(e.target.value)} /></label>
            <label>Centre<select className="sel" value={centre} onChange={(e) => setCentre(e.target.value)}>{CENTRES.map((c) => <option key={c.name}>{c.name}</option>)}</select></label>
            <label>Centre reference<input className="inp" placeholder="e.g. VFS-2211-8842" value={reference} onChange={(e) => setReference(e.target.value)} /></label>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>Book on the centre&rsquo;s site first, then save the slot: the customer sees the countdown and checklist on their dashboard. WhatsApp reminders are not connected yet.</p>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" className="btn primary sm" disabled={pending || !date}>Save appointment</button>
            <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : null}
      {msg ? <div className={msg.ok ? "flash ok" : "flash err"} role="status"><span>{msg.text}</span></div> : null}
    </div>
  )
}
