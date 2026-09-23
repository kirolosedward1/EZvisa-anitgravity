import { Skeleton } from "@/components/ui/skeleton"
import { DashboardCard } from "@/components/dashboard/dashboard-card"

/** Loading placeholder that mirrors the ApplicationView layout, so nothing jumps when data arrives */
export function DashboardSkeleton() {
  return (
    <main className="bg-background" aria-busy="true" aria-label="Loading your application">
      <section className="border-b border-border/60 bg-gradient-to-b from-secondary/60 to-background pb-10 pt-28 md:pt-32">
        <div className="container mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:px-6">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
      </section>
      <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DashboardCard className="flex flex-col gap-6 p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-6 w-56 max-w-full" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </DashboardCard>
          <DashboardCard className="flex flex-col gap-4 p-6">
            <Skeleton className="h-5 w-48" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </DashboardCard>
        </div>
        <div className="flex flex-col gap-6">
          <DashboardCard className="flex flex-col gap-4 p-6">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </DashboardCard>
          <DashboardCard className="flex flex-col gap-3 p-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-full rounded-full" />
          </DashboardCard>
        </div>
      </div>
    </main>
  )
}
