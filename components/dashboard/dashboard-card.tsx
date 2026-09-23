import { cn } from "@/lib/utils"

export function DashboardCard({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-2xl border border-border/60 bg-card text-card-foreground shadow-sm", className)}
      {...props}
    >
      {children}
    </section>
  )
}

export function DashboardCardHeader({
  title,
  icon: Icon,
  action,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 px-6 py-4">
      <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
        {Icon && <Icon className="size-4 text-primary" />}
        {title}
      </h2>
      {action}
    </div>
  )
}
