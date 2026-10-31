// Payments board (and the Finance desk for the Finance role): money in this month, transactions, failed payments,
// refunds and refund requests. Refunds go through the modal with a reason and the fixed policy; nothing is edited
// inline. Amounts come from the application rows; settlement and payout data are not connected.
import { RefundButton, RefundDecision, type RefundTarget } from "@/components/staff/refunds"
import { ErrorBanner, PermissionDenied } from "@/components/staff/states"
import { serviceClient } from "@/lib/applications"
import { STAGE, isOpen, type StaffCase } from "@/lib/staff/cases"
import { loadConsoleData } from "@/lib/staff/data"
import { sectionAccess } from "@/lib/staff/guard"
import { refundPolicy, REFUND_STATUS } from "@/lib/staff/refunds"
import { can } from "@/lib/staff/roles"
import { dubaiMonthStart } from "@/lib/staff/sla"
import { missingTable } from "@/lib/staff/session"
import { PRICE_AED } from "@/lib/shared/wizard-contract"

export const dynamic = "force-dynamic"

type Refund = { id: string; application_id: string; amount: number; amount_paid: number; reason: string; policy: string; stage_at_request: string; note: string | null; status: string; requested_by: string; requested_at: string; decided_by: string | null; gateway_ref: string | null }
const TABS = [
  { key: "all", label: "All transactions" },
  { key: "failed", label: "Failed" },
  { key: "refunds", label: "Refunds" },
  { key: "requests", label: "Refund requests" },
] as const
const aed = (n: number) => `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { staff, allowed } = await sectionAccess("payments")
  if (!allowed) return <PermissionDenied what="Payments need the Finance role" role={staff.role} who="You can request a refund from a case's Payments tab; Finance or an admin approves it." />
  const sp = await searchParams
  const finance = staff.role === "finance"
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? (finance ? "requests" : "all")
  const q = (sp.q ?? "").trim().toLowerCase()
  const { cases, reviews } = await loadConsoleData(staff)
  const now = Date.now()

  let refunds: Refund[] = []
  let problem: string | null = null
  if (staff.demo) {
    const paid = cases.filter((c) => c.paid).slice(0, 3)
    refunds = paid.map((c, i) => ({ id: `demo-refund-${i}`, application_id: c.id, amount: i === 1 ? 124.5 : 249, amount_paid: 249, reason: i === 0 ? "Customer cancelled before review" : i === 1 ? "Goodwill" : "Duplicate payment", policy: i === 1 ? "After review, 50 percent" : "Before review, full refund", stage_at_request: STAGE[c.stage].label, note: null, status: i === 2 ? "sent" : "requested", requested_by: "Demo specialist", requested_at: new Date(now - (i + 1) * 7_200_000).toISOString(), decided_by: null, gateway_ref: i === 2 ? "demo-ref" : null }))
  } else {
    const client = serviceClient()
    const res = client ? await client.from("refund_requests").select("*").order("requested_at", { ascending: false }).limit(500) : null
    if (res?.error) problem = missingTable(res.error) ? "Refunds need migration 008 (refund_requests). Payments still show." : "Refunds could not be read."
    else refunds = (res?.data ?? []) as Refund[]
  }
  const byCase = new Map(cases.map((c) => [c.id, c]))
  const monthStart = dubaiMonthStart(now)
  const paidMonth = cases.filter((c) => c.paid && Date.parse(c.paidAt ?? c.createdAt) >= monthStart)
  const collected = paidMonth.reduce((s, c) => s + (c.amount ?? 0), 0)
  const refundedMonth = refunds.filter((r) => r.status === "sent" && Date.parse(r.requested_at) >= monthStart)
  const refundedSum = refundedMonth.reduce((s, r) => s + Number(r.amount), 0)
  const failed = cases.filter((c) => isOpen(c) && c.paymentFailed)
  const drafts = cases.filter((c) => isOpen(c) && c.side === "draft" && !c.paymentFailed)
  const requests = refunds.filter((r) => r.status === "requested")
  const toSend = refunds.filter((r) => r.status === "approved")

  const refundTarget = (c: StaffCase): RefundTarget => {
    const reviewedAny = Object.keys(reviews[c.id] ?? {}).length > 0
    const p = refundPolicy(c, reviewedAny)
    return { caseId: c.id, name: c.name, amount: c.amount ?? PRICE_AED, method: "Payment gateway", stageLabel: STAGE[c.stage].label, stage: c.stage, policyLabel: p.label, policyAmount: p.amount, duplicateAmount: c.amount ?? PRICE_AED }
  }
  const match = (c: StaffCase | undefined) => !q || (!!c && `${c.name} ${c.email} ${c.ref}`.toLowerCase().includes(q))
  const txns = cases
    .filter((c) => (c.paid || c.paymentFailed) && match(c))
    .filter((c) => (tab === "failed" ? c.paymentFailed && !c.paid : true))
    .sort((a, b) => (b.paidAt ?? b.updatedAt).localeCompare(a.paidAt ?? a.updatedAt))
    .slice(0, 200)
  const refundRows = refunds.filter((r) => (tab === "requests" ? r.status === "requested" || r.status === "approved" : r.status === "sent" || r.status === "approved" || r.status === "declined") && match(byCase.get(r.application_id)))

  return (
    <>
      {problem ? <ErrorBanner title="Part of Payments did not load." body={problem} /> : null}
      <div className="ezc-pagehead" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1>{finance ? "Finance desk" : "Payments"}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {finance ? `Signed in as ${staff.name}, Finance. Refund requests, payments and exports. Cases are read only.` : "From the application records. Settlement and payout data from the payment gateway are not connected."}
          </p>
        </div>
        <form method="get" action="/staff/payments" role="search" style={{ display: "flex", gap: 6 }}>
          <input type="hidden" name="tab" value={tab} />
          <input className="inp" type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Name, email or reference" aria-label="Search payments" />
        </form>
      </div>

      <div className="kpis">
        <a className="card kpi" href="/staff/payments?tab=all"><span className="v">{Math.round(collected).toLocaleString("en-US")}<small> AED</small></span><span className="l">Collected this month · {paidMonth.length} payments</span></a>
        <a className="card kpi" href="/staff/payments?tab=refunds"><span className="v">{Math.round(refundedSum).toLocaleString("en-US")}<small> AED</small></span><span className="l">Refunded this month · {refundedMonth.length}</span></a>
        <a className="card kpi" href="/staff/payments?tab=all"><span className="v">{Math.round(collected - refundedSum).toLocaleString("en-US")}<small> AED</small></span><span className="l">Net</span></a>
        <a className="card kpi" href="/staff/payments?tab=failed"><span className="v" style={{ color: failed.length ? "#8a1c1c" : undefined }}>{failed.length}</span><span className="l">Failed, not paid since</span></a>
        <a className="card kpi" href="/staff/cases?stage=payment"><span className="v">{(drafts.length * PRICE_AED).toLocaleString("en-US")}<small> AED</small></span><span className="l">{drafts.length} unpaid drafts, potential</span></a>
      </div>

      <nav className="utabs" aria-label="Payments">
        {TABS.map((t) => (
          <a key={t.key} className="tab" href={`/staff/payments?tab=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={tab === t.key ? "page" : undefined}>
            {t.label}
            {t.key === "failed" && failed.length ? <span className="pill xs red">{failed.length}</span> : null}
            {t.key === "requests" && requests.length + toSend.length ? <span className="pill xs amber">{requests.length + toSend.length}</span> : null}
          </a>
        ))}
      </nav>

      {tab === "all" || tab === "failed" ? (
        <section className="card" aria-label="Transactions" style={{ overflow: "visible" }}>
          <div className="tbl" style={{ border: 0 }}>
            <div className="tbl-h pay"><span>Date</span><span>Customer</span><span>Case</span><span>Reference</span><span>Status</span><span>Amount</span><span /></div>
            {txns.length === 0 ? <div className="empty">{tab === "failed" ? "No failed payments waiting." : "No payments match."}</div> : null}
            {txns.map((c) => {
              const refund = refunds.find((r) => r.application_id === c.id && r.status !== "declined")
              const status = c.paid ? (refund ? REFUND_STATUS[refund.status] : { label: "Paid", tone: "green" }) : { label: "Failed", tone: "red" }
              const digits = c.phone.replace(/\D/g, "")
              return (
                <div key={c.id} className="tbl-r pay">
                  <span>{when(c.paidAt ?? c.updatedAt)}</span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><a className="ellipsis" style={{ fontWeight: 500, color: "inherit" }} href={`/staff/customers?case=${c.id}`} title="Customer profile">{c.name}</a><a className="muted ellipsis" style={{ fontSize: 12 }} href={`mailto:${c.email}`}>{c.email}</a></span>
                  <a href={`/staff/cases/${c.id}?tab=payments`} style={{ display: "flex", flexDirection: "column" }}>{c.ref}<span className="muted" style={{ fontSize: 12 }}>{c.country}</span></a>
                  <span className="muted ellipsis" style={{ fontSize: 12 }}>Payment gateway</span>
                  <span><span className={`pill ${status.tone}`}>{status.label}{refund ? ` ${Number(refund.amount).toFixed(2)}` : ""}</span></span>
                  <span style={{ color: refund?.status === "sent" ? "#52617a" : undefined }}>{c.amount ? aed(c.amount) : "–"}</span>
                  <span style={{ display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
                    {c.paid && !refund ? <RefundButton target={refundTarget(c)} canApprove={can(staff.role, "refund")} demo={staff.demo} /> : null}
                    {!c.paid && digits.length >= 8 ? <a className="btn outline sm" href={`https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${c.name.split(" ")[0]}, your payment for ${c.ref} did not go through. You can try again from your dashboard: https://www.ezvisa.net/dashboard?id=${c.id}`)}`} target="_blank" rel="noopener noreferrer">Send pay link</a> : null}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="stack" aria-label={tab === "requests" ? "Refund requests" : "Refunds"} style={{ gap: 10 }}>
          {tab === "requests" ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>Policy: full refund before review, 50 percent after review, none once the file is ready; duplicate charges always in full.</p> : null}
          {refundRows.length === 0 ? (
            <div className="card empty" style={{ borderTop: 0 }}>{tab === "requests" ? "No refund requests waiting. Specialists and Support send them here from the case." : "No refunds yet."}</div>
          ) : null}
          {refundRows.map((r) => {
            const c = byCase.get(r.application_id)
            const s = REFUND_STATUS[r.status] ?? { label: r.status, tone: "grey" }
            return (
              <div key={r.id} className="card refund">
                <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <b style={{ fontWeight: 500 }}>{c ? <a href={`/staff/customers?case=${c.id}`} style={{ color: "inherit" }}>{c.name}</a> : "Case"} · <a href={`/staff/cases/${r.application_id}?tab=payments`}>{c?.ref ?? r.application_id.slice(0, 8)}</a></b>
                  <span className="muted" style={{ fontSize: 12 }}>Paid {Number(r.amount_paid).toFixed(2)} AED · requested {when(r.requested_at)} by {r.requested_by}{r.decided_by ? ` · decided by ${r.decided_by}` : ""}{r.gateway_ref ? ` · gateway ref ${r.gateway_ref}` : ""}</span>
                  <span style={{ fontSize: 13 }}>{r.reason}{r.note ? `: ${r.note}` : ""}</span>
                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="pill xs grey">{r.policy}</span>
                    <span className="pill xs grey">Stage at request: {r.stage_at_request}</span>
                    <span className={`pill xs ${s.tone}`}>{s.label} {Number(r.amount).toFixed(2)} AED</span>
                  </span>
                </div>
                {can(staff.role, "refund") && (r.status === "requested" || r.status === "approved") ? <RefundDecision id={r.id} amount={Number(r.amount)} max={Number(r.amount_paid)} status={r.status} demo={staff.demo} /> : null}
              </div>
            )
          })}
        </section>
      )}
    </>
  )
}
