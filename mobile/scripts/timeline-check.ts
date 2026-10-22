// Node-only checks for the Home timeline, hero choice and next action (no device, no network, no DB rows created).
// Input rows have exactly the live visa_applications shape and go through the real mapper (toApplication), so the
// rules are checked against what the app actually reads. Run: bun scripts/run-check.ts scripts/timeline-check.ts
import { toApplication, type VisaRow } from "../lib/data";
import { buildTimeline, chooseHero, doneCount, type Step } from "../lib/timeline";
import { nextAction } from "../lib/nextAction";
import { buildChecklist } from "../lib/checklist";
import { requirementsFor } from "../lib/data";
declare const process: any;

let fail = 0;
const ok = (c: boolean, l: string) => { console.log(`${c ? "PASS" : "FAIL"}  ${l}`); if (!c) fail++; };
const base: VisaRow = {
  id: "11111111-2222-4333-8444-555555555555", additional_notes: null, application_status: "submitted", created_at: "2026-10-01T08:00:00Z", updated_at: "2026-10-20T08:00:00Z",
  date_of_birth: "1990-01-01", destination_country: "France", duration_days: 10, email: "test@example.com", entry_date: "2026-12-10", exit_date: "2026-12-20", full_name: "Test Person",
  has_accommodation: null, has_bank_statements: false, has_employment_proof: false, has_flight_booking: null, has_passport: false, has_photos: false, has_travel_insurance: null,
  nationality: "India", noc_url: null, passport_number: "X1", passport_url: null, payment_amount: null, payment_id: null, payment_status: "pending", phone: "+971500000000", photo_url: null,
  previous_rejections: false, previous_schengen_visa: false, referrer: null, rejection_details: null, residency_url: null, search_vector: null, submission_ip: null, travel_purpose: "tourism", user_agent: null,
};
const row = (p: Partial<VisaRow> & Record<string, unknown>, notes?: Record<string, unknown>) => toApplication({ ...base, ...p, additional_notes: notes ? JSON.stringify(notes) : (p.additional_notes ?? null) } as VisaRow);
const st = (s: Step[], k: Step["key"]) => s.find((x) => x.key === k)!;
const next = (a: ReturnType<typeof row>) => nextAction(a, buildChecklist(requirementsFor((a.notes?.wizard as any)?.employmentStatus), a.documents).customer);
const selfEmployed = { employmentStatus: "student" }; // complete employment answers with no NOC requirement
const app = { source: "mobile-app", platform: "ios" };
const up = (type: string, at: string) => ({ type, path: `x/${type}.pdf`, name: `${type}.pdf`, at });
const ALL = ["passportCopy", "residencyCopy", "photo", "bankStatement"];
const future = new Date(Date.now() + 9 * 864e5).toISOString(); const past = new Date(Date.now() - 3 * 864e5).toISOString();

// A. Website submission, unpaid (row inserted at submit, so created_at is the submit time).
{ const a = row({}); const s = buildTimeline(a);
  ok(st(s, "submitted").state === "done" && st(s, "submitted").at === base.created_at, "A website row: Submitted done at created_at");
  ok(st(s, "paid").state === "current" && st(s, "paid").at === null, "A unpaid: Paid is current, no time");
  ok(["documents", "appointment", "decision"].every((k) => st(s, k as any).state === "todo"), "A later steps not done");
  ok(next(a).kind === "pay", "A next action: Pay"); }

// B. App draft submitted in the app, paid, documents partly uploaded.
{ const a = row({ payment_status: "paid", payment_id: "z1", created_at: "2026-09-01T08:00:00Z" }, { ...app, submittedAt: "2026-10-02T09:30:00Z", wizard: selfEmployed, uploads: [up("passportCopy", "2026-10-03T10:00:00Z")] });
  const s = buildTimeline(a);
  ok(st(s, "submitted").at === "2026-10-02T09:30:00Z", "B app row: Submitted time is notes.submittedAt, not the draft's created_at");
  ok(st(s, "paid").state === "done" && st(s, "paid").at === null, "B Paid done, no invented paid time (no column)");
  ok(st(s, "documents").state === "current" && st(s, "documents").at === null, "B Documents current while some are missing");
  ok(next(a).kind === "upload", "B next action: Upload documents"); }

// C. App row submitted before submittedAt existed: done, but no time (created_at is the draft start).
{ const a = row({ created_at: "2026-09-01T08:00:00Z" }, { ...app }); const s = buildTimeline(a);
  ok(st(s, "submitted").state === "done" && st(s, "submitted").at === null, "C missing timestamp: Submitted done without a time"); }

// D. Paid, every document uploaded, file ready, upcoming appointment.
{ const a = row({ application_status: "ready", payment_status: "paid", appointment_at: future, appointment_centre: "VFS Dubai", appointment_address: "Wafi Mall" },
    { ...app, submittedAt: "2026-10-02T09:30:00Z", wizard: selfEmployed, uploads: ALL.map((t, i) => up(t, `2026-10-0${4 + i}T10:00:00Z`)) });
  const s = buildTimeline(a);
  ok(st(s, "documents").state === "done" && st(s, "documents").at === "2026-10-07T10:00:00Z", "D Documents done at the last real upload time");
  ok(st(s, "appointment").state === "done" && st(s, "appointment").at === future && st(s, "appointment").scheduled === true, "D Appointment shows the scheduled time");
  ok(st(s, "decision").state === "current", "D Decision is the current step");
  ok(next(a).kind === "appointment" && next(a).cta === "View appointment", "D next action: View appointment");
  ok(doneCount(s) === 4, "D progress 4 of 5"); }

// E. Appointment already passed, no decision yet.
{ const a = row({ application_status: "ready", payment_status: "paid", appointment_at: past }, { ...app, wizard: selfEmployed, uploads: ALL.map((t) => up(t, "2026-10-04T10:00:00Z")) });
  ok(next(a).title === "Awaiting decision" && next(a).kind === "none", "E past appointment: Awaiting decision, no action"); }

// F. Refused (status rejected).
{ const a = row({ application_status: "rejected", payment_status: "paid" }, { ...app, wizard: selfEmployed }); const s = buildTimeline(a);
  ok(st(s, "decision").state === "failed" && st(s, "decision").label === "Visa refused" && st(s, "decision").at === null, "F Decision failed: Visa refused, no time");
  ok(!s.some((x) => x.state === "current"), "F nothing is current after a decision");
  ok(next(a).title === "Visa refused", "F next action: Visa refused"); }

// G. Granted (status completed).
{ const s = buildTimeline(row({ application_status: "completed", payment_status: "paid" }, { ...app }));
  ok(st(s, "decision").state === "done" && st(s, "decision").label === "Visa granted", "G Decision done: Visa granted"); }

// H. Cancelled by EZvisa after payment.
{ const s = buildTimeline(row({ application_status: "cancelled", payment_status: "paid" }, { ...app, submittedAt: "2026-10-02T09:30:00Z" }));
  ok(st(s, "submitted").state === "done" && st(s, "paid").state === "done" && st(s, "decision").label === "Cancelled" && st(s, "decision").state === "failed", "H staff-cancelled paid case: Cancelled"); }

// I. Discarded by the customer while still a draft: nothing is marked done.
{ const a = row({ application_status: "cancelled" }, { ...app, discarded_at: "2026-10-05T10:00:00Z" }); const s = buildTimeline(a);
  ok(doneCount(s) === 0, "I discarded draft: no step done without evidence");
  ok(chooseHero([a], []) === null, "I discarded case is never the Home hero"); }

// J. Payment failed.
{ const s = buildTimeline(row({ payment_status: "failed" }));
  ok(st(s, "paid").state === "attention" && st(s, "paid").label === "Payment failed", "J failed payment needs attention"); }

// K. A document rejected by staff (document_reviews).
{ const a = row({ payment_status: "paid", document_reviews: { passportCopy: { status: "rejected", reason: "Blurry", at: "2026-10-06T10:00:00Z" } } }, { ...app, wizard: selfEmployed, uploads: [up("passportCopy", "2026-10-03T10:00:00Z")] });
  const s = buildTimeline(a);
  ok(st(s, "documents").state === "attention" && st(s, "documents").note === "Re-upload needed", "K rejected document: Documents needs attention");
  ok(next(a).kind === "upload" && next(a).title.startsWith("Re-upload"), "K next action: Re-upload"); }

// L. Website row with has_* flags only (no upload times), file ready: done, no time.
{ const s = buildTimeline(row({ application_status: "ready", payment_status: "paid", has_passport: true, has_photos: true, has_bank_statements: true, has_employment_proof: true }));
  ok(st(s, "documents").state === "done" && st(s, "documents").at === null, "L flags only: Documents done with no time");
  ok(st(s, "appointment").state === "current", "L no appointment data: Appointment not done"); }

// M. Paid but employment answers missing -> Continue application.
{ ok(next(row({ payment_status: "paid" }, { ...app })).kind === "continue", "M paid, employment missing: Continue application"); }
// N. The passport number is asked after payment too: employment done but no number (column or wizard) -> Continue application.
{ ok(next(row({ payment_status: "paid", passport_number: null }, { ...app, wizard: { ...selfEmployed, hasValidPassport: "yes" } })).kind === "continue", "N paid, passport number missing: Continue application");
  ok(next(row({ payment_status: "paid", passport_number: null }, { ...app, wizard: { ...selfEmployed, hasValidPassport: "yes", passportNumber: "N1234567" } })).kind !== "continue", "N paid, number in the wizard notes: no Continue");
  ok(next(row({ payment_status: "paid", passport_number: "N1234567" }, { ...app, wizard: selfEmployed })).kind !== "continue", "N paid, number only in the passport_number column (website row): no Continue");
  ok(next(row({ payment_status: "pending", passport_number: null }, { ...app, wizard: selfEmployed })).kind === "pay", "N unpaid, no number: still Pay, never Continue"); }

// N. Draft -> Continue draft.
{ const a = row({ application_status: "draft" }, { ...app }); const s = buildTimeline(a);
  ok(doneCount(s) === 0 && st(s, "submitted").state === "current", "N draft: nothing done, Submitted current");
  ok(next(a).kind === "draft" && next(a).cta === "Continue draft", "N next action: Continue draft"); }

// O. Hero choice with several applications (newest first).
{ const active = row({ id: "a0000000-0000-4000-8000-000000000001", payment_status: "paid" });
  const done = row({ id: "a0000000-0000-4000-8000-000000000002", application_status: "rejected" });
  const draft = { key: "d1" };
  ok((chooseHero([done, active], [draft]) as any)?.a?.id === active.id, "O active case wins over a newer finished case and a draft");
  ok((chooseHero([done], [draft]) as any)?.d === draft, "O draft wins over a finished case");
  ok((chooseHero([done], []) as any)?.a?.id === done.id, "O finished case shown when nothing else");
  ok(chooseHero([], []) === null, "O no applications: empty state"); }

console.log(fail ? `${fail} FAILED` : "ALL PASS"); process.exit(fail ? 1 : 0);
