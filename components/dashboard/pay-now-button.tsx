"use client"

import { useState } from "react"
import { CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PayNowButtonProps {
  applicationId?: string
  trackingToken?: string
  destination?: string
  amount: number
}

export function PayNowButton({ applicationId, trackingToken, destination, amount }: PayNowButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePay = async () => {
    setLoading(true)
    setError(null)
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
      })
      const data = await res.json()
      if (!res.ok || !data.redirect_url) throw new Error(data.error || "Could not start payment")
      window.location.href = data.redirect_url
    } catch (err) {
      console.error("Payment start failed:", err)
      setError("We couldn't open the payment page")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handlePay} disabled={loading} className="rounded-full px-5">
        {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
        {loading ? "Redirecting to payment…" : `Pay ${amount} AED`}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}. Please try again or message us on WhatsApp.
        </p>
      )}
    </div>
  )
}
