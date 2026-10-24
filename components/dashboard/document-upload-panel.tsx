"use client"

import { useRouter } from "next/navigation"
import { UploadChecklist } from "@/components/documents/upload-checklist"
import type { Requirement } from "@/lib/shared/wizard-contract"

/** The application page's documents box: each row uploads with the case's tracking token, then the page refreshes. */
export function DocumentUploadPanel({ token, rows, status }: { token: string; rows: Requirement[]; status: Record<string, unknown> }) {
  const router = useRouter()
  const upload = async (file: File, documentType: string) => {
    const formData = new window.FormData()
    formData.append("file", file)
    formData.append("trackingToken", token)
    formData.append("documentType", documentType)
    formData.append("uploadId", crypto.randomUUID())
    const res = await fetch("/api/upload-document", { method: "POST", body: formData })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "The upload didn't go through. Try again.")
    router.refresh()
  }
  return <UploadChecklist rows={rows} status={status} onUpload={upload} />
}
