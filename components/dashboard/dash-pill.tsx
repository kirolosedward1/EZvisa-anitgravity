import type { PillTone } from "@/lib/application-status"
import { cn } from "@/lib/utils"

const TONE: Record<PillTone, { pill: string; dot: string }> = {
  success: { pill: "bg-[#e3f5e8] text-[#135c2b]", dot: "bg-[#1a7f37]" },
  warning: { pill: "bg-[#fff4de] text-[#7a4b00]", dot: "bg-[#d98a00]" },
  info: { pill: "bg-[#edf4ff] text-primary", dot: "bg-primary" },
  danger: { pill: "bg-[#fdeaea] text-[#8a1c1c]", dot: "bg-[#c62828]" },
  neutral: { pill: "bg-[#eef1f6] text-muted-foreground", dot: "bg-[#8b97ab]" },
}

/** Rounded status pill with an optional coloured dot (dashboard and account pages). */
export function DashPill({ tone, dot = true, className, children }: { tone: PillTone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium", TONE[tone].pill, className)}>
      {dot && <span className={cn("size-[7px] rounded-full", TONE[tone].dot)} aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Just the dot, for compact lists such as the application switcher. */
export function StatusDot({ tone }: { tone: PillTone }) {
  return <span className={cn("size-[7px] shrink-0 rounded-full", TONE[tone].dot)} aria-hidden="true" />
}
