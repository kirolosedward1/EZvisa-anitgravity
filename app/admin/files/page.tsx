// File preparation board: cases whose file is due (paid, documents approved), the parts of the selected case's file,
// what the templates use, the approved customer documents and the other travellers on the same trip.
import { Check } from "lucide-react"
import { CountryFlag } from "@/components/country-flag"
import { FileParts } from "@/components/staff/file-prep"
import { PermissionDenied } from "@/components/staff/states"
import { serviceClient } from "@/lib/applications"
import { SCHENGEN_META } from "@/lib/countries"
import { EMPLOYMENT, FUNDING, label, type WizardAnswers } from "@/lib/shared/wizard-contract"
import { loadCaseDetail } from "@/lib/staff/case-detail"
import { byUrgency, isOpen, STAGE } from "@/lib/staff/cases"
import { loadConsoleData } from "@/lib/staff/data"
import { partsFrom, type Part } from "@/lib/staff/file-prep"
import { sectionAccess } from "@/lib/staff/guard"
import { travelLabel } from "@/lib/staff/queue"
import { can } from "@/lib/staff/roles"
import { dueLabel } from "@/lib/staff/sla"

export const dynamic = "force-dynamic"

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const { staff, allowed } = await sectionAccess("files")
  if (!allowed) return <PermissionDenied what="File preparation is not part of your role" role={staff.role} who="Specialists and admins prepare files." />
  const sp = await searchParams
  const { cases } = await loadConsoleData(staff)
  const now = Date.now()
  const queue = cases.filter((c) => c.task === "files").sort(byUrgency(now))
  const readyWaiting = cases.filter((c) => isOpen(c) && c.stage === "ready" && !c.appointmentAt)
  const selectedId = sp.case && cases.some((c) => c.id === sp.case) ? sp.case : queue[0]?.id
  const detail = selectedId ? await loadCaseDetail(staff, selectedId) : null

  let parts: Part[] = partsFrom([])
  let problem: string | null = null
  if (detail && !staff.demo) {
    const client = serviceClient()
    const res = client ? await client.from("file_parts").select("part, state, body, file_name, file_path, updated_by").eq("application_id", detail.c.id) : null
    if (res?.error) problem = res.error.code === "42P01" || res.error.code === "PGRST205" ? "File preparation needs migration 007 (file_parts). Until it is applied, parts cannot be saved." : "The parts could not be read."
    else parts = partsFrom(res?.data ?? [])
  }
  const w = (detail?.notes.wizard ?? {}) as Partial<WizardAnswers>
  const mates = detail ? cases.filter((c) => c.id !== detail.c.id && c.email === detail.c.email && c.travelStart && c.travelStart === detail.c.travelStart) : []

  return (
    <>
      <div className="ezc-pagehead" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1>File preparation</h1>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>{queue.length} {queue.length === 1 ? "file" : "files"} to prepare · <a href="/staff/appointments#rna-h">{readyWaiting.length} ready, waiting for the customer</a></p>
        </div>
      </div>
      <div className="files">
        <section className="card desk-queue" aria-labelledby="fq-h">
          <div style={{ padding: "14px 16px 8px" }}><h2 id="fq-h">To prepare</h2></div>
          {queue.length === 0 ? <p className="muted" style={{ padding: "0 16px 16px", margin: 0, fontSize: 13 }}>No files to prepare. Cases arrive here when every document is approved.</p> : null}
          <ul>
            {queue.map((c) => (
              <li key={c.id}>
                <a href={`/staff/files?case=${c.id}`} className="qbtn" aria-current={c.id === selectedId ? "true" : undefined}>
                  <CountryFlag iso={SCHENGEN_META[c.country]?.iso} title={c.country} className="size-6" />
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <b className="ellipsis">{c.name}</b>
                    <span className="muted ellipsis" style={{ fontSize: 12 }}>{c.ref} · {c.country}</span>
                  </span>
                  {c.dueAt ? <span className={`pill xs ${Date.parse(c.dueAt) - now < 2 * 86_400_000 ? "amber" : "grey"}`}>{dueLabel(c.dueAt, now)}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {detail ? (
          <section className="stack" aria-label={`File for ${detail.c.name}`}>
            <div className="card" style={{ padding: "14px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <CountryFlag iso={SCHENGEN_META[detail.c.country]?.iso} title={detail.c.country} className="size-7" />
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2><a className="h-link" href={`/staff/cases/${detail.c.id}`}>{detail.c.name}</a> · {detail.c.country}</h2>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  <a href={`/staff/cases/${detail.c.id}`}>{detail.c.ref}</a> · {travelLabel(detail.c.travelStart, detail.c.travelEnd)}{mates.length ? <> · same trip as {mates.map((m, i) => <span key={m.id}>{i ? ", " : ""}<a href={`/staff/files?case=${m.id}`}>{m.name.split(" ")[0]}</a></span>)}</> : null}
                </p>
              </div>
              <span className={`pill ${STAGE[detail.c.stage].tone}`}><span className="dot" />{STAGE[detail.c.stage].label}</span>
              {can(staff.role, "edit") ? <a className="btn outline sm" href={`/staff/cases/${detail.c.id}?tab=details&edit=1`}>Edit details</a> : null}
            </div>
            {problem ? <div className="banner amber" role="note">{problem}</div> : null}
            <FileParts key={detail.c.id} caseId={detail.c.id} parts={parts} canWrite={can(staff.role, "files") && !problem} canReady={can(staff.role, "stage") && !problem} demo={staff.demo} />
          </section>
        ) : (
          <section className="card" style={{ padding: 24 }}><p className="muted" style={{ margin: 0 }}>Pick a case on the left.</p></section>
        )}

        {detail ? (
          <aside className="stack">
            <section className="card" style={{ padding: "16px 18px" }} aria-labelledby="tu-h">
              <h2 id="tu-h" style={{ marginBottom: 8 }}>What the templates use</h2>
              <dl className="kv" style={{ gridTemplateColumns: "90px minmax(0,1fr)" }}>
                <dt>Traveller</dt><dd>{detail.c.name}, {detail.app.nationality || "nationality not given"}</dd>
                <dt>Trip</dt><dd>{detail.c.country}, {travelLabel(detail.c.travelStart, detail.c.travelEnd)}</dd>
                <dt>Employer</dt><dd>{w.companyName || "Not given"}{w.jobTitle ? `, ${w.jobTitle}` : ""}{w.employmentStatus ? ` (${label(EMPLOYMENT, w.employmentStatus).toLowerCase()})` : ""}</dd>
                <dt>Funds</dt><dd>{w.fundingSource ? label(FUNDING, w.fundingSource) : "Not given"}</dd>
              </dl>
              <a href={`/staff/cases/${detail.c.id}?tab=details${can(staff.role, "edit") ? "&edit=1" : ""}`} style={{ fontSize: 13 }}>{can(staff.role, "edit") ? "Edit application details" : "Application details"}</a>
            </section>
            <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }} aria-labelledby="cd-h">
              <h2 id="cd-h">Customer documents, approved</h2>
              {detail.docs.map((d) => (
                <span key={d.type} style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                  {d.state === "approved" ? <Check size={15} color="#1a7f37" aria-label="Approved" /> : <span className={`pill xs ${d.state === "rejected" ? "amber" : "grey"}`}>{d.state === "rejected" ? "Sent back" : d.state === "missing" ? "Missing" : "To check"}</span>}
                  {d.state === "missing" ? d.title : <a href={`/staff/documents/${detail.c.id}~${d.type}`}>{d.title}</a>}
                </span>
              ))}
            </section>
            {mates.length ? (
              <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }} aria-labelledby="st-h">
                <h2 id="st-h">Same trip</h2>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>Bookings and itinerary can be the same; cover letters are per traveller.</p>
                {mates.map((m) => (
                  <a key={m.id} href={`/staff/files?case=${m.id}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    {m.name}<span className={`pill xs ${STAGE[m.stage].tone}`}>{STAGE[m.stage].label}</span>
                  </a>
                ))}
              </section>
            ) : null}
          </aside>
        ) : null}
      </div>
    </>
  )
}
