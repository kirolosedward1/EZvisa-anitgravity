"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, FileText, Loader2, ShieldCheck, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardCard, DashboardCardHeader } from "@/components/dashboard/dashboard-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { getDocumentProgress, getReference, REQUIRED_DOCUMENTS } from "@/lib/application-status";
import { getDocumentHelpWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const DOCUMENT_OPTIONS = [
  { value: "passportCopy", label: "Passport bio page (colour copy)" },
  { value: "residencyCopy", label: "UAE residence visa / Emirates ID" },
  { value: "photo", label: "Personal photo (35×45 mm)" },
  { value: "bankStatement", label: "Bank statement (last 3–6 months)" },
  { value: "nocCertificate", label: "Employment proof (NOC / salary certificate)" },
];

interface AppDocStatus {
  destination_country?: string;
  full_name?: string;
  has_passport?: boolean;
  has_photos?: boolean;
  has_bank_statements?: boolean;
  has_employment_proof?: boolean;
  application_status?: string;
}

export default function UploadDocumentsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const requestedType = searchParams.get("type");
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>(
    DOCUMENT_OPTIONS.some((option) => option.value === requestedType) ? (requestedType as string) : "passportCopy",
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appStatus, setAppStatus] = useState<AppDocStatus | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/upload-document?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        if (data.app) setAppStatus(data.app);
      }
    } catch {
      // Non-critical background fetch
    }
  }, [token]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const selectFile = (selected: File | undefined) => {
    if (!selected) return;
    setSuccess(false);
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFile(null);
      setError("Please choose a PDF, JPG or PNG file.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("This file is larger than 5 MB. Please compress it or send it to us on WhatsApp.");
      return;
    }
    setError(null);
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new window.FormData();
      formData.append("file", file);
      formData.append("trackingToken", token);
      formData.append("documentType", docType);

      const res = await fetch("/api/upload-document", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setSuccess(true);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const progress = appStatus ? getDocumentProgress(appStatus) : null;
  const allComplete = progress !== null && progress.missing.length === 0;

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="bg-background">
        <DashboardHeader
          badge="Secure upload"
          title="Upload your documents"
          description={
            appStatus ? (
              <>
                {appStatus.destination_country} visa · {appStatus.full_name} ·{" "}
                <span className="font-medium text-foreground">{getReference(token)}</span>
              </>
            ) : (
              "Add the documents we need to complete your visa file."
            )
          }
          actions={
            <Button asChild variant="outline" className="rounded-full px-5">
              <Link href={`/track/${token}`}>
                <ArrowLeft />
                Back to application
              </Link>
            </Button>
          }
        />

        <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3">
          <DashboardCard aria-label="Upload a document" className="lg:col-span-2">
            <DashboardCardHeader title="Choose a document" icon={Upload} />
            <div className="flex flex-col gap-6 p-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="document-type" className="text-sm font-medium text-foreground">
                  Document type
                </label>
                <select
                  id="document-type"
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  {DOCUMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Upload one document at a time.</p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">File</span>
                <label
                  htmlFor="file"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    selectFile(e.dataTransfer.files?.[0]);
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                    isDragging ? "border-primary bg-primary/5" : "border-border bg-secondary/40 hover:border-primary/40 hover:bg-primary/5",
                  )}
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Upload className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    <span className="text-primary">Click to browse</span> or drop a file here
                  </span>
                  <span className="text-xs text-muted-foreground">PDF, JPG or PNG · up to 5 MB</span>
                  <input
                    ref={inputRef}
                    type="file"
                    id="file"
                    className="sr-only"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => selectFile(e.target.files?.[0])}
                  />
                </label>

                {file && (
                  <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm">
                    <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate font-medium text-foreground">{file.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                      aria-label="Remove selected file"
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {error}
                </div>
              )}

              {success && (
                <div role="status" className="flex items-start gap-3 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Document uploaded</p>
                    <p className="text-xs opacity-90">Your checklist is updated. You can upload the next one.</p>
                  </div>
                </div>
              )}

              <Button onClick={handleUpload} disabled={!file || uploading} className="h-11 rounded-full text-base">
                {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                {uploading ? "Uploading securely…" : "Upload document"}
              </Button>

              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                Files are encrypted and only seen by our visa specialists.
              </p>
            </div>
          </DashboardCard>

          <aside className="flex flex-col gap-6" aria-label="Checklist and help">
            <DashboardCard aria-label="Document checklist">
              <DashboardCardHeader
                title="Your checklist"
                action={
                  progress && (
                    <span className="text-sm text-muted-foreground">
                      {progress.received}/{progress.total}
                    </span>
                  )
                }
              />
              <ul className="flex flex-col gap-1 p-2">
                {REQUIRED_DOCUMENTS.map((doc) => {
                  const received = Boolean(appStatus?.[doc.key]);
                  return (
                    <li key={doc.key}>
                      <button
                        type="button"
                        onClick={() => setDocType(doc.uploadType)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-secondary",
                          docType === doc.uploadType && "bg-secondary",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-foreground">{doc.label}</span>
                          <span className="block truncate text-xs text-muted-foreground">{doc.hint}</span>
                        </span>
                        {appStatus &&
                          (received ? (
                            <StatusBadge tone="success">Received</StatusBadge>
                          ) : (
                            <StatusBadge tone="warning">Needed</StatusBadge>
                          ))}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {allComplete && (
                <div className="border-t border-border/60 px-6 py-4 text-sm text-muted-foreground">
                  All required documents are in. Our experts will take it from here.
                </div>
              )}
            </DashboardCard>

            <DashboardCard aria-label="Help" className="flex flex-col gap-3 bg-secondary/60 p-6">
              <h2 className="text-base font-semibold tracking-tight text-foreground">Prefer WhatsApp?</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Send your documents straight to a specialist and we&apos;ll add them to your file.
              </p>
              <a
                href={getDocumentHelpWhatsAppUrl(token)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/60 bg-background px-5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary"
              >
                <WhatsAppIcon className="size-4 text-whatsapp" />
                Send on WhatsApp
              </a>
            </DashboardCard>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
