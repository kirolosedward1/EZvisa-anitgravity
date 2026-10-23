import Image from "next/image"
import { Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { flagSrc } from "@/lib/flags"

/** Round flag for a country name; a neutral globe when no flag image is bundled (never a broken image). */
export function CountryFlag({ country, className }: { country?: string | null; className?: string }) {
  const src = flagSrc(country)
  return (
    <span className={cn("relative inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/50 bg-secondary shadow-sm", className)}>
      {src ? <Image src={src} alt="" fill sizes="24px" className="object-cover" /> : <Globe className="h-3 w-3 text-muted-foreground" aria-hidden />}
    </span>
  )
}
