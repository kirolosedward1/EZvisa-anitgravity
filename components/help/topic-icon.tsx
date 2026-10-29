import { CalendarDays, Compass, CreditCard, FileUp, ListChecks, RotateCcw, ShieldPlus, UserRound, type LucideIcon } from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  "getting-started": Compass,
  "pricing-and-payment": CreditCard,
  "documents-and-uploads": FileUp,
  "your-application": ListChecks,
  "visa-appointment": CalendarDays,
  "travel-insurance": ShieldPlus,
  "account-and-sign-in": UserRound,
  "refunds-and-cancellations": RotateCcw,
}

export function TopicIcon({ topic, className }: { topic: string; className?: string }) {
  const Icon = ICONS[topic] ?? Compass
  return <Icon className={className} aria-hidden="true" />
}
