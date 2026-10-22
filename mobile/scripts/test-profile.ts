// Profile prefill checks (lib/profile.ts) against an in-memory Supabase (scripts/stubs/supabase.js). No network, no DB.
// Run: node scripts/run-test-profile.mjs
// @ts-ignore plain JS stub
import { db as fake } from "./stubs/supabase.js";
import { loadProfile, applyProfile, isFreshDraft, profileChanges, saveProfile, splitPhone, markPrefilled, markAsked, shouldAsk } from "../lib/profile";
import { emptyForm, validatePersonal, iso, type WizardForm } from "../lib/wizard";
declare const process: any;
const db: any = fake;

let fail = 0; const ok = (c: boolean, l: string) => { console.log(`${c ? "PASS" : "FAIL"}  ${l}`); if (!c) fail++; };
const A = { id: "uid-a", email: "a+ezvisa-app-test@example.com", user_metadata: { full_name: "Amira Hassan", phone: "+20 100 123 4567" } };
const B = { id: "uid-b", email: "b+ezvisa-app-test@example.com", user_metadata: {} };
const inYears = (n: number) => { const d = new Date(); d.setFullYear(d.getFullYear() + n); return iso(d); };
const wiz = (w: Partial<WizardForm>) => JSON.stringify({ wizard: w });
db.rows = [
  { email: A.email, application_status: "submitted", updated_at: "2026-09-01", full_name: "Amira Hassan", nationality: "Egypt", date_of_birth: "1991-04-02", passport_number: "A1234567", phone: "+20 100 123 4567",
    additional_notes: wiz({ firstName: "Amira", lastName: "Hassan", nationality: "Egypt", dateOfBirth: "1991-04-02", passportNumber: "a1234567", passportExpiry: "2025-01-31", phoneCountry: "EG", maritalStatus: "single" }) },
  { email: A.email, application_status: "cancelled", updated_at: "2026-10-01", full_name: "Typo Name", nationality: "India", passport_number: "ZZZ", additional_notes: wiz({ nationality: "India", passportNumber: "ZZZ" }) },
];

(async () => {
  // ---- returning user: prefilled from metadata + their own last real application ----
  db.user = A; db.calls = [];
  const r = await loadProfile(A.id);
  ok(!!r, "profile loads for the signed-in user");
  ok(db.calls.every((c: any) => c.table !== "visa_applications" || c.eqs.some(([k, v]: any) => k === "email" && v === A.email)), "every applications query is filtered by the user's own email");
  const p = r!.profile;
  ok(p.firstName === "Amira" && p.lastName === "Hassan", "names from user_metadata.full_name");
  ok(p.nationality === "Egypt" && p.dateOfBirth === "1991-04-02", "nationality + date of birth from the last real application (cancelled one ignored)");
  ok(p.passportNumber === "A1234567" && p.hasValidPassport === "yes", "passport number from the last application, upper-cased");
  ok(p.phoneCountry === "EG" && p.phoneLocal === "100 123 4567", "phone split into country + local");
  ok(p.email === A.email, "email is the account email");

  // ---- expired passport: still prefilled, validation flags it ----
  const { form, filled } = applyProfile({ ...emptyForm, destination: "France", nationality: "" }, p);
  ok(form.passportExpiry === "2025-01-31" && filled.includes("passportExpiry") && form.hasValidPassport === "yes", "expired passport expiry is prefilled");
  ok(form.passportNumber === "" && !filled.includes("passportNumber" as any), "passport number is not prefilled (asked after payment)");
  ok(/expired/i.test(validatePersonal(form).passportExpiry ?? ""), `validation flags the expired passport ("${validatePersonal(form).passportExpiry}")`);
  ok(validatePersonal({ ...form, passportExpiry: inYears(5) }).passportExpiry === undefined, "a valid future expiry passes");

  // ---- never over answers already in a draft ----
  const draft = { ...emptyForm, firstName: "Mina", nationality: "India" };
  const again = applyProfile(draft, p);
  ok(again.form.firstName === "Mina" && again.form.nationality === "India", "existing answers are never overwritten");
  ok(!isFreshDraft(draft) && isFreshDraft({ ...emptyForm, destination: "Italy", nationality: "Egypt" }), "isFreshDraft: identity answers make a draft non-new; link values don't");

  // ---- edits -> profile question (only edited prefilled, savable fields) ----
  const edited = { ...form, phone: "+20 100 999 0000", phoneLocal: "100 999 0000", passportNumber: "B7654321", passportExpiry: inYears(5) };
  const ch = profileChanges(edited, p);
  ok(ch.length === 1 && ch[0].key === "phone", `only the edited savable field is offered (got ${ch.map((c) => c.key).join(",")})`);
  ok(profileChanges(form, p).length === 0, "no question when nothing was edited");
  ok(profileChanges({ ...form, phone: "+20 1001234567" }, p).length === 0, "phone formatting differences are not a change");

  // ---- update only after confirmation, only for the same account ----
  db.calls = [];
  ok(!db.calls.some((c: any) => c.updateUser), "nothing written before confirmation");
  await saveProfile(A.id, edited, ch);
  const w = db.calls.find((c: any) => c.updateUser);
  ok(!!w && w.updateUser === A.id && w.data.phone === "+20 100 999 0000" && Object.keys(w.data).sort().join() === "phone,phone_country", "confirmed: only the changed field is written to the user's own profile");
  ok(!JSON.stringify(db.calls).includes("B7654321"), "passport details are never written to user_metadata");
  db.user = B; let refused = false;
  try { await saveProfile(A.id, edited, ch); } catch { refused = true; }
  ok(refused, "saving A's changes while B is signed in is refused");

  // ---- new user / partial profile / other account ----
  const rb = await loadProfile(B.id);
  ok(!!rb && Object.keys(rb.profile).join() === "email", `new user: nothing but the email (got ${Object.keys(rb?.profile ?? {}).join(",")})`);
  ok(applyProfile({ ...emptyForm }, rb!.profile).filled.join() === "email", "new user sees empty fields");
  ok(!JSON.stringify(rb).includes("Amira") && !JSON.stringify(rb).includes("A1234567"), "B never sees A's data");
  ok((await loadProfile(A.id)) === null, "loading A's profile while B is signed in returns nothing");
  db.user = { ...B, user_metadata: { first_name: "Bilal" } };
  const partial = (await loadProfile(B.id))!.profile;
  ok(partial.firstName === "Bilal" && !partial.lastName && !partial.passportNumber, "partial profile: only the known fields");

  // ---- phone parsing ----
  ok(JSON.stringify(splitPhone("+971 50 123 4567")) === JSON.stringify({ phoneCountry: "AE", phoneLocal: "50 123 4567" }), "+971 -> AE");
  ok(splitPhone("+919876543210")?.phoneCountry === "IN" && splitPhone("+7 701 000 0000", "KZ")?.phoneCountry === "KZ", "+91 -> IN, +7 keeps the preferred KZ");
  ok(splitPhone("0501234567") === null, "a local number without a code is not guessed");

  // ---- ask once, per account ----
  await markPrefilled("d1", A.id);
  ok(await shouldAsk("d1", A.id), "prefilled draft: ask on review");
  ok(!(await shouldAsk("d1", B.id)), "never asked for another account");
  await markAsked("d1"); ok(!(await shouldAsk("d1", A.id)), "asked once only");

  console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED"); process.exit(fail ? 1 : 0);
})();
