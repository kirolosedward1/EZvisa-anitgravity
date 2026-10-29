import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { ScrollToTop } from "@/components/scroll-to-top"
import { InnerHero } from "@/components/inner-hero"
import { LocaleLink } from "@/components/locale-link"
import { HelpSearch } from "@/components/help/help-search"
import { HelpSupport } from "@/components/help/help-support"
import { HelpAccountShortcut } from "@/components/help/help-account-shortcut"
import { TopicIcon } from "@/components/help/topic-icon"
import { HELP_ARTICLES, HELP_TOPICS, helpArticleHref, topicArticles } from "@/lib/help/articles"
import type { HelpSearchItem } from "@/lib/help/search"
import { requestLocale } from "@/lib/request-locale"

export async function generateMetadata(): Promise<Metadata> {
  const arabic = (await requestLocale()) === "ar"
  const url = arabic ? "https://www.ezvisa.net/ar/help" : "https://www.ezvisa.net/help"
  const title = arabic ? "مركز المساعدة" : "Help center"
  const description = arabic
    ? "إجابات عن الأسعار والدفع والمستندات والرفع والمواعيد وتأمين السفر والحساب والاسترداد في إيزي فيزا."
    : "Answers about EZvisa pricing, payment, documents and uploads, visa centre appointments, travel insurance, your account and refunds."
  return {
    title,
    description,
    alternates: { canonical: url, languages: { en: "https://www.ezvisa.net/help", ar: "https://www.ezvisa.net/ar/help" } },
    openGraph: { title: `${title} | EZvisa`, description, url, type: "website" },
  }
}

export default async function HelpCenterPage() {
  const arabic = (await requestLocale()) === "ar"
  const lang = arabic ? "ar" : "en"
  const pick = (en: string, ar: string) => (arabic ? ar : en)

  const searchItems: HelpSearchItem[] = HELP_ARTICLES.map((article) => ({
    href: helpArticleHref(article),
    title: article.title[lang],
    summary: article.summary[lang],
    topic: HELP_TOPICS.find((topic) => topic.slug === article.topic)?.title[lang] ?? "",
    text: article.body[lang].join(" "),
  }))

  return (
    <>
      <ScrollToTop />
      <SiteHeader forceBackground={true} />
      <div className="min-h-screen bg-background">
        <InnerHero
          badge={pick("Help center", "مركز المساعدة")}
          title={pick("How can we help?", "كيف يمكننا مساعدتك؟")}
          description={pick(
            "Answers about your application, payment, documents, appointments and refunds.",
            "إجابات عن طلبك والدفع والمستندات والمواعيد والاسترداد.",
          )}
        >
          <div className="flex w-full flex-col gap-4">
            <HelpSearch items={searchItems} arabic={arabic} />
            <HelpAccountShortcut />
          </div>
        </InnerHero>

        <section aria-labelledby="help-topics-heading" className="py-16 md:py-20">
          <div className="container mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6">
            <h2 id="help-topics-heading" className="text-foreground">{pick("Browse by topic", "تصفّح حسب الموضوع")}</h2>
            <div className="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-2">
              {HELP_TOPICS.map((topic) => (
                <div key={topic.slug} className="flex flex-col gap-4 border-t border-border/70 pt-6">
                  <LocaleLink href={`/help/${topic.slug}`} className="group flex items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <TopicIcon topic={topic.slug} className="size-5" />
                    </span>
                    <span className="flex flex-col gap-1">
                      <h3 className="panel-title panel-title-lg text-foreground group-hover:text-primary">{topic.title[lang]}</h3>
                      <span className="text-sm leading-relaxed text-muted-foreground">{topic.description[lang]}</span>
                    </span>
                  </LocaleLink>
                  <ul className="flex flex-col ps-15">
                    {topicArticles(topic.slug).map((article) => (
                      <li key={article.slug}>
                        <LocaleLink
                          href={helpArticleHref(article)}
                          className="group flex items-center justify-between gap-3 py-2 text-base text-foreground/85 hover:text-primary"
                        >
                          <span>{article.title[lang]}</span>
                          <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180" aria-hidden="true" />
                        </LocaleLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <HelpSupport arabic={arabic} />
      </div>
      <Footer />
    </>
  )
}
