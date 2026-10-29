import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { LocaleLink } from "@/components/locale-link"
import { HelpSupport } from "@/components/help/help-support"
import { TopicIcon } from "@/components/help/topic-icon"
import { HELP_TOPICS, helpArticleHref, helpTopic, topicArticles } from "@/lib/help/articles"
import { requestLocale } from "@/lib/request-locale"

export function generateStaticParams() {
  return HELP_TOPICS.map((topic) => ({ topic: topic.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const { topic: slug } = await params
  const topic = helpTopic(slug)
  if (!topic) return { title: "Help center" }
  const arabic = (await requestLocale()) === "ar"
  const lang = arabic ? "ar" : "en"
  const url = `https://www.ezvisa.net${arabic ? "/ar" : ""}/help/${slug}`
  return {
    title: `${topic.title[lang]} | ${arabic ? "مركز المساعدة" : "Help center"}`,
    description: topic.description[lang],
    alternates: { canonical: url, languages: { en: `https://www.ezvisa.net/help/${slug}`, ar: `https://www.ezvisa.net/ar/help/${slug}` } },
    openGraph: { title: topic.title[lang], description: topic.description[lang], url, type: "website" },
  }
}

export default async function HelpTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params
  const topic = helpTopic(slug)
  if (!topic) notFound()
  const arabic = (await requestLocale()) === "ar"
  const lang = arabic ? "ar" : "en"
  const articles = topicArticles(slug)

  // Each article is a question with a short answer, which is what FAQPage describes.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang,
    mainEntity: articles.map((article) => ({
      "@type": "Question",
      name: article.title[lang],
      acceptedAnswer: { "@type": "Answer", text: article.summary[lang] },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero badge={arabic ? "مركز المساعدة" : "Help center"} title={topic.title[lang]} description={topic.description[lang]} globiPose="companion" />

        <section className="pb-16 md:pb-20">
          <div className="container mx-auto flex max-w-3xl flex-col px-4 sm:px-6">
            <div className="mb-6 flex items-center gap-3 text-primary">
              <TopicIcon topic={slug} className="size-5" />
              <span className="text-sm font-medium">
                {articles.length} {arabic ? "مقالات" : articles.length === 1 ? "article" : "articles"}
              </span>
            </div>
            <ul className="flex flex-col border-t border-border/70">
              {articles.map((article) => (
                <li key={article.slug} className="border-b border-border/70">
                  <LocaleLink href={helpArticleHref(article)} className="group flex items-start gap-4 py-5">
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="text-lg font-medium text-foreground group-hover:text-primary">{article.title[lang]}</span>
                      <span className="text-base leading-relaxed text-muted-foreground">{article.summary[lang]}</span>
                    </span>
                    <ArrowRight className="mt-1.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary rtl:rotate-180" aria-hidden="true" />
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <HelpSupport arabic={arabic} />
      </div>
      <Footer />
    </>
  )
}
