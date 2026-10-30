"use client"

// Upload desk reached from a tracking link. Same document types, checklist rule (NOC only for employees) and
// server route as the signed-in desk and the EZvisa app (POST /api/upload-document).
import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { useSiteLocale } from "@/components/locale-provider"
import { UploadDesk, type DeskApp } from "@/components/documents/upload-desk"
import { useRegisterSupportCase } from "@/lib/support-context"
import { customerText } from "@/lib/translations/customer"

export default function UploadDocumentsPage() {
  const locale = useSiteLocale()
  const params = useParams()
  const token = params.token as string
  const [appStatus, setAppStatus] = useState<DeskApp | null>(null)
  // Only once the row is loaded: a reference built from the token would not match the one the customer sees.
  useRegisterSupportCase(appStatus?.id ? { id: appStatus.id, country: appStatus.destination_country, step: "upload" } : null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const fetchStatus = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/upload-document?token=${encodeURIComponent(token)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.app) setAppStatus(data.app)
      }
    } catch {
      // Non-critical background fetch
    } finally {
      setLoadingStatus(false)
    }
  }, [token])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const upload = async (file: File, documentType: string) => {
    const formData = new window.FormData()
    formData.append("file", file)
    formData.append("trackingToken", token)
    formData.append("documentType", documentType)
    formData.append("uploadId", crypto.randomUUID())
    const res = await fetch("/api/upload-document", { method: "POST", body: formData })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || customerText(locale, "docs.failed"))
    await fetchStatus()
  }

  return (
    <>
      <SiteHeader forceBackground={true} />
      <main id="main-content" className="ez-customer-page ez-dash min-h-screen px-4 pb-16 pt-[100px] sm:px-8">
        <UploadDesk app={appStatus} loading={loadingStatus} error={customerText(locale, "desk.notFound")} backHref={`/track/${token}`} onUpload={upload} />
      </main>
      <Footer />
    </>
  )
}
