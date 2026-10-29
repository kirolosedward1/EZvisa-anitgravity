// Post-payment appointment step. The prepared file must have been downloaded first.
// Help is accepted only for the caller's own paid application. No price is stored.
import { parseCalendarDate } from "@/lib/dates"
import { toWesternDigits } from "@/lib/digits"
import { sanitizeInput } from "@/lib/sanitize"

/** Single source for the help-request status line. Change the timeframe here. */
export const APPOINTMENT_HELP_STATUS_TEXT = {
  en: "Help requested, our team will contact you soon",
  ar: "طُلبت المساعدة، وسيتواصل معك فريقنا قريبًا",
} as const

export type AppointmentChoice = "has_one" | "help_requested" | "later"
export type AppointmentHelpStatus = "requested" | "contacted" | "booked" | "cancelled"
export type AppointmentCardState = "not_answered" | "later" | "help_requested" | "contacted" | "booked" | "cancelled"

export type AppointmentApp = {
  email?: string | null
  payment_status?: string | null
  application_status?: string | null
  file_downloaded_at?: string | null
  appointment_choice?: string | null
  appointment_at?: string | null
  appointment_centre?: string | null
  appointment_address?: string | null
  appointment_reference?: string | null
  appointment_help_status?: string | null
  appointment_help_requested_at?: string | null
}

export type AppointmentInput = {
  action?: string
  date?: string
  time?: string
  centre?: string
  address?: string
  reference?: string
}

export type AppointmentDecision =
  | { ok: true; patch: Record<string, string | null> }
  | { ok: false; status: number; code: string }

const STAFF_HELP = new Set(["contacted", "booked", "cancelled"])

export function isPaidStatus(status?: string | null): boolean {
  return status === "paid" || status === "completed"
}

export function ownsApplication(app: AppointmentApp, email: string): boolean {
  const owner = (app.email ?? "").trim().toLowerCase()
  const caller = email.trim().toLowerCase()
  return owner.length > 0 && owner === caller
}

/** The appointment step is open only after the prepared file has been downloaded. */
export function appointmentReachable(app: AppointmentApp): boolean {
  if (!isPaidStatus(app.payment_status)) return false
  const status = (app.application_status || "").toLowerCase()
  if (status === "cancelled" || status === "rejected") return false
  return Boolean(app.file_downloaded_at)
}

export function hasAppointmentTime(value?: string | null): boolean {
  return Boolean(value) && !Number.isNaN(Date.parse(value as string))
}

export function appointmentSettled(app: AppointmentApp): boolean {
  if (app.appointment_choice === "has_one" || app.appointment_choice === "later" || app.appointment_choice === "help_requested") return true
  if (app.appointment_help_status === "requested" || STAFF_HELP.has(app.appointment_help_status || "")) return true
  return hasAppointmentTime(app.appointment_at)
}

/** Date and time are UAE local (Asia/Dubai, UTC+4). Returns an ISO timestamp or null. */
export function appointmentInstant(date: string, time: string): string | null {
  const parsed = parseCalendarDate(toWesternDigits(date).trim())
  const clock = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(toWesternDigits(time).trim())
  if (!parsed || !clock) return null
  const instant = new Date(`${parsed.iso}T${clock[1]}:${clock[2]}:00+04:00`)
  if (Number.isNaN(instant.getTime())) return null
  return instant.toISOString()
}

export function validateAppointmentSlot(date: string, time: string, now = new Date()): "invalid_date" | "past_date" | null {
  const instant = appointmentInstant(date, time)
  if (!instant) return "invalid_date"
  if (Date.parse(instant) < now.getTime()) return "past_date"
  return null
}

function staffOwned(status?: string | null): boolean {
  return STAFF_HELP.has(status || "")
}

/**
 * Server decision for saving the appointment step.
 * A foreign application is not found. An unpaid one is rejected. So is a file that
 * has not been downloaded. Past dates are rejected. Help never writes a price.
 */
export function planAppointmentWrite(app: AppointmentApp, callerEmail: string, input: AppointmentInput, now = new Date()): AppointmentDecision {
  if (!ownsApplication(app, callerEmail)) return { ok: false, status: 404, code: "not_found" }
  if (!isPaidStatus(app.payment_status)) return { ok: false, status: 403, code: "unpaid" }
  if (!appointmentReachable(app)) return { ok: false, status: 403, code: "not_downloaded" }

  if (input.action === "help_requested") {
    const patch: Record<string, string | null> = { appointment_choice: "help_requested" }
    if (!staffOwned(app.appointment_help_status)) {
      patch.appointment_help_status = "requested"
      patch.appointment_help_requested_at = app.appointment_help_requested_at || now.toISOString()
    }
    return { ok: true, patch }
  }

  if (input.action === "later") {
    const patch: Record<string, string | null> = { appointment_choice: "later" }
    if (!staffOwned(app.appointment_help_status)) {
      patch.appointment_help_status = null
      patch.appointment_help_requested_at = null
    }
    return { ok: true, patch }
  }

  if (input.action !== "has_one") return { ok: false, status: 400, code: "action" }

  const slot = validateAppointmentSlot(input.date || "", input.time || "", now)
  if (slot) return { ok: false, status: 400, code: slot }
  const centre = sanitizeInput(toWesternDigits(input.centre || ""), 160).trim()
  if (!centre) return { ok: false, status: 400, code: "centre" }
  const address = sanitizeInput(input.address || "", 300).trim()
  const reference = sanitizeInput(toWesternDigits(input.reference || ""), 80).trim()
  return {
    ok: true,
    patch: {
      appointment_choice: "has_one",
      appointment_at: appointmentInstant(input.date || "", input.time || ""),
      appointment_centre: centre,
      appointment_address: address || null,
      appointment_reference: reference || null,
    },
  }
}

export function appointmentCardState(app: AppointmentApp): AppointmentCardState | null {
  const help = app.appointment_help_status
  const choice = app.appointment_choice
  if (hasAppointmentTime(app.appointment_at)) return "booked"
  if (help === "cancelled") return "cancelled"
  if (help === "booked") return "booked"
  if (help === "contacted") return "contacted"
  if (choice === "help_requested" || help === "requested") return "help_requested"
  if (choice === "later") return "later"
  if (appointmentReachable(app)) return "not_answered"
  return null
}
