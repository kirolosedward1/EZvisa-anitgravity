import type { Metadata } from "next"
import { withArabicMeta } from "@/lib/page-meta"
import { translations } from "@/lib/translations"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: translations.en.authForm.signupTitle,
      description: translations.en.authForm.signupSubtitle,
    },
    {
      title: translations.ar.authForm.signupTitle,
      description: translations.ar.authForm.signupSubtitle,
      path: "/ar/signup",
    },
  )
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
