"use client"

import { useState } from "react"
import { CreditCard, Loader2 } from "lucide-react"
import { payLabel } from "@/components/aed-amount"
import { useSiteLocale } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { customerText } from "@/lib/translations/customer"

interface PayNowButtonProps {
  applicationId?: string
  trackingToken?: string
  destination?: string
  amount?: number
  className?: string
  label?: string
}

export function PayNowButton({ applicationId, trackingToken, destination, amount = 249, className, label }: PayNowButtonProps) {
  const locale = useSiteLocale()
  const arabic = locale === "ar"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePay = async () => {
    setLoading(true)
    setError(null)
    const started = performance.now()
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 20000)
    try {
      const successUrl = new URL("/payment-success", window.location.origin)
      if (trackingToken) successUrl.searchParams.set("token", trackingToken)
      if (applicationId) successUrl.searchParams.set("appId", applicationId)
      if (destination) successUrl.searchParams.set("dest", destination)

      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          amount,
          currency: "AED",
          success_url: successUrl.toString(),
          cancel_url: `${window.location.origin}/payment-failed`,
          test: false,
        }),
        signal: controller.signal,
      })
      const data = await res.json().catch(() => ({}))
      console.info("[payment] create-payment", {
        ms: Math.round(performance.now() - started),
        status: res.status,
        error: data.error || null,
        elapsedMs: data.elapsedMs ?? null,
      })
      if (!res.ok || !data.redirect_url) throw new Error(arabic ? customerText("ar", "pay.startFailed") : data.error || "Could not start payment")
      window.location.href = data.redirect_url
    } catch (err) {
      console.error("Payment start failed:", err)
      const aborted = err instanceof Error && err.name === "AbortError"
      setError(aborted ? customerText(locale, "pay.timeout") : customerText(locale, "pay.failed"))
      setLoading(false)
    } finally {
      window.clearTimeout(timer)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handlePay} disabled={loading} className={className}>
        {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
        {loading ? customerText(locale, "pay.opening") : label ?? payLabel(amount, arabic)}
      </Button>
      {error && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p className="text-xs text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={handlePay} disabled={loading}>
            {customerText(locale, "pay.retry")}
          </Button>
        </div>
      )}
    </div>
  )
}
