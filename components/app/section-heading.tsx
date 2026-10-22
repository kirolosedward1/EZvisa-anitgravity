import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  id: string
  chip?: string
  title: string
  lede?: string
  align?: "start" | "center"
  className?: string
}

export function SectionHeading({ id, chip, title, lede, align = "start", className }: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex max-w-2xl flex-col gap-4",
        align === "center" ? "mx-auto items-center text-center" : "items-start text-start",
        className,
      )}
    >
      {chip && (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {chip}
        </span>
      )}
      <h2 id={id} className="text-balance text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {lede && <p className="text-base leading-relaxed text-muted-foreground md:text-lg">{lede}</p>}
    </div>
  )
}
