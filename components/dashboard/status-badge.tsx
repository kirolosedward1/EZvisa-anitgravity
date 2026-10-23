import { AlertCircle, CheckCircle2, Circle, Clock, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type StatusTone = "success" | "warning" | "info" | "danger" | "neutral"

const toneStyles: Record<StatusTone, { className: string; icon: typeof CheckCircle2 }> = {
  success: { className: "border-transparent bg-[#EAF6EE] text-[#1A7F37]", icon: CheckCircle2 },
  warning: { className: "border-transparent bg-[#FFF4EC] text-[#B83200]", icon: AlertCircle },
  info: { className: "bg-primary/10 text-primary border-primary/15", icon: Clock },
  danger: { className: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  neutral: { className: "border-transparent bg-[#F2F4F7] text-[#5B6475]", icon: Circle },
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
