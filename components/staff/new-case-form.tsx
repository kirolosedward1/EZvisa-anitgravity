"use client"

// New case board: 1 Customer, 2 Trip, 3 Traveller and work, 4 Review and send the pay link. Same questions as the
// website wizard, no marketing steps. The pay link is shared by the specialist (copy, or WhatsApp with the message
// written) because automatic WhatsApp and email sending are not connected.
import { useMemo, useState, useTransition } from "react"
import { Check, Copy, MessageCircle } from "lucide-react"
import { createCaseOnBehalf, type NewCaseInput, type NewCaseResult } from "@/app/admin/cases/new/actions"
import { EMPLOYMENT, MARITAL, PURPOSES, SCHENGEN, priceAed, requirementsFor } from "@/lib/shared/wizard-contract"
import { TRIP_LENGTHS, upcomingTravelMonths } from "@/lib/dates"

export type CustomerOption = { email: string; name: string; phone: string; nationality: string; cases: number }

const STEPS = ["Customer", "Trip", "Traveller and work", "Review and send pay link"]
const SOURCE_LABEL: Record<NewCaseInput["source"], string> = { whatsapp: "WhatsApp inquiry", phone: "Phone call", walk_in: "Walk-in", referral: "Referral", email: "Email" }
const initials = (n: string) => n.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"

export function NewCaseForm({ customers, nationalities, owners }: { customers: CustomerOption[]; nationalities: string[]; owners: { id: string; name: string; open: number }[] }) {
  const [step, setStep] = useState(1)
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)
  const [customer, setCustomer] = useState<NewCaseInput["customer"] & { note?: string }>({ fullName: "", email: "", phone: "+971 ", nationality: "", language: "en" })
  const [picked, setPicked] = useState(false)
  const [trip, setTrip] = useState({ destination: "France", purpose: "tourism", kind: "fixed" as "fixed" | "flexible", start: "", end: "", month: "", days: 14, otherCountries: "", spouse: false })
  const [t, setT] = useState<NewCaseInput["traveller"]>({ dateOfBirth: "", maritalStatus: "", employmentStatus: "employed", companyName: "", employmentStartDate: "", previousSchengen: "", previousRefusals: "", fundingSource: "self" })
  const [ownerId, setOwnerId] = useState("")
  const [source, setSource] = useState<NewCaseInput["source"]>("whatsapp")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Extract<NewCaseResult, { ok: true }> | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, start] = useTransition()
  const months = useMemo(() => upcomingTravelMonths(12), [])

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    const digits = q.replace(/\D/g, "")
    return customers
      .filter((c) => !q || `${c.name} ${c.email}`.toLowerCase().includes(q) || (digits.length >= 4 && c.phone.replace(/\D/g, "").includes(digits)))
      .slice(0, 8)
  }, [customers, search])

  const fee = priceAed(trip.spouse ? "yes" : "no", trip.spouse ? "spouse" : "alone")
  const docs = requirementsFor(t.employmentStatus).filter((r) => !r.provided_by_ezvisa).map((r) => r.title.toLowerCase())
  const datesText =
    trip.kind === "fixed"
      ? trip.start && trip.end ? `${trip.start} to ${trip.end}` : "Dates not set"
      : `${TRIP_LENGTHS.find((l) => l.days === trip.days)?.en ?? `${trip.days} days`} in ${months.find((m) => m.value === trip.month)?.en ?? "a month to choose"}, flexible`

  const customerOk = customer.fullName.trim().length >= 3 && /\S+@\S+\.\S+/.test(customer.email) && customer.phone.replace(/\D/g, "").length >= 7 && customer.nationality
  // What still blocks Continue, said next to the button.
  const customerMissing = [
    customer.fullName.trim().length < 3 && "full name",
    !/\S+@\S+\.\S+/.test(customer.email) && "email",
    customer.phone.replace(/\D/g, "").length < 7 && "phone",
    !customer.nationality && "nationality",
  ].filter(Boolean) as string[]
  const tripOk = trip.kind === "fixed" ? !!trip.start && !!trip.end && trip.end > trip.start : !!trip.month
  const go = (n: number) => {
    setError(null)
    setStep(Math.min(4, Math.max(1, n)))
  }

  const submit = () =>
    start(async () => {
      setError(null)
      const r = await createCaseOnBehalf({
        customer: { fullName: customer.fullName, email: customer.email, phone: customer.phone, nationality: customer.nationality, language: customer.language },
        trip: {
          destination: trip.destination,
          purpose: trip.purpose,
          dates: trip.kind === "fixed" ? { kind: "fixed", start: trip.start, end: trip.end } : { kind: "flexible", month: trip.month, days: trip.days },
          otherCountries: trip.otherCountries,
          spouse: trip.spouse,
        },
        traveller: t,
        ownerId: ownerId || null,
        source,
      })
      if (r.ok) setDone(r)
      else setError(r.error)
    })

  if (done) {
    return (
      <section className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
        <div className="flash ok" role="status">
          <Check size={16} aria-hidden />
          <span>
            {done.demo ? "Demo: nothing was saved. " : ""}Case {done.ref} created as Payment due for {done.name}, owner {done.ownerName}. It appears in the queue under Needs customer once they sign in.
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 14 }}>
          Send the customer their link. They sign in with <b>{customer.email}</b> (a sign-in link or Google, no password needed) and pay {done.fee} AED through the payment gateway; documents unlock after payment.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input className="inp" readOnly value={done.payLink} aria-label="Pay link" style={{ flex: "1 1 280px" }} onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className="btn outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(done.payLink)
                setCopied(true)
              } catch {
                setCopied(false)
              }
            }}
          >
            <Copy size={14} aria-hidden /> {copied ? "Copied" : "Copy link"}
          </button>
          {done.whatsapp ? (
            <a className="btn primary" href={done.whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={14} aria-hidden /> Send on WhatsApp
            </a>
          ) : null}
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>Automatic WhatsApp and email sending are not connected yet, so the link is shared from here.</p>
        <div style={{ display: "flex", gap: 8 }}>
          {!done.demo ? <a className="btn outline" href={`/staff/cases/${done.id}`}>Open the case</a> : null}
          <a className="btn ghost" href="/staff/cases/new">Start another case</a>
        </div>
      </section>
    )
  }

  return (
    <div className="nc">
      <div className="stack">
        <ol className="stepper" aria-label="Steps">
          {STEPS.map((label, i) => {
            const n = i + 1
            const state = n < step ? "done" : n === step ? "current" : "next"
            return (
              <li key={label} data-state={state} aria-current={state === "current" ? "step" : undefined}>
                <span className="n">{state === "done" ? <Check size={12} strokeWidth={3} aria-hidden /> : n}</span>
                <span>{label}</span>
              </li>
            )
          })}
        </ol>

        {error ? <div className="flash err" role="alert"><span>{error}</span></div> : null}

        {step === 1 ? (
          <section className="card form" aria-labelledby="s1">
            <h2 id="s1">Who is this for?</h2>
            <input className="inp" type="search" placeholder="Search customers by name, phone or email" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search customers" />
            <div className="list">
              {matches.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  className="pick"
                  aria-pressed={picked && customer.email === c.email}
                  onClick={() => {
                    setCustomer({ fullName: c.name, email: c.email, phone: c.phone || "+971 ", nationality: c.nationality, language: "en" })
                    setPicked(true)
                    setCreating(false)
                    go(2)
                  }}
                >
                  <span className="av" aria-hidden="true">{initials(c.name)}</span>
                  <span className="who">
                    <b>{c.name}</b>
                    <span className="muted" style={{ fontSize: 12 }}>{[c.email, c.phone, c.nationality].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="pill grey">{c.cases === 1 ? "1 case" : `${c.cases} cases`}</span>
                </button>
              ))}
              {matches.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>No customer matches. Create one below.</p> : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderTop: "1px solid #eef1f6", paddingTop: 12 }}>
              <span className="muted" style={{ fontSize: 13 }}>Not a customer yet?</span>
              <button type="button" className="btn outline sm" aria-expanded={creating} onClick={() => { setCreating((v) => !v); setPicked(false) }}>
                Create a new customer
              </button>
            </div>
            {creating ? (
              <div className="grid-form">
                <label>Full name, as in passport<input className="inp" value={customer.fullName} onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })} autoComplete="off" /></label>
                <label>WhatsApp number<input className="inp" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} inputMode="tel" placeholder="+971 50 000 0000" /></label>
                <label>Email (they sign in with it)<input className="inp" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></label>
                <label>Language<select className="sel" value={customer.language} onChange={(e) => setCustomer({ ...customer, language: e.target.value as "en" | "ar" })}><option value="en">English</option><option value="ar">Arabic</option></select></label>
                <label>Nationality
                  <select className="sel" value={customer.nationality} onChange={(e) => setCustomer({ ...customer, nationality: e.target.value })}>
                    <option value="">Choose</option>
                    {nationalities.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <div style={{ alignSelf: "end", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                  {customerMissing.length ? <span className="muted" style={{ fontSize: 12 }}>Still needed: {customerMissing.join(", ")}</span> : null}
                  <button type="button" className="btn primary" disabled={!customerOk} onClick={() => { setPicked(true); go(2) }}>Continue</button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 2 ? (
          <section className="card form" aria-labelledby="s2">
            <h2 id="s2">Trip</h2>
            <div className="grid-form">
              <label>Destination (main stay)<select className="sel" value={trip.destination} onChange={(e) => setTrip({ ...trip, destination: e.target.value })}>{SCHENGEN.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label>Purpose<select className="sel" value={trip.purpose} onChange={(e) => setTrip({ ...trip, purpose: e.target.value })}>{PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
            </div>
            <fieldset className="seg-field">
              <legend>Dates</legend>
              <div className="seg" role="radiogroup">
                <button type="button" role="radio" className="tab" aria-checked={trip.kind === "fixed"} aria-pressed={trip.kind === "fixed"} onClick={() => setTrip({ ...trip, kind: "fixed" })}>Fixed dates</button>
                <button type="button" role="radio" className="tab" aria-checked={trip.kind === "flexible"} aria-pressed={trip.kind === "flexible"} onClick={() => setTrip({ ...trip, kind: "flexible" })}>Flexible, by month and length</button>
              </div>
            </fieldset>
            {trip.kind === "fixed" ? (
              <div className="grid-form">
                <label>Entry<input className="inp" type="date" value={trip.start} onChange={(e) => setTrip({ ...trip, start: e.target.value })} /></label>
                <label>Exit<input className="inp" type="date" value={trip.end} min={trip.start || undefined} onChange={(e) => setTrip({ ...trip, end: e.target.value })} /></label>
              </div>
            ) : (
              <div className="grid-form">
                <label>Month<select className="sel" value={trip.month} onChange={(e) => setTrip({ ...trip, month: e.target.value })}><option value="">Choose</option>{months.map((m) => <option key={m.value} value={m.value}>{m.en}</option>)}</select></label>
                <label>Length<select className="sel" value={trip.days} onChange={(e) => setTrip({ ...trip, days: Number(e.target.value) })}>{TRIP_LENGTHS.map((l) => <option key={l.days} value={l.days}>About {l.en}</option>)}</select></label>
              </div>
            )}
            <div className="grid-form">
              <label>Other Schengen countries on this trip<input className="inp" placeholder="e.g. Austria, 2 days" value={trip.otherCountries} onChange={(e) => setTrip({ ...trip, otherCountries: e.target.value })} /></label>
              <label>Travellers on this application
                <select className="sel" value={trip.spouse ? "2" : "1"} onChange={(e) => setTrip({ ...trip, spouse: e.target.value === "2" })}>
                  <option value="1">Just this customer</option>
                  <option value="2">With spouse (same application)</option>
                </select>
              </label>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>Children and other family members get their own case; cases with the same email and dates show as one trip.</p>
            <div className="actions"><button type="button" className="btn outline" onClick={() => go(1)}>Back</button>{!tripOk ? <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>{trip.kind === "fixed" ? "Choose the travel dates (return after departure)" : "Choose the travel month"}</span> : null}<button type="button" className="btn primary" disabled={!tripOk} onClick={() => go(3)}>Continue</button></div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="card form" aria-labelledby="s3">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <h2 id="s3">Traveller and work</h2>
              <span className="muted" style={{ fontSize: 12 }}>Optional now; the customer can complete it after payment</span>
            </div>
            <div className="grid-form">
              <label>Full name<input className="inp" value={customer.fullName} onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })} /></label>
              <label>Date of birth<input className="inp" type="date" value={t.dateOfBirth} onChange={(e) => setT({ ...t, dateOfBirth: e.target.value })} /></label>
              <label>Marital status<select className="sel" value={t.maritalStatus} onChange={(e) => setT({ ...t, maritalStatus: e.target.value as typeof t.maritalStatus })}><option value="">Not asked yet</option>{MARITAL.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
              <label>Employment status<select className="sel" value={t.employmentStatus} onChange={(e) => setT({ ...t, employmentStatus: e.target.value as typeof t.employmentStatus })}><option value="">Not asked yet</option>{EMPLOYMENT.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
              <label>Employer or company<input className="inp" value={t.companyName} onChange={(e) => setT({ ...t, companyName: e.target.value })} /></label>
              <label>In this job since<input className="inp" type="month" value={t.employmentStartDate} onChange={(e) => setT({ ...t, employmentStartDate: e.target.value })} /></label>
              <label>Previous Schengen visa<select className="sel" value={t.previousSchengen} onChange={(e) => setT({ ...t, previousSchengen: e.target.value as typeof t.previousSchengen })}><option value="">Not asked yet</option><option value="recent">Yes, in the last 3 years</option><option value="older">Yes, older</option><option value="no">No</option></select></label>
              <label>Any refusal before<select className="sel" value={t.previousRefusals} onChange={(e) => setT({ ...t, previousRefusals: e.target.value as typeof t.previousRefusals })}><option value="">Not asked yet</option><option value="no">No</option><option value="yes">Yes</option></select></label>
              <label>Who pays for the trip<select className="sel" value={t.fundingSource} onChange={(e) => setT({ ...t, fundingSource: e.target.value as typeof t.fundingSource })}><option value="self">Self</option><option value="sponsor">Family member or friend</option><option value="company">Employer</option></select></label>
            </div>
            <div className="banner amber" style={{ background: "#edf4ff", borderColor: "#c9d6fb", color: "#102347" }}>
              Passport number is collected after payment, as on the website. Documents for {EMPLOYMENT.find((o) => o.value === t.employmentStatus)?.label.toLowerCase() ?? "this traveller"}: {docs.join(", ")}.
            </div>
            <div className="actions"><button type="button" className="btn outline" onClick={() => go(2)}>Back</button><button type="button" className="btn primary" onClick={() => go(4)}>Continue to review</button></div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="card form" aria-labelledby="s4">
            <h2 id="s4">Review and send the pay link</h2>
            <dl className="kv">
              <dt>Customer</dt><dd>{customer.fullName} · {customer.email} · {customer.phone}</dd>
              <dt>Trip</dt><dd>{trip.destination} · {datesText} · {trip.spouse ? "2 travellers" : "1 traveller"}</dd>
              <dt>Employment</dt><dd>{EMPLOYMENT.find((o) => o.value === t.employmentStatus)?.label ?? "Not asked yet"}{t.companyName ? `, ${t.companyName}` : ""}</dd>
              <dt>Service fee</dt><dd><b>{fee} AED</b> · 249 per traveller, ×2 with a spouse on the same application</dd>
            </dl>
            <div className="grid-form">
              <label>Owner
                <select className="sel" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                  <option value="">Auto-assign (fewest open cases)</option>
                  {owners.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.open} open</option>)}
                </select>
              </label>
              <label>Source
                <select className="sel" value={source} onChange={(e) => setSource(e.target.value as NewCaseInput["source"])}>
                  {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              The case opens as Payment due. The customer pays through the payment gateway from their dashboard, and documents unlock after payment.
            </p>
            <div className="actions">
              <button type="button" className="btn outline" onClick={() => go(3)}>Back</button>
              <button type="button" className="btn primary" disabled={pending || !customerOk || !tripOk} onClick={submit}>{pending ? "Creating…" : "Create case and get pay link"}</button>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="stack">
        <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2>Customer</h2>
          {picked || customer.fullName.trim() ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className="av" aria-hidden="true">{initials(customer.fullName)}</span>
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <b style={{ fontWeight: 500 }}>{customer.fullName || "New customer"}</b>
                <span className="muted ellipsis" style={{ fontSize: 12 }}>{[customer.email, customer.phone].filter(Boolean).join(" · ")}</span>
              </span>
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>Pick or create a customer to start.</p>
          )}
        </section>
        <section className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2>How this differs from the website</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            No marketing steps and no price page. The customer still pays through the payment gateway and sees the same dashboard afterwards. What you type is logged as entered by staff on their behalf, and they can edit it from their dashboard before paying.
          </p>
        </section>
      </aside>
    </div>
  )
}
