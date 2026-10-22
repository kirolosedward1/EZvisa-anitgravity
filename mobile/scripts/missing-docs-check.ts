// Node-only checks for the owner rule "a No to a document never blocks; it is listed to get later".
// Run: bun scripts/run-check.ts scripts/missing-docs-check.ts
import { emptyForm, missingDocs, validatePassport, validateSpouse, validateEmployment, type WizardForm } from "../lib/wizard";
import { Q_BY_ID } from "../lib/questions";
import { AR } from "../lib/ar";
declare const process: any;

let fail = 0;
const ok = (c: boolean, l: string) => { console.log(`${c ? "PASS" : "FAIL"}  ${l}`); if (!c) fail++; };
const f = (p: Partial<WizardForm>): WizardForm => ({ ...emptyForm, ...p });
const has = (p: Partial<WizardForm>, item: string) => missingDocs(p).includes(item);

// Nothing answered No: nothing to get later.
ok(missingDocs(emptyForm).length === 0, "empty form: nothing to get later");
ok(missingDocs(f({ hasValidPassport: "yes", residenceVisaValid: "yes", employmentStatus: "employed", hasNOC: "yes" })).length === 0, "all Yes: nothing to get later");

// Each No is listed.
ok(has({ hasValidPassport: "no" }, "Valid passport"), "passport No -> Valid passport");
ok(has({ residenceVisaValid: "no" }, "Renewed UAE residence visa"), "residence visa No -> listed");
ok(has({ hasEmiratesId: "no" }, "Emirates ID"), "website row, Emirates ID No (no residence answer) -> listed");
ok(!has({ hasEmiratesId: "no", residenceVisaValid: "yes" }, "Emirates ID"), "Emirates ID ignored once the residence question is answered");
ok(has({ maritalStatus: "married", spouseAccompanying: "yes", spouseHasValidPassport: "no" }, "Spouse's valid passport"), "spouse travels, passport No -> listed");
ok(!has({ maritalStatus: "married", spouseAccompanying: "no", spouseHasValidPassport: "no" }, "Spouse's valid passport"), "spouse not travelling -> not listed");
ok(has({ employmentStatus: "employed", hasNOC: "no" }, "NOC from your employer"), "employed, NOC No -> listed");
ok(!has({ employmentStatus: "business", hasNOC: "no" }, "NOC from your employer"), "self-employed -> never NOC");

// A No never blocks Continue.
ok(!validatePassport(f({ residenceVisaValid: "no", dateOfBirth: "1990-01-01", hasValidPassport: "no" })).hasValidPassport, "passport No does not block");
ok(!validatePassport(f({ residenceVisaValid: "no", dateOfBirth: "1990-01-01", hasValidPassport: "no" })).residenceVisaValid, "residence visa No does not block");
ok(Object.keys(validateSpouse(f({ spouseFirstName: "A", spouseLastName: "B", spouseHasValidPassport: "no" }))).length === 0, "spouse passport No does not block");
ok(!validateEmployment(f({ employmentStatus: "employed", jobTitle: "X", companyName: "Y", employmentStartDate: "2020-01-01", monthlySalary: "5000-10000", hasNOC: "no" })).hasNOC, "NOC No does not block");

// Each No shows a note, and no note says the document is needed before applying.
for (const [id, field] of [["hasValidPassport", "hasValidPassport"], ["residenceVisaValid", "residenceVisaValid"], ["spouseHasValidPassport", "spouseHasValidPassport"], ["hasNOC", "hasNOC"]] as const) {
  const note = Q_BY_ID[id]?.note?.(f({ [field]: "no" } as Partial<WizardForm>));
  ok(!!note && !/before applying/i.test(note.text), `${id} No: note shown, not "before applying"`);
  ok(!!note && !!AR[note.text], `${id} No: note has Arabic`);
}
// Every item that can be listed has Arabic.
for (const item of missingDocs(f({ hasValidPassport: "no", residenceVisaValid: "no", maritalStatus: "married", spouseAccompanying: "yes", spouseHasValidPassport: "no", employmentStatus: "employed", hasNOC: "no" })).concat(missingDocs({ hasEmiratesId: "no" })))
  ok(!!AR[item], `Arabic for "${item}"`);

console.log(fail ? `${fail} FAILED` : "ALL PASS");
process.exit(fail ? 1 : 0);
