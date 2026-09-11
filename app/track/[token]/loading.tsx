import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"

export default function TrackLoading() {
  return (
    <>
      <SiteHeader forceBackground={true} hideNavigation={false} />
      <main className="min-h-screen bg-background pt-32 pb-24">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <div className="h-8 w-32 bg-muted rounded-lg animate-pulse mb-4"></div>
            <div className="h-10 w-64 bg-muted rounded-lg animate-pulse"></div>
          </div>
          <div className="bg-card rounded-xl shadow-sm border p-12 flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground font-medium animate-pulse">Retrieving case details...</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
