import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type StatusTone = "success" | "warning" | "info" | "danger"

const toneStyles: Record<StatusTone, { className: string; icon: typeof CheckCircle2 }> = {
  success: { className: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  warning: { className: "bg-warning/10 text-warning border-warning/25", icon: AlertCircle },
  info: { className: "bg-primary/10 text-primary border-primary/15", icon: Clock },
  danger: { className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
}

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone
  children: React.ReactNode
  className?: string
}) {
  const { className: toneClassName, icon: Icon } = toneStyles[tone]
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClassName,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </span>
  )
}
