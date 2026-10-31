"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addMember, updateMember } from "@/app/admin/team/actions"
import { ROLES, ROLE_LABEL } from "@/lib/staff/roles"

function useAction(demo: boolean) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const run = (fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn()
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error })
      if (r.ok) {
        after?.()
        if (!demo) router.refresh()
      }
    })
  return { pending, run, flash: msg ? <div className={msg.ok ? "flash ok" : "flash err"} role="status"><span>{msg.text}</span></div> : null }
}

export function MemberControls({ id, name, role, active, self, envAdmin, demo }: { id: string; name: string; role: string; active: boolean; self: boolean; envAdmin: boolean; demo: boolean }) {
  const { pending, run, flash } = useAction(demo)
  const [renaming, setRenaming] = useState(false)
  const [value, setValue] = useState(name)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
        {self ? <span className="muted" style={{ fontSize: 12 }}>You</span> : (
          <>
            <select className="sel" aria-label={`Role for ${name}`} value={role} disabled={pending || envAdmin} onChange={(e) => run(() => updateMember({ id, role: e.target.value }))} style={{ height: 30 }}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            <button type="button" className="btn ghost sm" disabled={pending} onClick={() => run(() => updateMember({ id, active: !active }))}>{active ? "Deactivate" : "Reactivate"}</button>
          </>
        )}
        <button type="button" className="btn ghost sm" aria-expanded={renaming} onClick={() => setRenaming((v) => !v)}>Rename</button>
      </div>
      {renaming ? (
        <form style={{ display: "flex", gap: 6 }} onSubmit={(e) => { e.preventDefault(); run(() => updateMember({ id, name: value }), () => setRenaming(false)) }}>
          <input className="inp" style={{ minWidth: 0, width: 180, height: 30 }} aria-label={`New name for ${name}`} required minLength={2} maxLength={80} value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="submit" className="btn primary sm" disabled={pending || value.trim() === name}>Save</button>
        </form>
      ) : null}
      {flash}
    </div>
  )
}

export function AddMember({ demo }: { demo: boolean }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("specialist")
  const { pending, run, flash } = useAction(demo)
  return (
    <div className="stack" style={{ gap: 8 }}>
      <button type="button" className="btn primary" aria-expanded={open} onClick={() => setOpen((v) => !v)} style={{ alignSelf: "flex-end" }}>+ Add member</button>
      {open ? (
        <form className="card form" onSubmit={(e) => { e.preventDefault(); run(() => addMember({ email, name, role }), () => { setEmail(""); setName(""); setOpen(false) }) }}>
          <div className="grid-form">
            <label>Name<input className="inp" required value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label>Email they sign in with<input className="inp" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Role<select className="sel" value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></label>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>No invitation email is sent (the email service is not working). Tell them to open ezvisa.net/staff and sign in with this email.</p>
          <div className="actions"><button type="submit" className="btn primary" disabled={pending}>Add</button></div>
        </form>
      ) : null}
      {flash}
    </div>
  )
}
