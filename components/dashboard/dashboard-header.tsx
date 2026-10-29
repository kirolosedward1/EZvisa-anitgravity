/** Compact page heading for the customer dashboard: greeting, one line of context, actions on the right. */
export function DashboardHeader({
  title,
  description,
  actions,
}: {
  /** Kept for older call sites; no longer shown (the header nav already says where you are). */
  badge?: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <section className="ez-customer-heading pb-8 pt-28 md:pt-32">
      <div className="container mx-auto flex max-w-6xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="app-title text-foreground">{title}</h1>
          {description && <div className="text-sm leading-relaxed text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </section>
  )
}
