// Pure helpers for notify-status (no Deno or npm imports) so they can be checked with plain node: scripts/check-push.mjs.
// Lock-screen text carries no names, passport numbers, destinations, references or outcomes. The app shows the details
// after the tap, behind the user's session (and Face ID if they turned the lock on).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Status changes made by EZvisa staff. draft/submitted are the customer's own steps. */
const STAFF_STATUSES = new Set(["reviewing", "awaiting_documents", "approved", "ready", "appointment_booked", "completed", "rejected", "cancelled"]);

export type HookEvent = { application_id?: unknown; old_status?: string | null; new_status?: string | null; rejected?: unknown };
export type PushMessage = { body: string; data: { type: "status" | "document"; applicationId: string; url: string } };

export const TEXT = { status: "There's an update on your application.", document: "A document needs your attention." } as const;

/** One message per trigger call (several rejected documents become one push), or null when there is nothing to tell. */
export function buildMessage(e: HookEvent): PushMessage | null {
  const id = typeof e.application_id === "string" ? e.application_id : "";
  if (!UUID.test(id)) return null;
  const data = (type: "status" | "document") => ({ type, applicationId: id, url: `/applications/${id}` });
  const changed = !!e.new_status && e.new_status !== e.old_status;
  const rejected = Array.isArray(e.rejected) && e.rejected.length > 0;
  if (rejected || (changed && e.new_status === "awaiting_documents")) return { body: TEXT.document, data: data("document") };
  if (!changed || !STAFF_STATUSES.has(e.new_status!)) return null;
  // A customer discarding their own unpaid draft/submitted case (migration 0007) is not news to them.
  if (e.new_status === "cancelled" && (!e.old_status || e.old_status === "draft" || e.old_status === "submitted")) return null;
  return { body: TEXT.status, data: data("status") };
}

export type TokenRow = { token: string; email: string | null; updated_at: string | null; created_at?: string | null };
/** Tokens whose most recent row belongs to `email`. A phone that changed hands keeps sending only to its latest account,
 * even if the previous account's row could not be deleted (offline sign-out, or before claim_device_token exists). */
export function latestOwnerTokens(rows: TokenRow[], email: string): string[] {
  const latest = new Map<string, TokenRow>();
  const at = (r: TokenRow) => Date.parse(r.updated_at ?? r.created_at ?? "") || 0;
  for (const r of rows) { const cur = latest.get(r.token); if (!cur || at(r) > at(cur)) latest.set(r.token, r); }
  const me = email.toLowerCase();
  return [...latest.values()].filter((r) => (r.email ?? "").toLowerCase() === me).map((r) => r.token);
}
