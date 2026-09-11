import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Payment Failed | EZvisa",
  robots: {
    index: false,
    follow: false,
  },
}

export default function PaymentFailedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
