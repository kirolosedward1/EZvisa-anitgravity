import type { Metadata } from "next"
import { headers } from "next/headers"

export async function generateMetadata(): Promise<Metadata> {
  const arabic = (await headers()).get("x-ez-locale") === "ar"
  return {
    title: arabic ? "تأكيد الدفع" : "Payment Success",
    robots: { index: false, follow: false },
  }
}

export default function PaymentSuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
