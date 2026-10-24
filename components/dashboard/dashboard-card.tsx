import { cn } from "@/lib/utils"

export function DashboardCard({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-2xl border border-border/70 bg-card text-card-foreground shadow-xs", className)}
      {...props}
    >
      {children}
    </section>
  )
}

export function DashboardCardHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: React.ReactNode
  /** Kept for older call sites; section headings no longer carry an icon. */
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 pb-1 pt-5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="panel-title text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
