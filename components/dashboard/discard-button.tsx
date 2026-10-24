"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useSiteLocale } from "@/components/locale-provider"
import { Button } from "@/components/ui/button"
import { customerText } from "@/lib/translations/customer"

export function DiscardButton({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const locale = useSiteLocale()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  const discard = async () => {
    if (!window.confirm(customerText(locale, "discard.confirm"))) return
    setPending(true)
    setError("")
    const response = await fetch("/api/applications/discard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: applicationId }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(locale === "ar" ? customerText("ar", "discard.failed") : data.error || "Could not discard this application.")
      setPending(false)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border/60 px-6 py-4">
      <Button type="button" variant="outline" className="rounded-full" onClick={discard} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {customerText(locale, "discard.button")}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
