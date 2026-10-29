import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArrowRight, ChevronRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { LocaleLink } from "@/components/locale-link"
import { HelpBody } from "@/components/help/help-body"
import { HelpSupport } from "@/components/help/help-support"
import { TopicIcon } from "@/components/help/topic-icon"
import { HELP_ARTICLES, helpArticle, helpArticleHref, helpTopic, topicArticles } from "@/lib/help/articles"
import { requestLocale } from "@/lib/request-locale"
import { OG_LOCALE, SITE_URL, defaultOgImage, localeAlternates } from "@/lib/seo"

export function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({ topic: article.topic, article: article.slug }))
}

type Params = { params: Promise<{ topic: string; article: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { topic, article: slug } = await params
  const article = helpArticle(topic, slug)
  if (!article) return { title: "Help center" }
  const arabic = (await requestLocale()) === "ar"
  const lang = arabic ? "ar" : "en"
  const alternates = localeAlternates(helpArticleHref(article), arabic)
  return {
    title: `${article.title[lang]} | ${arabic ? "مركز المساعدة" : "Help center"}`,
    description: article.summary[lang],
    alternates,
    openGraph: { title: article.title[lang], description: article.summary[lang], url: `${SITE_URL}${arabic ? "/ar" : ""}${helpArticleHref(article)}`, siteName: "EZvisa", type: "article", locale: OG_LOCALE[lang], alternateLocale: OG_LOCALE[arabic ? "en" : "ar"], images: [defaultOgImage(arabic)] },
  }
}

export default async function HelpArticlePage({ params }: Params) {
  const { topic: topicSlug, article: slug } = await params
  const article = helpArticle(topicSlug, slug)
  const topic = helpTopic(topicSlug)
  if (!article || !topic) notFound()
  const arabic = (await requestLocale()) === "ar"
  const lang = arabic ? "ar" : "en"
  const related = topicArticles(topicSlug).filter((other) => other.slug !== slug)

  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
          <article className="flex min-w-0 max-w-3xl flex-col gap-6">
            <nav aria-label={arabic ? "مسار التنقل" : "Breadcrumb"}>
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <li>
                  <LocaleLink href="/help" className="hover:text-primary">{arabic ? "مركز المساعدة" : "Help center"}</LocaleLink>
                </li>
                <li aria-hidden="true"><ChevronRight className="size-3.5 rtl:rotate-180" /></li>
                <li>
                  <LocaleLink href={`/help/${topic.slug}`} className="hover:text-primary">{topic.title[lang]}</LocaleLink>
                </li>
              </ol>
            </nav>
            <header className="flex flex-col gap-3">
              <h1 className="app-title text-balance text-foreground">{article.title[lang]}</h1>
              <p className="text-lg leading-relaxed text-muted-foreground">{article.summary[lang]}</p>
            </header>
            <div className="border-t border-border/70 pt-6">
              <HelpBody paragraphs={article.body[lang]} />
            </div>
          </article>

          {related.length > 0 && (
            <aside aria-labelledby="help-related-heading" className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
              <h2 id="help-related-heading" className="panel-title flex items-center gap-2 text-foreground">
                <TopicIcon topic={topic.slug} className="size-4 text-primary" />
                {arabic ? `المزيد في ${topic.title.ar}` : `More in ${topic.title.en}`}
              </h2>
              <ul className="flex flex-col border-t border-border/70">
                {related.map((other) => (
                  <li key={other.slug} className="border-b border-border/70">
                    <LocaleLink href={helpArticleHref(other)} className="group flex items-start justify-between gap-3 py-3 text-sm text-foreground/85 hover:text-primary">
                      <span>{other.title[lang]}</span>
                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-primary rtl:rotate-180" aria-hidden="true" />
                    </LocaleLink>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>

        <HelpSupport arabic={arabic} context={article.title[lang]} />
      </div>
      <Footer />
    </>
  )
}
