"use server"

// New case on behalf of a customer (New case board). Builds the row with the same shared contract as the website
// wizard (lib/shared/wizard-contract.ts applicationColumns), so the customer's dashboard and the app read it the same
// way. The case opens as Payment due: the customer signs in with this email and pays through the payment gateway.
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordApplicationEvent } from "@/lib/application-events-server"
import { serviceClient } from "@/lib/applications"
import { flexibleEntryDate, schengenEndDate } from "@/lib/dates"
import { applicationColumns, EMPLOYMENT, MARITAL, PURPOSES, SCHENGEN, priceAed, type WizardAnswers } from "@/lib/shared/wizard-contract"
import { recordAudit } from "@/lib/staff/audit"
import { isOpen } from "@/lib/staff/cases"
import { loadConsoleData } from "@/lib/staff/data"
import { getStaff } from "@/lib/staff/session"
import { getReference } from "@/lib/application-status"

const values = (opts: { value: string }[]) => opts.map((o) => o.value) as [string, ...string[]]
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const SOURCES = ["whatsapp", "phone", "walk_in", "referral", "email"] as const

const schema = z
  .object({
    customer: z.object({
      fullName: z.string().trim().min(3).max(120),
      email: z.string().trim().toLowerCase().email().max(160),
      phone: z.string().trim().min(7).max(30),
      nationality: z.string().trim().min(2).max(60),
      language: z.enum(["en", "ar"]),
    }),
    trip: z.object({
      destination: z.enum(SCHENGEN as [string, ...string[]]),
      purpose: z.enum(values(PURPOSES)),
      dates: z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("fixed"), start: date, end: date }),
        z.object({ kind: z.literal("flexible"), month: z.string().regex(/^\d{4}-\d{2}$/), days: z.number().int().min(1).max(90) }),
      ]),
      otherCountries: z.string().trim().max(200),
      spouse: z.boolean(),
    }),
    traveller: z.object({
      dateOfBirth: z.union([date, z.literal("")]),
      maritalStatus: z.union([z.enum(values(MARITAL)), z.literal("")]),
      employmentStatus: z.union([z.enum(values(EMPLOYMENT)), z.literal("")]),
      companyName: z.string().trim().max(120),
      employmentStartDate: z.union([z.string().regex(/^\d{4}-\d{2}$/), z.literal("")]),
      previousSchengen: z.enum(["recent", "older", "no", ""]),
      previousRefusals: z.enum(["yes", "no", ""]),
      fundingSource: z.enum(["self", "sponsor", "company", ""]),
    }),
    ownerId: z.string().max(64).nullable(),
    source: z.enum(SOURCES),
  })
  .refine((v) => v.trip.dates.kind !== "fixed" || v.trip.dates.end > v.trip.dates.start, { message: "The exit date must be after the entry date." })

export type NewCaseInput = z.input<typeof schema>
export type NewCaseResult =
  | { ok: true; id: string; ref: string; name: string; fee: number; payLink: string; whatsapp: string | null; demo?: boolean; ownerName: string }
  | { ok: false; error: string }

export async function createCaseOnBehalf(input: NewCaseInput): Promise<NewCaseResult> {
  const staff = await getStaff()
  if (!staff) return { ok: false, error: "Your session has ended. Sign in again." }
  if (staff.role === "finance") return { ok: false, error: "Finance has cases read only." }
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message?.startsWith("The exit") ? parsed.error.issues[0].message : "Some answers are missing or not valid. Check the highlighted steps." }
  const v = parsed.data

  // Owner: the chosen team member, or the active specialist with the fewest open cases.
  const { cases, team } = await loadConsoleData(staff)
  const specialists = team.filter((m) => m.role === "specialist" && m.active)
  const openCount = (id: string) => cases.filter((c) => isOpen(c) && c.ownerId === id).length
  const owner = v.ownerId ? team.find((m) => m.id === v.ownerId) : [...specialists].sort((a, b) => openCount(a.id) - openCount(b.id))[0]
  if (v.ownerId && !owner) return { ok: false, error: "That team member is not active." }
  const rule = v.ownerId ? "manual" : "fewest_open"

  const [first, ...rest] = v.customer.fullName.split(/\s+/)
  const start = v.trip.dates.kind === "fixed" ? v.trip.dates.start : flexibleEntryDate(v.trip.dates.month)
  const end = v.trip.dates.kind === "fixed" ? v.trip.dates.end : schengenEndDate(start, v.trip.dates.days) ?? ""
  const answers: Partial<WizardAnswers> = {
    destination: v.trip.destination,
    nationality: v.customer.nationality,
    countryOfResidence: "United Arab Emirates",
    firstName: first,
    lastName: rest.join(" "),
    email: v.customer.email,
    phone: v.customer.phone,
    whatsappOptIn: true,
    dateOfBirth: v.traveller.dateOfBirth,
    maritalStatus: v.traveller.maritalStatus as WizardAnswers["maritalStatus"],
    spouseAccompanying: v.trip.spouse ? "yes" : v.traveller.maritalStatus === "married" ? "no" : "",
    employmentStatus: v.traveller.employmentStatus as WizardAnswers["employmentStatus"],
    companyName: v.traveller.companyName,
    employmentStartDate: v.traveller.employmentStartDate,
    purposeOfTrip: v.trip.purpose,
    travelStartDate: start,
    travelEndDate: end,
    datesFlexible: v.trip.dates.kind === "flexible" ? "yes" : "no",
    travelingWith: v.trip.spouse ? "spouse" : "alone",
    fundingSource: v.traveller.fundingSource,
    isFirstSchengenVisa: v.traveller.previousSchengen === "" ? "" : v.traveller.previousSchengen === "no" ? "yes" : "no",
    previousRefusals: v.traveller.previousRefusals,
    willVisitOtherCountries: v.trip.otherCountries ? "yes" : "no",
    itinerary: v.trip.otherCountries ? `Other Schengen countries: ${v.trip.otherCountries}` : "",
  }
  const fee = priceAed(answers.spouseAccompanying, answers.travelingWith)
  const ownerName = owner?.name ?? "Unassigned"

  if (staff.demo) {
    return { ok: true, demo: true, id: "demo", ref: "EZ-DEMO0000", name: v.customer.fullName, fee, ownerName, payLink: "https://www.ezvisa.net/dashboard", whatsapp: null }
  }

  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const columns = applicationColumns(answers, v.customer.email, "payment", {}, {
    platform: "web",
    source: "website",
    extra: {
      // Who typed it, and from which channel; the customer can still edit it from their dashboard before paying.
      enteredByStaff: { id: staff.staffId, name: staff.name, at: new Date().toISOString(), channel: v.source },
      preferredLanguage: v.customer.language,
      ...(v.traveller.previousSchengen ? { previousSchengenWhen: v.traveller.previousSchengen } : {}),
    } as Record<string, unknown>,
  })
  const row = { ...columns, payment_status: "pending", application_status: "submitted", has_passport: false, has_photos: false, has_bank_statements: false, has_employment_proof: false }
  const { data, error } = await client.from("visa_applications").insert([row]).select("id, tracking_token").single()
  if (error || !data) {
    console.error("[new case] insert failed:", error?.code)
    return { ok: false, error: "The case could not be created. Nothing was saved." }
  }

  if (owner) {
    await client.from("case_assignments").insert({ application_id: data.id, staff_id: owner.id, assigned_by: staff.staffId, rule })
    await recordApplicationEvent(data.id, "specialist_assigned", { name: owner.name.split(/\s+/)[0] }, "team", client)
  }
  const ref = getReference(data.tracking_token) || data.id.slice(0, 8)
  await recordAudit(staff, {
    action: `Case created on behalf of ${v.customer.fullName} (${v.source.replace("_", " ")}), owner ${ownerName}`,
    type: "edit",
    targetTable: "visa_applications",
    targetId: data.id,
    targetLabel: ref,
    field: "case",
    after: { destination: v.trip.destination, fee, owner: ownerName, rule, source: v.source },
    notified: "No (pay link shared by staff)",
  }, client)

  revalidatePath("/admin/cases")
  revalidatePath("/admin/overview")
  const payLink = `https://www.ezvisa.net/dashboard?id=${data.id}`
  const digits = v.customer.phone.replace(/\D/g, "")
  const text =
    v.customer.language === "ar"
      ? `مرحباً ${first}، أنشأنا طلب تأشيرة ${v.trip.destination} (${ref}). سجّل الدخول بهذا البريد ${v.customer.email} وادفع رسوم الخدمة (${fee} درهم) من هنا: ${payLink}`
      : `Hi ${first}, we have started your ${v.trip.destination} visa application (${ref}). Sign in with ${v.customer.email} and pay the service fee (${fee} AED) here: ${payLink}`
  return {
    ok: true,
    id: data.id,
    ref,
    name: v.customer.fullName,
    fee,
    ownerName,
    payLink,
    whatsapp: digits.length >= 8 ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null,
  }
}
