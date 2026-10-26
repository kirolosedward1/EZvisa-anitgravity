import type { Metadata } from "next"
import { withArabicMeta } from "@/lib/page-meta"

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
      title: "Sign in",
      description: "Sign in to EZvisa to track your Schengen visa application, upload documents and download your file.",
      robots: { index: false, follow: true },
    },
    {
      title: "تسجيل الدخول",
      description: "سجّل الدخول إلى إيزي فيزا لمتابعة طلب تأشيرة شنغن ورفع المستندات وتنزيل الملف.",
      path: "/ar/login",
    },
  )
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
