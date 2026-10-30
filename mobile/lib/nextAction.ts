import { isPaid, needsContinue, UPLOAD_STATUSES, type Application } from "./data";
import type { CheckItem } from "./checklist";
import { appointmentOf } from "./appointment";
import type { IconName } from "../components/ui";
import { payActionCopy } from "./payLabel";

export type NextAction = { icon: IconName; title: string; body: string; cta?: string; vars?: Record<string, string | number>; kind: "upload" | "pay" | "open" | "none" | "continue" | "draft" | "appointment"; tone: "tint" | "orange" | "red" | "green" };

/** The single most useful thing to do next, derived only from the application's real status, payment and documents. */
export function nextAction(a: Application, checklist: CheckItem[] | null): NextAction {
  // Uploads are only offered while the server accepts them (same statuses as uploadDocument); a file that staff moved on is not asked again.
  const uploadsOpen = UPLOAD_STATUSES.includes(a.status);
  const rejected = uploadsOpen ? checklist?.filter((i) => i.state === "rejected") ?? [] : [];
  const missing = uploadsOpen ? checklist?.filter((i) => i.state === "missing" && i.req.is_mandatory) ?? [] : [];
  if (["completed", "rejected", "cancelled"].includes(a.status)) return { icon: a.status === "completed" ? "checkmark.seal.fill" : "xmark.circle.fill", title: a.status === "completed" ? "All done" : a.status === "rejected" ? "Application closed" : "Cancelled", body: "Open the application for details.", cta: "View application", kind: "open", tone: a.status === "completed" ? "green" : "tint" };
  if (a.status === "draft") return { icon: "doc.text.fill", title: "Draft", body: "Not submitted yet.", cta: "Continue draft", kind: "draft", tone: "tint" };
  // Refunded (fully or partly): never ask for the payment again.
  if (a.payment_status === "refunded" || a.payment_status === "partially_refunded") return { icon: "creditcard.fill", title: a.payment_status === "refunded" ? "Refunded" : "Part refunded", body: "Open the application for details.", cta: "View application", kind: "open", tone: "tint" };
  // Before payment, Pay is the only next action (documents unlock after payment).
  // Title and button share one key ("Pay {amount} AED") so Arabic can say «ادفع 249 درهمًا».
  if (a.status !== "draft" && !isPaid(a)) {
    const pay = payActionCopy(a.total_amount, a.currency);
    return { icon: "creditcard.fill", title: pay.title, vars: pay.vars, body: a.payment_status === "failed" ? "The last payment didn't go through." : "Documents unlock after payment.", cta: pay.cta, kind: "pay", tone: "orange" };
  }
  // Paid: passport number and employment details are asked now (moved out of the pre-payment wizard).
  if (needsContinue(a)) return { icon: "briefcase.fill", title: "Continue application", body: "Add your passport number and employment details.", cta: "Continue", kind: "continue", tone: "tint" };
  if (rejected.length) return { icon: "exclamationmark.circle.fill", title: rejected.length === 1 ? `Re-upload ${rejected[0].req.title}` : `Re-upload ${rejected.length} documents`, body: rejected[0].reason || "A document needs to be replaced.", cta: "Fix now", kind: "upload", tone: "red" };
  if (missing.length) return { icon: "arrow.up.circle.fill", title: "Upload documents", body: missing.slice(0, 3).map((i) => i.req.title).join(", "), cta: "Upload", kind: "upload", tone: "tint" };
  // Appointment entered: upcoming -> view it (date, place, calendar, directions); passed -> our work is finished.
  const ap = appointmentOf(a);
  if (ap) return Date.parse(ap.at) > Date.now() - 6 * 3600e3
    ? { icon: "calendar", title: "Appointment", body: ap.centre ?? "", cta: "View appointment", kind: "appointment", tone: "green" }
    : { icon: "checkmark.seal.fill", title: "All done", body: "Your file is ready and your appointment is set. Our work on this application is finished.", kind: "none", tone: "green" };
  switch (a.status) {
    case "submitted": return { icon: "clock.fill", title: "Submitted", body: "We're checking your details. No action needed.", kind: "none", tone: "tint" };
    case "reviewing": return { icon: "clock.fill", title: "Expert review", body: "A specialist is checking everything. No action needed.", kind: "none", tone: "tint" };
    case "awaiting_documents": return { icon: "arrow.up.circle.fill", title: "Documents requested", body: "Open the application to see what's needed.", cta: "Open", kind: "open", tone: "orange" };
    case "approved": return { icon: "clock.fill", title: "Preparing your file", body: "Cover letter, bookings and itinerary. Usually 1 to 2 days.", kind: "none", tone: "tint" };
    case "ready": return { icon: "checkmark.seal.fill", title: "File ready", body: "Download and print the full set, then add your appointment.", cta: "Add the appointment", kind: "appointment", tone: "green" };
    case "appointment_booked": return { icon: "calendar", title: "Appointment booked", body: "Open the application for the date and place.", cta: "Open", kind: "open", tone: "green" };
  }
  return { icon: "clock.fill", title: "In progress", body: "No action needed.", kind: "none", tone: "tint" };
}
