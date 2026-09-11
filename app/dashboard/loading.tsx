import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"

export default function DashboardLoading() {
  return (
    <>
      <SiteHeader forceBackground={true} hideNavigation={false} />
      <main className="min-h-screen bg-background pt-32 pb-24">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
          
          <div className="mb-8">
            <div className="h-10 w-48 bg-muted rounded-lg animate-pulse mb-2"></div>
            <div className="h-5 w-72 bg-muted rounded-md animate-pulse"></div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-card rounded-xl shadow-sm border p-6 h-[400px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-card rounded-xl shadow-sm border p-6 h-[250px] animate-pulse"></div>
              <div className="bg-card rounded-xl shadow-sm border p-6 h-[150px] animate-pulse"></div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
