// Continue application (after payment) against an in-memory Supabase (scripts/stubs/supabase.js). No network, no DB.
// Covers: saveAfterPayment writes only the after-payment answers (a website row keeps its name, contact, nationality,
// destination and source), needsContinue and the screen agree (no redirect loop), and unwritable rows report it.
// Run: node scripts/run-test-after-payment.mjs
// @ts-ignore plain JS stub
import { db as fake } from "./stubs/supabase.js";
import { saveAfterPayment, needsContinue, continueForm, toApplication, isWebsiteRow } from "../lib/data";
import { continueQuestions, continueError, firstError } from "../lib/questions";
declare const process: any;
const db: any = fake;

let fail = 0; const ok = (c: boolean, l: string) => { console.log(`${c ? "PASS" : "FAIL"}  ${l}`); if (!c) fail++; };
const ME = { id: "uid-a", email: "a+ezvisa-app-test@example.com", user_metadata: {} };
const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const base = { application_status: "submitted", payment_status: "paid", created_at: "2026-10-01T08:00:00Z", updated_at: "2026-10-01T08:00:00Z", has_passport: false, has_photos: false, has_bank_statements: false, has_employment_proof: false };
db.user = ME;

(async () => {
  // ---- 1. Website row: only passport number + employment are asked, and nothing else on the row changes ----
  const web: any = { ...base, id: "web-1", email: ME.email, full_name: "Omar Saleh", phone: "+971501112233", nationality: "Egypt", destination_country: "France",
    entry_date: "2026-12-01", exit_date: "2026-12-10", travel_purpose: "tourism", passport_number: null, date_of_birth: "1990-05-05",
    additional_notes: JSON.stringify({ maritalStatus: "single", spouseAccompanying: "no", uploads: [{ type: "photo", path: "x", name: "p.jpg", at: "2026-10-02" }] }) };
  db.rows = [web];
  let a = toApplication(web);
  ok(isWebsiteRow(a), "row without source = website row");
  ok(needsContinue(a), "website row, paid, no passport number or employment: Continue needed");
  let f = continueForm(a);
  const qs = continueQuestions(f, true);
  ok(qs.length > 0 && qs.every((q) => q.step === "employment" || q.id === "hasValidPassport" || q.id === "passportNumber"), `website row asks only passport (valid? + number) + employment (${qs.map((q) => q.id).join(", ")})`);
  ok(!!qs.find((q) => !!firstError(q, f)), "the screen has a question to start on (no redirect loop)");
  ok(qs.some((q) => q.id === "passportNumber"), "passport number is asked although the website never stored the validity answer");
  f = { ...f, hasValidPassport: "yes", passportNumber: "a1234567", employmentStatus: "student" };
  const r1 = await saveAfterPayment("web-1", f);
  ok(r1.synced, "saved");
  ok(web.full_name === "Omar Saleh" && web.phone === "+971501112233" && web.nationality === "Egypt" && web.destination_country === "France", "name, phone, nationality and destination are untouched");
  ok(web.entry_date === "2026-12-01" && web.exit_date === "2026-12-10" && web.date_of_birth === "1990-05-05", "existing dates are not cleared");
  ok(web.passport_number === "A1234567", "passport_number column written, upper case");
  const n1 = JSON.parse(web.additional_notes);
  ok(n1.source === undefined && n1.lastEditedOn === undefined, "website row is not re-labelled as an app row");
  ok(n1.uploads?.length === 1 && n1.maritalStatus === "single", "other notes keys (uploads, marital status) are kept");
  ok(n1.employmentStatus === "student" && n1.wizard?.passportNumber === "a1234567", "employment and the answers are in the notes");
  ok(n1.wizard?.firstName === undefined && n1.wizard?.email === undefined, "pre-payment answers are not written from an empty form");
  ok(!needsContinue(toApplication(web)), "after saving: Continue no longer needed");
  ok(db.calls.filter((c: any) => c.update).every((c: any) => c.eqs.some(([k, v]: any) => k === "email" && v === ME.email)), "every write is filtered by the signed-in email");

  // ---- 2. App row: every after-payment question; pre-payment answers stay ----
  const wiz = { destination: "Italy", nationality: "India", cityOfResidence: "Dubai", firstName: "Aisha", lastName: "Khan", email: ME.email, phone: "+971501234567", phoneLocal: "501234567", maritalStatus: "single" };
  const app: any = { ...base, id: "app-1", email: ME.email, full_name: "Aisha Khan", phone: "+971501234567", nationality: "India", destination_country: "Italy", passport_number: null,
    // What the pre-payment submit writes (lib/data columns(), same mapping as the website) before these are asked.
    previous_schengen_visa: false, previous_rejections: false, rejection_details: null,
    additional_notes: JSON.stringify({ source: "mobile-app", wizard: wiz, submittedAt: "2026-10-01T09:00:00Z" }) };
  db.rows = [web, app];
  a = toApplication(app); f = continueForm(a);
  ok(!isWebsiteRow(a) && needsContinue(a), "app row, paid, after-payment answers missing: Continue needed");
  ok(continueQuestions(f, false)[0]?.id === "purposeOfTrip", "app row starts at the trip questions");
  ok(f.previousRefusals === "" && continueQuestions(f, false).some((q) => q.id === "previousRefusals" && !!firstError(q, f)), "app row: the stored previous_rejections=false is not taken as a No (refusal question still asked)");
  ok(continueForm({ ...toApplication(web), previous_rejections: true, rejection_details: "France 2024" }).previousRefusals === "yes", "website row: the previous_rejections column is still read as the answer");
  f = { ...f, purposeOfTrip: "tourism", travelStartDate: inDays(30), travelEndDate: inDays(40), datesFlexible: "no", travelingWith: "alone", hotelCategory: "3-star", fundingSource: "self",
    balanceRange: "10000-25000", isFirstSchengenVisa: "yes", previousRefusals: "no", residenceVisaValid: "yes", dateOfBirth: "1992-02-02", hasValidPassport: "yes", passportNumber: "N7654321",
    passportExpiry: inDays(2000), employmentStatus: "employed", jobTitle: "Engineer", companyName: "ACME", employmentStartDate: "2020-01-01", monthlySalary: "10000-15000" };
  ok(!continueQuestions(f, false).some((q) => !!firstError(q, f)), "all after-payment answers valid");
  await saveAfterPayment("app-1", f);
  ok(app.entry_date === inDays(30) && app.exit_date === inDays(40) && app.duration_days === 10 && app.travel_purpose === "tourism", "trip columns written");
  ok(app.date_of_birth === "1992-02-02" && app.passport_number === "N7654321" && app.previous_schengen_visa === false && app.previous_rejections === false, "passport and history columns written");
  const n2 = JSON.parse(app.additional_notes);
  ok(n2.source === "mobile-app" && n2.submittedAt === "2026-10-01T09:00:00Z" && n2.wizard.firstName === "Aisha" && n2.wizard.destination === "Italy", "pre-payment answers and app keys kept");
  ok(n2.wizard.hotelCategory === "3-star" && n2.jobTitle === "Engineer" && n2.companyName === "ACME", "after-payment answers saved");
  ok(app.full_name === "Aisha Khan" && app.destination_country === "Italy", "app row name and destination untouched");
  ok(!needsContinue(toApplication(app)), "after saving: Continue no longer needed");

  // ---- 3. A "No" passport answer is accepted after payment (the team follows up) ----
  const g = { ...f, hasValidPassport: "no" as const, passportNumber: "", passportExpiry: "" };
  ok(!continueQuestions(g, false).some((q) => !!firstError(q, g)), "valid passport = No: nothing blocks, number and expiry not asked");

  // ---- 4. Row not writable (e.g. file ready): synced = false, nothing changes ----
  const done: any = { ...app, id: "done-1", application_status: "ready", additional_notes: JSON.stringify({ source: "mobile-app", wizard: wiz }) };
  db.rows = [done]; db.writable = (r: any) => ["draft", "submitted", "reviewing"].includes(r.application_status);
  const before = done.additional_notes;
  const r4 = await saveAfterPayment("done-1", f);
  ok(!r4.synced && done.additional_notes === before, "unwritable row: synced false, row unchanged");
  ok(!needsContinue(toApplication(done)), "a ready case never asks to continue");

  // ---- 5. A finished app row is not reopened as the trip gets closer (the 15-day rule applies when a date is picked) ----
  db.writable = null;
  const soon: any = { ...app, id: "soon-1", application_status: "submitted", additional_notes: JSON.stringify({ source: "mobile-app", wizard: { ...wiz, ...f, travelStartDate: inDays(5), travelEndDate: inDays(12) } }) };
  db.rows = [soon];
  const fs = continueForm(toApplication(soon));
  ok(!needsContinue(toApplication(soon)), "answered app row with departure in 5 days: Continue not needed again");
  const dq = continueQuestions(fs, false).find((q) => q.id === "travelStartDate")!;
  ok(!continueError(dq, fs, fs), "the saved departure date is still accepted on the screen");
  ok(!!continueError(dq, { ...fs, travelStartDate: inDays(6) }, fs), "a newly picked date under 15 days is still refused");

  // ---- 6. Website row whose customer answered "No valid passport" there (number cleared, answer not stored) ----
  const nop: any = { ...web, id: "web-nop", passport_number: null, additional_notes: JSON.stringify({ maritalStatus: "single", employmentStatus: "student" }) };
  db.rows = [nop];
  let fn = continueForm(toApplication(nop));
  const nq = continueQuestions(fn, true);
  ok(nq[0]?.id === "hasValidPassport", `website row without a number is asked "Do you have a valid passport?" first (${nq.map((q) => q.id).join(", ")})`);
  fn = { ...fn, hasValidPassport: "no" };
  ok(!continueQuestions(fn, true).some((q) => !!firstError(q, fn)), "answering No: no passport number demanded");
  await saveAfterPayment("web-nop", fn);
  ok(!needsContinue(toApplication(nop)) && nop.full_name === "Omar Saleh", "saved: Continue done, website data untouched");
  const withNo = continueForm(toApplication(web));
  ok(withNo.hasValidPassport === "yes" && !continueQuestions(withNo, true).some((q) => q.id === "hasValidPassport" && !!firstError(q, withNo)), "website row with a number: validity inferred, not asked");

  // ---- 7. An upload landing between Continue's read and write is kept (versioned write, retried) ----
  const race: any = { ...app, id: "race-1", updated_at: "2026-10-05T10:00:00.000001+00:00", additional_notes: JSON.stringify({ source: "mobile-app", wizard: wiz }) };
  db.rows = [race];
  db.beforeUpdate = () => { const n = JSON.parse(race.additional_notes); n.uploads = [{ type: "photo", path: "race-1/photo_x.jpg", name: "p.jpg", at: "2026-10-05" }]; race.additional_notes = JSON.stringify(n); race.updated_at = "2026-10-05T10:00:01.000001+00:00"; };
  const rr = await saveAfterPayment("race-1", f);
  const nr = JSON.parse(race.additional_notes);
  ok(rr.synced && nr.uploads?.length === 1 && nr.wizard?.hotelCategory === "3-star", "concurrent upload kept and the answers saved");

  console.log(fail ? `${fail} FAILED` : "ALL PASSED");
  process.exit(fail ? 1 : 0);
})();
