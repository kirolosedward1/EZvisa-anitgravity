"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { Upload, FileText, CheckCircle2, Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function UploadDocumentsPage() {
  const params = useParams();
  const token = params.token as string;
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>("passportPhoto");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <SiteHeader forceBackground={true} />
      <main className="min-h-screen bg-background pt-24 pb-16 px-4">
        <div className="container max-w-2xl mx-auto space-y-6">
          <Link href={`/track/${token}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="bg-card border rounded-xl p-8 shadow-sm">
            <h1 className="text-2xl font-bold mb-2">Secure Document Upload</h1>
            <p className="text-muted-foreground mb-8">Upload missing or replacement documents for your application.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Document Type</label>
                <select 
                  className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="passportPhoto">Passport Photo (Bio Page)</option>
                  <option value="photo">Personal Photo</option>
                  <option value="bankStatement">Bank Statement</option>
                  <option value="nocCertificate">Employment Proof (NOC)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select File (PDF, JPG, PNG)</label>
                <div className="border-2 border-dashed rounded-xl p-8 text-center bg-background">
                  <input type="file" id="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
                  <label htmlFor="file" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-8 h-8 text-muted-foreground mb-3" />
                    <span className="font-medium text-primary">Click to browse</span>
                    <span className="text-sm text-muted-foreground mt-1">Max 5MB</span>
                  </label>
                </div>
                {file && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-md flex items-center text-sm border border-blue-100 dark:border-blue-900/50">
                    <FileText className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-start text-sm border border-red-100">
                  <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-md flex items-start text-sm border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                  Document uploaded securely.
                </div>
              )}

              <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading securely...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Upload Document</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
