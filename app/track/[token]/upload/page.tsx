"use client"

// Upload desk reached from a tracking link. Same document types, checklist rule (NOC only for employees) and
// server route as the signed-in desk and the EZvisa app (POST /api/upload-document).
import { useState, useEffect, useCallback } from "react"
import { LocaleLink } from "@/components/locale-link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ArrowLeft, Loader2 } from "lucide-react"
import { UploadChecklist } from "@/components/documents/upload-checklist"
import { useRegisterSupportCase } from "@/lib/support-context"
import { DOC_FLAG, REQUIREMENTS, referenceOf } from "@/lib/shared/wizard-contract"

type AppDocStatus = {
  id?: string
  destination_country?: string
  full_name?: string
  has_passport?: boolean | null
  has_photos?: boolean | null
  has_bank_statements?: boolean | null
  has_employment_proof?: boolean | null
  application_status?: string
  required?: string[]
}

const ALL_FLAGS = ["has_passport", "has_photos", "has_bank_statements", "has_employment_proof"]

export default function UploadDocumentsPage() {
  const params = useParams()
  const token = params.token as string
  const [appStatus, setAppStatus] = useState<AppDocStatus | null>(null)
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
    if (!res.ok) throw new Error(data.error || "The upload didn't go through. Try again.")
    await fetchStatus()
  }

  const required = appStatus?.required ?? ALL_FLAGS
  const rows = REQUIREMENTS.filter((r) => !r.provided_by_ezvisa && required.includes(DOC_FLAG[r.document_type]))
  const allComplete = !!appStatus && rows.every((r) => !!(appStatus as Record<string, unknown>)[DOC_FLAG[r.document_type]])
  const reference = appStatus?.id ? referenceOf(appStatus.id) : ""

  return (
    <>
      <SiteHeader forceBackground={true} />
      <main className="min-h-screen bg-secondary/40 px-4 pb-20 pt-28 md:pt-32">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <LocaleLink href={`/track/${token}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              Back to your application
            </LocaleLink>
            {reference ? <span className="ltr-isolate text-xs tabular-nums text-muted-foreground">{reference}</span> : null}
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="app-title text-foreground">Upload your documents</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {appStatus ? <>{appStatus.full_name} · {appStatus.destination_country} visa. </> : null}
              Upload each document in its row. A clear phone photo or scan is fine: PDF, JPG or PNG, up to 5 MB.
            </p>
          </div>

          {loadingStatus ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading your checklist" />
            </div>
          ) : appStatus ? (
            <>
              <UploadChecklist rows={rows} status={appStatus as Record<string, unknown>} onUpload={upload} />
              {allComplete ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <p className="text-sm text-foreground">Everything is in. A visa specialist will check your documents and prepare your file.</p>
                  <Button asChild variant="outline" className="shrink-0 rounded-full hover:bg-secondary hover:text-foreground">
                    <LocaleLink href={`/track/${token}`}>Back to your application</LocaleLink>
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground">
              We couldn&apos;t find this application. Open the link from your confirmation email again, or sign in to see your applications.
            </p>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Files are stored privately and only our visa team can open them. The same checklist is in the EZvisa app.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
