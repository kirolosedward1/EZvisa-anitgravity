// Team board: members and roles, the permission matrix, how cases are assigned and the SLA targets in force.
import { AddMember, MemberControls } from "@/components/staff/team-controls"
import { ErrorBanner, PermissionDenied } from "@/components/staff/states"
import { serviceClient } from "@/lib/applications"
import { isOpen, isOver } from "@/lib/staff/cases"
import { loadConsoleData } from "@/lib/staff/data"
import { DEMO_STAFF } from "@/lib/staff/demo"
import { sectionAccess } from "@/lib/staff/guard"
import { agoLabel } from "@/lib/staff/queue"
import { can, currentMatrix, ROLE_LABEL, isRole } from "@/lib/staff/roles"
import { PermissionsEditor } from "@/components/staff/settings-editors"
import { initials, isStaffEmail, missingTable, staffEmails } from "@/lib/staff/session"

export const dynamic = "force-dynamic"
type Member = { id: string; name: string; email: string; role: string; active: boolean; last_seen_at: string | null }

export default async function TeamPage() {
  const { staff, allowed } = await sectionAccess("team")
  if (!allowed) return <PermissionDenied what="Team and roles are admin only" role={staff.role} who="Ask an admin to change roles." />
  const { cases, settings } = await loadConsoleData(staff)
  const SLA = settings.sla
  const now = Date.now()
  let members: Member[] = []
  let problem: string | null = null
  if (staff.demo) members = DEMO_STAFF.map((m) => ({ ...m, active: true, last_seen_at: new Date(now - 3_600_000).toISOString() }))
  else {
    const client = serviceClient()
    const res = client ? await client.from("staff_users").select("id, name, email, role, active, last_seen_at").order("name") : null
    if (res?.error) problem = missingTable(res.error) ? "Migration 005 is not applied, so only the ADMIN_EMAILS admins exist." : "The team could not be read."
    else members = (res?.data ?? []) as Member[]
  }
  const envOnly = [...staffEmails()].filter((e) => !members.some((m) => m.email.toLowerCase() === e))

  return (
    <>
      {problem ? <ErrorBanner title="Team" body={problem} /> : null}
      <div className="ezc-pagehead" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <h1>Team</h1>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>{members.filter((m) => m.active).length + envOnly.length} members · 4 roles · staff sign in with Google or an email link; 2-step is set on their own account</p>
        </div>
        {!problem ? <AddMember demo={staff.demo} /> : null}
      </div>
      <section className="card" aria-label="Members" style={{ overflow: "visible" }}>
        <div className="tbl" style={{ border: 0 }}>
          <div className="tbl-h team"><span>Member</span><span>Role</span><span>Open cases</span><span>Past SLA</span><span>Last active</span><span /></div>
          {envOnly.map((e) => (
            <div key={e} className="tbl-r team"><span style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}><span className="av">{initials(e)}</span><span className="ellipsis">{e}</span></span><span><span className="pill xs blue">Admin</span></span><span>–</span><span>–</span><span className="muted">–</span><span className="muted" style={{ fontSize: 12 }}>From ADMIN_EMAILS</span></div>
          ))}
          {members.map((m) => {
            const open = cases.filter((c) => isOpen(c) && c.ownerId === m.id)
            const over = open.filter((c) => isOver(c, now)).length
            return (
              <div key={m.id} className="tbl-r team" style={{ opacity: m.active ? 1 : 0.55 }}>
                <span style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}><span className="av">{initials(m.name)}</span><span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><b className="ellipsis" style={{ fontWeight: 500 }}>{m.name}</b><a className="muted ellipsis" style={{ fontSize: 12 }} href={`mailto:${m.email}`}>{m.email}</a>{m.active ? null : <span className="muted" style={{ fontSize: 12 }}>Deactivated</span>}</span></span>
                <span><span className="pill xs grey">{isStaffEmail(m.email) ? "Admin" : isRole(m.role) ? ROLE_LABEL[m.role] : m.role}</span></span>
                <span>{m.role === "specialist" || open.length ? <a href={`/staff/cases?owner=${m.id}`} title={`${m.name}: open cases`}>{open.length}</a> : "–"}</span>
                <span>{open.length ? <a href={`/staff/cases?owner=${m.id}&tab=sla`} style={{ color: over ? "#8a1c1c" : undefined }} title={`${m.name}: cases past SLA`}>{over}</a> : "–"}</span>
                <span className="muted">{m.last_seen_at ? agoLabel(m.last_seen_at, now) : "Never"}</span>
                <MemberControls id={m.id} name={m.name} role={m.role} active={m.active} self={m.id === staff.staffId} envAdmin={isStaffEmail(m.email)} demo={staff.demo} />
              </div>
            )
          })}
        </div>
      </section>
      <div className="grid2">
        <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="pm-h">
          <div><h2 id="pm-h">Permissions by role</h2><p className="muted" style={{ margin: 0, fontSize: 12 }}>What each role can do. Changes are logged in the audit.</p></div>
          <PermissionsEditor initial={currentMatrix()} canEdit={can(staff.role, "settings")} demo={staff.demo} updated={settings.updated.permissions} />
        </section>
        <aside className="stack">
          <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }} aria-labelledby="aa-h">
            <h2 id="aa-h">Assignment</h2>
            <p style={{ margin: 0, fontSize: 13 }}>New cases created by staff go to the active specialist with the fewest open cases unless an owner is picked. Paid website cases are assigned from the queue (admins) or taken by a specialist with &ldquo;Assign to me&rdquo;.</p>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>Automatic assignment on payment is {settings.autoAssign.on ? `on${settings.autoAssign.cap ? `, capped at ${settings.autoAssign.cap} open cases per specialist` : ", no cap"}` : "off"}. Away days are not built yet.</p>
            {can(staff.role, "settings") ? <a href="/staff/settings?sec=sla" style={{ fontSize: 13 }}>Change in Settings</a> : null}
          </section>
          <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }} aria-labelledby="sla-h">
            <h2 id="sla-h">SLA targets</h2>
            <dl className="kv"><dt>First document check</dt><dd>{SLA.reviewHours}h after the upload</dd><dt>File prepared</dt><dd>{SLA.fileBusinessDays} business days after the last approval (Mon to Fri, Dubai)</dd><dt>Appointment help</dt><dd>{SLA.helpHours}h after the request</dd></dl>
            {can(staff.role, "settings") ? <a href="/staff/settings?sec=sla" style={{ fontSize: 13 }}>Change in Settings</a> : null}
          </section>
        </aside>
      </div>
    </>
  )
}
