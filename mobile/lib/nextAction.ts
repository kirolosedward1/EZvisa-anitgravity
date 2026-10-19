import type { Application } from "./data";
import type { CheckItem } from "./checklist";
import type { IconName } from "../components/ui";

export type NextAction = { icon: IconName; title: string; body: string; cta?: string; kind: "upload" | "pay" | "open" | "none"; tone: "tint" | "orange" | "red" | "green" };

const money = (n: number | null, cur: string | null) => (n == null ? "" : `${Number(n).toLocaleString()} ${cur ?? ""}`.trim());

/** The single most useful thing to do next, derived only from the application's real status, payment and documents. */
export function nextAction(a: Application, checklist: CheckItem[] | null): NextAction {
  const rejected = checklist?.filter((i) => i.state === "rejected") ?? [];
  const missing = checklist?.filter((i) => i.state === "missing" && i.req.is_mandatory) ?? [];
  if (["completed", "rejected", "cancelled"].includes(a.status)) return { icon: "checkmark.circle.fill", title: a.status === "completed" ? "Completed" : a.status === "rejected" ? "Visa refused" : "Cancelled", body: "Open the application for details.", cta: "Open", kind: "open", tone: a.status === "completed" ? "green" : "red" };
  if (rejected.length) return { icon: "exclamationmark.circle.fill", title: rejected.length === 1 ? `Re-upload ${rejected[0].req.title}` : `Re-upload ${rejected.length} documents`, body: rejected[0].reason || "A document needs to be replaced.", cta: "Fix now", kind: "upload", tone: "red" };
  if (a.payment_status === "pending" || a.payment_status === "failed") return { icon: "creditcard.fill", title: `Pay ${money(a.total_amount, a.currency)}`, body: a.payment_status === "failed" ? "The last payment didn't go through." : "Payment is the next step. Secure checkout by Ziina.", cta: "Pay now", kind: "pay", tone: "orange" };
  if (missing.length) return { icon: "arrow.up.circle.fill", title: missing.length === 1 ? `Upload ${missing[0].req.title}` : `Upload ${missing.length} documents`, body: missing.slice(0, 3).map((i) => i.req.title).join(", "), cta: "Upload", kind: "upload", tone: "tint" };
  switch (a.status) {
    case "draft": return { icon: "doc.text.fill", title: "Draft", body: "This application hasn't been submitted yet.", cta: "Open", kind: "open", tone: "tint" };
    case "submitted": return { icon: "clock.fill", title: "Submitted", body: "We're checking your details. No action needed.", kind: "none", tone: "tint" };
    case "reviewing": return { icon: "clock.fill", title: "Under review", body: "Our team is reviewing your file. No action needed.", kind: "none", tone: "tint" };
    case "awaiting_documents": return { icon: "arrow.up.circle.fill", title: "Documents requested", body: "Open the application to see what's needed.", cta: "Open", kind: "open", tone: "orange" };
    case "approved": case "ready": return { icon: "checkmark.seal.fill", title: "File ready", body: "Your file is ready. We'll confirm the appointment.", kind: "none", tone: "green" };
    case "appointment_booked": return { icon: "calendar", title: "Appointment booked", body: "Open the application for the date and place.", cta: "Open", kind: "open", tone: "green" };
  }
  return { icon: "clock.fill", title: "In progress", body: "No action needed.", kind: "none", tone: "tint" };
}
