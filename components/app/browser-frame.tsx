import type { ReactNode } from "react"
import { Lock } from "lucide-react"

import { cn } from "@/lib/utils"

interface BrowserFrameProps {
  url: string
  children: ReactNode
  className?: string
}

/** Pure-CSS browser window. The window controls stay on the left and the URL reads LTR in every language. */
export function BrowserFrame({ url, children, className }: BrowserFrameProps) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-sm", className)}>
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5" dir="ltr">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>
        <div className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden="true" />
          <span>{url}</span>
        </div>
      </div>
      <div className="relative bg-background">{children}</div>
    </div>
  )
}
