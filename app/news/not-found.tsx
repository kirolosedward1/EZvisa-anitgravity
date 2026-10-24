import { Button } from "@/components/ui/button"
import { Newspaper, Home, ArrowLeft } from "lucide-react"
import { LocaleLink } from "@/components/locale-link"
import { Msg } from "@/components/msg"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"

export default function NewsNotFound() {
  return (
    <>
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Newspaper className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-2xl font-semibold text-foreground mb-3">
            <Msg id="news.notFoundTitle" />
          </h1>

          <p className="text-muted-foreground mb-8">
            <Msg id="news.notFoundBody" />
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="gap-2">
              <LocaleLink href="/news">
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                <Msg id="news.backToNews" />
              </LocaleLink>
            </Button>

            <Button variant="outline" asChild className="gap-2 bg-transparent">
              <LocaleLink href="/">
                <Home className="w-4 h-4" />
                <Msg id="news.goHome" />
              </LocaleLink>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
