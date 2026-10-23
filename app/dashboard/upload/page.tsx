"use client"

// Signed-in upload desk for a case without a tracking link (e.g. started in the app): sends the file to
// POST /api/upload-document with the application id, the session token and a stable uploadId, exactly like the app.
import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { Upload, FileText, CheckCircle2, Loader2, ArrowLeft, AlertCircle, Clock } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { DOC_TYPES, DOC_FLAG, MAX_UPLOAD_BYTES, UPLOAD_MIME, REQUIREMENTS } from "@/lib/shared/wizard-contract"

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
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<string>("passportCopy")
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [app, setApp] = useState<AppDocStatus | null>(null)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setSuccess(false)
    if (f.size > MAX_UPLOAD_BYTES) {
      setError("File size exceeds 5MB limit")
      return
    }
    if (!(f.type in UPLOAD_MIME)) {
      setError("Only PDF, JPG or PNG files")
      return
    }
    setError(null)
    setFile(f)
  }

  const handleUpload = async () => {
    if (!file || !id) return
    setUploading(true)
    setError(null)
    setSuccess(false)
    try {
      const jwt = await token()
      if (!jwt) throw new Error("Please sign in to upload documents")
      const formData = new window.FormData()
      formData.append("file", file)
      formData.append("applicationId", id)
      formData.append("documentType", docType)
      formData.append("uploadId", crypto.randomUUID())
      const res = await fetch("/api/upload-document", { method: "POST", body: formData, headers: { Authorization: `Bearer ${jwt}` } })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setSuccess(true)
      setFile(null)
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const required = app?.required ?? ["has_passport", "has_photos", "has_bank_statements", "has_employment_proof"]
  const rows = REQUIREMENTS.filter((r) => !r.provided_by_ezvisa && required.includes(DOC_FLAG[r.document_type]))
  const allComplete = !!app && rows.every((r) => !!(app as Record<string, unknown>)[DOC_FLAG[r.document_type]])

  return (
    <>
      <SiteHeader forceBackground={true} />
      <main className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="container max-w-3xl mx-auto space-y-6">
          <Link href={id ? `/dashboard?id=${id}` : "/dashboard"} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>

          <div className="bg-card border rounded-xl p-6 md:p-8 shadow-sm">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">Upload Supporting Documents</h1>
            {app && (
              <p className="text-muted-foreground">
                Application for <strong className="text-foreground">{app.full_name}</strong> &bull; {app.destination_country} Visa
              </p>
            )}
            {!id && <p className="text-sm text-destructive">No application selected.</p>}
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : app ? (
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Document Checklist
                </h2>
                {allComplete ? (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All Documents Received
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Pending Uploads
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rows.map((r) => {
                  const received = !!(app as Record<string, unknown>)[DOC_FLAG[r.document_type]]
                  return (
                    <div key={r.id} className="p-3 rounded-lg border flex items-center justify-between bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                      </div>
                      <span className={`${received ? "text-emerald-600 bg-emerald-500/10" : "text-amber-600 bg-amber-500/10"} px-2 py-0.5 text-xs font-bold rounded-full`}>{received ? "Received" : "Pending"}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {app && (
            <div className="bg-card border rounded-xl p-6 md:p-8 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Select Document to Upload</h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="docType" className="block text-sm font-medium mb-2">Document Category</label>
                  <select
                    id="docType"
                    className="w-full flex h-11 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  >
                    {DOC_TYPES.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="file" className="block text-sm font-medium mb-2">Select File (PDF, JPG, PNG)</label>
                  <div className="border-2 border-dashed rounded-xl p-8 text-center bg-background transition-colors hover:bg-secondary/60">
                    <input type="file" id="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
                    <label htmlFor="file" className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-8 h-8 text-muted-foreground mb-3" />
                      <span className="font-medium text-primary">Click to browse</span>
                      <span className="text-xs text-muted-foreground mt-1">Accepted: PDF, JPG, PNG &bull; Max 5MB</span>
                    </label>
                  </div>
                  {file && (
                    <div className="mt-4 p-3 bg-primary/5 text-primary rounded-md flex items-center text-sm border border-primary/10">
                      <FileText className="w-4 h-4 mr-2 shrink-0" />
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="ml-auto text-xs opacity-75">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-destructive/5 text-destructive rounded-md flex items-start text-sm border border-destructive/20" role="alert">
                    <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-md flex items-start text-sm border border-emerald-100 dark:border-emerald-900/40" role="status">
                    <CheckCircle2 className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                    Document uploaded securely. The checklist has been updated.
                  </div>
                )}

                <Button onClick={handleUpload} disabled={!file || uploading} className="w-full h-11 text-base font-semibold">
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading securely...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Upload Document</>
                  )}
                </Button>
              </div>
            </div>
          )}
          {!loading && !app && error && (
            <div className="p-4 bg-destructive/5 text-destructive rounded-md flex items-start text-sm border border-destructive/20" role="alert">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
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
