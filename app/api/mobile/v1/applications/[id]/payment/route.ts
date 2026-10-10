import { RATE_LIMITS } from "@/lib/rate-limit"
import {
  ApiError,
  getAdmin,
  handler,
  json,
  loadOwnedApplication,
  rateLimit,
  readJson,
  requireUser,
  serializeApplication,
  wizardDataOf,
} from "@/lib/mobile/server"
import { isPaid, priceAED } from "@/lib/shared/visa-wizard"
import { isAllowedAppReturnUrl } from "@/lib/mobile/return-url"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

const ZIINA_API = "https://api-v2.ziina.com/api"

const ZIINA_STATUS_MAP: Record<string, string> = {
  completed: "paid",
  pending: "pending",
  requires_payment_instrument: "pending",
  requires_user_action: "pending",
  failed: "failed",
  cancelled: "cancelled",
  canceled: "cancelled",
  expired: "expired",
}

function ziinaKey() {
  const key = process.env.ZIINA_API_KEY
  if (!key) throw new ApiError(500, "not_configured", "Payments are not configured")
  return key
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.ezvisa.net").replace(/\/$/, "")
}

/**
 * POST — create a Ziina payment intent for a submitted application.
 * Body: { returnUrl } — the app's deep link (ezvisa://… or exp://… in Expo Go).
 * The amount is computed here from the stored answers; the client never sends it.
 */
export const POST = handler(async (request: Request, { params }: Ctx) => {
  const user = await requireUser(request)
  await rateLimit(`pay:${user.id}`, RATE_LIMITS.strict)
  const { id } = await params
  const row = await loadOwnedApplication(user, id)

  if (row.application_status === "draft") throw new ApiError(409, "not_submitted", "Submit the application first.")
  if (isPaid(row.payment_status)) throw new ApiError(409, "already_paid", "This application is already paid.")

  const { returnUrl } = await readJson<{ returnUrl?: string }>(request)
  if (!returnUrl || !isAllowedAppReturnUrl(returnUrl)) throw new ApiError(400, "invalid_return_url", "Invalid return URL")

  const amountAED = priceAED(wizardDataOf(row))
  const back = (status: string) =>
    `${siteUrl()}/api/mobile/v1/payment-return?status=${status}&to=${encodeURIComponent(returnUrl)}`

  const res = await fetch(`${ZIINA_API}/payment_intent`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ziinaKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(amountAED * 100), // fils
      currency_code: "AED",
      success_url: back("success"),
      cancel_url: back("cancelled"),
      test: process.env.ZIINA_TEST_MODE === "true",
    }),
  })
  if (!res.ok) {
    console.error("[mobile-pay] Ziina error", res.status, await res.text())
    throw new ApiError(502, "payment_provider_error", "Couldn't start the payment. Please try again.")
  }
  const intent = (await res.json()) as { id?: string; redirect_url?: string }
  if (!intent.id || !intent.redirect_url) {
    throw new ApiError(502, "payment_provider_error", "Couldn't start the payment. Please try again.")
  }

  const { error } = await getAdmin()
    .from("visa_applications")
    .update({ payment_id: intent.id, payment_amount: amountAED })
    .eq("id", row.id)
  if (error) throw error

  return json({ checkoutUrl: intent.redirect_url, paymentId: intent.id, amountAED })
})

/**
 * GET — re-check the payment with Ziina and store the result. The Ziina
 * webhook does the same thing; this makes the app correct even if the webhook
 * is late or not configured.
 */
export const GET = handler(async (request: Request, { params }: Ctx) => {
  const user = await requireUser(request)
  await rateLimit(`paycheck:${user.id}`, RATE_LIMITS.standard)
  const { id } = await params
  const row = await loadOwnedApplication(user, id)

  if (row.payment_id && !isPaid(row.payment_status)) {
    const res = await fetch(`${ZIINA_API}/payment_intent/${encodeURIComponent(row.payment_id)}`, {
      headers: { Authorization: `Bearer ${ziinaKey()}` },
      cache: "no-store",
    })
    if (res.ok) {
      const intent = (await res.json()) as { status?: string }
      const mapped = intent.status ? ZIINA_STATUS_MAP[intent.status.toLowerCase()] : undefined
      if (mapped && mapped !== row.payment_status) {
        const patch: Record<string, unknown> = { payment_status: mapped }
        if (mapped === "paid" && row.application_status === "submitted") patch.application_status = "reviewing"
        await getAdmin().from("visa_applications").update(patch).eq("id", row.id)
        row.payment_status = mapped
        if (patch.application_status) row.application_status = "reviewing"
      }
    }
  }
  return json({ application: serializeApplication(row) })
})
