"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">Something went wrong</h1>

        <p className="text-muted-foreground mb-8">
          We apologize for the inconvenience. An unexpected error occurred while processing your request.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>

          <Button variant="outline" asChild className="gap-2 bg-transparent">
            <Link href="/">
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </Button>
        </div>

        {error.digest && <p className="text-xs text-muted-foreground mt-6">Error ID: {error.digest}</p>}
      </div>
    </div>
  )
}
