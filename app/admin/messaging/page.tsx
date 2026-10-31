// Messaging board (and the Support desk for the Support role). WhatsApp Business is not connected: there is no
// inbox of incoming messages. "Waiting on us" lists the customers to reply to, with quick replies that open WhatsApp
// with the message written; Broadcast builds an audience with a live count; App push shows registered devices.
import { Broadcast, type Recipient } from "@/components/staff/broadcast"
import { PermissionDenied } from "@/components/staff/states"
import { serviceClient } from "@/lib/applications"
import { customerDocuments } from "@/lib/dashboard-state"
import { parseNotes } from "@/lib/shared/wizard-contract"
import { byUrgency, docTitle, isOpen, isOver, OPEN_STAGES, STAGE } from "@/lib/staff/cases"
import { loadConsoleData } from "@/lib/staff/data"
import { sectionAccess } from "@/lib/staff/guard"
import { agoLabel } from "@/lib/staff/queue"
import { slaLabel } from "@/lib/staff/sla"
import { fillTemplate, TEMPLATES, waUrl, type TemplateKey } from "@/lib/staff/templates"
import { initials } from "@/lib/staff/session"

export const dynamic = "force-dynamic"
const TABS = [{ key: "inbox", label: "Waiting on us" }, { key: "customer", label: "Waiting on customers" }, { key: "broadcast", label: "Broadcast" }, { key: "push", label: "App push" }] as const
const QUICK: TemplateKey[] = ["status", "documents", "appointment", "greeting"]

export default async function MessagingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { staff, allowed } = await sectionAccess("messaging")
  if (!allowed) return <PermissionDenied what="Messaging is not part of your role" role={staff.role} who="Specialists, Support and admins message customers." />
  const sp = await searchParams
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "inbox"
  const { cases, apps, reviews } = await loadConsoleData(staff)
  const now = Date.now()
  const appById = new Map(apps.map((a) => [a.id ?? "", a]))
  const support = staff.role === "support"

  const info = (id: string) => {
    const app = appById.get(id)
    const notes = parseNotes(app?.additional_notes) as Record<string, unknown> & { wizard?: Record<string, unknown> }
    const lang = notes.preferredLanguage === "ar" ? "ar" : "en"
    const optIn = notes.wizard?.whatsappOptIn !== false
    const missing = app ? customerDocuments(app, reviews[id] ?? {}).rows.filter((r) => r.state === "missing" || r.state === "rejected").map((r) => docTitle(r.document_type).toLowerCase()).join(", ") : ""
    return { lang: lang as "en" | "ar", optIn, missing }
  }
  const list = cases.filter((c) => isOpen(c) && (tab === "customer" ? c.side === "customer" : c.side === "us")).sort(byUrgency(now)).slice(0, 60)
  const tomorrow = cases.filter((c) => c.appointmentAt && Date.parse(c.appointmentAt) > now && Date.parse(c.appointmentAt) < now + 2 * 86_400_000)

  let devices: number | null = null
  if (tab === "push" && !staff.demo) {
    const client = serviceClient()
    const res = client ? await client.from("device_tokens").select("*", { count: "exact", head: true }) : null
    devices = res && !res.error ? res.count ?? 0 : null
  }
  const recipients: Recipient[] = tab === "broadcast"
    ? cases.filter((c) => isOpen(c) && c.phone).flatMap((c) => {
        const i = info(c.id)
        return i.optIn ? [{ phone: c.phone, first: c.name.split(" ")[0], lang: i.lang, stage: c.stage, stageLabel: STAGE[c.stage].label, country: c.country, missing: i.missing, ref: c.ref }] : []
      })
    : []

  return (
    <>
      <div>
        <h1>{support ? "Support desk" : "Messaging"}</h1>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          {support ? `Signed in as ${staff.name}, Support. Customers, appointments and messages; no document decisions or money.` : "WhatsApp Business is not connected yet: replies open WhatsApp with the message written."}
        </p>
      </div>
      {support ? (
        <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div className="card kpi"><span className="v">{cases.filter((c) => isOpen(c) && c.side === "us").length}</span><span className="l">Customers waiting on us</span></div>
          <div className="card kpi"><span className="v">{cases.filter((c) => isOpen(c) && c.task === "help").length}</span><span className="l">Appointment help requests</span></div>
          <div className="card kpi"><span className="v">{tomorrow.length}</span><span className="l">Appointments in the next 48 hours</span></div>
          <div className="card kpi"><span className="v">{cases.filter((c) => isOpen(c) && c.side === "customer").length}</span><span className="l">Waiting on customers</span></div>
        </div>
      ) : null}
      <nav className="utabs" aria-label="Messaging">
        {TABS.map((t) => <a key={t.key} className="tab" href={`/staff/messaging?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}>{t.label}</a>)}
      </nav>

      {tab === "inbox" || tab === "customer" ? (
        <section className="card" aria-label="Customers" style={{ overflow: "hidden" }}>
          {list.length === 0 ? <div className="empty">Nobody is waiting here.</div> : null}
          {list.map((c) => {
            const i = info(c.id)
            const vars = { first_name: c.name.split(" ")[0], reference: c.ref, stage: STAGE[c.stage].label.toLowerCase(), destination: c.country, missing_documents: i.missing || "the remaining documents", dashboard_link: "https://www.ezvisa.net/dashboard" }
            return (
              <div key={c.id} className="thread">
                <span className="av" aria-hidden="true">{initials(c.name)}</span>
                <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <a href={`/staff/cases/${c.id}`} style={{ fontWeight: 500, color: "#102347" }}>{c.name}</a>
                    <span className="muted" style={{ fontSize: 12 }}>{c.ref} · {STAGE[c.stage].label}{i.lang === "ar" ? " · Arabic" : ""}</span>
                    {c.side === "us" && c.dueAt ? <span className={`pill xs ${isOver(c, now) ? "red" : "amber"}`}>{slaLabel(c.dueAt, now).text}</span> : <span className="pill xs grey">{agoLabel(c.updatedAt, now)}</span>}
                  </div>
                  <span style={{ fontSize: 13 }}>{c.what}</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {QUICK.map((k) => {
                      const url = i.optIn ? waUrl(c.phone, fillTemplate(k === "greeting" || i.lang === "ar" ? TEMPLATES[k].ar : TEMPLATES[k].en, vars)) : null
                      return url ? <a key={k} className="btn outline sm" style={{ height: 28 }} href={url} target="_blank" rel="noopener noreferrer">{TEMPLATES[k].label}</a> : null
                    })}
                    {!i.optIn ? <span className="muted" style={{ fontSize: 12 }}>Opted out of WhatsApp; use email.</span> : null}
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      ) : null}

      {tab === "broadcast" ? (
        <Broadcast recipients={recipients} stages={OPEN_STAGES.map((s) => ({ key: s, label: STAGE[s].label }))} countries={[...new Set(recipients.map((r) => r.country))].sort()} />
      ) : null}

      {tab === "push" ? (
        <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }} aria-labelledby="push-h">
          <h2 id="push-h">App push</h2>
          <p style={{ margin: 0, fontSize: 14 }}>{devices === null ? (staff.demo ? "The demo has no app devices." : "Registered devices could not be counted.") : `${devices} app ${devices === 1 ? "device is" : "devices are"} registered for notifications.`}</p>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Sending pushes from the console, delivery and open rates, and event-based pushes are not built yet. Status pushes the app already sends are unchanged.</p>
        </section>
      ) : null}
    </>
  )
}
