// Status timeline built only from the live visa_applications row. A step is "done" only when a column says so, and a
// time is shown only when the row holds a real one. What the live table has (verified 2026-10-22):
//  - application_status: submitted -> reviewing -> ready | cancelled (website admin) + the app's draft. completed and
//    rejected are read if staff ever set them, but no screen sets them today.
//  - payment_status: set by the Ziina webhook. There is NO paid-at column, so "Paid" never shows a time.
//  - uploads: additional_notes.uploads[].at (written when the file was stored) and the website's has_* flags (no time).
//  - appointment_* columns (migrations/0003, staff only).
//  - created_at / updated_at only. updated_at changes on any edit, so it is never shown as a step time.
// migrations/0008 (proposed, not applied) adds a server-side history so every step gets a real time.
import { isPaid, requirementsFor, type Application } from "./data";
import { buildChecklist } from "./checklist";
import { appointmentOf } from "./appointment";
import { isDiscarded } from "./discard";

export type StepKey = "submitted" | "paid" | "documents" | "appointment" | "decision";
/** done: the data says it happened. current: the step being worked on now. attention: needs the customer (failed
 *  payment, rejected document). failed: refused or cancelled. todo: not reached. */
export type StepState = "done" | "current" | "todo" | "attention" | "failed";
export type Step = { key: StepKey; label: string; state: StepState; at: string | null; scheduled?: boolean; note?: string };

const valid = (s?: string | null) => (s && !isNaN(Date.parse(s)) ? s : null);
const FILE_READY = ["ready", "approved", "appointment_booked", "completed"];
const PAY_FAILED: Record<string, string> = { failed: "Payment failed", expired: "Payment expired", cancelled: "Payment cancelled" };

/** When the application was submitted, only if we really know it: the app records notes.submittedAt at submit; rows the
 *  website created are inserted at submission, so their created_at is the submit time. App drafts are created when the
 *  wizard starts, so their created_at is not used. */
export function submittedAt(a: Application): string | null {
  const n: any = a.notes ?? {};
  return valid(n.submittedAt) ?? (n.source !== "mobile-app" ? valid(a.created_at) : null);
}

export function buildTimeline(a: Application): Step[] {
  const n: any = a.notes ?? {};
  const paid = isPaid(a); const refunded = a.payment_status === "refunded" || a.payment_status === "partially_refunded";
  const st = a.status;

  // 1. Submitted. A cancelled row counts as submitted only with evidence (a submit time, a payment, or a website row).
  const sAt = submittedAt(a);
  const submitted = st !== "draft" && (st !== "cancelled" || !!sAt || paid || refunded);
  const steps: Step[] = [{ key: "submitted", label: "Submitted", state: submitted ? "done" : "todo", at: submitted ? sAt : null }];

  // 2. Paid (payment_status from the Ziina webhook; no time column exists).
  const pf = PAY_FAILED[a.payment_status ?? ""];
  steps.push({ key: "paid", label: pf && submitted ? pf : "Paid", state: paid || refunded ? "done" : pf && submitted && st !== "cancelled" ? "attention" : "todo", at: null, note: refunded ? "Refunded" : undefined });

  // 3. Documents: complete when every mandatory customer document is in (and none rejected), or staff moved the file past review.
  const items = buildChecklist(requirementsFor(n.wizard?.employmentStatus ?? n.employmentStatus), a.documents).customer.filter((i) => i.req.is_mandatory);
  const rejected = items.filter((i) => i.state === "rejected");
  const complete = items.length > 0 && items.every((i) => i.state !== "missing" && i.state !== "rejected");
  const uploadTimes = (n.uploads ?? []).map((u: any) => valid(u?.at)).filter(Boolean) as string[];
  const lastUpload = uploadTimes.sort().at(-1) ?? null;
  const docsDone = FILE_READY.includes(st) || (paid && complete);
  steps.push({ key: "documents", label: "Documents", state: docsDone ? "done" : paid && rejected.length ? "attention" : "todo", at: docsDone ? lastUpload : null,
    note: !docsDone && paid && rejected.length ? "Re-upload needed" : undefined });

  // 4. Appointment: only when staff entered one. The time shown is the appointment itself.
  const ap = appointmentOf(a);
  steps.push({ key: "appointment", label: "Appointment", state: ap ? "done" : "todo", at: ap?.at ?? null, scheduled: !!ap, note: ap?.centre });

  // 5. Decision: completed = granted, rejected = refused, cancelled ends the case. No decision time column exists.
  if (st === "completed") steps.push({ key: "decision", label: "Visa granted", state: "done", at: null });
  else if (st === "rejected") steps.push({ key: "decision", label: "Visa refused", state: "failed", at: null });
  else if (st === "cancelled") steps.push({ key: "decision", label: "Cancelled", state: "failed", at: null });
  else steps.push({ key: "decision", label: "Decision", state: "todo", at: null });

  // The first open step after the last finished one is "current" (nothing is current once the case has ended).
  if (!["completed", "rejected", "cancelled"].includes(st)) {
    const lastDone = steps.reduce((m, s, i) => (s.state === "done" ? i : m), -1);
    const next = steps.findIndex((s, i) => i > lastDone && s.state !== "done");
    if (next >= 0 && steps[next].state === "todo") steps[next] = { ...steps[next], state: "current" };
  }
  return steps;
}

/** Steps done, for the progress bar. */
export const doneCount = (steps: Step[]) => steps.filter((s) => s.state === "done").length;

/** A cancelled case the customer discarded themselves (unpaid). Staff-cancelled or paid cases stay visible. */
export const isUserDiscarded = (a: Application) => a.status === "cancelled" && !isPaid(a) && isDiscarded(a);

const FINISHED = ["completed", "rejected", "cancelled"];
/** What Home leads with: the most recent active (submitted or later) case; otherwise the newest unsubmitted draft;
 *  otherwise the most recent finished case (granted, refused, staff-cancelled). `apps` arrive newest first and
 *  `drafts` (this phone's drafts + the account's server drafts) newest first. */
export function chooseHero<D>(apps: Application[], drafts: D[]): { kind: "app"; a: Application } | { kind: "draft"; d: D } | null {
  const active = apps.find((a) => a.status !== "draft" && !FINISHED.includes(a.status));
  if (active) return { kind: "app", a: active };
  if (drafts.length) return { kind: "draft", d: drafts[0] };
  const finished = apps.find((a) => FINISHED.includes(a.status) && !isUserDiscarded(a));
  return finished ? { kind: "app", a: finished } : null;
}
