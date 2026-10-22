"use client"

// Pays an existing unpaid case (e.g. one started in the app or left unpaid): the server prices it and the Ziina
// checkout returns to the website, exactly like the wizard's payment step and the app's Pay button.
import { useState } from "react"
import { CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function PayNowButton({ applicationId, destination, trackingToken, className, label = "Pay now" }: { applicationId?: string; destination?: string | null; trackingToken?: string | null; className?: string; label?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pay = async () => {
    setBusy(true)
    setError(null)
    try {
      if (!applicationId) throw new Error("This application could not be identified.")
      const successUrl = new URL("/payment-success", window.location.origin)
      successUrl.searchParams.set("appId", applicationId)
      if (trackingToken) successUrl.searchParams.set("token", trackingToken)
      if (destination) successUrl.searchParams.set("dest", destination)
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, success_url: successUrl.toString(), cancel_url: `${window.location.origin}/payment-failed` }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) throw new Error(data.error || "This application is already paid.")
      if (!res.ok || !data.redirect_url) throw new Error(data.error || "Online payment isn't available right now. Please message us on WhatsApp.")
      window.location.href = data.redirect_url
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the payment")
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={pay} disabled={busy} className={cn("font-semibold", className)}>
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
        {busy ? "Opening secure payment…" : label}
      </Button>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  )
}
