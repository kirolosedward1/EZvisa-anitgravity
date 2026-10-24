import { Metadata } from 'next'
import { withArabicMeta } from '@/lib/page-meta'

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Track your application",
      robots: {
        index: false,
        follow: false,
      },
    },
    { title: "تابع طلبك", path: "/ar/track" },
  )
}

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
