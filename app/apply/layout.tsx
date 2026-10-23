import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Application Wizard",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
