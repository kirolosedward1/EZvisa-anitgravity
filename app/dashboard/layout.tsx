import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Download Documents | EZvisa",
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
