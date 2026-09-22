export function DashboardHeader({
  badge,
  title,
  description,
  actions,
}: {
  badge: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-secondary/60 to-background pb-10 pt-28 md:pt-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--primary) 18%, transparent) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 70% 80% at 50% 0%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 80% at 50% 0%, black 30%, transparent 100%)",
        }}
      />
      <div className="container relative mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {badge}
          </span>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">{title}</h1>
          {description && <div className="text-base leading-relaxed text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </section>
  )
}
