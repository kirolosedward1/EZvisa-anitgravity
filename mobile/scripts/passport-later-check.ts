// Node-only checks: the passport NUMBER is asked after payment (Continue application), not in the pre-payment wizard.
// Run: bun scripts/run-check.ts scripts/passport-later-check.ts
import { QUESTIONS, normalizePage } from "../lib/questions";
import { emptyForm, validatePersonal, validatePassportNumber, continueComplete, type WizardForm } from "../lib/wizard";
declare const process: any;

let fail = 0;
const ok = (c: boolean, l: string) => { console.log(`${c ? "PASS" : "FAIL"}  ${l}`); if (!c) fail++; };
const ids = QUESTIONS.map((q) => q.id);
ok(!ids.includes("passportNumber"), "wizard: no Passport Number question before payment");
ok(ids.includes("hasValidPassport") && ids.includes("passportExpiry"), "wizard: valid-passport question and expiry date stay");
const f: WizardForm = { ...emptyForm, hasValidPassport: "yes", passportNumber: "" };
ok(!("passportNumber" in validatePersonal(f)), "personal step: an empty passport number no longer blocks the wizard");
ok("hasValidPassport" in validatePersonal({ ...emptyForm }), "personal step: the valid-passport answer is still required");
ok("passportNumber" in validatePassportNumber({ hasValidPassport: "yes", passportNumber: "  " }), "continue: passport number required");
ok(!("passportNumber" in validatePassportNumber({ hasValidPassport: "yes", passportNumber: "N1234567" })), "continue: a number is accepted");
const emp = { employmentStatus: "student" as const };
ok(!continueComplete({ ...emp, hasValidPassport: "yes" }), "continue: employment done but no number = not complete");
ok(continueComplete({ ...emp, hasValidPassport: "yes", passportNumber: "N1234567" }), "continue: employment + number = complete");
ok(!continueComplete({ hasValidPassport: "yes", passportNumber: "N1234567" }), "continue: number but no employment = not complete");
ok(normalizePage("q:passportNumber", { ...emptyForm, hasValidPassport: "yes" }) === "q:passportExpiry", "saved draft on the old Passport Number screen resumes at Passport Expiry");
console.log(fail ? `${fail} FAILED` : "ALL PASS");
process.exit(fail ? 1 : 0);
