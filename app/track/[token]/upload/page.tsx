"use client"

// Upload desk reached from a tracking link. Same document types, checklist rule (NOC only for employees) and
// server route as the signed-in desk and the EZvisa app (POST /api/upload-document).
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { Upload, FileText, CheckCircle2, Loader2, ArrowLeft, AlertCircle, Clock, ShieldCheck } from "lucide-react"
import { getDocumentHelpWhatsAppUrl } from "@/lib/whatsapp"
import { DOC_TYPES, DOC_FLAG, MAX_UPLOAD_BYTES, UPLOAD_MIME, REQUIREMENTS, referenceOf } from "@/lib/shared/wizard-contract"

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
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<string>(DOC_TYPES[0]?.value ?? "passportCopy")
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appStatus, setAppStatus] = useState<AppDocStatus | null>(null)
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
    if (!file) return
    setUploading(true)
    setError(null)
    setSuccess(false)
    try {
      const formData = new window.FormData()
      formData.append("file", file)
      formData.append("trackingToken", token)
      formData.append("documentType", docType)
      formData.append("uploadId", crypto.randomUUID())
      const res = await fetch("/api/upload-document", { method: "POST", body: formData })
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

  const required = appStatus?.required ?? ALL_FLAGS
  const rows = REQUIREMENTS.filter((r) => !r.provided_by_ezvisa && required.includes(DOC_FLAG[r.document_type]))
  const allComplete = !!appStatus && rows.every((r) => !!(appStatus as Record<string, unknown>)[DOC_FLAG[r.document_type]])
  const reference = referenceOf(appStatus?.id ?? token)

  return (
    <>
      <SiteHeader forceBackground={true} />
      <main className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="container max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Link href={`/track/${token}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to your case
            </Link>
            <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2.5 py-1 rounded">{reference}</span>
          </div>

          <div className="bg-card border rounded-xl p-6 md:p-8 shadow-sm">
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Encrypted upload desk
            </span>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Upload Supporting Documents</h1>
            {appStatus && (
              <p className="text-muted-foreground mt-1">
                Application for <strong className="text-foreground">{appStatus.full_name}</strong> &bull; {appStatus.destination_country} Visa
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Upload your documents below to complete your visa file. Files are stored securely and reviewed by our UAE visa specialists. The same checklist is in the EZvisa app.
            </p>
          </div>

          {loadingStatus ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : appStatus ? (
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
                  const received = !!(appStatus as Record<string, unknown>)[DOC_FLAG[r.document_type]]
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

              {allComplete && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between flex-wrap gap-2">
                  <span>All required files are uploaded. Our experts are finalizing your Schengen file.</span>
                  <Button asChild size="sm" variant="outline" className="text-xs h-7 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10">
                    <Link href={`/track/${token}`}>Return to your case</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : null}

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
                <p className="text-xs text-muted-foreground mt-1.5">Select which document you are uploading. You can upload documents one by one.</p>
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
                <div className="p-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-md flex items-start text-sm border border-emerald-500/20" role="status">
                  <CheckCircle2 className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Document uploaded securely.</p>
                    <p className="text-xs opacity-90 mt-0.5">The checklist has been updated. You can now upload the next document.</p>
                  </div>
                </div>
              )}

              <Button onClick={handleUpload} disabled={!file || uploading} className="w-full h-11 text-base font-semibold">
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading securely...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Upload Document</>
                )}
              </Button>

              <div className="pt-4 border-t border-border/60 text-center">
                <p className="text-xs text-muted-foreground mb-2">Need help or prefer sending files directly?</p>
                <a
                  href={getDocumentHelpWhatsAppUrl(appStatus?.id ?? token)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  <svg className="w-3.5 h-3.5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Send documents via WhatsApp Concierge
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
