// Status timeline built only from the live visa_applications row. A step is "done" only when a column says so, and a
// time is shown only when the row holds a real one. What the live table has (verified 2026-10-22):
//  - application_status: submitted -> reviewing -> approved (preparing the file) -> ready | cancelled (website admin) +
//    the app's draft. appointment_booked, completed and rejected are read if staff set them.
//  - payment_status: set by the Ziina webhook. There is NO paid-at column, so "Paid" never shows a time.
//  - uploads: additional_notes.uploads[].at (written when the file was stored) and the website's has_* flags (no time).
//  - appointment_* columns (migrations/0003, staff only).
//  - created_at / updated_at only. updated_at changes on any edit, so it is never shown as a step time.
import { employmentOf, isPaid, requirementsFor, type Application } from "./data";
import { buildChecklist } from "./checklist";
import { appointmentOf } from "./appointment";
import { isDiscarded } from "./discard";

// The website's customer tracker (components/dashboard/progress-tracker.tsx + lib/application-status.ts on main), step for
// step: Payment, Documents, Expert review, Preparation, Ready, Appointment. EZvisa's work ends with the file; the
// appointment is the customer's last step. There is no decision step: the consulate's answer is not tracked here.
export type StepKey = "payment" | "documents" | "review" | "preparation" | "ready" | "appointment";
/** done: the data says it happened. current: the step being worked on now. attention: needs the customer (failed
 *  payment, rejected document). failed: the case was cancelled or closed at this step. todo: not reached. */
export type StepState = "done" | "current" | "todo" | "attention" | "failed";
export type Step = { key: StepKey; label: string; state: StepState; at: string | null; scheduled?: boolean; note?: string; vars?: Record<string, string | number> };

const valid = (s?: string | null) => (s && !isNaN(Date.parse(s)) ? s : null);
const ORDER: StepKey[] = ["payment", "documents", "review", "preparation", "ready", "appointment"];
/** Website labels and plain descriptions (lib/translations/customer.ts step.* / prog.*). */
const LABEL: Record<StepKey, string> = { payment: "Payment", documents: "Documents", review: "Expert review", preparation: "Preparation", ready: "Ready", appointment: "Appointment" };
const HINT: Record<StepKey, string> = { payment: "Secure your file", documents: "Upload your papers", review: "We check everything", preparation: "Cover letter, bookings, itinerary", ready: "Download and print your file", appointment: "Date and centre" };
const PAY_FAILED: Record<string, string> = { failed: "Payment failed", expired: "Payment expired", cancelled: "Payment cancelled" };
const PAST_READY = ["appointment_booked", "completed"];

/** When the application was submitted, only if we really know it: the app records notes.submittedAt at submit; rows the
 *  website created are inserted at submission, so their created_at is the submit time. App drafts are created when the
 *  wizard starts, so their created_at is not used. */
export function submittedAt(a: Application): string | null {
  const n: any = a.notes ?? {};
  return valid(n.submittedAt) ?? (n.source !== "mobile-app" ? valid(a.created_at) : null);
}

/** The website's getStage(): payment, documents, review, preparation (status approved), ready (status ready; the app also
 *  counts appointment_booked and completed, which come after the file). */
function stageOf(a: Application, docsComplete: boolean): Exclude<StepKey, "appointment"> {
  if (!isPaid(a)) return "payment";
  if (a.status === "ready" || PAST_READY.includes(a.status)) return "ready";
  if (a.status === "approved") return "preparation";
  return docsComplete ? "review" : "documents";
}

export function buildTimeline(a: Application): Step[] {
  const n: any = a.notes ?? {};
  const st = a.status; const paid = isPaid(a);
  const refunded = a.payment_status === "refunded" || a.payment_status === "partially_refunded";
  const items = buildChecklist(requirementsFor(employmentOf(a)), a.documents, st).customer.filter((i) => i.req.is_mandatory);
  const received = items.filter((i) => i.state !== "missing" && i.state !== "rejected").length;
  const rejected = items.some((i) => i.state === "rejected");
  const complete = items.length > 0 && received === items.length;
  const lastUpload = ((n.uploads ?? []).map((u: any) => valid(u?.at)).filter(Boolean) as string[]).sort().at(-1) ?? null;
  const ap = appointmentOf(a);

  // The website's customerProgress(): "Ready" stays current until the file is downloaded, then the appointment is
  // current until it is settled. The live table has no download column yet, so an entered appointment (or a later
  // status) also counts as past Ready.
  let key: StepKey = stageOf(a, complete); let finished = false;
  if (key === "ready") {
    const past = !!valid((a as any).file_downloaded_at) || !!ap || PAST_READY.includes(st);
    if (past) { key = "appointment"; finished = !!ap || st === "completed"; } // website appointmentSettled(): a date is in
  }
  const at = ORDER.indexOf(key);
  const closed = st === "cancelled" || st === "rejected";

  const steps: Step[] = ORDER.map((k, i) => {
    const done = i < at || (finished && i === at) || (k === "payment" && (paid || refunded));
    const here = i === at && !finished;
    let state: StepState = done ? "done" : here ? (closed ? "failed" : "current") : "todo";
    let label = LABEL[k]; let note: string | undefined = HINT[k]; let vars: Step["vars"];
    let when: string | null = null; let scheduled: boolean | undefined;
    if (k === "payment") {
      const pf = PAY_FAILED[a.payment_status ?? ""];
      if (refunded) note = a.payment_status === "refunded" ? "Refunded" : "Part refunded";
      else if (!paid && pf && st !== "draft" && !closed) { state = "attention"; label = pf; note = undefined; }
      else if (st === "draft") { label = "Finish application"; note = undefined; }
    }
    if (k === "documents" && paid) {
      if (done) { note = "{n} of {n} received"; vars = { n: items.length }; when = lastUpload; }
      else if (here && rejected && !closed) { state = "attention"; note = "Re-upload needed"; }
      else if (here) { note = "{n} of {total} uploaded"; vars = { n: received, total: items.length }; }
    }
    if (k === "appointment" && ap) { when = ap.at; scheduled = true; note = ap.centre ?? note; }
    // A finished step says what happened, not what it is for (website prog.done).
    if (state === "done" && note === HINT[k]) {
      if (k === "payment") { const amt = Number(a.payment_amount); note = amt > 0 ? "Paid · {amount} AED" : "Paid"; vars = amt > 0 ? { amount: amt } : undefined; }
      else note = "Done";
    }
    if (state === "failed") label = st === "cancelled" ? "Cancelled" : "Closed";
    return { key: k, label, state, at: when, scheduled, note, vars };
  });
  // A draft the customer discarded before paying: nothing happened, nothing failed.
  if (st === "cancelled" && !paid && !refunded && !submittedAt(a)) return steps.map((s) => ({ ...s, state: "todo" as StepState, label: LABEL[s.key], note: HINT[s.key] }));
  return steps;
}

/** Steps done, for the progress bar. */
export const doneCount = (steps: Step[]) => steps.filter((s) => s.state === "done").length;

/** A cancelled case the customer discarded themselves (unpaid). Staff-cancelled or paid cases stay visible. */
export const isUserDiscarded = (a: Application) => a.status === "cancelled" && !isPaid(a) && isDiscarded(a);

const FINISHED = ["completed", "rejected", "cancelled"];
/** What Home leads with: the most recent active (submitted or later) case; otherwise the newest unsubmitted draft;
 *  otherwise the most recent finished case (completed, closed, staff-cancelled). `apps` arrive newest first and
 *  `drafts` (this phone's drafts + the account's server drafts) newest first. */
export function chooseHero<D>(apps: Application[], drafts: D[]): { kind: "app"; a: Application } | { kind: "draft"; d: D } | null {
  const active = apps.find((a) => a.status !== "draft" && !FINISHED.includes(a.status));
  if (active) return { kind: "app", a: active };
  if (drafts.length) return { kind: "draft", d: drafts[0] };
  const finished = apps.find((a) => FINISHED.includes(a.status) && !isUserDiscarded(a));
  return finished ? { kind: "app", a: finished } : null;
}
