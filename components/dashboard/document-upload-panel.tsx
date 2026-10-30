"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { UploadChecklist } from "@/components/documents/upload-checklist"
import type { Requirement } from "@/lib/shared/wizard-contract"
import type { DocumentReviews, UploadRecord } from "@/lib/document-reviews"

/** The application page's documents box: each row uploads with the case's tracking token, then the page refreshes. */
export function DocumentUploadPanel({ token, rows, status, footer, reviews, uploads }: { token: string; rows: Requirement[]; status: Record<string, unknown>; footer?: ReactNode; reviews?: DocumentReviews; uploads?: UploadRecord[] }) {
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
  return <UploadChecklist rows={rows} status={status} onUpload={upload} footer={footer} reviews={reviews} uploads={uploads} />
}
