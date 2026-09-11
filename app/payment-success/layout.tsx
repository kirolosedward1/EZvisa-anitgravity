import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Payment Success | EZvisa",
  robots: {
    index: false,
    follow: false,
  },
}

export default function PaymentSuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
