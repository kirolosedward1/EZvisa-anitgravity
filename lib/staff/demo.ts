/**
 * Demo data for the staff console's demo session (local and preview builds only, lib/staff/session.ts). Invented
 * people and cases, generated from a fixed seed with times relative to now so SLA clocks look live. Never written
 * anywhere and never shown to a real staff session.
 */
import type { VisaApplication } from "@/lib/types/visa-application"
import type { DocumentReviews } from "@/lib/document-reviews"

export type DemoStaffMember = { id: string; name: string; email: string; role: "admin" | "specialist" | "support" | "finance" }

export const DEMO_STAFF: DemoStaffMember[] = [
  { id: "demo-staff-1", name: "Nour Saleh", email: "nour.demo@ezvisa.net", role: "specialist" },
  { id: "demo-staff-2", name: "Omar Khaled", email: "omar.demo@ezvisa.net", role: "specialist" },
  { id: "demo-staff-3", name: "Lina Haddad", email: "lina.demo@ezvisa.net", role: "specialist" },
]

/** The demo session acts as the first demo specialist, so "My cases" has something in it. */
export const DEMO_SELF_ID = DEMO_STAFF[0].id

const FIRST = ["Amira", "Basel", "Dalia", "Fadi", "Ghada", "Hisham", "Iman", "Jad", "Karim", "Layla", "Majed", "Nadia", "Rami", "Salma", "Tamer", "Yara", "Ziad", "Hala", "Wael", "Reem"]
const LAST = ["Aziz", "Barakat", "Darwish", "Farouk", "Haddad", "Ibrahim", "Khoury", "Mansour", "Nasser", "Qasim", "Rizk", "Sabbagh", "Toma", "Yousef", "Zein"]
const COUNTRIES = ["France", "Italy", "Spain", "Germany", "Czech Republic", "Sweden", "Croatia", "Netherlands", "Greece", "Bulgaria"]
const CENTRES = ["VFS Global Dubai, Wafi Mall", "TLScontact Dubai", "VFS Global Abu Dhabi", "BLS International Dubai"]
const DOCS = [
  { type: "passportCopy", flag: "has_passport", file: "passport.pdf" },
  { type: "residencyCopy", flag: "has_passport", file: "residence-visa.jpg" },
  { type: "photo", flag: "has_photos", file: "photo.jpg" },
  { type: "bankStatement", flag: "has_bank_statements", file: "bank-statement.pdf" },
  { type: "nocCertificate", flag: "has_employment_proof", file: "noc-letter.pdf" },
] as const

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

type Kind = "draft" | "failed" | "docs-missing" | "docs-uploaded" | "review" | "sent-back" | "prep" | "ready" | "help" | "booked" | "completed" | "cancelled"

/** How many demo cases of each kind (roughly the mix a busy week has). */
const MIX: [Kind, number][] = [
  ["draft", 14], ["failed", 2], ["docs-missing", 9], ["docs-uploaded", 5], ["review", 4], ["sent-back", 3], ["prep", 6],
  ["ready", 7], ["help", 3], ["booked", 6], ["completed", 8], ["cancelled", 2],
]

export type DemoConsoleData = { apps: VisaApplication[]; reviews: Record<string, DocumentReviews>; owners: Record<string, string | null> }

let cached: { at: number; data: DemoConsoleData } | null = null

export function demoConsoleData(now = Date.now()): DemoConsoleData {
  // Regenerated at most once a minute so relative times stay current without changing on every render.
  if (cached && now - cached.at < 60_000) return cached.data
  const rand = rng(20261030)
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]
  const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString()
  const apps: VisaApplication[] = []
  const reviews: Record<string, DocumentReviews> = {}
  const owners: Record<string, string | null> = {}
  let n = 0

  for (const [kind, count] of MIX) {
    for (let i = 0; i < count; i++) {
      n++
      const id = `demo-case-${String(n).padStart(3, "0")}`
      const created = hoursAgo(6 + rand() * 24 * 13)
      const paid = !["draft", "failed"].includes(kind)
      const uploadedAll = !["draft", "failed", "docs-missing"].includes(kind)
      const uploads: { type: string; path: string; name: string; at: string }[] = []
      const flags: Record<string, boolean> = { has_passport: false, has_photos: false, has_bank_statements: false, has_employment_proof: false }
      const docCount = uploadedAll ? DOCS.length : kind === "docs-missing" ? Math.floor(rand() * 3) : 0
      for (const d of DOCS.slice(0, docCount)) {
        const at = kind === "docs-uploaded" ? hoursAgo(1 + rand() * 40) : hoursAgo(30 + rand() * 120)
        uploads.push({ type: d.type, path: `${id}/${d.file}`, name: d.file, at })
        flags[d.flag] = true
      }
      const r: DocumentReviews = {}
      if (["docs-uploaded", "review"].includes(kind)) {
        // Some documents already approved, the rest waiting.
        for (const u of uploads.slice(0, Math.floor(rand() * 3))) r[u.type] = { status: "approved", note: null, reviewedAt: hoursAgo(2) }
        if (kind === "review") for (const u of uploads) if (!r[u.type] && rand() > 0.5) r[u.type] = { status: "checking", note: null, reviewedAt: u.at }
      }
      if (kind === "sent-back") {
        for (const u of uploads) r[u.type] = { status: "approved", note: null, reviewedAt: hoursAgo(20) }
        r.bankStatement = { status: "rejected", note: "The statement is missing the bank stamp.", reviewedAt: hoursAgo(20) }
      }
      if (["prep", "ready", "help", "booked", "completed"].includes(kind)) {
        for (const u of uploads) r[u.type] = { status: "approved", note: null, reviewedAt: hoursAgo(kind === "prep" ? 10 + rand() * 50 : 80) }
      }
      reviews[id] = r

      const status =
        kind === "draft" || kind === "failed" ? "draft"
        : kind === "prep" ? "preparation"
        : kind === "ready" || kind === "help" ? "ready"
        : kind === "booked" ? "appointment_booked"
        : kind === "completed" ? "completed"
        : kind === "cancelled" ? "cancelled"
        : "submitted"
      const appointmentAt =
        kind === "booked" ? new Date(now + (rand() * 6 - 1) * 86400_000).toISOString().slice(0, 14) + "30:00.000Z" : null

      apps.push({
        id,
        tracking_token: `ez-${id.replace(/\D/g, "").padStart(3, "0")}${Math.floor(rand() * 0xfffff).toString(16).padStart(5, "0")}`,
        full_name: `${pick(FIRST)} ${pick(LAST)}`,
        email: `${id}@example.com`,
        phone: "+971 50 000 0000",
        nationality: pick(["Egypt", "Jordan", "Lebanon", "Syria", "India", "Pakistan"]),
        destination_country: pick(COUNTRIES),
        travel_purpose: "tourism",
        ...(() => {
          const start = new Date(now + (12 + rand() * 110) * 86400_000)
          const end = new Date(start.getTime() + (6 + Math.floor(rand() * 15)) * 86400_000)
          const day = (d: Date) => d.toISOString().slice(0, 10)
          return rand() > 0.25 ? { entry_date: day(start), exit_date: day(end) } : {}
        })(),
        ...flags,
        additional_notes: JSON.stringify({
          employmentStatus: "employed",
          spouseAccompanying: rand() > 0.8 ? "yes" : "no",
          uploads,
          ...(kind === "ready" && rand() > 0.5 ? { insurancePreference: "quote" } : {}),
        }),
        payment_status: kind === "failed" ? "failed" : paid ? "paid" : "pending",
        payment_amount: paid || kind === "failed" ? 249 : null,
        paid_at: paid ? new Date(Date.parse(created) + 600_000).toISOString() : null,
        application_status: status,
        appointment_at: appointmentAt,
        appointment_centre: appointmentAt ? pick(CENTRES) : null,
        appointment_help_status: kind === "help" ? "requested" : null,
        appointment_help_requested_at: kind === "help" ? hoursAgo(2 + rand() * 10) : null,
        file_downloaded_at: kind === "ready" && rand() > 0.4 ? hoursAgo(20) : null,
        created_at: created,
        updated_at: hoursAgo(1 + rand() * 30),
      })
      owners[id] = paid && kind !== "cancelled" && rand() > 0.12 ? pick(DEMO_STAFF).id : null
    }
  }
  apps.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
  cached = { at: now, data: { apps, reviews, owners } }
  return cached.data
}
