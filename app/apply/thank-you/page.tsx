import { Suspense } from "react"
import { ThankYouClient } from "./thank-you-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Payment Successful - Thank You | EZvisa",
  description: "Your visa application payment has been received successfully. Check what happens next.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouClient />
    </Suspense>
  )
}
