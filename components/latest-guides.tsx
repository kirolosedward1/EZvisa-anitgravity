import { ArrowRight } from "lucide-react"
import { NewsCategory, NewsDate, NewsExcerpt, NewsTitle, newsTitleText } from "@/components/blog/news-copy"
import { Image } from "@/components/image"
import { LangText } from "@/components/lang-text"
import { LocaleLink } from "@/components/locale-link"
import { latestGuides } from "@/lib/guides"
import { requestLocale } from "@/lib/request-locale"

/** Replaces the old closing CTA. Hidden when this locale has no published guides. */
export async function LatestGuides() {
  const locale = await requestLocale()
  const posts = await latestGuides(locale, 3)
  if (posts.length === 0) return null

  return (
    <section className="bg-background py-16 md:py-24" aria-labelledby="visa-guides-heading">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h2 id="visa-guides-heading">
            <LangText en="Visa guides" ar="أدلة التأشيرة" />
          </h2>
          <LocaleLink
            href="/news"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary"
          >
            <span>
              <LangText en="View all guides" ar="عرض كل الأدلة" />
            </span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </LocaleLink>
        </div>

        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug} className="min-w-0">
              <LocaleLink
                href={`/news/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-[#E5E7EB] bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="relative aspect-[16/10] bg-muted">
                  <Image
                    src={post.featuredImage}
                    alt={newsTitleText(locale, post.slug, post.title)}
                    fill
                    sizes="(min-width: 1024px) 360px, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col gap-2 p-5">
                  <p className="text-[13px] leading-normal text-muted-foreground">
                    <NewsCategory category={post.category} />
                    <span aria-hidden="true"> · </span>
                    <NewsDate iso={post.publishedAt} />
                  </p>
                  <h3 className="line-clamp-2 !text-[18px] font-semibold leading-snug text-foreground transition-colors group-hover:!text-primary">
                    <NewsTitle slug={post.slug} fallback={post.title} />
                  </h3>
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    <NewsExcerpt slug={post.slug} fallback={post.excerpt} />
                  </p>
                </div>
              </LocaleLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
