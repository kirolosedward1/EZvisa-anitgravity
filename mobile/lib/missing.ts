// "To get later" (PRODUCT.md, canvas Passport / NOC / Review / Status): a "No" to a document question never blocks.
// The document goes on this list, shows on Review and on the application's status page, and is saved for the team as
// additional_notes.missingDocuments (contract ApplicationNotes). Pure: derived from the answers only.
import { showSpouse, type WizardForm } from "./wizard";

export type MissingDoc = "passportCopy" | "residencyCopy" | "spousePassport" | "nocCertificate";
export const MISSING_LABEL: Record<MissingDoc, string> = {
  passportCopy: "Passport", residencyCopy: "UAE residence visa", spousePassport: "Spouse's passport", nocCertificate: "NOC from your employer",
};

/** Documents the customer said they don't have yet, in a stable order. */
export function missingDocuments(f: Partial<WizardForm>): MissingDoc[] {
  const out: MissingDoc[] = [];
  if (f.hasValidPassport === "no") out.push("passportCopy");
  if (f.residenceVisaValid === "no") out.push("residencyCopy");
  if (f.spouseHasValidPassport === "no" && showSpouse({ maritalStatus: f.maritalStatus ?? "", spouseAccompanying: f.spouseAccompanying ?? "" })) out.push("spousePassport");
  if (f.hasNOC === "no" && f.employmentStatus === "employed") out.push("nocCertificate");
  return out;
}
