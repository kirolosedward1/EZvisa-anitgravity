import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to EZvisa to track your Schengen visa application, upload documents and download your file.",
  robots: { index: false, follow: true },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
