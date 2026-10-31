// Messaging board (and the Support desk for the Support role). WhatsApp Business is not connected: there is no
// inbox of incoming messages. "Waiting on us" lists the customers to reply to, with quick replies that open WhatsApp
// with the message written; Broadcast builds an audience with a live count; App push shows registered devices.
import { Broadcast, type Recipient } from "@/components/staff/broadcast"
import { ReplyComposer } from "@/components/staff/reply-composer"
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
const TABS = [{ key: "inbox", label: "Inbox" }, { key: "customer", label: "Waiting on customers" }, { key: "broadcast", label: "Broadcast" }, { key: "push", label: "App push" }] as const
const QUICK: TemplateKey[] = ["status", "documents", "appointment", "greeting"]

export default async function MessagingPage({ searchParams }: { searchParams: Promise<{ tab?: string; c?: string }> }) {
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
      <div className="ezc-pagehead">
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

      {tab === "inbox" || tab === "customer" ? (() => {
        const sel = list.find((c) => c.id === sp.c) ?? list[0]
        const selInfo = sel ? info(sel.id) : null
        const vars = sel ? { first_name: sel.name.split(" ")[0], reference: sel.ref, stage: STAGE[sel.stage].label.toLowerCase(), destination: sel.country, missing_documents: selInfo?.missing || "the remaining documents", dashboard_link: "https://www.ezvisa.net/dashboard" } : null
        return (
          <div className="inbox">
            <section className="card inbox-list" aria-label="Conversations">
              {list.length === 0 ? <div className="empty">Nobody is waiting here.</div> : null}
              {list.map((c) => (
                <a key={c.id} href={`/staff/messaging?tab=${tab}&c=${c.id}`} className="conv" aria-current={sel?.id === c.id ? "true" : undefined}>
                  <span className="av" aria-hidden="true">{initials(c.name)}</span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, gap: 2 }}>
                    <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b className="ellipsis">{c.name}</b><span className="muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{agoLabel(c.since ?? c.updatedAt, now)}</span></span>
                    <span className="muted ellipsis" style={{ fontSize: 12 }}>{c.what}</span>
                    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {c.side === "us" && c.dueAt ? <span className={`pill xs ${isOver(c, now) ? "red" : "amber"}`}>{isOver(c, now) ? "Past SLA" : "Waiting"}</span> : <span className="pill xs grey">On customer</span>}
                      <span className="muted" style={{ fontSize: 11 }}>{c.ref}</span>
                    </span>
                  </span>
                </a>
              ))}
            </section>
            {sel && selInfo && vars ? (
              <section className="card inbox-thread" aria-label={`Conversation with ${sel.name}`}>
                <header className="thread-head">
                  <span className="av" aria-hidden="true">{initials(sel.name)}</span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <b style={{ fontWeight: 500 }}>{sel.name}</b>
                    <span className="muted" style={{ fontSize: 12 }}>{sel.phone || "No phone"} · <a href={`/staff/cases/${sel.id}`}>{sel.ref}</a> · {STAGE[sel.stage].label}{selInfo.lang === "ar" ? " · Arabic" : " · English"}</span>
                  </span>
                  <a className="btn outline sm" href={`/staff/cases/${sel.id}`}>Open case</a>
                </header>
                <div className="thread-body">
                  <div className="sysmsg">{sel.what}{sel.side === "us" && sel.dueAt ? ` · ${slaLabel(sel.dueAt, now).text}` : ""}</div>
                  <p className="muted" style={{ margin: "auto 0 0", fontSize: 12, textAlign: "center" }}>Message history is not stored here: WhatsApp Business is not connected yet.</p>
                </div>
                {selInfo.optIn ? (
                  <ReplyComposer phone={sel.phone} quick={QUICK.map((k) => ({ label: TEMPLATES[k].label, text: fillTemplate(k === "greeting" || selInfo.lang === "ar" ? TEMPLATES[k].ar : TEMPLATES[k].en, vars) }))} />
                ) : (
                  <p className="muted" style={{ padding: "12px 16px", margin: 0, fontSize: 13 }}>This customer switched WhatsApp messages off in their application. Use email: {sel.email}</p>
                )}
              </section>
            ) : null}
          </div>
        )
      })() : null}

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
