"use client"

import { ArrowRight, LayoutDashboard } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { LangText } from "@/components/lang-text"
import { useViewer } from "@/components/user-menu"

/** Signed-in visitors: a direct way to the application they are probably asking about. */
export function HelpAccountShortcut() {
  const { viewer } = useViewer()
  if (!viewer) return null
  return (
    <LocaleLink
      href="/dashboard"
      className="group inline-flex items-center gap-3 rounded-full border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
    >
      <LayoutDashboard className="size-4 text-primary" aria-hidden="true" />
      <LangText en="Your applications, status and documents" ar="طلباتك وحالتها ومستنداتها" />
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
    </LocaleLink>
  )
}
