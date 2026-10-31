/**
 * File preparation automation (Make.com). Two directions, neither needs the database key:
 *  - Out: when a case reaches Preparation, POST { event, application_id, reference } to MAKE_WEBHOOK_URL, signed with
 *    HMAC-SHA256 of the body using MAKE_API_SECRET (header X-EZvisa-Signature: sha256=<hex>). No personal data.
 *  - In: Make calls /api/automation/cases/... with `Authorization: Bearer <MAKE_API_SECRET>` to read that case and write
 *    its file parts back as drafts for staff review. That secret opens nothing else.
 * Both values live only in Vercel (and in Make's connection). Without them the integration is off.
 */
import crypto from "crypto"
import { hasBearerSecret } from "@/lib/bearer-auth"

export const PART_KEYS = ["form", "cover_letter", "flight", "hotel", "itinerary", "checklist"] as const
export type AutomationPart = (typeof PART_KEYS)[number]

export function automationConfigured(): { inbound: boolean; outbound: boolean } {
  return { inbound: !!process.env.MAKE_API_SECRET, outbound: !!process.env.MAKE_API_SECRET && !!process.env.MAKE_WEBHOOK_URL }
}

/** Inbound check: the Make secret only (never the staff or admin secrets). */
export function isAutomationRequest(request: Request): boolean {
  return hasBearerSecret(request.headers.get("authorization"), process.env.MAKE_API_SECRET)
}

/** Pure: the signature header value Make can recompute to check a webhook came from EZvisa. */
export function signBody(body: string, secret: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`
}

export type AutomationEvent = { event: "case.ready_for_preparation"; application_id: string; reference: string; reason: "all_documents_approved" | "stage_changed" | "manual"; sent_at: string }

/** Pure: the webhook body (ids only). */
export function buildEvent(applicationId: string, reference: string, reason: AutomationEvent["reason"], now = new Date()): AutomationEvent {
  return { event: "case.ready_for_preparation", application_id: applicationId, reference, reason, sent_at: now.toISOString() }
}

/** Sends the webhook. Best effort: never throws, never blocks the staff action; returns whether Make accepted it. */
export async function notifyAutomation(applicationId: string, reference: string, reason: AutomationEvent["reason"]): Promise<{ sent: boolean; reason?: string }> {
  const url = process.env.MAKE_WEBHOOK_URL
  const secret = process.env.MAKE_API_SECRET
  if (!url || !secret) return { sent: false, reason: "not_configured" }
  if (!/^https:\/\/hook\.[a-z0-9.-]*make\.com\//i.test(url)) return { sent: false, reason: "invalid_url" }
  const body = JSON.stringify(buildEvent(applicationId, reference, reason))
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-EZvisa-Signature": signBody(body, secret) }, body, signal: AbortSignal.timeout(5000) })
    return res.ok ? { sent: true } : { sent: false, reason: `http_${res.status}` }
  } catch {
    return { sent: false, reason: "network" }
  }
}
