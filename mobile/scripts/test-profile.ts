// Profile prefill checks (lib/profile.ts) against an in-memory Supabase (scripts/stubs/supabase.js). No network, no DB.
// Run: node scripts/run-test-profile.mjs
// @ts-ignore plain JS stub
import { db as fake } from "./stubs/supabase.js";
import { loadProfile, applyProfile, isFreshDraft, profileChanges, saveProfile, splitPhone, markPrefilled, markAsked, shouldAsk, OFFER_KEYS, PRE_PAYMENT_KEYS, SAVABLE } from "../lib/profile";
import { emptyForm, validatePassport, visibleSteps, iso, type WizardForm } from "../lib/wizard";
import { QUESTIONS, activeQuestions, firstError } from "../lib/questions";
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

  // ---- only answers asked before payment are prefilled (nothing hidden that Continue would then skip) ----
  const preKeys = new Set(QUESTIONS.filter((q) => visibleSteps(emptyForm).includes(q.step)).flatMap((q) => q.keys as string[]));
  const { form, filled } = applyProfile({ ...emptyForm, destination: "France", nationality: "" }, p);
  ok(filled.length > 0 && filled.every((k) => preKeys.has(k)), `prefill fills only pre-payment answers (filled: ${filled.join(",")})`);
  ok(!form.dateOfBirth && !form.hasValidPassport && !form.passportExpiry && !form.passportNumber, "date of birth and passport are not prefilled before payment");
  const askedAfter = activeQuestions({ ...form, travelEndDate: inYears(1) }, "post").filter((q) => !!firstError(q, { ...form, travelEndDate: inYears(1) })).map((q) => q.id);
  ok(["dateOfBirth", "hasValidPassport"].every((id) => askedAfter.includes(id)), `Continue (after payment) still asks date of birth and passport (asks: ${askedAfter.join(",")})`);
  ok(OFFER_KEYS.every((k) => preKeys.has(k)) && OFFER_KEYS.includes("maritalStatus") && !OFFER_KEYS.some((k) => /^(employment|jobTitle|companyName|spouse|monthly|average)/.test(k)),
    `"Use details from your last application" offers only pre-payment answers (${OFFER_KEYS.join(",")})`);
  ok([...PRE_PAYMENT_KEYS].every((k) => preKeys.has(k)) && SAVABLE.every((x) => preKeys.has(x.key)), "profile save-back lists only fields shown on the pre-payment Review");
  // ---- expired passport: flagged where the passport is asked now (Continue, validatePassport) ----
  const expired = { ...emptyForm, hasValidPassport: "yes" as const, passportNumber: "A1234567", passportExpiry: "2025-01-31" };
  ok(/expired/i.test(validatePassport(expired).passportExpiry ?? ""), `an expired passport is flagged ("${validatePassport(expired).passportExpiry}")`);
  ok(validatePassport({ ...expired, passportExpiry: inYears(5) }).passportExpiry === undefined, "a valid future expiry passes");

  // ---- never over answers already in a draft ----
  const draft = { ...emptyForm, firstName: "Mina", nationality: "India" };
  const again = applyProfile(draft, p);
  ok(again.form.firstName === "Mina" && again.form.nationality === "India", "existing answers are never overwritten");
  ok(!isFreshDraft(draft) && isFreshDraft({ ...emptyForm, destination: "Italy", nationality: "Egypt" }), "isFreshDraft: identity answers make a draft non-new; link values don't");

  // ---- edits -> profile question (only edited prefilled, savable fields) ----
  const edited = { ...form, phone: "+20 100 999 0000", phoneLocal: "100 999 0000", dateOfBirth: "1992-05-05", passportNumber: "B7654321", passportExpiry: inYears(5) };
  const ch = profileChanges(edited, p, filled);
  ok(ch.length === 1 && ch[0].key === "phone", `only the edited savable field is offered (got ${ch.map((c) => c.key).join(",")})`);
  ok(profileChanges(form, p, filled).length === 0, "no question when nothing was edited");
  ok(profileChanges({ ...form, phone: "+20 1001234567" }, p, filled).length === 0, "phone formatting differences are not a change");

  // ---- update only after confirmation, only for the same account ----
  ok(!db.calls.some((c: any) => c.updateUser), "nothing written before confirmation (load, prefill and diff never write)");
  db.calls = [];
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

  // ---- review: only fields that were actually prefilled (a link answer is not "from your profile") ----
  const linkNat = { ...form, nationality: "Pakistan" }; // nationality came from ?from=pakistan, phone from the profile
  ok(profileChanges(linkNat, p, ["phone", "phoneCountry", "phoneLocal"]).length === 0, "review ignores fields that were not prefilled (link nationality vs profile)");
  ok(profileChanges({ ...linkNat, phone: "+20 100 555 0000" }, p, ["phone", "phoneCountry", "phoneLocal"]).map((c) => c.key).join() === "phone", "review lists an edited prefilled field");
  // ---- save writes exactly the confirmed values, nothing unlisted ----
  db.user = { id: "uid-c", email: "c+ezvisa-app-test@example.com", user_metadata: {} }; db.calls = [];
  await saveProfile("uid-c", { ...form, firstName: "Changed", lastName: "Hassan2" }, [{ key: "lastName", label: "Last Name", from: "Hassan", to: "Hassan2" }]);
  const wc = db.calls.find((c: any) => c.updateUser)?.data ?? {};
  ok(wc.last_name === "Hassan2" && !("first_name" in wc) && !("full_name" in wc), `confirmed last name only: no unlisted first/full name written (${JSON.stringify(wc)})`);
  db.calls = [];
  await saveProfile("uid-c", { ...form, phone: "+20 100 777 7777" }, [{ key: "phone", label: "Phone Number", from: "+20 100 123 4567", to: "+20 100 555 0000" }]);
  ok(db.calls.find((c: any) => c.updateUser)?.data.phone === "+20 100 555 0000", "saves the value shown on the card, not a later form value");
  // ---- rows anyone can insert (guest submissions) cannot crash prefill with non-text values ----
  db.user = { id: "uid-d", email: "d+ezvisa-app-test@example.com", user_metadata: {} };
  db.rows.push({ email: "d+ezvisa-app-test@example.com", application_status: "submitted", updated_at: "2026-10-01", full_name: "X", additional_notes: JSON.stringify({ wizard: { cityOfResidence: { evil: 1 }, firstName: ["a"], maritalStatus: "single" } }) });
  const rd = await loadProfile("uid-d");
  ok(!!rd && typeof (rd.last as any)?.cityOfResidence === "undefined" && typeof (rd.profile as any).firstName !== "object" && (rd.last as any)?.maritalStatus === "single", "non-text values in application notes are ignored");

  // ---- phone parsing ----
  ok(JSON.stringify(splitPhone("+971 50 123 4567")) === JSON.stringify({ phoneCountry: "AE", phoneLocal: "50 123 4567" }), "+971 -> AE");
  ok(splitPhone("+919876543210")?.phoneCountry === "IN" && splitPhone("+7 701 000 0000", "KZ")?.phoneCountry === "KZ", "+91 -> IN, +7 keeps the preferred KZ");
  ok(splitPhone("0501234567") === null, "a local number without a code is not guessed");

  // ---- ask once, per account ----
  await markPrefilled("d1", A.id, ["phone"]);
  ok(JSON.stringify(await shouldAsk("d1", A.id)) === '["phone"]', "prefilled draft: ask on review, for the keys that were prefilled");
  ok(!(await shouldAsk("d1", B.id)), "never asked for another account");
  await markAsked("d1"); ok(!(await shouldAsk("d1", A.id)), "asked once only");

  console.log(fail ? `\n${fail} FAILED` : "\nALL PASSED"); process.exit(fail ? 1 : 0);
})();
