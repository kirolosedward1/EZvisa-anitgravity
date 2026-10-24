import { Metadata } from 'next'
import { withArabicMeta } from '@/lib/page-meta'

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "My account",
      robots: {
        index: false,
        follow: false,
      },
    },
    { title: "حسابي", path: "/ar/dashboard" },
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
