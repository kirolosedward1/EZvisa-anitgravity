// One display stage for an application, used by every badge, card and progress bar (and mirrored by the website:
// see /workspace/ezvisa/status-mapping.md). Pure: inputs are the row's status, payment_status and document progress.
export type StageKey = "draft" | "payment_due" | "payment_failed" | "paid" | "reviewing" | "awaiting_documents" | "ready" | "appointment_booked" | "completed" | "rejected" | "cancelled";
export type StageInput = { status: string; payment_status?: string | null; docsMissing?: number; detailsMissing?: boolean };
export type Stage = { key: StageKey; label: string; tone: "grey" | "blue" | "orange" | "green" | "red" | "indigo"; color?: string; next: { label: string; vars?: Record<string, number> } | null };

const PAID = ["paid", "completed"];
export const paidStatus = (p?: string | null) => PAID.includes(p ?? "");

export function stage(i: StageInput): Stage {
  const paid = paidStatus(i.payment_status); const s = i.status;
  const afterPay = (): Stage["next"] => i.detailsMissing ? { label: "Add passport & employment details" }
    : (i.docsMissing ?? 0) > 0 ? { label: i.docsMissing === 1 ? "Submit 1 document" : "Submit {n} documents", vars: { n: i.docsMissing! } } : null;
  switch (s) {
    case "cancelled": return { key: "cancelled", label: "Cancelled", tone: "grey", next: null };
    case "rejected": return { key: "rejected", label: "Closed", tone: "grey", next: null };
    case "completed": return { key: "completed", label: "Completed", tone: "green", next: null };
    case "approved": return { key: "reviewing", label: "Preparing your file", tone: "orange", next: null };
    case "ready": return { key: "ready", label: "File ready", tone: "green", next: null };
    case "appointment_booked": return { key: "appointment_booked", label: "Appointment booked", tone: "indigo", next: null };
    case "awaiting_documents": return { key: "awaiting_documents", label: "Documents needed", tone: "orange", next: afterPay() ?? { label: "Submit documents" } };
    case "reviewing": return { key: "reviewing", label: "Expert review", tone: "orange", next: paid ? afterPay() : null };
  }
  // draft / submitted (and anything unknown): payment decides.
  if (paid) return { key: "paid", label: "Paid", tone: "green", color: "#1A7F37", next: afterPay() };
  if (s === "draft") return { key: "draft", label: "Draft", tone: "grey", next: { label: "Finish application" } };
  if (i.payment_status === "failed") return { key: "payment_failed", label: "Payment failed", tone: "red", next: { label: "Pay now" } };
  return { key: "payment_due", label: "Payment due", tone: "orange", color: "#B83200", next: { label: "Pay now" } };
}
