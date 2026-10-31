"use server"

// Appointments board: save an appointment booked on the centre's site on the customer's behalf. The customer's
// dashboard then shows the countdown and checklist. Save appointments permission (Admin, Specialist, Support).
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordApplicationEvent } from "@/lib/application-events-server"
import { serviceClient, UUID_RE } from "@/lib/applications"
import { appointmentInstant, validateAppointmentSlot } from "@/lib/appointment"
import { recordAudit } from "@/lib/staff/audit"
import { can } from "@/lib/staff/roles"
import { getStaff } from "@/lib/staff/session"

export type ApptResult = { ok: true; message: string } | { ok: false; error: string }

export async function saveAppointment(input: { id: string; date: string; time: string; centre: string; reference: string }): Promise<ApptResult> {
  const staff = await getStaff()
  if (!staff) return { ok: false, error: "Your session has ended. Sign in again." }
  if (!can(staff.role, "appt")) return { ok: false, error: "Your role cannot save appointments." }
  const parsed = z
    .object({ id: staff.demo ? z.string().min(1) : z.string().regex(UUID_RE), date: z.string(), time: z.string(), centre: z.string().trim().min(2).max(160), reference: z.string().trim().max(80) })
    .safeParse(input)
  if (!parsed.success) return { ok: false, error: "Fill in the date, time and centre." }
  const v = parsed.data
  const slot = validateAppointmentSlot(v.date, v.time)
  if (slot) return { ok: false, error: slot === "past_date" ? "That date is in the past." : "Enter a valid date and time." }
  const at = appointmentInstant(v.date, v.time)
  if (!at) return { ok: false, error: "Enter a valid date and time." }
  if (staff.demo) return { ok: true, message: `Demo: appointment saved for ${v.date} ${v.time} at ${v.centre}. Nothing was stored.` }

  const client = serviceClient()
  if (!client) return { ok: false, error: "The database is not configured." }
  const { data: row } = await client.from("visa_applications").select("application_status, payment_status, appointment_at, appointment_centre").eq("id", v.id).maybeSingle()
  if (!row) return { ok: false, error: "Case not found." }
  if (!["paid", "completed"].includes((row.payment_status ?? "").toLowerCase())) return { ok: false, error: "The case is not paid yet." }

  const base = { appointment_at: at, appointment_centre: v.centre, appointment_reference: v.reference || null, updated_at: new Date().toISOString(), ...(row.application_status === "ready" ? { application_status: "appointment_booked" } : {}) }
  // appointment_choice and appointment_help_status come with migration 002; without it the slot is still saved.
  let { error } = await client.from("visa_applications").update({ ...base, appointment_choice: "has_one", appointment_help_status: "booked" }).eq("id", v.id)
  if (error && (error.code === "42703" || error.code === "PGRST204")) ({ error } = await client.from("visa_applications").update(base).eq("id", v.id))
  if (error) return { ok: false, error: "The appointment could not be saved." }

  await recordAudit(staff, {
    action: `Appointment saved on behalf of the customer: ${v.date} ${v.time}, ${v.centre}${v.reference ? `, ref ${v.reference}` : ""}`,
    type: "appointment",
    targetTable: "visa_applications",
    targetId: v.id,
    field: "appointment_at",
    before: { at: row.appointment_at, centre: row.appointment_centre },
    after: { at, centre: v.centre },
    notified: "Customer dashboard",
    reversible: false,
  }, client)
  await recordApplicationEvent(v.id, "appointment_saved", { at, centre: v.centre }, "team", client)
  revalidatePath("/admin/appointments")
  revalidatePath(`/admin/cases/${v.id}`)
  revalidatePath("/admin/overview")
  return { ok: true, message: `Appointment saved: ${v.date} ${v.time} at ${v.centre}. The customer sees the countdown and checklist on their dashboard.` }
}
