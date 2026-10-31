// Settings board: what the website, the app and the console run on today. Values come from the shared contract and
// the console's code, so this page shows the truth; editing them here (versioned) is not built yet. Integration
// status shows only whether something is configured, never a value.
import { CountryFlag } from "@/components/country-flag"
import { PermissionDenied } from "@/components/staff/states"
import { SCHENGEN_META } from "@/lib/countries"
import { EMPLOYMENT, PRICE_AED, REQUIREMENTS, requiredFlags, DOC_FLAG, SCHENGEN, SPOUSE_MULTIPLIER } from "@/lib/shared/wizard-contract"
import { CENTRES } from "@/lib/staff/centres"
import { sectionAccess } from "@/lib/staff/guard"
import { TEMPLATES, type TemplateKey } from "@/lib/staff/templates"

export const dynamic = "force-dynamic"
const SECTIONS = [
  { key: "destinations", label: "Destinations and requirements" },
  { key: "pricing", label: "Pricing and refunds" },
  { key: "templates", label: "Message templates" },
  { key: "automations", label: "Automations" },
  { key: "centres", label: "Visa centres" },
  { key: "integrations", label: "Integrations" },
] as const

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ sec?: string; lang?: string }> }) {
  const { staff, allowed } = await sectionAccess("settings")
  if (!allowed) return <PermissionDenied what="Settings are admin only" role={staff.role} who="Ask an admin." />
  const sp = await searchParams
  const sec = SECTIONS.find((s) => s.key === sp.sec)?.key ?? "destinations"
  const lang = sp.lang === "ar" ? "ar" : "en"
  const set = (k: string) => !!process.env[k]
  const integrations = [
    { name: "Payment gateway", desc: "Checkout and payment status", status: set("ZIINA_API_KEY") ? (process.env.ZIINA_TEST_MODE === "true" ? "Connected, test mode" : "Connected") : "Not configured", tone: set("ZIINA_API_KEY") ? "green" : "amber" },
    { name: "Database and sign-in", desc: "Cases, accounts, files", status: set("SUPABASE_SERVICE_ROLE_KEY") || set("SUPABASE_SECRET_KEY") ? "Connected" : "Not configured", tone: set("SUPABASE_SERVICE_ROLE_KEY") || set("SUPABASE_SECRET_KEY") ? "green" : "red" },
    { name: "Email sending", desc: "Confirmations, resets, digests", status: set("RESEND_API_KEY") ? "Key set, last reported not working" : "Not configured", tone: "amber" },
    { name: "WhatsApp Business", desc: "Inbox, templates, broadcasts", status: "Not connected", tone: "grey" },
    { name: "Insurance partner", desc: "Rate card and policy issuing", status: "Not connected", tone: "grey" },
    { name: "Google Analytics and Ads", desc: "Visits, campaigns, cost per paid", status: "Not connected to the console", tone: "grey" },
  ]
  const automations = [
    { name: "Documents reminder, day 3 and day 7", rule: "Paid, nothing uploaded · WhatsApp" },
    { name: "Unpaid draft, day 2", rule: "Draft not paid after 2 days · email with pay link" },
    { name: "Ready, no appointment", rule: "File ready, no appointment after 3 days · WhatsApp" },
    { name: "Appointment reminders, 48h and 2h", rule: "Appointment saved · WhatsApp with checklist" },
    { name: "Post appointment thank you", rule: "Day after the appointment · WhatsApp, closes the case" },
    { name: "SLA warning to the team", rule: "2h before the deadline · owner, then admin" },
    { name: "Review request", rule: "7 days after the appointment · WhatsApp with a review link" },
  ]

  return (
    <>
      <div>
        <h1>Settings</h1>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Shared with the website and the app through the wizard contract. Shown read only: changing them is a code change for now, so nothing drifts between web and app.</p>
      </div>
      <div className="settings">
        <nav className="card" aria-label="Settings sections" style={{ padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
          {SECTIONS.map((s) => <a key={s.key} className="qbtn" href={`/staff/settings?sec=${s.key}`} aria-current={sec === s.key ? "true" : undefined}>{s.label}</a>)}
        </nav>
        <div className="stack">
          {sec === "destinations" ? (
            <>
              <section className="card" style={{ padding: "16px 18px" }} aria-labelledby="d-h">
                <h2 id="d-h" style={{ marginBottom: 10 }}>Destinations · {SCHENGEN.length}</h2>
                <div className="dest-grid">{SCHENGEN.map((c) => <span key={c} className="dest"><CountryFlag iso={SCHENGEN_META[c]?.iso} title={c} className="size-5" />{c}</span>)}</div>
              </section>
              <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="r-h">
                <h2 id="r-h">Documents the customer uploads, by employment</h2>
                <div className="tbl"><div className="tbl-h" style={{ gridTemplateColumns: `minmax(0,2fr) repeat(${EMPLOYMENT.length}, 0.7fr)` }}><span>Document</span>{EMPLOYMENT.map((e) => <span key={e.value}>{e.label}</span>)}</div>
                  {REQUIREMENTS.filter((r) => !r.provided_by_ezvisa).map((r) => (
                    <div key={r.id} className="tbl-r" style={{ gridTemplateColumns: `minmax(0,2fr) repeat(${EMPLOYMENT.length}, 0.7fr)` }}>
                      <span style={{ display: "flex", flexDirection: "column" }}>{r.title}{r.description ? <span className="muted" style={{ fontSize: 11 }}>{r.description}</span> : null}</span>
                      {EMPLOYMENT.map((e) => <span key={e.value}>{requiredFlags(e.value).includes(DOC_FLAG[r.document_type]) ? <span className="pill xs green">Yes</span> : <span className="muted">–</span>}</span>)}
                    </div>
                  ))}
                </div>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>Prepared by EZvisa for everyone: cover letter, itinerary, bookings and checklist (File preparation).</p>
              </section>
            </>
          ) : null}
          {sec === "pricing" ? (
            <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="p-h">
              <h2 id="p-h">Service fee and refunds</h2>
              <dl className="kv">
                <dt>Service fee</dt><dd>{PRICE_AED} AED per traveller (shared contract, charged only by the server)</dd>
                <dt>Spouse on the same application</dt><dd>×{SPOUSE_MULTIPLIER}</dd>
                <dt>Children, rush, promo codes</dt><dd>None</dd>
              </dl>
              <h3>Refund policy (used by the refund modal)</h3>
              <dl className="kv">
                <dt>Before any document is reviewed</dt><dd>Full refund</dd>
                <dt>After review, before the file is ready</dt><dd>50 percent</dd>
                <dt>After the file is ready</dt><dd>No refund, goodwill only</dd>
                <dt>Duplicate charge</dt><dd>Always in full</dd>
              </dl>
            </section>
          ) : null}
          {sec === "templates" ? (
            <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="t-h">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <h2 id="t-h">Message templates</h2>
                <nav className="seg" aria-label="Language"><a className="tab" href="/staff/settings?sec=templates" aria-current={lang === "en" ? "page" : undefined}>English</a><a className="tab" href="/staff/settings?sec=templates&lang=ar" aria-current={lang === "ar" ? "page" : undefined}>Arabic</a></nav>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>Used for quick replies and broadcasts; variables fill from the case. They open WhatsApp with the text (WhatsApp Business templates and approval are not connected).</p>
              {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => (
                <div key={k} className="appt-row">
                  <b style={{ fontWeight: 500 }}>{TEMPLATES[k].label}{TEMPLATES[k].broadcast ? <span className="pill xs blue" style={{ marginInlineStart: 8 }}>Broadcast</span> : null}</b>
                  <p dir={lang === "ar" ? "rtl" : "ltr"} style={{ margin: 0, fontSize: 13, whiteSpace: "pre-wrap" }}>{TEMPLATES[k][lang]}</p>
                </div>
              ))}
            </section>
          ) : null}
          {sec === "automations" ? (
            <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="a-h">
              <h2 id="a-h">Automations</h2>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>None of these run yet: they need WhatsApp Business or a working email service, and a scheduler. Until then the console lists who to nudge (Appointments, Messaging).</p>
              {automations.map((a) => <div key={a.name} className="appt-row" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}><span style={{ display: "flex", flexDirection: "column" }}><b style={{ fontWeight: 500 }}>{a.name}</b><span className="muted" style={{ fontSize: 12 }}>{a.rule}</span></span><span className="pill xs grey">Not running</span></div>)}
            </section>
          ) : null}
          {sec === "centres" ? (
            <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="c-h">
              <h2 id="c-h">Visa centres on the staff appointment form</h2>
              {CENTRES.map((c) => <div key={c.name} className="appt-row" style={{ flexDirection: "row", justifyContent: "space-between" }}><b style={{ fontWeight: 500 }}>{c.name}</b><span className="muted" style={{ fontSize: 12 }}>{c.short}</span></div>)}
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>Customers type their own centre when they save an appointment; check addresses and hours on the centre&rsquo;s site.</p>
            </section>
          ) : null}
          {sec === "integrations" ? (
            <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="i-h">
              <h2 id="i-h">Integrations</h2>
              {integrations.map((i) => <div key={i.name} className="appt-row" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}><span style={{ display: "flex", flexDirection: "column" }}><b style={{ fontWeight: 500 }}>{i.name}</b><span className="muted" style={{ fontSize: 12 }}>{i.desc}</span></span><span className={`pill xs ${i.tone}`}>{i.status}</span></div>)}
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>Shows only whether a service is configured on this deployment. Credentials are managed in Vercel and never shown here.</p>
            </section>
          ) : null}
        </div>
      </div>
    </>
  )
}
