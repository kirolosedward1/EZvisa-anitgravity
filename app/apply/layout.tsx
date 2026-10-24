import { Metadata } from 'next'
import { withArabicMeta } from '@/lib/page-meta'

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Application Wizard",
      robots: {
        index: false,
        follow: false,
      },
    },
    { title: "نموذج الطلب", path: "/ar/apply" },
  )
}

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
