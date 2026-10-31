/**
 * Refund policy (fixed in code, as agreed): full refund before any document is reviewed, 50 percent after review
 * and before the file is ready, none once the file is ready; a duplicate charge is always refunded in full. Pure.
 */
import type { StaffCase } from "@/lib/staff/cases"

export const REFUND_REASONS = ["Customer cancelled before review", "Duplicate payment", "Service not delivered", "Goodwill", "Other"] as const
export type RefundReason = (typeof REFUND_REASONS)[number]

export type RefundPolicy = { key: "full" | "half" | "none" | "duplicate"; label: string; amount: number }

export function refundPolicy(c: Pick<StaffCase, "stage" | "amount" | "docsToCheck">, reviewedAny: boolean, reason?: string): RefundPolicy {
  const paid = c.amount ?? 0
  if (reason === "Duplicate payment") return { key: "duplicate", label: "Duplicate charge, full refund", amount: paid }
  if (["ready", "appointment", "completed"].includes(c.stage)) return { key: "none", label: "File ready, no refund (goodwill only)", amount: 0 }
  if (!reviewedAny && (c.stage === "documents" || c.stage === "review" || c.stage === "payment")) return { key: "full", label: "Before review, full refund", amount: paid }
  return { key: "half", label: "After review, 50 percent", amount: Math.round(paid * 50) / 100 }
}

export const REFUND_STATUS: Record<string, { label: string; tone: string }> = {
  requested: { label: "Refund requested", tone: "amber" },
  approved: { label: "Approved, to send", tone: "blue" },
  declined: { label: "Declined", tone: "grey" },
  sent: { label: "Refunded", tone: "blue" },
}
