"use client"

import { useState } from "react"
import { CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PayNowButtonProps {
  applicationId?: string
  trackingToken?: string
  destination?: string
  amount?: number
  className?: string
  label?: string
}

export function PayNowButton({ applicationId, trackingToken, destination, amount = 249, className, label }: PayNowButtonProps) {
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
      if (!res.ok || !data.redirect_url) throw new Error(data.error || "Could not start payment")
      window.location.href = data.redirect_url
    } catch (err) {
      console.error("Payment start failed:", err)
      const aborted = err instanceof Error && err.name === "AbortError"
      setError(aborted ? "Ziina didn't open within 20 seconds." : "We couldn't open the payment page.")
      setLoading(false)
    } finally {
      window.clearTimeout(timer)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handlePay} disabled={loading} className={`rounded-full px-5 ${className ?? ""}`}>
        {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
        {loading ? "Opening Ziina…" : label ?? `Pay ${amount} AED`}
      </Button>
      {error && (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p className="text-xs text-destructive">{error}</p>
          <Button type="button" variant="outline" onClick={handlePay} disabled={loading} className="h-8 rounded-full px-4 text-xs">
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
