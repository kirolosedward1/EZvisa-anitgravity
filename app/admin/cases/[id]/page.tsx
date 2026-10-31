// Case board: one case with its stage bar, owner, explicit stage change, tabs (Overview, Documents with the shared
// DocumentReview, Application details, Payments, Activity) and the customer card, internal notes and quick actions.
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { CountryFlag } from "@/components/country-flag"
import { CaseControls, CaseNotes } from "@/components/staff/case-controls"
import { CaseDocuments } from "@/components/staff/document-review"
import { RefundButton } from "@/components/staff/refunds"
import { EditApplication } from "@/components/staff/edit-application"
import { editableAnswers } from "@/lib/staff/editable"
import { refundPolicy } from "@/lib/staff/refunds"
import { ErrorBanner } from "@/components/staff/states"
import { SCHENGEN_META } from "@/lib/countries"
import { applicationInsurance } from "@/lib/insurance"
import { EMPLOYMENT, FUNDING, MARITAL, PURPOSES, label, type WizardAnswers } from "@/lib/shared/wizard-contract"
import { loadCaseDetail } from "@/lib/staff/case-detail"
import { docTitle, isOver, STAGE } from "@/lib/staff/cases"
import { sectionAccess } from "@/lib/staff/guard"
import { agoLabel, travelLabel } from "@/lib/staff/queue"
import { can } from "@/lib/staff/roles"
import { slaLabel } from "@/lib/staff/sla"
import { initials } from "@/lib/staff/session"

export const dynamic = "force-dynamic"

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "documents", label: "Documents" },
  { key: "details", label: "Application details" },
  { key: "payments", label: "Payments" },
  { key: "activity", label: "Activity" },
] as const
type Tab = (typeof TABS)[number]["key"]

const BAR = ["payment", "documents", "review", "preparation", "ready", "appointment"] as const
const BAR_LABEL: Record<(typeof BAR)[number], string> = { payment: "Payment due", documents: "Documents", review: "Expert review", preparation: "Preparation", ready: "Ready", appointment: "Appointment" }
const dt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "")
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", year: "numeric" }) : "")
const dash = (v: unknown) => (typeof v === "string" && v.trim() ? v : "Not given")

const EVENT_TEXT: Record<string, (p: Record<string, unknown>) => string> = {
  payment_received: (p) => `Payment received${typeof p.amount === "number" ? `, ${p.amount} AED` : ""}`,
  payment_failed: () => "Payment failed",
  document_uploaded: (p) => `${docTitle(String(p.document_type ?? ""))} uploaded`,
  document_reviewed: (p) => `${docTitle(String(p.document_type ?? ""))} ${p.status === "approved" ? "approved" : p.status === "rejected" ? "sent back" : "reviewed"}`,
  status_changed: (p) => `Stage changed to ${String(p.to ?? "").replace(/_/g, " ")}`,
  specialist_assigned: (p) => `Specialist ${String(p.name ?? "")} assigned`,
  file_downloaded: () => "Prepared file downloaded",
  appointment_saved: (p) => `Appointment saved${p.centre ? ` at ${p.centre}` : ""}`,
  insurance_preference: (p) => (p.preference === "quote" ? "Asked for an insurance quote" : "Will provide own insurance"),
}

export default async function CasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; view?: string }> }) {
  const { staff } = await sectionAccess("cases")
  const { id } = await params
  const sp = await searchParams
  const detail = await loadCaseDetail(staff, id)
  if (!detail) notFound()
  const { app, notes, c, docs, events, audit, caseNotes, others, team, hasPreparedFile, problem } = detail
  const tab: Tab = (TABS.find((t) => t.key === sp.tab)?.key ?? "overview") as Tab
  const now = Date.now()
  const w = (notes.wizard ?? {}) as Partial<WizardAnswers>
  const stage = STAGE[c.stage]
  const stepIndex = BAR.indexOf(c.stage as (typeof BAR)[number])
  const toCheck = docs.filter((d) => d.state === "received" || d.state === "checking").length
  const sentBack = docs.filter((d) => d.state === "rejected").length
  const approved = docs.filter((d) => d.state === "approved").length
  const ownerName = c.ownerId ? team.find((m) => m.id === c.ownerId)?.name ?? "Former staff" : null
  const phoneDigits = c.phone.replace(/\D/g, "")
  const waLink = phoneDigits.length >= 8 ? `https://wa.me/${phoneDigits}` : null
  const trackingUrl = c.trackingToken ? `https://www.ezvisa.net/track/${c.trackingToken}` : null
  const insurance = applicationInsurance(app.additional_notes)
  const staffEntered = notes.enteredByStaff as { name?: string; channel?: string; at?: string } | undefined
  const source = staffEntered
    ? `Entered by ${staffEntered.name ?? "staff"} (${String(staffEntered.channel ?? "").replace("_", " ")})`
    : [notes.source === "mobile-app" ? "Mobile app" : "Website", notes.platform, app.referrer ? `from ${app.referrer}` : ""].filter(Boolean).join(" · ")
  const href = (t: Tab, extra = "") => `/staff/cases/${c.id}${t === "overview" ? "" : `?tab=${t}`}${extra}`

  // Activity: what the customer sees (application_events) and what only staff see (audit log).
  const view = sp.view === "customer" || sp.view === "internal" ? sp.view : "all"
  const timeline = [
    ...events.map((e, i) => ({ id: `e${i}`, at: e.created_at, text: EVENT_TEXT[e.kind]?.(e.payload) ?? e.kind, by: "Customer timeline", visible: true, tone: e.kind === "payment_failed" || (e.kind === "document_reviewed" && e.payload.status === "rejected") ? "red" : e.kind === "payment_received" || (e.kind === "document_reviewed" && e.payload.status === "approved") ? "green" : "blue" })),
    ...audit.map((a) => ({ id: `a${a.id}`, at: a.at, text: a.action, by: a.actor, visible: false, tone: a.type === "document" ? "amber" : "grey" })),
  ]
    .filter((t) => view === "all" || (view === "customer" ? t.visible : !t.visible))
    .sort((a, b) => b.at.localeCompare(a.at))

  return (
    <>
      {problem ? <ErrorBanner title="Part of this case did not load." body={`${problem} The rest is shown.`} /> : null}

      <div className="case-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <a href="/staff/cases" className="muted" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}><ArrowLeft size={14} aria-hidden /> Cases</a>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <CountryFlag iso={SCHENGEN_META[c.country]?.iso} title={c.country} className="size-7" />
            <h1 className="ellipsis">{c.name} · {c.country}</h1>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {c.ref} · Schengen {label(PURPOSES, app.travel_purpose ?? "tourism").toLowerCase()} visa · {c.travellers === 1 ? "1 traveller" : `${c.travellers} travellers`} · created {day(c.createdAt)}
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className={`pill ${stage.tone}`}><span className="dot" />{stage.label}</span>
            {c.dueAt && c.side === "us" ? (
              <span className={`pill ${isOver(c, now) ? "red" : "amber"}`}>{slaLabel(c.dueAt, now).text} SLA</span>
            ) : null}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <CaseControls
            caseId={c.id}
            status={(app.application_status ?? "").toLowerCase()}
            ownerId={c.ownerId}
            owners={team.filter((m) => m.active && m.role !== "finance").map((m) => ({ id: m.id, name: m.name }))}
            waLink={waLink}
            trackingUrl={trackingUrl}
            perms={{ assign: can(staff.role, "assign"), stage: can(staff.role, "stage"), msg: can(staff.role, "msg"), selfAssign: can(staff.role, "docs") }}
            hasPreparedFile={hasPreparedFile}
            me={staff.staffId}
          />
        </div>
      </div>

      <ol className="stagebar" aria-label="Stage">
        {BAR.map((s, i) => (
          <li key={s} data-state={stepIndex < 0 ? "next" : i < stepIndex ? "done" : i === stepIndex ? "current" : "next"} aria-current={i === stepIndex ? "step" : undefined}>
            {BAR_LABEL[s]}
          </li>
        ))}
      </ol>

      <nav className="utabs" aria-label="Case sections">
        {TABS.map((t) => (
          <a key={t.key} className="tab" href={href(t.key)} aria-current={tab === t.key ? "page" : undefined}>
            {t.label}
            {t.key === "documents" && toCheck + sentBack > 0 ? <span className="pill xs amber">{toCheck + sentBack}</span> : null}
          </a>
        ))}
        <a className="tab" href="/staff/files">File</a>
      </nav>

      <div className="grid2">
        <div className="stack">
          {tab === "overview" ? (
            <>
              <div className="tiles">
                <div className="card tile">
                  <span className="muted">Waiting for</span>
                  <b>{c.side === "us" ? "Us: " : c.side === "customer" || c.side === "draft" ? "Customer: " : ""}{c.what}</b>
                  {c.dueAt && c.side === "us" ? <span className={`pill ${isOver(c, now) ? "red" : "amber"}`}>{isOver(c, now) ? "SLA passed" : "Due"} {dt(c.dueAt)}</span> : null}
                </div>
                <div className="card tile">
                  <span className="muted">Documents</span>
                  <b>{approved} approved · {toCheck} checking · {sentBack} to redo</b>
                  <a href={href("documents")} style={{ fontSize: 13 }}>Review now</a>
                </div>
                <div className="card tile">
                  <span className="muted">Travel</span>
                  <b>{w.datesFlexible === "yes" ? `${travelLabel(c.travelStart, c.travelEnd)}, flexible` : travelLabel(c.travelStart, c.travelEnd)}</b>
                  <span className="muted" style={{ fontSize: 12 }}>Nationality {dash(app.nationality)} · UAE resident</span>
                </div>
                <div className="card tile">
                  <span className="muted">Appointment</span>
                  <b>{c.appointmentAt ? `${dt(c.appointmentAt)}${c.appointmentCentre ? `, ${c.appointmentCentre}` : ""}` : c.helpRequested ? "Customer asked us to book" : "Not booked yet"}</b>
                  {can(staff.role, "appt") ? <a href="/staff/appointments" style={{ fontSize: 13 }}>{c.appointmentAt ? "Open appointments" : "Book for the customer"}</a> : null}
                </div>
              </div>
              <section className="card" style={{ padding: "16px 18px" }} aria-labelledby="app-h">
                <h2 id="app-h" style={{ marginBottom: 10 }}>Application</h2>
                <dl className="kv">
                  <dt>Traveller</dt><dd>{c.name}{app.date_of_birth ? ` · born ${day(app.date_of_birth)}` : ""} · {dash(app.nationality)}{app.passport_number ? ` · passport ${app.passport_number}` : " · passport after payment"}</dd>
                  <dt>Contact</dt><dd>{c.email} · {c.phone || "no phone"}{notes.preferredLanguage === "ar" ? " · prefers Arabic" : ""}</dd>
                  <dt>Employment</dt><dd>{w.employmentStatus ? label(EMPLOYMENT, w.employmentStatus) : "Not answered yet"}{w.companyName ? `, ${w.companyName}` : ""}{w.jobTitle ? `, ${w.jobTitle}` : ""}</dd>
                  <dt>Previous Schengen</dt><dd>{w.isFirstSchengenVisa === "yes" ? "First Schengen visa" : w.isFirstSchengenVisa === "no" ? "Has had a Schengen visa" : "Not answered yet"}{w.previousRefusals === "yes" ? " · refused before" : w.previousRefusals === "no" ? " · no refusals" : ""}</dd>
                  <dt>Service fee</dt><dd>{c.paid ? <span className="pill green">Paid</span> : c.paymentFailed ? <span className="pill red">Failed</span> : <span className="pill grey">Not paid</span>} {c.amount ? `${c.amount} AED` : ""}{c.paidAt ? ` · ${dt(c.paidAt)}` : ""}{app.payment_id ? ` · payment gateway ref ${app.payment_id}` : ""}</dd>
                  <dt>Insurance</dt><dd>{insurance === "quote" ? "Asked for a quote through EZvisa" : insurance === "own" ? "Providing own policy" : "No choice yet"}</dd>
                  <dt>Source</dt><dd>{source}</dd>
                </dl>
              </section>
              <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }} aria-labelledby="ra-h">
                <div style={{ display: "flex", justifyContent: "space-between" }}><h2 id="ra-h">Recent activity</h2><a href={href("activity")} style={{ fontSize: 13 }}>See all</a></div>
                {timeline.slice(0, 4).map((t) => (
                  <div key={t.id} className="tl"><span className={`tl-dot ${t.tone}`} aria-hidden="true" /><span>{t.text}</span><span className="muted">{agoLabel(t.at, now)} · {t.by}</span></div>
                ))}
                {timeline.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>No activity recorded yet.</p> : null}
              </section>
            </>
          ) : null}

          {tab === "documents" ? (
            <section aria-labelledby="docs-h" className="stack" style={{ gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <h2 id="docs-h">Documents from the customer</h2>
                {can(staff.role, "docs") ? <a className="btn outline sm" href={`/staff/documents?case=${c.id}`}>Open review view</a> : null}
              </div>
              {c.paid ? (
                <CaseDocuments caseId={c.id} docs={docs} canDecide={can(staff.role, "docs")} demo={staff.demo} />
              ) : (
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>Documents unlock after payment.</p>
              )}
            </section>
          ) : null}

          {tab === "details" ? (
            <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="det-h">
              <h2 id="det-h">Application details</h2>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>As the customer answered on the website or app{can(staff.role, "edit") ? ", or as edited on their behalf" : ""}.</p>
              {can(staff.role, "edit") && c.side !== "closed" ? <EditApplication caseId={c.id} initial={editableAnswers(app as unknown as Record<string, unknown>)} paid={c.paid} demo={staff.demo} /> : null}
              <div className="cols2">
                <dl className="kv">
                  <dt>Full name</dt><dd>{c.name}</dd>
                  <dt>Date of birth</dt><dd>{day(app.date_of_birth) || "Not given"}</dd>
                  <dt>Nationality</dt><dd>{dash(app.nationality)}</dd>
                  <dt>Passport</dt><dd>{app.passport_number ? `${app.passport_number}${w.passportExpiry ? ` · expires ${day(w.passportExpiry)}` : ""}` : "Collected after payment"}</dd>
                  <dt>Residence</dt><dd>{dash(w.countryOfResidence)}{w.cityOfResidence ? `, ${w.cityOfResidence}` : ""}{w.residenceVisaValid === "yes" ? " · visa valid 3+ months after return" : ""}</dd>
                  <dt>Marital status</dt><dd>{w.maritalStatus ? label(MARITAL, w.maritalStatus) : "Not given"}{w.spouseAccompanying === "yes" ? ", spouse travelling" : w.maritalStatus === "married" ? ", spouse not travelling" : ""}</dd>
                </dl>
                <dl className="kv">
                  <dt>Destination</dt><dd>{c.country}</dd>
                  <dt>Purpose</dt><dd>{label(PURPOSES, app.travel_purpose ?? "")}</dd>
                  <dt>Dates</dt><dd>{travelLabel(c.travelStart, c.travelEnd)}{w.datesFlexible === "yes" ? " (flexible)" : ""}</dd>
                  <dt>Other Schengen</dt><dd>{w.additionalCountries?.length ? w.additionalCountries.map((x) => x.country).join(", ") : w.itinerary || "None"}</dd>
                  <dt>Employment</dt><dd>{w.employmentStatus ? label(EMPLOYMENT, w.employmentStatus) : "Not given"}{w.companyName ? ` · ${w.companyName}` : ""}{w.employmentStartDate ? ` · since ${w.employmentStartDate}` : ""}</dd>
                  <dt>Funds</dt><dd>{w.fundingSource ? label(FUNDING, w.fundingSource) : "Not given"}</dd>
                </dl>
              </div>
              {app.additional_notes && typeof notes.customerNotes === "string" ? <div className="note-box"><b>Customer&rsquo;s additional notes</b> {notes.customerNotes as string}</div> : null}
            </section>
          ) : null}

          {tab === "payments" ? (
            <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="pay-h">
              <div style={{ display: "flex", justifyContent: "space-between" }}><h2 id="pay-h">Payments</h2>{can(staff.role, "pay") ? <a href={`/staff/payments?q=${encodeURIComponent(c.ref)}`} style={{ fontSize: 13 }}>Open in Payments</a> : null}</div>
              <div className="tbl">
                <div className="tbl-h"><span>Date</span><span>Description</span><span>Reference</span><span>Amount</span></div>
                <div className="tbl-r">
                  <span>{dt(c.paidAt ?? c.updatedAt)}</span>
                  <span>Visa service fee {c.paid ? <span className="pill green xs">Paid</span> : c.paymentFailed ? <span className="pill red xs">Failed</span> : <span className="pill grey xs">Not paid</span>}</span>
                  <span className="muted">{app.payment_id ?? "–"}</span>
                  <span>{c.amount ? `${c.amount.toFixed(2)} AED` : "–"}</span>
                </div>
              </div>
              {c.paid ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <RefundButton
                    target={(() => {
                      const p = refundPolicy(c, Object.keys(detail.reviews).length > 0)
                      return { caseId: c.id, name: c.name, amount: c.amount ?? 249, method: "Payment gateway", stageLabel: STAGE[c.stage].label, stage: c.stage, policyLabel: p.label, policyAmount: p.amount, duplicateAmount: c.amount ?? 249 }
                    })()}
                    canApprove={can(staff.role, "refund")}
                    label={can(staff.role, "refund") ? "Issue refund" : "Request a refund"}
                    demo={staff.demo}
                  />
                </div>
              ) : null}
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>Refunds need a reason and are logged. Finance or an admin approves them; others send a request.</p>
            </section>
          ) : null}

          {tab === "activity" ? (
            <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }} aria-labelledby="act-h">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <h2 id="act-h">Activity</h2>
                <nav className="seg" aria-label="Show">
                  {(["all", "customer", "internal"] as const).map((v) => (
                    <a key={v} className="tab" href={href("activity", v === "all" ? "" : `&view=${v}`)} aria-current={view === v ? "page" : undefined}>{v === "all" ? "All" : v === "customer" ? "Customer visible" : "Internal"}</a>
                  ))}
                </nav>
              </div>
              {timeline.map((t) => (
                <div key={t.id} className="tl"><span className={`tl-dot ${t.tone}`} aria-hidden="true" /><span>{t.text}</span><span className="muted">{dt(t.at)} · {t.by}</span></div>
              ))}
              {timeline.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>Nothing recorded in this view yet.</p> : null}
            </section>
          ) : null}
        </div>

        <aside className="stack">
          <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }} aria-label="Customer">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className="av" style={{ width: 36, height: 36 }} aria-hidden="true">{initials(c.name)}</span>
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <b style={{ fontWeight: 500 }}>{c.name}</b>
                <span className="muted" style={{ fontSize: 12 }}>{others.length + 1} {others.length ? "cases" : "case"} · since {day([c.createdAt, ...others.map((o) => o.createdAt)].sort()[0])}</span>
              </span>
            </div>
            <span className="ellipsis" style={{ fontSize: 13 }}>{c.email}</span>
            <span style={{ fontSize: 13 }}>{c.phone || "No phone"}{waLink ? " · WhatsApp" : ""}</span>
            {ownerName ? <span className="muted" style={{ fontSize: 12 }}>Owner: {ownerName}</span> : null}
            {others.length ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span className="muted" style={{ fontSize: 12 }}>Other cases:</span>
                {others.slice(0, 6).map((o) => <a key={o.id} href={`/staff/cases/${o.id}`} className={`pill ${STAGE[o.stage].tone}`}>{o.country} · {STAGE[o.stage].label.toLowerCase()}</a>)}
              </div>
            ) : null}
          </section>
          <CaseNotes caseId={c.id} notes={caseNotes} canWrite={staff.role !== "finance"} />
          <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }} aria-labelledby="qa-h">
            <h2 id="qa-h">Quick actions</h2>
            {can(staff.role, "msg") && waLink && c.side === "customer" ? (
              <a className="btn outline sm" href={`${waLink}?text=${encodeURIComponent(`Hi ${c.name.split(" ")[0]}, this is EZvisa about ${c.ref}. ${c.what}. You can do it from your dashboard: https://www.ezvisa.net/dashboard`)}`} target="_blank" rel="noopener noreferrer">Send a reminder (WhatsApp)</a>
            ) : null}
            {can(staff.role, "files") ? <a className="btn outline sm" href="/staff/files">Start file preparation</a> : null}
            {can(staff.role, "appt") ? <a className="btn outline sm" href="/staff/appointments">Book the appointment for the customer</a> : null}
            <a className="btn ghost sm" href={`/staff/cases/legacy`}>Old case tools (emails, documents)</a>
          </section>
        </aside>
      </div>
    </>
  )
}
