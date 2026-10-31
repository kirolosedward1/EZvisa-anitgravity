// Customers board: customers by email (from their applications) with segments and search, and a profile with their
// cases, saved travellers and the account tools that work today (sign-in link, data export).
import { CountryFlag } from "@/components/country-flag"
import { SignInLink } from "@/components/staff/sign-in-link"
import { serviceClient } from "@/lib/applications"
import { SCHENGEN_META } from "@/lib/countries"
import { parseNotes, travellerFromRow, TRAVELLERS_TABLE } from "@/lib/shared/wizard-contract"
import { isOpen, STAGE, type StaffCase } from "@/lib/staff/cases"
import { loadConsoleData } from "@/lib/staff/data"
import { sectionAccess } from "@/lib/staff/guard"
import { travelLabel } from "@/lib/staff/queue"
import { can } from "@/lib/staff/roles"
import { initials } from "@/lib/staff/session"
import { waUrl } from "@/lib/staff/templates"
import { MessageCircle } from "lucide-react"

export const dynamic = "force-dynamic"
const SEGMENTS = [{ key: "all", label: "All" }, { key: "repeat", label: "Repeat customers" }, { key: "active", label: "With an open case" }, { key: "arabic", label: "Arabic" }] as const
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", year: "numeric" })

type Customer = { email: string; name: string; phone: string; nationality: string; cases: StaffCase[]; arabic: boolean; since: string; paid: number }

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; seg?: string; email?: string; case?: string; page?: string }> }) {
  const { staff } = await sectionAccess("customers")
  const sp = await searchParams
  const { cases, apps } = await loadConsoleData(staff)
  const appById = new Map(apps.map((a) => [a.id ?? "", a]))
  const byEmail = new Map<string, Customer>()
  for (const c of [...cases].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const email = c.email.trim().toLowerCase()
    if (!email) continue
    const notes = parseNotes(appById.get(c.id)?.additional_notes) as Record<string, unknown>
    const x = byEmail.get(email) ?? { email, name: c.name, phone: c.phone, nationality: c.nationality, cases: [], arabic: false, since: c.createdAt, paid: 0 }
    x.cases.push(c)
    x.since = c.createdAt < x.since ? c.createdAt : x.since
    x.arabic ||= notes.preferredLanguage === "ar"
    if (c.paid) x.paid += c.amount ?? 0
    byEmail.set(email, x)
  }
  const seg = SEGMENTS.find((s) => s.key === sp.seg)?.key ?? "all"
  const q = (sp.q ?? "").trim().toLowerCase()
  const digits = q.replace(/\D/g, "")
  const list = [...byEmail.values()]
    .filter((c) => seg === "all" || (seg === "repeat" ? c.cases.length > 1 : seg === "active" ? c.cases.some(isOpen) : c.arabic))
    .filter((c) => !q || `${c.name} ${c.email} ${c.cases.map((x) => x.ref).join(" ")}`.toLowerCase().includes(q) || (digits.length >= 4 && c.phone.replace(/\D/g, "").includes(digits)))
  const fromCase = sp.case ? cases.find((c) => c.id === sp.case)?.email.toLowerCase() : undefined
  const selected = byEmail.get((sp.email ?? fromCase ?? "").toLowerCase()) ?? list[0]
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1)
  const shown = list.slice((page - 1) * 25, page * 25)

  let travellers: ReturnType<typeof travellerFromRow>[] = []
  if (selected && !staff.demo) {
    const client = serviceClient()
    const res = client ? await client.from(TRAVELLERS_TABLE).select("*").ilike("email", selected.email.replace(/[\\%_]/g, (c) => `\\${c}`)).limit(20) : null
    travellers = ((res?.data ?? []) as Record<string, unknown>[]).map(travellerFromRow)
  }
  const href = (o: Record<string, string>) => `/staff/customers?${new URLSearchParams({ ...(q ? { q } : {}), ...(seg !== "all" ? { seg } : {}), ...o })}`

  return (
    <>
      <div className="ezc-pagehead" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1>Customers</h1>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>{byEmail.size} customers · {cases.filter((c) => c.stage === "completed").length} completed cases</p>
        </div>
        <form method="get" action="/staff/customers" role="search"><input className="inp" type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Name, email, phone or reference" aria-label="Search customers" /></form>
      </div>
      <div className="grid2" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)" }}>
        <section className="card" aria-label="Customer list" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "12px 14px" }}>
            {SEGMENTS.map((s) => <a key={s.key} className="tab" href={`/staff/customers?${new URLSearchParams({ ...(q ? { q } : {}), seg: s.key })}`} aria-current={seg === s.key ? "page" : undefined}>{s.label}</a>)}
          </div>
          {shown.length === 0 ? <div className="empty">No customers match.</div> : null}
          {shown.map((c) => (
            <a key={c.email} href={href({ email: c.email })} className="cust-row" aria-current={selected?.email === c.email ? "true" : undefined}>
              <span className="av" aria-hidden="true">{initials(c.name)}</span>
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <b className="ellipsis">{c.name}</b>
                <span className="muted ellipsis" style={{ fontSize: 12 }}>{c.email} · {c.phone || "no phone"}</span>
              </span>
              <span className="muted cust-meta" style={{ fontSize: 12 }}>{c.nationality || "–"}<br />{c.arabic ? "Arabic" : "English"}</span>
              <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{c.cases.length} {c.cases.length === 1 ? "case" : "cases"}</span>
              {c.cases.some(isOpen) ? <span className="pill xs blue">Active</span> : <span className="pill xs green">Done</span>}
            </a>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid #eef1f6", fontSize: 13 }}>
            <span className="muted">{list.length ? `${(page - 1) * 25 + 1} to ${(page - 1) * 25 + shown.length} of ${list.length}` : ""}</span>
            <span style={{ display: "flex", gap: 6 }}>
              {page > 1 ? <a className="btn outline sm" href={href({ page: String(page - 1) })}>Previous</a> : null}
              {page * 25 < list.length ? <a className="btn outline sm" href={href({ page: String(page + 1) })}>Next</a> : null}
            </span>
          </div>
        </section>

        {selected ? (
          <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }} aria-label={`Customer ${selected.name}`}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span className="av" style={{ width: 44, height: 44, fontSize: 14 }} aria-hidden="true">{initials(selected.name)}</span>
              <div style={{ minWidth: 0 }}>
                <h2>{selected.name}</h2>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>Customer since {day(selected.since)} · {selected.cases.length} {selected.cases.length === 1 ? "case" : "cases"}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {waUrl(selected.phone) && can(staff.role, "msg") ? <a className="btn outline sm" href={waUrl(selected.phone)!} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} color="#1a7f37" aria-hidden /> WhatsApp</a> : null}
              <a className="btn outline sm" href={`mailto:${selected.email}`}>Email</a>
              {selected.cases[0] ? <a className="btn outline sm" href={`/staff/cases/${selected.cases[0].id}`}>Latest case</a> : null}
            </div>
            <dl className="kv">
              <dt>Email</dt><dd>{selected.email}</dd>
              <dt>Phone</dt><dd>{selected.phone || "Not given"}</dd>
              <dt>Nationality</dt><dd>{selected.nationality || "Not given"}</dd>
              <dt>Language</dt><dd>{selected.arabic ? "Arabic" : "English"}</dd>
              <dt>Paid</dt><dd>{selected.paid.toLocaleString("en-US")} AED across {selected.cases.filter((c) => c.paid).length} {selected.cases.filter((c) => c.paid).length === 1 ? "case" : "cases"}</dd>
            </dl>
            <div className="stack" style={{ gap: 6 }}>
              <h3>Cases</h3>
              {selected.cases.map((c) => (
                <a key={c.id} href={`/staff/cases/${c.id}`} className="cust-case">
                  <CountryFlag iso={SCHENGEN_META[c.country]?.iso} title={c.country} className="size-6" />
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}><b className="ellipsis">{c.country} · {c.ref}</b><span className="muted" style={{ fontSize: 12 }}>{travelLabel(c.travelStart, c.travelEnd)} · {c.what}</span></span>
                  <span className={`pill xs ${STAGE[c.stage].tone}`}>{STAGE[c.stage].label}</span>
                </a>
              ))}
            </div>
            <div className="stack" style={{ gap: 6 }}>
              <h3>Saved travellers</h3>
              {staff.demo ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>Demo customers have no saved travellers.</p> : travellers.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>None saved.</p> : null}
              {travellers.map((t) => {
                const soon = t.passportExpiry && Date.parse(t.passportExpiry) < Date.now() + 180 * 86_400_000
                return <span key={t.id} style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>{[t.firstName, t.lastName].filter(Boolean).join(" ") || "Unnamed"} <span className="muted">· {t.relationship}{t.nationality ? ` · ${t.nationality}` : ""}{t.passportExpiry ? ` · passport ends ${day(t.passportExpiry)}` : ""}</span>{soon ? <span className="pill xs amber">Expires soon</span> : null}</span>
              })}
            </div>
            <div className="stack" style={{ gap: 10, borderTop: "1px solid #eef1f6", paddingTop: 12 }}>
              <h3>Account and sign-in tools</h3>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>For &ldquo;I can&rsquo;t sign in&rdquo;. Every action is logged.</p>
              {can(staff.role, "msg") ? <SignInLink email={selected.email} phone={selected.phone} first={selected.name.split(" ")[0]} /> : null}
              {can(staff.role, "export") ? <a className="btn outline sm" style={{ alignSelf: "flex-start" }} href={`/api/admin/customers/export?email=${encodeURIComponent(selected.email)}`}>Export everything we hold (JSON)</a> : null}
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                Not available yet: changing the email, unlinking Google or Apple, resetting 2-step, merging duplicate accounts and deletion. Ask the owner; these change the customer&rsquo;s sign-in and need care. Finance records are kept 7 years.
              </p>
            </div>
          </section>
        ) : (
          <section className="card" style={{ padding: 24 }}><p className="muted" style={{ margin: 0 }}>No customers yet.</p></section>
        )}
      </div>
    </>
  )
}
