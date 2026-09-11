"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { Upload, FileText, CheckCircle2, Loader2, ArrowLeft, AlertCircle, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getDocumentHelpWhatsAppUrl } from "@/lib/whatsapp";

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
  const token = params.token as string;
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>("passportCopy");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appStatus, setAppStatus] = useState<AppDocStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/upload-document?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        if (data.app) {
          setAppStatus(data.app);
        }
      }
    } catch {
      // Non-critical background fetch
    } finally {
      setLoadingStatus(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(false);
    }
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

      const res = await fetch("/api/upload-document", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setSuccess(true);
      setFile(null);
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const allComplete = appStatus &&
    appStatus.has_passport &&
    appStatus.has_photos &&
    appStatus.has_bank_statements &&
    appStatus.has_employment_proof;

  return (
    <>
      <SiteHeader forceBackground={true} />
      <main className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="container max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Link href={`/track/${token}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tracking &amp; Dashboard
            </Link>
            <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2.5 py-1 rounded">
              Ref: #{token ? token.slice(0, 8).toUpperCase() : ""}
            </span>
          </div>
          
          {/* Header Card */}
          <div className="bg-card border rounded-xl p-6 md:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit Encrypted Upload Desk
                </span>
                <h1 className="text-2xl md:text-3xl font-bold">Upload Supporting Documents</h1>
                {appStatus && (
                  <p className="text-muted-foreground mt-1">
                    Application for <strong className="text-foreground">{appStatus.full_name}</strong> &bull; {appStatus.destination_country} Visa
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload your documents below to complete your visa file. Your files are securely encrypted and reviewed directly by our UAE visa specialists.
            </p>
          </div>

          {/* Real-Time Document Checklist */}
          {appStatus && (
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Document Verification Checklist
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
                <div className="p-3 rounded-lg border flex items-center justify-between bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">Passport Copy</p>
                    <p className="text-xs text-muted-foreground">Bio page (min. 6mo validity)</p>
                  </div>
                  {appStatus.has_passport ? (
                    <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold rounded-full">Received</span>
                  ) : (
                    <span className="text-amber-600 bg-amber-500/10 px-2 py-0.5 text-xs font-bold rounded-full">Pending</span>
                  )}
                </div>

                <div className="p-3 rounded-lg border flex items-center justify-between bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">Personal Photo</p>
                    <p className="text-xs text-muted-foreground">35x45mm white background</p>
                  </div>
                  {appStatus.has_photos ? (
                    <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold rounded-full">Received</span>
                  ) : (
                    <span className="text-amber-600 bg-amber-500/10 px-2 py-0.5 text-xs font-bold rounded-full">Pending</span>
                  )}
                </div>

                <div className="p-3 rounded-lg border flex items-center justify-between bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">Bank Statement</p>
                    <p className="text-xs text-muted-foreground">Last 3-6 months with bank stamp</p>
                  </div>
                  {appStatus.has_bank_statements ? (
                    <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold rounded-full">Received</span>
                  ) : (
                    <span className="text-amber-600 bg-amber-500/10 px-2 py-0.5 text-xs font-bold rounded-full">Pending</span>
                  )}
                </div>

                <div className="p-3 rounded-lg border flex items-center justify-between bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">Employment Proof / NOC</p>
                    <p className="text-xs text-muted-foreground">Signed company NOC letter</p>
                  </div>
                  {appStatus.has_employment_proof ? (
                    <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold rounded-full">Received</span>
                  ) : (
                    <span className="text-amber-600 bg-amber-500/10 px-2 py-0.5 text-xs font-bold rounded-full">Pending</span>
                  )}
                </div>
              </div>

              {allComplete && (
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between flex-wrap gap-2">
                  <span>Great news! All required files are uploaded. Our experts are finalizing your Schengen file.</span>
                  <Button asChild size="sm" variant="outline" className="text-xs h-7 border-emerald-500/40 text-emerald-700 hover:bg-emerald-100">
                    <Link href={`/track/${token}`}>Return to Tracker</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Upload Form */}
          <div className="bg-card border rounded-xl p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Select Document to Upload</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Document Category</label>
                <select 
                  className="w-full flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="passportCopy">Passport Bio Page (Clear Color Copy)</option>
                  <option value="residencyCopy">UAE Residence Visa / Emirates ID</option>
                  <option value="photo">Personal Passport Photo (35x45mm Schengen Spec)</option>
                  <option value="bankStatement">Bank Statement (Last 3-6 Months)</option>
                  <option value="nocCertificate">Employment Proof (NOC / Salary Certificate)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Select which document you are uploading. You can upload each document one by one.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select File (PDF, JPG, PNG)</label>
                <div className="border-2 border-dashed rounded-xl p-8 text-center bg-background transition-colors hover:bg-slate-100/60 dark:hover:bg-slate-900/60">
                  <input type="file" id="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
                  <label htmlFor="file" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-8 h-8 text-muted-foreground mb-3" />
                    <span className="font-medium text-primary">Click to browse or drop file here</span>
                    <span className="text-xs text-muted-foreground mt-1">Accepted: PDF, JPG, PNG &bull; Max 5MB</span>
                  </label>
                </div>
                {file && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-md flex items-center text-sm border border-blue-100 dark:border-blue-900/50">
                    <FileText className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="ml-auto text-xs opacity-75">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-md flex items-start text-sm border border-red-100 dark:border-red-900/40">
                  <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-md flex items-start text-sm border border-emerald-100 dark:border-emerald-900/40">
                  <CheckCircle2 className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Document uploaded successfully!</p>
                    <p className="text-xs opacity-90 mt-0.5">The checklist has been updated. You can now select and upload the next document.</p>
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
                  href={getDocumentHelpWhatsAppUrl(token)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  <svg className="w-3.5 h-3.5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Send documents directly via WhatsApp Concierge
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

