"use client"

// Settings board editors: message templates (English and Arabic), SLA targets, automatic assignment and the visa
// centres on the staff appointment form. Each saves on its own (app/admin/settings/actions.ts) and can be reset.
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { resetSetting, saveSetting, type SettingResult } from "@/app/admin/settings/actions"
import { matchFromName, type AutoAssign, type Centre, type SettingKey, type SlaTargets, type Templates } from "@/lib/staff/console-settings"
import { GRANTABLE, PERMISSIONS, ROLE_LABEL, type Matrix, type Permission } from "@/lib/staff/roles"

function useSave(demo: boolean) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const run = (fn: () => Promise<SettingResult>) =>
    start(async () => {
      const r = await fn()
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error })
      if (r.ok && !demo) router.refresh()
    })
  return { pending, run, flash: msg ? <div className={msg.ok ? "flash ok" : "flash err"} role="status"><span>{msg.text}</span></div> : null }
}

function Footer({ k, pending, dirty, run, flash, canEdit, updated }: { k: SettingKey; pending: boolean; dirty: boolean; run: (fn: () => Promise<SettingResult>) => void; flash: React.ReactNode; canEdit: boolean; updated?: string }) {
  if (!canEdit) return <p className="muted" style={{ margin: 0, fontSize: 12 }}>Only admins can change settings.</p>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="actions" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="btn primary" disabled={pending || !dirty}>{pending ? "Saving" : "Save changes"}</button>
        {updated ? <button type="button" className="btn ghost sm" disabled={pending} onClick={() => { if (confirm("Reset to the default? The change is logged in the audit.")) run(() => resetSetting(k)) }}>Reset to default</button> : null}
        <span className="muted" style={{ fontSize: 12 }}>{updated ? `Last changed ${new Date(updated).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Using the default"}</span>
      </div>
      {flash}
    </div>
  )
}

export function TemplatesEditor({ initial, canEdit, demo, updated }: { initial: Templates; canEdit: boolean; demo: boolean; updated?: string }) {
  const [t, setT] = useState(initial)
  const { pending, run, flash } = useSave(demo)
  const dirty = JSON.stringify(t) !== JSON.stringify(initial)
  const keys = Object.keys(t) as (keyof Templates)[]
  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); run(() => saveSetting("templates", Object.fromEntries(keys.map((k) => [k, { en: t[k].en, ar: t[k].ar }])))) }}>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>
        Variables fill from the case: <code>{"{first_name}"}</code> <code>{"{reference}"}</code> <code>{"{stage}"}</code> <code>{"{destination}"}</code> <code>{"{missing_documents}"}</code> <code>{"{dashboard_link}"}</code>. Used by quick replies in Messaging and by broadcasts.
      </p>
      {keys.map((k) => (
        <fieldset key={k} className="tpl-edit">
          <legend>{t[k].label}{t[k].broadcast ? <span className="pill xs blue" style={{ marginInlineStart: 8 }}>Broadcast</span> : null}</legend>
          <label>English<textarea className="ta" rows={3} value={t[k].en} disabled={!canEdit} onChange={(e) => setT({ ...t, [k]: { ...t[k], en: e.target.value } })} /></label>
          <label>Arabic<textarea className="ta" rows={3} dir="rtl" value={t[k].ar} disabled={!canEdit} onChange={(e) => setT({ ...t, [k]: { ...t[k], ar: e.target.value } })} /></label>
        </fieldset>
      ))}
      <Footer k="templates" pending={pending} dirty={dirty} run={run} flash={flash} canEdit={canEdit} updated={updated} />
    </form>
  )
}

export function SlaEditor({ initial, canEdit, demo, updated }: { initial: SlaTargets; canEdit: boolean; demo: boolean; updated?: string }) {
  const [s, setS] = useState(initial)
  const { pending, run, flash } = useSave(demo)
  const dirty = JSON.stringify(s) !== JSON.stringify(initial)
  const field = (key: keyof SlaTargets, label: string, unit: string, max: number) => (
    <label>{label}<span style={{ display: "flex", gap: 8, alignItems: "center" }}><input className="inp" style={{ minWidth: 0, width: 90 }} type="number" min={1} max={max} required disabled={!canEdit} value={s[key]} onChange={(e) => setS({ ...s, [key]: Number(e.target.value) })} /><span className="muted">{unit}</span></span></label>
  )
  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); run(() => saveSetting("sla", s)) }}>
      <div className="grid-form">
        {field("reviewHours", "First document check", "hours after the upload", 240)}
        {field("fileBusinessDays", "File prepared", "business days after the last approval (Mon to Fri, Dubai)", 20)}
        {field("helpHours", "Appointment help answered", "hours after the request", 240)}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>Changes the due times, &ldquo;Past SLA&rdquo; flags and counts on every board. Customers do not see these.</p>
      <Footer k="sla" pending={pending} dirty={dirty} run={run} flash={flash} canEdit={canEdit} updated={updated} />
    </form>
  )
}

export function AutoAssignEditor({ initial, canEdit, demo, updated }: { initial: AutoAssign; canEdit: boolean; demo: boolean; updated?: string }) {
  const [a, setA] = useState(initial)
  const { pending, run, flash } = useSave(demo)
  const dirty = JSON.stringify(a) !== JSON.stringify(initial)
  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); run(() => saveSetting("auto_assign", a)) }}>
      <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
        <button type="button" className="switch" data-on={a.on ? "true" : undefined} role="switch" aria-checked={a.on} aria-label="Assign new paid cases automatically" disabled={!canEdit} onClick={() => setA({ ...a, on: !a.on })} />
        Assign new paid cases automatically to the active specialist with the fewest open cases
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, flexWrap: "wrap" }}>
        Cap per specialist
        <input className="inp" style={{ minWidth: 0, width: 90 }} type="number" min={1} max={500} placeholder="None" disabled={!canEdit || !a.on} value={a.cap ?? ""} onChange={(e) => setA({ ...a, cap: e.target.value ? Number(e.target.value) : null })} />
        <span className="muted" style={{ fontSize: 12 }}>open cases. When everyone is at the cap, the case stays unassigned for an admin.</span>
      </label>
      <Footer k="auto_assign" pending={pending} dirty={dirty} run={run} flash={flash} canEdit={canEdit} updated={updated} />
    </form>
  )
}

export function CentresEditor({ initial, canEdit, demo, updated }: { initial: Centre[]; canEdit: boolean; demo: boolean; updated?: string }) {
  const [list, setList] = useState(initial)
  const { pending, run, flash } = useSave(demo)
  const dirty = JSON.stringify(list) !== JSON.stringify(initial)
  const set = (i: number, patch: Partial<Centre>) => setList(list.map((c, j) => (j === i ? { ...c, ...patch, ...(patch.name !== undefined ? { match: matchFromName(patch.name) } : {}) } : c)))
  return (
    <form className="stack" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); run(() => saveSetting("centres", list)) }}>
      {list.map((c, i) => (
        <div key={i} className="centre-row">
          <label>Name<input className="inp" required minLength={2} maxLength={80} disabled={!canEdit} value={c.name} onChange={(e) => set(i, { name: e.target.value })} /></label>
          <label>Short name (filters)<input className="inp" required minLength={2} maxLength={24} disabled={!canEdit} value={c.short} onChange={(e) => set(i, { short: e.target.value })} /></label>
          <span className="muted" style={{ fontSize: 12, alignSelf: "end", paddingBottom: 8 }}>Matches: {c.match.join(" + ")}</span>
          {canEdit ? <button type="button" className="btn ghost sm" style={{ alignSelf: "end" }} disabled={list.length <= 1} onClick={() => setList(list.filter((_, j) => j !== i))} aria-label={`Remove ${c.name}`}>Remove</button> : null}
        </div>
      ))}
      {canEdit ? <button type="button" className="btn outline sm" style={{ alignSelf: "flex-start" }} disabled={list.length >= 20} onClick={() => setList([...list, { name: "", short: "", match: ["new"] }])}>+ Add centre</button> : null}
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>Shown on the staff appointment form and as filters on Appointments. A saved appointment matches a centre when its text contains the keywords.</p>
      <Footer k="centres" pending={pending} dirty={dirty} run={run} flash={flash} canEdit={canEdit} updated={updated} />
    </form>
  )
}

export function PermissionsEditor({ initial, canEdit, demo, updated }: { initial: Matrix; canEdit: boolean; demo: boolean; updated?: string }) {
  const [m, setM] = useState(initial)
  const { pending, run, flash } = useSave(demo)
  const dirty = JSON.stringify(m) !== JSON.stringify(initial)
  const roles = ["specialist", "support", "finance"] as const
  const toggle = (r: (typeof roles)[number], p: Permission) => setM({ ...m, [r]: m[r].includes(p) ? m[r].filter((x) => x !== p) : [...m[r], p] })
  return (
    <form className="stack" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); run(() => saveSetting("permissions", m)) }}>
      <div className="tbl">
        <div className="tbl-h perm"><span>Permission</span><span>Admin</span>{roles.map((r) => <span key={r}>{ROLE_LABEL[r]}</span>)}</div>
        {PERMISSIONS.map((p) => {
          const locked = !GRANTABLE.includes(p.id) || p.id === "view"
          return (
            <div key={p.id} className="tbl-r perm">
              <span style={{ display: "flex", flexDirection: "column" }}>{p.label}<span className="muted" style={{ fontSize: 11 }}>{p.hint}{p.id === "view" ? " · every role" : !GRANTABLE.includes(p.id) ? " · admin only" : ""}</span></span>
              <span data-l="Admin"><span className="switch" data-on="true" role="img" aria-label="Admin: always" style={{ opacity: 0.55 }} /></span>
              {roles.map((r) => {
                const on = m[r].includes(p.id)
                return (
                  <span key={r} data-l={ROLE_LABEL[r]}>
                    <button type="button" className="switch" data-on={on ? "true" : undefined} role="switch" aria-checked={on} aria-label={`${ROLE_LABEL[r]}: ${p.label}`} disabled={!canEdit || locked || pending} onClick={() => toggle(r, p.id)} />
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>Applies on everyone&rsquo;s next page load. Granting a permission also opens its board (for example View payments shows Payments). Admin always has everything; Team and Settings stay admin only.</p>
      <Footer k="permissions" pending={pending} dirty={dirty} run={run} flash={flash} canEdit={canEdit} updated={updated} />
    </form>
  )
}
