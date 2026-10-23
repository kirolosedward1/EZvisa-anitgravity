// The one thing a paid application still needs from the customer, from the stage.ts next-step rule. Drives the
// "Continue application" / "Upload documents" pill on Home and Applications cards and where tapping the card goes.
import { stage } from "./stage";
import { employmentOf, isPaid, needsContinue, requirementsFor, type Application } from "./data";
import { buildChecklist, isOpen } from "./checklist";

export type NextAction = { label: string; short: string; href: string };
export function nextAction(a: Application): NextAction | null {
  if (!isPaid(a)) return null;
  const detailsMissing = needsContinue(a);
  const docsMissing = detailsMissing ? 0 : buildChecklist(requirementsFor(employmentOf(a)), a.documents, a.status).customer.filter(isOpen).length;
  const next = stage({ status: a.status, payment_status: a.payment_status, docsMissing, detailsMissing }).next;
  if (!next) return null;
  return detailsMissing
    ? { label: "Continue application", short: "Action required", href: `/continue/${a.id}` }
    : { label: "Upload documents", short: "Action required", href: `/applications/${a.id}` };
}
