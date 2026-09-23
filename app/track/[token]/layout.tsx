import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Track your application",
  robots: {
    index: false,
    follow: false,
  },
}

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
