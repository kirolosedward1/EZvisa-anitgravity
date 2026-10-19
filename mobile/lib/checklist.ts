import type { Application, Requirement } from "./data";

type Doc = Application["documents"][number];
export type CheckItem = { req: Requirement; state: "missing" | "uploaded" | "review" | "approved" | "rejected" | "ready" | "preparing"; doc?: Doc; reason?: string | null };

// Older uploads used these types before the requirement codes existed.
const LEGACY: Record<string, string> = { photo: "passport_photo", emirates_id: "residency_copy", residence_visa: "residency_copy", noc: "salary_certificate", insurance: "travel_insurance" };
const typeOf = (d: Doc) => LEGACY[d.document_type] ?? d.document_type;

/** Matches the requirement list against the application's real documents (latest non-superseded per requirement). */
export function buildChecklist(reqs: Requirement[], docs: Doc[]): { customer: CheckItem[]; ezvisa: CheckItem[] } {
  const live = docs.filter((d) => d.status !== "superseded").sort((a, b) => b.created_at.localeCompare(a.created_at));
  const find = (r: Requirement) => live.find((d) => d.requirement_id === r.id) ?? live.find((d) => typeOf(d) === r.document_type);
  const item = (r: Requirement): CheckItem => {
    const d = find(r);
    if (r.provided_by_ezvisa) return { req: r, state: d ? "ready" : "preparing", doc: d };
    if (!d) return { req: r, state: "missing" };
    if (d.status === "rejected") return { req: r, state: "rejected", doc: d, reason: d.rejection_reason };
    if (d.status === "approved") return { req: r, state: "approved", doc: d };
    if (d.status === "under_review") return { req: r, state: "review", doc: d };
    return { req: r, state: "uploaded", doc: d };
  };
  return { customer: reqs.filter((r) => !r.provided_by_ezvisa).map(item), ezvisa: reqs.filter((r) => r.provided_by_ezvisa).map(item) };
}
export const isOpen = (i: CheckItem) => i.state === "missing" || i.state === "rejected";
