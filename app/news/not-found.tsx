import { Button } from "@/components/ui/button"
import { Newspaper, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"

export default function NewsNotFound() {
  return (
    <>
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-gradient-to-b from-background to-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Newspaper className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-3">Article Not Found</h1>

          <p className="text-muted-foreground mb-8">
            The news article you are looking for does not exist or has been removed. Browse our latest articles for more
            visa-related news and tips.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="gap-2">
              <Link href="/news">
                <ArrowLeft className="w-4 h-4" />
                Back to News
              </Link>
            </Button>

            <Button variant="outline" asChild className="gap-2 bg-transparent">
              <Link href="/">
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
