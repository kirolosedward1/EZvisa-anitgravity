import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import {
  datesInOrder,
  flexibleEntryDate,
  isValidCalendarDate,
  INVALID_DATE_MESSAGE,
  RETURN_AFTER_DEPARTURE,
  schengenEndDate,
  schengenStayDays,
  todayIsoUae,
  TRIP_LENGTHS,
} from "@/lib/dates"
import { isPaid } from "@/lib/application-status"
import { UUID_RE } from "@/lib/applications"
import { rememberTravellersFromApplication } from "@/lib/travellers"
import { sanitizeInput } from "@/lib/sanitize"
import { canonicalSchengenCountry } from "@/lib/countries"
import { toWesternDigits, normalizePassport } from "@/lib/digits"
import { hasInvalidPhone, uaeMobileE164 } from "@/lib/phone"

// Arabic/Persian digits typed on the client become Western before validation and saving (Western input unchanged).
const DIGIT_FIELDS = ["phone", "dateOfBirth", "travelStartDate", "travelEndDate", "travelMonth", "tripLength", "employmentStartDate"]
function normalizeDigits(input: unknown): Record<string, any> {
  if (!input || typeof input !== "object") return {}
  const f: Record<string, any> = { ...(input as Record<string, any>) }
  for (const key of DIGIT_FIELDS) if (typeof f[key] === "string") f[key] = toWesternDigits(f[key])
  if (typeof f.passportNumber === "string") f.passportNumber = normalizePassport(f.passportNumber)
  if (Array.isArray(f.additionalCountries)) {
    f.additionalCountries = f.additionalCountries.map((v: unknown) => {
      if (!v || typeof v !== "object") return v
      const visit: Record<string, any> = { ...(v as Record<string, any>) }
      for (const key of ["arrivalDate", "departureDate"]) if (typeof visit[key] === "string") visit[key] = toWesternDigits(visit[key])
      return visit
    })
  }
  return f
}

// Post-payment answers (/continue/[id]), the same ones the app asks after payment: trip details, passport, spouse
// and employment. Every field is optional per request: each continue screen saves only what it asked.

const EMPLOYMENT = new Set(["employed", "business", "freelancer", "student", "unemployed", "retired"])
const OPTIONS: Record<string, Set<string>> = {
  purposeOfTrip: new Set(["tourism", "business", "family", "medical", "education", "other"]),
  travelingWith: new Set(["alone", "spouse", "family", "friends", "group"]),
  hotelCategory: new Set(["3-star", "4-star", "5-star", "sponsor"]),
  fundingSource: new Set(["self", "sponsor", "company"]),
  balanceRange: new Set(["under-10000", "10000-25000", "25000-50000", "50000-plus"]),
  isFirstSchengenVisa: new Set(["yes", "no"]),
  previousRefusals: new Set(["yes", "no"]),
  willVisitOtherCountries: new Set(["yes", "no"]),
  residenceVisaValid: new Set(["yes", "no"]),
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? sanitizeInput(v.trim(), max) : "")
const yesNo = (v: unknown) => (v === "yes" || v === "no" ? v : "")
const bad = (error: string) => NextResponse.json({ error }, { status: 400 })

export async function POST(request: Request) {
  const body = normalizeDigits(await request.json().catch(() => ({})))
  if (hasInvalidPhone(body.phone)) {
    return NextResponse.json({ success: false, message: "Enter a valid phone number." }, { status: 400 })
  }
  // Same canonical form as submit-application. A missing or blank phone is left untouched.
  const storedPhone = typeof body.phone === "string" ? (uaeMobileE164(body.phone) ?? "") : ""
  const id = typeof body.id === "string" ? body.id : ""
  if (!id) return NextResponse.json({ error: "Missing application" }, { status: 400 })
  // Demo sandbox rows live in code (lib/demo-data): nothing to save, and no Supabase session.
  if (id.startsWith("demo-")) return NextResponse.json({ ok: true, demo: true })

  const supabase = await createServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const email = auth.user?.email
  if (!email) return NextResponse.json({ error: "Sign in required" }, { status: 401 })

  const { data: app, error: loadError } = await supabase
    .from("visa_applications")
    .select("id, email, payment_status, additional_notes, passport_number, entry_date, exit_date")
    .eq("id", id)
    .eq("email", email)
    .maybeSingle()

  if (loadError || !app) return NextResponse.json({ error: "Application not found" }, { status: 404 })
  if (!isPaid(app)) return NextResponse.json({ error: "Payment is required first" }, { status: 409 })

  // ---- Trip dates: exact dates, or a flexible month + length (same rule as the wizard and the app) ----
  let start = typeof body.travelStartDate === "string" ? body.travelStartDate : ""
  let end = typeof body.travelEndDate === "string" ? body.travelEndDate : ""
  const flexible = body.datesFlexible === "yes"
  const travelMonth = str(body.travelMonth, 10)
  const tripLength = str(body.tripLength, 5)
  if (flexible) {
    const month = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(travelMonth)
    const length = Number(tripLength)
    if (!month || !TRIP_LENGTHS.some((item) => item.days === length)) return bad("Choose a travel month and trip length.")
    start = flexibleEntryDate(`${month[1]}-${month[2]}`)
    end = schengenEndDate(start, length) || ""
  }
  if ((start && !isValidCalendarDate(start)) || (end && !isValidCalendarDate(end))) return bad(INVALID_DATE_MESSAGE)
  if (!!start !== !!end) return bad("Please select a departure date and a return date.")
  if (start && end && !datesInOrder(start, end)) return bad(RETURN_AFTER_DEPARTURE)
  if (start && !flexible && start < todayIsoUae()) return bad("Your departure date is in the past. Please choose new dates.")
  if (start && end && schengenStayDays(start, end) > 90) return bad("Stay duration cannot exceed 90 days")

  // ---- Trip choices ----
  const trip: Record<string, unknown> = {}
  for (const [key, allowed] of Object.entries(OPTIONS)) {
    const value = str(body[key], 30)
    if (!value) continue
    if (!allowed.has(value)) return bad("Please choose one of the options.")
    trip[key] = value
  }
  if (trip.previousRefusals === "yes") {
    const details = str(body.refusalDetails, 1000)
    if (!details) return bad("Tell us briefly about the refusal.")
    trip.refusalDetails = details
  }
  if (Array.isArray(body.additionalCountries)) {
    trip.additionalCountries = body.additionalCountries.slice(0, 10).flatMap((v: unknown) => {
      const visit = (v ?? {}) as Record<string, unknown>
      const country = canonicalSchengenCountry(str(visit.country, 60))
      const arrivalDate = str(visit.arrivalDate, 20)
      const departureDate = str(visit.departureDate, 20)
      if (!country || !isValidCalendarDate(arrivalDate) || !isValidCalendarDate(departureDate)) return []
      return [{ country, arrivalDate, departureDate }]
    })
  }
  const itinerary = str(body.itinerary, 2000)
  if (itinerary) trip.itinerary = itinerary

  // ---- Passport, spouse, employment ----
  const hasValidPassport = yesNo(body.hasValidPassport)
  const passportNumber = typeof body.passportNumber === "string" ? body.passportNumber.trim().slice(0, 20) : ""
  const spouse = {
    spouseFirstName: str(body.spouseFirstName, 100),
    spouseLastName: str(body.spouseLastName, 100),
    spouseHasValidPassport: yesNo(body.spouseHasValidPassport),
    spouseOccupation: str(body.spouseOccupation, 100),
  }
  const employmentStatus = typeof body.employmentStatus === "string" ? body.employmentStatus : ""
  if (employmentStatus && !EMPLOYMENT.has(employmentStatus)) return bad("Choose an employment status")

  let notes: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(app.additional_notes || "{}")
    if (parsed && typeof parsed === "object") notes = parsed
  } catch {
    notes = {}
  }
  const wizard = (notes.wizard && typeof notes.wizard === "object" ? notes.wizard : {}) as Record<string, unknown>
  Object.assign(wizard, trip)
  if (flexible) Object.assign(wizard, { datesFlexible: "yes", travelMonth, tripLength })
  else if (start) wizard.datesFlexible = "no"
  if (start) wizard.travelStartDate = start
  if (end) wizard.travelEndDate = end
  if (hasValidPassport) wizard.hasValidPassport = hasValidPassport
  if (passportNumber) wizard.passportNumber = passportNumber
  for (const [key, value] of Object.entries(spouse)) if (value) wizard[key] = value
  if (employmentStatus) {
    wizard.employmentStatus = employmentStatus
    notes.employmentStatus = employmentStatus
    for (const key of ["jobTitle", "companyName", "employmentStartDate", "monthlySalary", "hasNOC", "averageMonthlyIncome"] as const) {
      const value = typeof body[key] === "string" ? body[key].trim().slice(0, 120) : ""
      if (value) wizard[key] = value
    }
  }
  wizard.lastEditedOn = "website"
  if (storedPhone) wizard.phone = storedPhone
  notes.wizard = wizard
  // The saved traveller the spouse was picked from ("Who is travelling?" on the spouse step), if any.
  const spouseTravellerId = typeof body.spouseTravellerId === "string" && UUID_RE.test(body.spouseTravellerId) ? body.spouseTravellerId : ""
  if (spouseTravellerId) notes.spouseTravellerId = spouseTravellerId
  else if (body.spouseTravellerId === null) delete notes.spouseTravellerId

  const patch: Record<string, string | number> = { additional_notes: JSON.stringify(notes) }
  if (passportNumber) patch.passport_number = passportNumber
  if (typeof trip.purposeOfTrip === "string") patch.travel_purpose = trip.purposeOfTrip
  // entry_date / exit_date are the real columns (readers fall back to travel_*_date for old rows only). Writing
  // travel_*_date too made the whole update fail where those columns don't exist.
  if (start) patch.entry_date = start
  if (end) patch.exit_date = end
  if (start && end) patch.duration_days = schengenStayDays(start, end)
  if (storedPhone) patch.phone = storedPhone

  const { data: saved, error } = await supabase.from("visa_applications").update(patch).eq("id", id).eq("email", email).select("id")
  if (error) {
    console.error("[continue-application] update failed", error.code)
    return NextResponse.json({ error: "Could not save your answers. Please try again." }, { status: 400 })
  }
  // RLS only lets customers update draft/submitted/reviewing rows: zero rows means nothing was saved.
  if (!saved?.length) {
    return NextResponse.json({ error: "This application can no longer be edited here. Please contact support." }, { status: 409 })
  }
  // The case is paid: an updated passport number or a newly named spouse goes to the account's saved travellers.
  await rememberTravellersFromApplication({ ...app, email, passport_number: passportNumber || app.passport_number, additional_notes: JSON.stringify(notes) })
  return NextResponse.json({ ok: true })
}
