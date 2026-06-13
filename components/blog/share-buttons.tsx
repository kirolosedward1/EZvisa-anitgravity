"use client"

import { Button } from "@/components/ui/button"
import { Share2, Copy, Check } from "lucide-react"
import { useState } from "react"

export function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${url}` : url

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title,
        url: fullUrl,
      })
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">Share:</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 bg-transparent">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 bg-transparent">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy Link"}
        </Button>
      </div>
    </div>
  )
}
