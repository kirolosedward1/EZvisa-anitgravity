import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export default function TrackLoading() {
  return (
    <>
      <SiteHeader />
      <DashboardSkeleton />
      <Footer />
    </>
  )
}
