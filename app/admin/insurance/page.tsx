// Insurance board: customers who asked for a quote through EZvisa, quotes sent and their answers, and policies issued.
// Quotes are separate from the visa service fee; a request is a preference, never a policy. No insurer or rate card is
// connected: staff type the price from the insurer's rates.
import { CountryFlag } from "@/components/country-flag"
import { QuoteActions, QuoteRequest } from "@/components/staff/insurance-quotes"
import { ErrorBanner, PermissionDenied } from "@/components/staff/states"
import { serviceClient } from "@/lib/applications"
import { SCHENGEN_META } from "@/lib/countries"
import { applicationInsurance } from "@/lib/insurance"
import { isOpen } from "@/lib/staff/cases"
import { loadConsoleData } from "@/lib/staff/data"
import { sectionAccess } from "@/lib/staff/guard"
import { agoLabel, travelLabel } from "@/lib/staff/queue"
import { dubaiMonthStart } from "@/lib/staff/sla"
import { missingTable } from "@/lib/staff/session"

export const dynamic = "force-dynamic"
type Quote = { application_id: string; price: number; insurer: string | null; status: string; sent_at: string; reminded_at: string | null; decided_at: string | null }
const TONE: Record<string, string> = { sent: "blue", accepted: "green", declined: "grey", issued: "green" }
const LABEL: Record<string, string> = { sent: "Sent, waiting", accepted: "Accepted", declined: "Declined", issued: "Policy issued" }

export default async function InsurancePage() {
  const { staff, allowed } = await sectionAccess("insurance")
  if (!allowed) return <PermissionDenied what="Insurance is part of the Finance role" role={staff.role} who="Finance or an admin sends quotes and issues policies." />
  const { cases, apps } = await loadConsoleData(staff)
  const now = Date.now()
  let quotes: Quote[] = []
  let problem: string | null = null
  if (!staff.demo) {
    const client = serviceClient()
    const res = client ? await client.from("insurance_quotes").select("application_id, price, insurer, status, sent_at, reminded_at, decided_at").limit(2000) : null
    if (res?.error) problem = missingTable(res.error) ? "Insurance quotes need migration 009 (insurance_quotes). Requests still show." : "Quotes could not be read."
    else quotes = (res?.data ?? []) as Quote[]
  }
  const byCase = new Map(quotes.map((q) => [q.application_id, q]))
  const appById = new Map(apps.map((a) => [a.id ?? "", a]))
  const wanted = cases.filter((c) => c.paid && isOpen(c) && c.insuranceQuote)
  const requests = wanted.filter((c) => !byCase.has(c.id))
  const sent = cases.filter((c) => byCase.has(c.id)).sort((a, b) => (byCase.get(b.id)!.sent_at).localeCompare(byCase.get(a.id)!.sent_at))
  const own = cases.filter((c) => isOpen(c) && c.paid && applicationInsurance(appById.get(c.id)?.additional_notes) === "own").length
  const issuedMonth = quotes.filter((q) => q.status === "issued" && q.decided_at && Date.parse(q.decided_at) >= dubaiMonthStart(now)).length

  return (
    <>
      {problem ? <ErrorBanner title="Part of Insurance did not load." body={problem} /> : null}
      <div className="ezc-pagehead">
        <h1>Travel insurance</h1>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Quotes are separate from the service fee. A request is a preference, never a policy. No insurer rate card is connected: type the price from the insurer&rsquo;s rates.</p>
      </div>
      <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="card kpi"><span className="v" style={{ color: "#7a4b00" }}>{requests.length}</span><span className="l">Quotes requested, not sent</span></div>
        <div className="card kpi"><span className="v">{quotes.filter((q) => q.status === "sent").length}</span><span className="l">Quotes sent, awaiting answer</span></div>
        <div className="card kpi"><span className="v">{issuedMonth}</span><span className="l">Policies issued this month</span></div>
        <div className="card kpi"><span className="v">{own}</span><span className="l">Own policy, to check at the appointment</span></div>
      </div>
      <div className="grid2" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
        <section className="card" aria-labelledby="qr-h" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="qr-h">Quote requests · {requests.length}</h2>
          {requests.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>No open requests.</p> : null}
          {requests.map((c) => {
            const flexible = !c.travelStart || !c.travelEnd
            return (
              <div key={c.id} className="appt-row">
                <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                  <CountryFlag iso={SCHENGEN_META[c.country]?.iso} title={c.country} className="size-6" />
                  <a href={`/staff/cases/${c.id}`} style={{ display: "flex", flexDirection: "column", minWidth: 0, color: "#102347", flex: 1 }}>
                    <b className="ellipsis" style={{ fontWeight: 500 }}>{c.name}{c.travellers > 1 ? ` + ${c.travellers - 1}` : ""}</b>
                    <span className="muted ellipsis" style={{ fontSize: 12 }}>{c.ref} · {c.country} · {travelLabel(c.travelStart, c.travelEnd)}</span>
                  </a>
                  {flexible ? <span className="pill xs amber">Needs dates</span> : null}
                </div>
                <QuoteRequest caseId={c.id} first={c.name.split(" ")[0]} phone={c.phone} trip={`${c.country}, ${travelLabel(c.travelStart, c.travelEnd)}`} flexible={flexible} demo={staff.demo} />
              </div>
            )
          })}
        </section>
        <section className="card" aria-labelledby="qs-h" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="qs-h">Sent and answered · {sent.length}</h2>
          {sent.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>{staff.demo ? "The demo has no quotes yet; record one on the left." : "No quotes sent yet."}</p> : null}
          {sent.map((c) => {
            const q = byCase.get(c.id)!
            return (
              <div key={c.id} className="appt-row" style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <a href={`/staff/cases/${c.id}`} style={{ display: "flex", flexDirection: "column", minWidth: 0, color: "#102347" }}>
                  <b style={{ fontWeight: 500 }}>{c.name}</b>
                  <span className="muted" style={{ fontSize: 12 }}>{Number(q.price).toFixed(2)} AED{q.insurer ? ` · ${q.insurer}` : ""} · sent {agoLabel(q.sent_at, now)}{q.reminded_at ? ` · reminded ${agoLabel(q.reminded_at, now)}` : ""}</span>
                  <span className={`pill xs ${TONE[q.status] ?? "grey"}`} style={{ marginTop: 4 }}>{LABEL[q.status] ?? q.status}</span>
                </a>
                <QuoteActions caseId={c.id} status={q.status} first={c.name.split(" ")[0]} phone={c.phone} demo={staff.demo} />
              </div>
            )
          })}
        </section>
      </div>
    </>
  )
}
