// Appointments board: the week's appointments by day (centre filter, previous and next week), customers who asked us
// to book (with an inline "Book and save"), and ready files with no appointment saved yet.
import { ChevronLeft, ChevronRight } from "lucide-react"
import { BookAndSave } from "@/components/staff/appointment-booking"
import { CountryFlag } from "@/components/country-flag"
import { PermissionDenied } from "@/components/staff/states"
import { SCHENGEN_META } from "@/lib/countries"
import { isOpen } from "@/lib/staff/cases"
import { CENTRES, centreMatches, centreTone } from "@/lib/staff/centres"
import { loadConsoleData } from "@/lib/staff/data"
import { sectionAccess } from "@/lib/staff/guard"
import { agoLabel } from "@/lib/staff/queue"
import { can } from "@/lib/staff/roles"
import { dubaiWeekStart, slaLabel } from "@/lib/staff/sla"
import { initials } from "@/lib/staff/session"

export const dynamic = "force-dynamic"
const DAY = 86_400_000
const fmt = (ms: number, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", ...o }).format(ms)

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ w?: string; centre?: string }> }) {
  const { staff, allowed } = await sectionAccess("appointments")
  if (!allowed) return <PermissionDenied what="Appointments are not part of your role" role={staff.role} who="Specialists, Support and admins save appointments." />
  const sp = await searchParams
  const offset = Math.max(-8, Math.min(12, Number.parseInt(sp.w ?? "0", 10) || 0))
  const centre = CENTRES.some((c) => c.short === sp.centre) ? sp.centre! : ""
  const { cases, team } = await loadConsoleData(staff)
  const now = Date.now()
  const start = dubaiWeekStart(now) + offset * 7 * DAY
  const end = start + 7 * DAY
  const matchesCentre = (c: string | null) => !centre || centreMatches(c, centre)
  const booked = cases.filter((c) => c.appointmentAt && c.stage !== "cancelled" && matchesCentre(c.appointmentCentre))
  const week = booked.filter((c) => Date.parse(c.appointmentAt!) >= start && Date.parse(c.appointmentAt!) < end).sort((a, b) => a.appointmentAt!.localeCompare(b.appointmentAt!))
  const help = cases.filter((c) => isOpen(c) && c.task === "help").sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
  const readyNoAppt = cases.filter((c) => isOpen(c) && c.stage === "ready" && !c.appointmentAt && !c.helpRequested).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
  const soon = booked.filter((c) => Date.parse(c.appointmentAt!) >= now && Date.parse(c.appointmentAt!) < now + 2 * DAY).length
  const nameOf = (id: string | null) => (id ? team.find((m) => m.id === id)?.name ?? "?" : null)
  const q = (o: Record<string, string | number>) => {
    const p = new URLSearchParams()
    const merged = { w: offset, centre, ...o }
    for (const [k, v] of Object.entries(merged)) if (v !== "" && v !== 0) p.set(k, String(v))
    const s = p.toString()
    return `/staff/appointments${s ? `?${s}` : ""}`
  }
  const todayKey = fmt(now, { year: "numeric", month: "2-digit", day: "2-digit" })

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h1 style={{ marginInlineEnd: 8 }}>Appointments</h1>
          <a className="btn outline sm" href={q({ w: offset - 1 })} aria-label="Previous week"><ChevronLeft size={16} aria-hidden /></a>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{fmt(start, fmt(start, { month: "long" }) === fmt(end - DAY, { month: "long" }) ? { day: "numeric" } : { day: "numeric", month: "short" })} to {fmt(end - DAY, { day: "numeric", month: "long", year: "numeric" })}</span>
          <a className="btn outline sm" href={q({ w: offset + 1 })} aria-label="Next week"><ChevronRight size={16} aria-hidden /></a>
          {offset !== 0 ? <a className="btn ghost sm" href={q({ w: 0 })}>This week</a> : null}
        </div>
        <nav className="seg" aria-label="Centre">
          <a className="tab" href={q({ centre: "" })} aria-current={!centre ? "page" : undefined}>All centres</a>
          {CENTRES.map((c) => <a key={c.short} className="tab" href={q({ centre: c.short })} aria-current={centre === c.short ? "page" : undefined}>{c.short}</a>)}
        </nav>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="card kpi"><span className="v">{week.length}</span><span className="l">Appointments this week</span></div>
        <div className="card kpi"><span className="v" style={{ color: "#7a4b00" }}>{help.length}</span><span className="l">Help requests, want us to book</span></div>
        <div className="card kpi"><span className="v">{readyNoAppt.length}</span><span className="l">Ready files with no appointment yet</span></div>
        <div className="card kpi"><span className="v">{soon}</span><span className="l">In the next 48 hours</span></div>
      </div>

      <section className="card" aria-label="Week" style={{ overflow: "hidden" }}>
        <div className="week">
          {Array.from({ length: 7 }, (_, i) => {
            const dayStart = start + i * DAY
            const items = week.filter((c) => Date.parse(c.appointmentAt!) >= dayStart && Date.parse(c.appointmentAt!) < dayStart + DAY)
            const isToday = fmt(dayStart, { year: "numeric", month: "2-digit", day: "2-digit" }) === todayKey
            return (
              <div key={i} className="day" data-today={isToday ? "true" : undefined}>
                <div className="day-h">{fmt(dayStart, { weekday: "short", day: "numeric" })}{isToday ? " · today" : ""}</div>
                {items.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: 12 }}>No appointments</p> : null}
                {items.map((c) => (
                  <a key={c.id} href={`/staff/cases/${c.id}`} className={`ev ${Date.parse(c.appointmentAt!) < now ? "done" : centreTone(c.appointmentCentre)}`}>
                    <b>{fmt(Date.parse(c.appointmentAt!), { hour: "2-digit", minute: "2-digit", hour12: false })} {c.name}</b>
                    <span>{c.appointmentCentre ?? "Centre not set"} · {c.country}</span>
                  </a>
                ))}
              </div>
            )
          })}
        </div>
        <div className="muted" style={{ display: "flex", gap: 14, padding: "10px 16px", fontSize: 12, borderTop: "1px solid #eef1f6", flexWrap: "wrap" }}>
          <span><i className="lg vfs" /> VFS</span><span><i className="lg tls" /> TLScontact</span><span><i className="lg other" /> Other centre</span><span><i className="lg done" /> Past</span>
        </div>
      </section>

      <div className="grid2" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
        <section className="card" aria-labelledby="help-h" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <h2 id="help-h">Customers who asked us to book · {help.length}</h2>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>From &ldquo;Help me book&rdquo; on the dashboard. Book on the centre&rsquo;s site, then save the slot here.</p>
          </div>
          {help.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>No open requests.</p> : null}
          {help.map((c) => {
            const sla = c.dueAt ? slaLabel(c.dueAt, now) : null
            const owner = nameOf(c.ownerId)
            return (
              <div key={c.id} className="appt-row">
                <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                  <CountryFlag iso={SCHENGEN_META[c.country]?.iso} title={c.country} className="size-6" />
                  <a href={`/staff/cases/${c.id}`} style={{ display: "flex", flexDirection: "column", minWidth: 0, color: "#102347" }}>
                    <b className="ellipsis" style={{ fontWeight: 500 }}>{c.name}</b>
                    <span className="muted ellipsis" style={{ fontSize: 12 }}>{c.country} · {c.appointmentCentre ?? "any centre"}</span>
                  </a>
                  {sla ? <span className={`pill xs ${sla.over ? "red" : "amber"}`}>{sla.over ? `Over SLA ${sla.text.replace(" over", "")}` : sla.text}</span> : null}
                  {owner ? <span className="av" title={owner}>{initials(owner)}</span> : <span className="av none" title="Unassigned">?</span>}
                </div>
                {can(staff.role, "appt") ? <BookAndSave caseId={c.id} defaultCentre={c.appointmentCentre} canAssignSelf={!c.ownerId && can(staff.role, "docs")} me={staff.staffId} demo={staff.demo} /> : null}
              </div>
            )
          })}
        </section>

        <section className="card" aria-labelledby="rna-h" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <h2 id="rna-h">File ready, no appointment saved · {readyNoAppt.length}</h2>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>Nudge them on WhatsApp; automatic nudges are not connected yet.</p>
          </div>
          {readyNoAppt.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>Every ready file has an appointment.</p> : null}
          {readyNoAppt.slice(0, 12).map((c) => {
            const digits = c.phone.replace(/\D/g, "")
            const text = `Hi ${c.name.split(" ")[0]}, your ${c.country} visa file (${c.ref}) is ready. Have you booked your visa centre appointment? Save it on your dashboard, or reply and we can help: https://www.ezvisa.net/dashboard`
            return (
              <div key={c.id} className="appt-row" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <a href={`/staff/cases/${c.id}`} style={{ display: "flex", flexDirection: "column", minWidth: 0, color: "#102347" }}>
                  <b className="ellipsis" style={{ fontWeight: 500 }}>{c.name}</b>
                  <span className="muted" style={{ fontSize: 12 }}>{c.country} · ready {agoLabel(c.updatedAt, now)}</span>
                </a>
                <div style={{ display: "flex", gap: 6 }}>
                  {digits.length >= 8 && can(staff.role, "msg") ? <a className="btn outline sm" href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">Nudge now</a> : null}
                  {digits.length >= 8 ? <a className="btn ghost sm" href={`tel:+${digits}`}>Call</a> : null}
                </div>
              </div>
            )
          })}
          {readyNoAppt.length > 12 ? <a href="/staff/cases?stage=ready" style={{ fontSize: 13 }}>See all {readyNoAppt.length}</a> : null}
        </section>
      </div>
    </>
  )
}
