import { Suspense } from "react"
import { ThankYouClient } from "./thank-you-client"
import type { Metadata } from "next"
import { withArabicMeta } from "@/lib/page-meta"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Payment Successful - Thank You",
      description: "Your visa application payment has been received successfully. Check what happens next.",
      robots: {
        index: false,
        follow: false,
      },
    },
    {
      title: "تم استلام الدفع",
      description: "استلمنا رسم الطلب. إليك ما يحدث بعد ذلك.",
      path: "/ar/apply/thank-you",
    },
  )
}

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouClient />
    </Suspense>
  )
}
