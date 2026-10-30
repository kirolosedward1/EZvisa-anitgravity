"use client"

// Signed-in upload desk for a case without a tracking link (e.g. started in the app): sends the file to
// POST /api/upload-document with the application id, the session token and a stable uploadId, exactly like the app.
import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { useSiteLocale } from "@/components/locale-provider"
import { UploadDesk, type DeskApp } from "@/components/documents/upload-desk"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRegisterSupportCase } from "@/lib/support-context"
import { customerText } from "@/lib/translations/customer"

function SignedInDesk() {
  const locale = useSiteLocale()
  const searchParams = useSearchParams()
  const id = searchParams.get("id") ?? ""
  const [error, setError] = useState<string | null>(null)
  const [app, setApp] = useState<DeskApp | null>(null)
  useRegisterSupportCase(id ? { id: app?.id || id, country: app?.destination_country, step: "upload" } : null)
  const [loading, setLoading] = useState(true)

  const token = useCallback(async () => {
    const { data } = await createBrowserClient().auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const fetchStatus = useCallback(async () => {
    if (!id) {
      setError(customerText(locale, "desk.noId"))
      setLoading(false)
      return
    }
    try {
      const jwt = await token()
      const res = await fetch(`/api/upload-document?id=${encodeURIComponent(id)}`, { headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.app) setApp(data.app)
      else setError(customerText(locale, res.status === 401 ? "desk.signIn" : "desk.loadFailed"))
    } catch {
      setError(customerText(locale, "desk.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [id, token, locale])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const upload = async (file: File, documentType: string) => {
    const jwt = await token()
    if (!jwt) throw new Error(customerText(locale, "desk.sessionEnded"))
    const formData = new window.FormData()
    formData.append("file", file)
    formData.append("applicationId", id)
    formData.append("documentType", documentType)
    formData.append("uploadId", crypto.randomUUID())
    const res = await fetch("/api/upload-document", { method: "POST", body: formData, headers: { Authorization: `Bearer ${jwt}` } })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || customerText(locale, "docs.failed"))
    await fetchStatus()
  }

  return <UploadDesk app={app} loading={loading} error={error} backHref={id ? `/dashboard?id=${id}` : "/dashboard"} onUpload={upload} />
}

export default function UploadDocumentsPage() {
  return (
    <>
      <SiteHeader forceBackground={true} />
      <main id="main-content" className="ez-customer-page ez-dash min-h-screen px-4 pb-16 pt-[100px] sm:px-8">
        <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" /></div>}>
          <SignedInDesk />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}
