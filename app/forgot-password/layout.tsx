import type { Metadata } from "next"
import { withArabicMeta } from "@/lib/page-meta"
import { translations } from "@/lib/translations"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: translations.en.authForm.resetTitle,
      description: translations.en.authForm.resetSubtitle,
    },
    {
      title: translations.ar.authForm.resetTitle,
      description: translations.ar.authForm.resetSubtitle,
      path: "/ar/forgot-password",
    },
  )
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
