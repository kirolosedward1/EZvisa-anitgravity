import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { APPLICATION_STEPS, customerProgress } from "./application-status.ts"
import {
  APPOINTMENT_HELP_STATUS_TEXT,
  appointmentCardState,
  appointmentReachable,
  planAppointmentWrite,
  validateAppointmentSlot,
  type AppointmentApp,
} from "./appointment.ts"
import { customerText } from "./translations/customer.ts"
import { appointmentCentreOptions, centrePlace, centreProviderName, VISA_CENTRES } from "./visa-centres.ts"

const NOW = new Date("2026-10-26T12:00:00+04:00")

const paidReady: AppointmentApp = {
  email: "owner@example.com",
  payment_status: "paid",
  application_status: "ready",
  file_downloaded_at: "2026-10-20T10:00:00.000Z",
}

test("appointment stays locked until the prepared file has been downloaded", () => {
  const locked = { ...paidReady, file_downloaded_at: null }
  assert.equal(appointmentReachable(locked), false)
  assert.equal(customerProgress(locked).key, "ready")
  assert.equal(customerProgress(locked).finished, false)

  assert.equal(appointmentReachable(paidReady), true)
  assert.equal(customerProgress(paidReady).key, "appointment")
  assert.equal(customerProgress(paidReady).finished, false)
  assert.equal(customerProgress({ ...paidReady, appointment_choice: "later" }).finished, true)

  const keys = APPLICATION_STEPS.map((step) => step.key)
  assert.equal(keys.indexOf("appointment"), keys.indexOf("ready") + 1)
})

test("a URL-level save is rejected before the file is downloaded", () => {
  const decision = planAppointmentWrite(paidReady, "owner@example.com", { action: "later" })
  assert.equal(decision.ok, true)
  const locked = planAppointmentWrite({ ...paidReady, file_downloaded_at: null }, "owner@example.com", { action: "later" })
  assert.equal(locked.ok, false)
  if (!locked.ok) assert.equal(locked.status, 403)
  if (!locked.ok) assert.equal(locked.code, "not_downloaded")
})

test("past appointment dates are rejected", () => {
  assert.equal(validateAppointmentSlot("2026-10-25", "09:00", NOW), "past_date")
  assert.equal(validateAppointmentSlot("2026-10-26", "11:59", NOW), "past_date")
  assert.equal(validateAppointmentSlot("2026-10-26", "12:00", NOW), null)
  assert.equal(validateAppointmentSlot("2026-10-26", "15:30", NOW), null)
  assert.equal(validateAppointmentSlot("2026-02-31", "15:00", NOW), "invalid_date")
  assert.equal(validateAppointmentSlot("26/10/2026", "15:00", NOW), null)

  const past = planAppointmentWrite(paidReady, "owner@example.com", {
    action: "has_one",
    date: "2026-10-25",
    time: "09:00",
    centre: "VFS Global, Dubai",
  }, NOW)
  assert.equal(past.ok, false)
  if (!past.ok) assert.equal(past.code, "past_date")

  const ok = planAppointmentWrite(paidReady, "owner@example.com", {
    action: "has_one",
    date: "2026-11-02",
    time: "09:30",
    centre: "VFS Global, Dubai",
    address: "WAFI Mall",
  }, NOW)
  assert.equal(ok.ok, true)
  if (ok.ok) {
    assert.equal(ok.patch.appointment_choice, "has_one")
    assert.equal(ok.patch.appointment_centre, "VFS Global, Dubai")
    assert.equal(ok.patch.appointment_at, "2026-11-02T05:30:00.000Z")
    assert.equal("price" in ok.patch, false)
  }
})

test("help is refused for an unpaid or foreign application", () => {
  const unpaid = planAppointmentWrite({ ...paidReady, payment_status: "pending" }, "owner@example.com", { action: "help_requested" })
  assert.equal(unpaid.ok, false)
  if (!unpaid.ok) {
    assert.equal(unpaid.status, 403)
    assert.equal(unpaid.code, "unpaid")
  }

  const foreign = planAppointmentWrite(paidReady, "someone-else@example.com", { action: "help_requested" })
  assert.equal(foreign.ok, false)
  if (!foreign.ok) assert.equal(foreign.status, 404)

  const own = planAppointmentWrite(paidReady, "Owner@Example.com", { action: "help_requested" }, NOW)
  assert.equal(own.ok, true)
  if (own.ok) {
    assert.equal(own.patch.appointment_choice, "help_requested")
    assert.equal(own.patch.appointment_help_status, "requested")
    assert.equal(own.patch.appointment_help_requested_at, NOW.toISOString())
    assert.equal("price" in own.patch, false)
    assert.equal("payment_amount" in own.patch, false)
  }
})

test("a customer help request does not downgrade a staff status", () => {
  const decision = planAppointmentWrite(
    { ...paidReady, appointment_help_status: "contacted", appointment_help_requested_at: "2026-10-01T00:00:00.000Z" },
    "owner@example.com",
    { action: "help_requested" },
  )
  assert.equal(decision.ok, true)
  if (decision.ok) assert.equal("appointment_help_status" in decision.patch, false)
})

test("help status copy lives in one constant", () => {
  assert.equal(customerText("en", "appt.helpStatus"), APPOINTMENT_HELP_STATUS_TEXT.en)
  assert.equal(customerText("ar", "appt.helpStatus"), APPOINTMENT_HELP_STATUS_TEXT.ar)
  assert.equal(/[٠-٩۰-۹]/.test(APPOINTMENT_HELP_STATUS_TEXT.ar), false)
  assert.match(APPOINTMENT_HELP_STATUS_TEXT.en, /Help requested, our team will contact you soon/)
})

test("dashboard card states follow the appointment choice", () => {
  assert.equal(appointmentCardState(paidReady), "not_answered")
  assert.equal(appointmentCardState({ ...paidReady, appointment_choice: "later" }), "later")
  assert.equal(appointmentCardState({ ...paidReady, appointment_choice: "help_requested", appointment_help_status: "requested" }), "help_requested")
  assert.equal(appointmentCardState({ ...paidReady, appointment_help_status: "contacted" }), "contacted")
  assert.equal(appointmentCardState({ ...paidReady, appointment_help_status: "cancelled" }), "cancelled")
  assert.equal(appointmentCardState({ ...paidReady, appointment_at: "2026-11-12T06:30:00.000Z", appointment_centre: "TLScontact, Dubai" }), "booked")
  assert.equal(appointmentCardState({ payment_status: "pending", application_status: "submitted" }), null)
})

test("centre place shows the provider above the address and builds no map link", () => {
  assert.deepEqual(centrePlace("TLScontact, Dubai", "Al Manara Building, 2nd Floor, Sheikh Zayed Road, Dubai"), {
    provider: "TLScontact",
    address: "Al Manara Building, 2nd Floor, Sheikh Zayed Road, Dubai",
  })
  assert.equal(centreProviderName("BLS Dubai"), "BLS International")
  assert.equal(centreProviderName("VFS"), "VFS Global")
  assert.deepEqual(centrePlace("Community hall", "Sheikh Zayed Road"), {
    provider: "Community hall",
    address: "Sheikh Zayed Road",
  })
  const source = readFileSync(new URL("./visa-centres.ts", import.meta.url), "utf8")
  assert.equal(/maps\.|directions|daddr|appointment_lat/.test(source), false)
})

test("dropdown centres match the visa centre guide", () => {
  const src = readFileSync(new URL("../components/tools/appointment-guide-client.tsx", import.meta.url), "utf8")
  const lit = src.split(/const APPOINTMENT_CENTERS[^=]*=\s*/)[1].split(/\n}\n/)[0] + "\n}"
  const web = new Function(`return (${lit});`)() as Record<string, { provider: string; countries: string[]; dubaiAddress: string; abuDhabiAddress: string }>
  assert.deepEqual(Object.keys(web).sort(), VISA_CENTRES.map((item) => item.key).sort())
  for (const item of VISA_CENTRES) {
    const guide = web[item.key]
    assert.equal(guide.provider, item.provider)
    assert.deepEqual(guide.countries, item.countries)
    assert.equal(guide.dubaiAddress, item.dubaiAddress)
    assert.equal(guide.abuDhabiAddress, item.abuDhabiAddress)
    const options = appointmentCentreOptions(item.countries[0])
    assert.equal(options.length, 2)
    assert.equal(options[0].provider, item.provider)
    assert.equal(options[0].address, item.dubaiAddress)
    assert.equal(options[1].address, item.abuDhabiAddress)
  }
  assert.deepEqual(appointmentCentreOptions("Bulgaria"), [])
})
