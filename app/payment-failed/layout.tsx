import type { Metadata } from "next"
import { headers } from "next/headers"

export async function generateMetadata(): Promise<Metadata> {
  const arabic = (await headers()).get("x-ez-locale") === "ar"
  return {
    title: arabic ? "فشل الدفع" : "Payment Failed",
    robots: { index: false, follow: false },
  }
}

export default function PaymentFailedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
