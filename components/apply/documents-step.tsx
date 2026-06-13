"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, X, Info, Loader2, AlertCircle } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface DocumentsStepProps {
  formData: {
    passportCopy: File | null
    residencyCopy: File | null
    photo: File | null
    nocSalaryCertificate: File | null
  }
  updateFormData: (data: Partial<DocumentsStepProps["formData"]>) => void
  onNext: () => void
  onBack: () => void
  isLoading?: boolean
}

export function DocumentsStep({ formData, updateFormData, onNext, onBack, isLoading }: DocumentsStepProps) {
  const [dragActive, setDragActive] = useState<"passport" | "residency" | "photo" | "noc" | null>(null)
  const [uploadLater, setUploadLater] = useState(false)
  const [showError, setShowError] = useState(false)

  const handleDrag = (e: React.DragEvent, type: "passport" | "residency" | "photo" | "noc") => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(type)
    } else if (e.type === "dragleave") {
      setDragActive(null)
    }
  }

  const handleDrop = (e: React.DragEvent, type: "passport" | "residency" | "photo" | "noc") => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(null)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0], type)
    }
  }

  const handleFile = (file: File, type: "passport" | "residency" | "photo" | "noc") => {
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      alert(`File size must be less than 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      return
    }

    // Validate file type
    const allowedTypes = type === "photo" 
      ? ["image/jpeg", "image/jpg", "image/png"]
      : ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    
    if (!allowedTypes.includes(file.type)) {
      alert(`Invalid file type. Please upload ${type === "photo" ? "JPG or PNG" : "PDF, JPG, or PNG"} files only.`)
      return
    }

    if (type === "passport") {
      updateFormData({ passportCopy: file })
    } else if (type === "residency") {
      updateFormData({ residencyCopy: file })
    } else if (type === "photo") {
      updateFormData({ photo: file })
    } else {
      updateFormData({ nocSalaryCertificate: file })
    }
  }

  const handleFileInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "passport" | "residency" | "photo" | "noc",
  ) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0], type)
    }
  }

  const removeFile = (type: "passport" | "residency" | "photo" | "noc") => {
    if (type === "passport") {
      updateFormData({ passportCopy: null })
    } else if (type === "residency") {
      updateFormData({ residencyCopy: null })
    } else if (type === "photo") {
      updateFormData({ photo: null })
    } else {
      updateFormData({ nocSalaryCertificate: null })
    }
  }

  const documents = [
    { key: "passport" as const, label: "Passport Copy", file: formData.passportCopy, formats: "PDF, JPG, PNG" },
    { key: "residency" as const, label: "Residency/Visa Copy", file: formData.residencyCopy, formats: "PDF, JPG, PNG" },
    { key: "photo" as const, label: "Photo", file: formData.photo, formats: "JPG, PNG" },
    {
      key: "noc" as const,
      label: "NOC/Salary Certificate",
      file: formData.nocSalaryCertificate,
      formats: "PDF, JPG, PNG",
    },
  ]

  const handleContinue = () => {
    // Check if user hasn't made a choice (neither uploaded docs nor checked upload later)
    const hasUploadedDocs =
      formData.passportCopy || formData.residencyCopy || formData.photo || formData.nocSalaryCertificate

    if (!uploadLater && !hasUploadedDocs) {
      setShowError(true)
      return
    }

    setShowError(false)
    onNext()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3.5 p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl shadow-sm">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground mb-1">Documents are Optional</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You can upload your documents now or later from your dashboard. Accepted formats: PDF, JPG, PNG (Max 10MB each)
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3.5 p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl shadow-sm">
        <label className="flex items-start gap-3 cursor-pointer w-full">
          <input
            type="checkbox"
            checked={uploadLater}
            onChange={(e) => setUploadLater(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border border-amber-500/30 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer bg-background/50"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground mb-1">I'll upload documents later</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Check this box if you want to complete your application now and upload documents after payment.
            </p>
          </div>
        </label>
      </div>

      {!uploadLater && (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.key}
              className={cn(
                "rounded-xl p-5 border transition-all duration-300 backdrop-blur-sm",
                dragActive === doc.key
                  ? "border-2 border-dashed border-blue-500 bg-blue-500/5 shadow-inner scale-[1.005]"
                  : "border-border/80 bg-background/30 hover:border-blue-500/45 hover:bg-background/60 hover:shadow-md",
              )}
              onDragEnter={(e) => handleDrag(e, doc.key)}
              onDragLeave={(e) => handleDrag(e, doc.key)}
              onDragOver={(e) => handleDrag(e, doc.key)}
              onDrop={(e) => handleDrop(e, doc.key)}
            >
              {doc.file ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{doc.file.name}</p>
                      <p className="text-xs text-muted-foreground">{(doc.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(doc.key)}
                    className="p-2 hover:bg-destructive/5 rounded-lg transition-colors ml-2 cursor-pointer"
                  >
                    <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-center shrink-0">
                      <Upload className="w-5 h-5 text-muted-foreground/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{doc.label}</p>
                      <p className="text-xs text-muted-foreground">{doc.formats} (Max 10MB)</p>
                    </div>
                  </div>
                  <input
                    id={doc.key}
                    type="file"
                    accept={doc.key === "photo" ? ".jpg,.jpeg,.png" : ".pdf,.jpg,.jpeg,.png"}
                    onChange={(e) => handleFileInput(e, doc.key)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById(doc.key)?.click()}
                    className="h-10 rounded-xl font-semibold text-xs border border-border/80 bg-background/50 hover:bg-background text-foreground transition-all duration-300 px-4 shrink-0 shadow-sm cursor-pointer"
                  >
                    Choose File
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {uploadLater && (
        <div className="flex items-start gap-3.5 p-5 bg-muted/20 border border-border/60 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-muted-foreground/80 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Documents will be uploaded later</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              After completing payment, you'll receive an email with instructions to upload your documents through your dashboard.
            </p>
          </div>
        </div>
      )}

      {showError && (
        <div
          className="flex items-start gap-3.5 p-4 bg-destructive/5 border border-destructive/20 rounded-2xl text-foreground text-sm"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Action Required</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Please either upload your documents now or check the "I'll upload documents later" box to continue.
            </p>
          </div>
        </div>
      )}

      <div className="md:flex md:justify-between fixed md:static bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border/80 md:border-t-0 md:bg-transparent md:p-0 md:backdrop-blur-none z-10 flex justify-between gap-3">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          disabled={isLoading}
          className="flex-1 md:flex-none h-14 rounded-xl font-semibold text-base border border-border bg-background/40 hover:bg-background/80 text-foreground hover:text-foreground transition-all duration-300 active:scale-95 px-8"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleContinue}
          disabled={isLoading}
          className="flex-1 md:flex-none h-14 rounded-xl font-semibold text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none px-8"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Continue to Review"
          )}
        </Button>
      </div>
    </div>
  )
}
