"use server"

// Console search (the top bar and Ctrl+K): cases by name, email, phone, EZ reference, tracking code or country, and
// customers by email. Reads the same per-request console data as the boards; nothing is written.
import { loadConsoleData } from "@/lib/staff/data"
import { getStaff } from "@/lib/staff/session"
import { STAGE } from "@/lib/staff/cases"

export type SearchHit =
  | { kind: "case"; id: string; title: string; sub: string; stage: string; tone: string; href: string }
  | { kind: "customer"; id: string; title: string; sub: string; href: string }

export async function searchConsole(query: string): Promise<SearchHit[]> {
  const staff = await getStaff()
  if (!staff) return []
  const q = String(query ?? "").trim().toLowerCase().slice(0, 80)
  if (q.length < 2) return []
  const digits = q.replace(/\D/g, "")
  const { cases } = await loadConsoleData(staff)
  const score = (c: (typeof cases)[number]): number => {
    const ref = c.ref.toLowerCase()
    if (ref === q || ref.replace(/^ez-?/, "") === q.replace(/^ez-?/, "")) return 100
    if (c.trackingToken && c.trackingToken.toLowerCase() === q) return 95
    if (c.email.toLowerCase() === q) return 90
    if (digits.length >= 5 && c.phone.replace(/\D/g, "").includes(digits)) return 80
    if (c.name.toLowerCase().startsWith(q)) return 70
    if (ref.includes(q) || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) return 60
    if (c.country.toLowerCase().startsWith(q)) return 30
    return 0
  }
  const matched = cases.map((c) => ({ c, s: score(c) })).filter((x) => x.s > 0)
  matched.sort((a, b) => b.s - a.s || Number(b.c.side === "us") - Number(a.c.side === "us") || b.c.updatedAt.localeCompare(a.c.updatedAt))
  const hits: SearchHit[] = matched.slice(0, 8).map(({ c }) => ({
    kind: "case",
    id: c.id,
    title: c.name,
    sub: `${c.ref} · ${c.country} · ${c.what}`,
    stage: STAGE[c.stage].label,
    tone: STAGE[c.stage].tone,
    href: `/staff/cases/${c.id}`,
  }))
  const customers = new Map<string, { name: string; n: number }>()
  for (const { c } of matched) {
    const e = c.email.toLowerCase()
    if (!e) continue
    const x = customers.get(e) ?? { name: c.name, n: 0 }
    x.n++
    customers.set(e, x)
  }
  for (const [email, x] of [...customers.entries()].slice(0, 4)) {
    hits.push({ kind: "customer", id: email, title: x.name, sub: `${email} · ${x.n} ${x.n === 1 ? "case" : "cases"}`, href: `/staff/customers?email=${encodeURIComponent(email)}` })
  }
  return hits
}
