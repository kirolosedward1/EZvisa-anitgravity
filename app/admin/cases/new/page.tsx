// New case board: a case created by staff on behalf of a customer (WhatsApp inquiry, phone call, walk-in).
import { NewCaseForm, type CustomerOption } from "@/components/staff/new-case-form"
import { PermissionDenied } from "@/components/staff/states"
import { CITIZENSHIP_OPTIONS } from "@/lib/nationalities"
import { isOpen } from "@/lib/staff/cases"
import { loadConsoleData } from "@/lib/staff/data"
import { sectionAccess } from "@/lib/staff/guard"

export const dynamic = "force-dynamic"

export default async function NewCasePage() {
  const { staff } = await sectionAccess("cases")
  if (staff.role === "finance") {
    return <PermissionDenied what="Finance has cases read only" role={staff.role} who="A specialist, Support or an admin can create a case for a customer." />
  }
  const { cases, team } = await loadConsoleData(staff)

  // One entry per customer email, newest case first (name and phone from their latest case).
  const byEmail = new Map<string, CustomerOption>()
  for (const c of [...cases].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const email = c.email.trim().toLowerCase()
    if (!email) continue
    const known = byEmail.get(email)
    if (known) known.cases++
    else byEmail.set(email, { email, name: c.name, phone: c.phone, nationality: c.nationality, cases: 1 })
  }
  const owners = team
    .filter((m) => m.active && (m.role === "specialist" || m.role === "admin"))
    .map((m) => ({ id: m.id, name: m.name, open: cases.filter((c) => isOpen(c) && c.ownerId === m.id).length }))

  return (
    <>
      <div className="ezc-pagehead" style={{ display: "flex", alignItems: "baseline", gap: "4px 12px", flexWrap: "wrap" }}>
        <a href="/staff/cases" className="muted" style={{ fontSize: 13 }}>&larr; Cases</a>
        <span className="muted" aria-hidden="true">/</span>
        <h1>New case on behalf of a customer</h1>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Same questions as the website wizard, no marketing, saved as Payment due under the customer&rsquo;s email.</p>
      </div>
      <NewCaseForm customers={[...byEmail.values()]} nationalities={CITIZENSHIP_OPTIONS.map((c) => c.name)} owners={owners} />
    </>
  )
}
