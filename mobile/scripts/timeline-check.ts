// Node-only checks for the Home timeline, hero choice and next action (no device, no network, no DB rows created).
// Input rows have exactly the live visa_applications shape and go through the real mapper (toApplication), so the
// rules are checked against what the app actually reads. Run: bun scripts/run-check.ts scripts/timeline-check.ts
import { toApplication, type VisaRow } from "../lib/data";
import { buildTimeline, chooseHero, doneCount, submittedAt, type Step } from "../lib/timeline";
import { nextAction } from "../lib/nextAction";
import { buildChecklist } from "../lib/checklist";
import { employmentOf, keepOrigin, requirementsFor } from "../lib/data";
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
const next = (a: ReturnType<typeof row>) => nextAction(a, buildChecklist(requirementsFor(employmentOf(a)), a.documents, a.status).customer);
const selfEmployed = { employmentStatus: "student" }; // complete employment answers with no NOC requirement
const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
/** Every answer the app asks after payment (Continue application), so an app row is complete. */
const afterPay = { ...selfEmployed, purposeOfTrip: "tourism", travelStartDate: inDays(30), travelEndDate: inDays(40), datesFlexible: "no", travelingWith: "alone", hotelCategory: "3-star",
  fundingSource: "self", balanceRange: "10000-25000", isFirstSchengenVisa: "yes", previousRefusals: "no", residenceVisaValid: "yes", dateOfBirth: "1990-01-01",
  hasValidPassport: "yes", passportNumber: "N1234567", passportExpiry: inDays(2000) };
const app = { source: "mobile-app", platform: "ios" };
const up = (type: string, at: string) => ({ type, path: `x/${type}.pdf`, name: `${type}.pdf`, at });
const ALL = ["passportCopy", "residencyCopy", "photo", "bankStatement"];
const future = new Date(Date.now() + 9 * 864e5).toISOString(); const past = new Date(Date.now() - 3 * 864e5).toISOString();

// The website's six steps, in order, and no decision step.
{ const s = buildTimeline(row({}));
  ok(s.map((x) => x.key).join(",") === "payment,documents,review,preparation,ready,appointment", "order: payment, documents, review, preparation, ready, appointment (the website tracker)");
  ok(!s.some((x) => /decision|approved|refused/i.test(x.label + (x.note ?? ""))), "no decision step or wording"); }

// A. Website submission, unpaid.
{ const a = row({}); const s = buildTimeline(a);
  ok(st(s, "payment").state === "current" && st(s, "payment").at === null, "A unpaid: Payment is current, no time");
  ok(["documents", "review", "preparation", "ready", "appointment"].every((k) => st(s, k as any).state === "todo"), "A later steps not done");
  ok(next(a).kind === "pay", "A next action: Pay"); }

// B. Paid, documents partly uploaded.
{ const a = row({ payment_status: "paid", payment_id: "z1" }, { ...app, submittedAt: "2026-10-02T09:30:00Z", wizard: afterPay, uploads: [up("passportCopy", "2026-10-03T10:00:00Z")] });
  const s = buildTimeline(a);
  ok(st(s, "payment").state === "done" && st(s, "payment").at === null, "B Payment done, no invented paid time (no column)");
  ok(st(s, "documents").state === "current" && st(s, "documents").note === "{n} of {total} uploaded", "B Documents current with the count, like the website");
  ok(next(a).kind === "upload", "B next action: Upload documents"); }

// C. Paid, every document in, staff reviewing: Expert review is current.
{ const s = buildTimeline(row({ application_status: "reviewing", payment_status: "paid" }, { ...app, wizard: selfEmployed, uploads: ALL.map((t, i) => up(t, `2026-10-0${4 + i}T10:00:00Z`)) }));
  ok(st(s, "documents").state === "done" && st(s, "documents").at === "2026-10-07T10:00:00Z", "C Documents done at the last real upload time");
  ok(st(s, "review").state === "current", "C Expert review current"); }

// D. Status approved = the file is being prepared (website getStage), never a visa approval.
{ const a = row({ application_status: "approved", payment_status: "paid" }, { ...app, wizard: selfEmployed, uploads: ALL.map((t) => up(t, "2026-10-04T10:00:00Z")) });
  const s = buildTimeline(a);
  ok(st(s, "review").state === "done" && st(s, "preparation").state === "current", "D approved: Preparation current");
  ok(next(a).title === "Preparing your file", "D next action: Preparing your file"); }

// E. File ready, no appointment yet: Ready current (download and print), Appointment next.
{ const a = row({ application_status: "ready", payment_status: "paid" }, { ...app, wizard: selfEmployed, uploads: ALL.map((t) => up(t, "2026-10-04T10:00:00Z")) });
  const s = buildTimeline(a);
  ok(st(s, "ready").state === "current" && st(s, "appointment").state === "todo", "E ready: Ready current, Appointment to do");
  ok(next(a).kind === "appointment" && next(a).cta === "Add the appointment", "E next action: Add the appointment"); }

// F. File ready and an appointment entered: every step done (the website's appointmentSettled), date shown.
{ const a = row({ application_status: "ready", payment_status: "paid", appointment_at: future, appointment_centre: "VFS Dubai" }, { ...app, wizard: selfEmployed, uploads: ALL.map((t) => up(t, "2026-10-04T10:00:00Z")) });
  const s = buildTimeline(a);
  ok(st(s, "appointment").state === "done" && st(s, "appointment").at === future && st(s, "appointment").scheduled === true && st(s, "appointment").note === "VFS Dubai", "F Appointment done with its date and centre");
  ok(doneCount(s) === 6, "F progress 6 of 6");
  ok(next(a).kind === "appointment" && next(a).cta === "View appointment", "F upcoming appointment: View appointment"); }

// G. Appointment passed: our work is finished, nothing about a decision.
{ const a = row({ application_status: "ready", payment_status: "paid", appointment_at: past }, { ...app, wizard: selfEmployed, uploads: ALL.map((t) => up(t, "2026-10-04T10:00:00Z")) });
  ok(next(a).title === "All done" && next(a).kind === "none", "G past appointment: All done, no action"); }

// H. Completed: all six done.
{ const a = row({ application_status: "completed", payment_status: "paid" }, { ...app });
  ok(doneCount(buildTimeline(a)) === 6, "H completed: 6 of 6 done");
  ok(next(a).title === "All done", "H next action: All done (no visa decision)"); }

// I. Closed by EZvisa (status rejected): the step it stopped at is Closed, nothing current, no refusal wording.
{ const a = row({ application_status: "rejected", payment_status: "paid" }, { ...app, wizard: selfEmployed }); const s = buildTimeline(a);
  ok(!s.some((x) => x.state === "current") && s.some((x) => x.label === "Closed" && x.state === "failed"), "I rejected: one step Closed, nothing current");
  ok(next(a).title === "Application closed", "I next action: Application closed"); }

// J. Cancelled by EZvisa after payment.
{ const s = buildTimeline(row({ application_status: "cancelled", payment_status: "paid" }, { ...app, submittedAt: "2026-10-02T09:30:00Z" }));
  ok(st(s, "payment").state === "done" && s.some((x) => x.label === "Cancelled" && x.state === "failed"), "J staff-cancelled paid case: Cancelled"); }

// K. Discarded by the customer while still a draft: nothing is marked done or failed.
{ const a = row({ application_status: "cancelled" }, { ...app, discarded_at: "2026-10-05T10:00:00Z" }); const s = buildTimeline(a);
  ok(doneCount(s) === 0 && !s.some((x) => x.state === "failed"), "K discarded draft: no step done or failed");
  ok(chooseHero([a], []) === null, "K discarded case is never the Home hero"); }

// L. Payment failed.
{ const s = buildTimeline(row({ payment_status: "failed" }));
  ok(st(s, "payment").state === "attention" && st(s, "payment").label === "Payment failed", "L failed payment needs attention"); }

// L2. A document rejected by staff (document_reviews).
{ const a = row({ payment_status: "paid", document_reviews: { passportCopy: { status: "rejected", reason: "Blurry", at: "2026-10-06T10:00:00Z" } } }, { ...app, wizard: afterPay, uploads: [up("passportCopy", "2026-10-03T10:00:00Z")] });
  const s = buildTimeline(a);
  ok(st(s, "documents").state === "attention" && st(s, "documents").note === "Re-upload needed", "L2 rejected document: Documents needs attention");
  ok(next(a).kind === "upload" && next(a).title.startsWith("Re-upload"), "L2 next action: Re-upload"); }

// L3. Website row with has_* flags only (no upload times), file ready: documents done, no time; Ready current.
{ const s = buildTimeline(row({ application_status: "ready", payment_status: "paid", has_passport: true, has_photos: true, has_bank_statements: true, has_employment_proof: true }));
  ok(st(s, "documents").state === "done" && st(s, "documents").at === null, "L3 flags only: Documents done with no time");
  ok(st(s, "ready").state === "current" && st(s, "appointment").state === "todo", "L3 no appointment data: Appointment not done"); }

// M. Paid but employment answers missing -> Continue application.
{ ok(next(row({ payment_status: "paid" }, { ...app })).kind === "continue", "M paid, employment missing: Continue application"); }
// N. The passport number is asked after payment too: employment done but no number (column or wizard) -> Continue application.
{ ok(next(row({ payment_status: "paid", passport_number: null }, { ...app, wizard: { ...selfEmployed, hasValidPassport: "yes" } })).kind === "continue", "N paid, passport number missing: Continue application");
  ok(next(row({ payment_status: "paid", passport_number: null }, { ...app, wizard: afterPay })).kind !== "continue", "N paid, every after-payment answer in the wizard notes: no Continue");
  { const { passportNumber: _n, ...noNumber } = afterPay;
    ok(next(row({ payment_status: "paid", passport_number: "N1234567" }, { wizard: noNumber })).kind !== "continue", "N paid, number only in the passport_number column (website row): no Continue"); }
  ok(next(row({ payment_status: "paid", passport_number: "N1234567" }, { wizard: selfEmployed })).kind === "continue", "N website row with trip details still missing: Continue application (the website's /continue asks them too)");
  ok(next(row({ payment_status: "paid", passport_number: "N1234567" }, { ...app, wizard: { ...selfEmployed, passportNumber: "N1234567" } })).kind === "continue", "N paid app row with trip and passport answers missing: Continue application");
  ok(next(row({ payment_status: "pending", passport_number: null }, { ...app, wizard: selfEmployed })).kind === "pay", "N unpaid, no number: still Pay, never Continue"); }

// N. Draft -> Continue draft.
{ const a = row({ application_status: "draft" }, { ...app }); const s = buildTimeline(a);
  ok(doneCount(s) === 0 && st(s, "payment").state === "current" && st(s, "payment").label === "Finish application", "N draft: nothing done, Finish application current");
  ok(next(a).kind === "draft" && next(a).cta === "Continue draft", "N next action: Continue draft"); }

// O. Hero choice with several applications (newest first).
{ const active = row({ id: "a0000000-0000-4000-8000-000000000001", payment_status: "paid" });
  const done = row({ id: "a0000000-0000-4000-8000-000000000002", application_status: "rejected" });
  const draft = { key: "d1" };
  ok((chooseHero([done, active], [draft]) as any)?.a?.id === active.id, "O active case wins over a newer finished case and a draft");
  ok((chooseHero([done], [draft]) as any)?.d === draft, "O draft wins over a finished case");
  ok((chooseHero([done], []) as any)?.a?.id === done.id, "O finished case shown when nothing else");
  ok(chooseHero([], []) === null, "O no applications: empty state"); }

// P. Website row (employment status stored at notes.employmentStatus, no wizard), not employed, paid, every non-NOC document
//    in: no NOC is asked for (hard rule: no NOC for self-employed), on the timeline or in the next action.
{ const a = row({ application_status: "reviewing", payment_status: "paid", passport_number: "N1234567" },
    { employmentStatus: "student", uploads: ALL.map((t) => up(t, "2026-10-03T10:00:00Z")) });
  ok(st(buildTimeline(a), "documents").state === "done", "P website non-employed row: Documents done without a NOC");
  ok(!(next(a).kind === "upload" && /NOC/i.test(next(a).body)), `P website non-employed row: next action never asks for a NOC (got "${next(a).title} · ${next(a).body}")`); }

// Q. Same website row but employed: the NOC is still required (the fix must not drop it for employees).
{ const a = row({ application_status: "reviewing", payment_status: "paid", passport_number: "N1234567" },
    { employmentStatus: "employed", jobTitle: "Engineer", companyName: "Acme", monthlySalary: "10000-15000", uploads: ALL.map((t) => up(t, "2026-10-03T10:00:00Z")) });
  ok(st(buildTimeline(a), "documents").state !== "done", "Q website employed row without a NOC: Documents not done");
  ok(requirementsFor(employmentOf(a)).some((r) => r.document_type === "nocCertificate"), "Q website employed row: the NOC stays in the checklist"); }

// R. Staff rejected a document the customer uploaded on the website (known only from has_passport). The review was
//    written after the upload, and writing it moved updated_at on: the rejection must still show.
{ const a = row({ application_status: "reviewing", payment_status: "paid", passport_number: "N1234567", has_passport: true, updated_at: "2026-10-22T10:00:00.412+00:00",
    document_reviews: { passportCopy: { status: "rejected", reason: "Blurry", at: "2026-10-22T10:00:00.000Z" } } }, { employmentStatus: "student", wizard: afterPay });
  ok(st(buildTimeline(a), "documents").state === "attention", "R website-flag document rejected by staff: Documents needs attention");
  ok(next(a).kind === "upload" && next(a).title.startsWith("Re-upload"), `R website-flag document rejected: next action Re-upload (got "${next(a).title}")`); }

// S. File ready (staff moved it past review) while some website documents are only partly known: no upload is offered,
//    since uploads are closed in that status (UPLOAD_STATUSES); the file-ready state is shown instead.
{ const a = row({ application_status: "ready", payment_status: "paid", passport_number: "N1234567", has_passport: true, has_photos: true, has_bank_statements: true }, { employmentStatus: "student" });
  ok(st(buildTimeline(a), "documents").state === "done", "S ready: Documents done");
  ok(next(a).kind !== "upload", `S ready: next action never offers an upload the server would refuse (got "${next(a).title}")`); }

// T. Refunded / partly refunded: never asked to pay again.
{ for (const p of ["refunded", "partially_refunded"]) { const a = row({ application_status: "reviewing", payment_status: p, passport_number: "N1234567" }, { employmentStatus: "student" });
    ok(next(a).kind !== "pay", `T ${p}: no Pay action (got "${next(a).title}")`); } }

// U. A website row after the customer answered "Continue application" in the app: it stays a website row, so its real
//    submit time (created_at) is kept and Continue is not asked a second time with the app's full question set.
{ const webNotes = { employmentStatus: "student" };
  const saved = { ...keepOrigin(webNotes), lastEditedOn: "app", wizard: { ...afterPay, employmentStatus: "student", hasValidPassport: "yes", passportNumber: "N1234567" } };
  const a = row({ application_status: "reviewing", payment_status: "paid", passport_number: "N1234567" }, saved);
  ok(saved.source !== "mobile-app", "U keepOrigin: a website row is not relabelled as an app row");
  ok(submittedAt(a) === base.created_at, "U website row after Continue: the submit time stays real");
  ok(next(a).kind !== "continue", `U website row after Continue: not asked to continue again (got "${next(a).title}")`);
  ok(keepOrigin({ source: "mobile-app" }).source === "mobile-app", "U keepOrigin: app rows stay app rows"); }

console.log(fail ? `${fail} FAILED` : "ALL PASS"); process.exit(fail ? 1 : 0);
