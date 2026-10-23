"use client"

// Signed-in upload desk for a case without a tracking link (e.g. started in the app): sends the file to
// POST /api/upload-document with the application id, the session token and a stable uploadId, exactly like the app.
import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ArrowLeft, Loader2 } from "lucide-react"
import { UploadChecklist } from "@/components/documents/upload-checklist"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRegisterSupportCase } from "@/lib/support-context"
import { DOC_FLAG, REQUIREMENTS, referenceOf } from "@/lib/shared/wizard-contract"

type AppDocStatus = {
  id: string
  destination_country?: string
  full_name?: string
  has_passport?: boolean | null
  has_photos?: boolean | null
  has_bank_statements?: boolean | null
  has_employment_proof?: boolean | null
  required?: string[]
}

function UploadDesk() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id") ?? ""
  const [error, setError] = useState<string | null>(null)
  const [app, setApp] = useState<AppDocStatus | null>(null)
  useRegisterSupportCase(id ? { id: app?.id || id, country: app?.destination_country, step: "upload" } : null)
  const [loading, setLoading] = useState(true)

  const token = useCallback(async () => {
    const { data } = await createBrowserClient().auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const fetchStatus = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }
    try {
      const jwt = await token()
      const res = await fetch(`/api/upload-document?id=${encodeURIComponent(id)}`, { headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.app) setApp(data.app)
      else setError(data.error || "Please sign in to see this application")
    } catch {
      setError("Could not load the application")
    } finally {
      setLoading(false)
    }
  }, [id, token])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const upload = async (file: File, documentType: string) => {
    const jwt = await token()
    if (!jwt) throw new Error("Your session has ended. Sign in again to upload.")
    const formData = new window.FormData()
    formData.append("file", file)
    formData.append("applicationId", id)
    formData.append("documentType", documentType)
    formData.append("uploadId", crypto.randomUUID())
    const res = await fetch("/api/upload-document", { method: "POST", body: formData, headers: { Authorization: `Bearer ${jwt}` } })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "The upload didn't go through. Try again.")
    await fetchStatus()
  }

  const required = app?.required ?? ["has_passport", "has_photos", "has_bank_statements", "has_employment_proof"]
  const rows = REQUIREMENTS.filter((r) => !r.provided_by_ezvisa && required.includes(DOC_FLAG[r.document_type]))
  const allComplete = !!app && rows.every((r) => !!(app as Record<string, unknown>)[DOC_FLAG[r.document_type]])
  const back = id ? `/dashboard?id=${id}` : "/dashboard"

  return (
    <>
      <SiteHeader forceBackground={true} />
      <main className="min-h-screen bg-secondary/40 px-4 pb-20 pt-28 md:pt-32">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <Link href={back} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              Back to your application
            </Link>
            {app?.id ? <span className="ltr-isolate text-xs tabular-nums text-muted-foreground">{referenceOf(app.id)}</span> : null}
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="app-title text-foreground">Upload your documents</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {app ? <>{app.full_name} · {app.destination_country} visa. </> : null}
              Upload each document in its row. A clear phone photo or scan is fine: PDF, JPG or PNG, up to 5 MB.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading your checklist" />
            </div>
          ) : app ? (
            <>
              <UploadChecklist rows={rows} status={app as Record<string, unknown>} onUpload={upload} />
              {allComplete ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <p className="text-sm text-foreground">Everything is in. A visa specialist will check your documents and prepare your file.</p>
                  <Button asChild variant="outline" className="shrink-0 rounded-full hover:bg-secondary hover:text-foreground">
                    <Link href={back}>Back to your application</Link>
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground" role="alert">
              {!id ? "No application selected. Open it from My applications." : error}
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

export default function UploadDocumentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <UploadDesk />
    </Suspense>
  )
}
