"use client"

import { useRegisterSupportCase, type SupportCase } from "@/lib/support-context"

/** Renders nothing: tells the header and footer WhatsApp buttons which application this page is about. */
export function SupportApplication(props: SupportCase) {
  useRegisterSupportCase(props.id ? props : null)
  return null
}
