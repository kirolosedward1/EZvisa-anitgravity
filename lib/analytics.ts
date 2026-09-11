// Privacy-Safe Analytics & Funnel Tracking

// Disallowed PII / sensitive parameter keys
const BLOCKED_KEYS = new Set([
  "passport",
  "passportnumber",
  "passport_number",
  "dob",
  "dateofbirth",
  "date_of_birth",
  "email",
  "phone",
  "phonenumber",
  "fullname",
  "firstname",
  "lastname",
  "name",
  "salary",
  "income",
  "bank",
  "bankstatement",
  "token",
  "tracking_token",
  "trackingtoken",
  "file",
  "filename",
  "content",
  "address",
])

// In-memory deduplication set to avoid re-render double fires
const firedEvents = new Set<string>()

export type FunnelEvent =
  | "destination_view"
  | "nationality_selected"
  | "destination_selected"
  | "application_started"
  | "application_step_completed"
  | "application_completed"
  | "checkout_started"
  | "payment_success"
  | "payment_failed"
  | "document_upload_started"
  | "document_upload_completed"
  | "file_ready_viewed"
  | "support_click"
  | "whatsapp_click"

function sanitizeParams(params: Record<string, any>): Record<string, any> {
  const safe: Record<string, any> = {}
  for (const [key, value] of Object.entries(params)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, "")
    if (BLOCKED_KEYS.has(lowerKey)) {
      continue // Strictly omit PII
    }
    // Only accept primitive scalar types
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safe[key] = value
    }
  }
  return safe
}

export const trackEvent = (
  eventName: FunnelEvent | (string & {}),
  params: Record<string, any> = {},
  dedupeKey?: string
) => {
  if (typeof window === "undefined") return

  // Prevent duplicate firing if a dedupeKey is provided
  if (dedupeKey) {
    if (firedEvents.has(dedupeKey)) return
    firedEvents.add(dedupeKey)
    try {
      if (sessionStorage.getItem(`evt_${dedupeKey}`)) return
      sessionStorage.setItem(`evt_${dedupeKey}`, "1")
    } catch {
      // sessionStorage unavailable/blocked
    }
  }

  const safeParams = sanitizeParams(params)

  // Dispatch to Google Analytics / GTAG if present
  if ((window as any).gtag) {
    ;(window as any).gtag("event", eventName, safeParams)
  }

  // Dispatch to GTM dataLayer if present
  if ((window as any).dataLayer) {
    ;(window as any).dataLayer.push({
      event: eventName,
      ...safeParams,
    })
  }
}

