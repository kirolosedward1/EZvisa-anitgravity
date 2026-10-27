import { ArrowRight } from "lucide-react"
import { NewsCategory, NewsDate, NewsExcerpt, NewsReadTime, NewsTitle, newsTitleText } from "@/components/blog/news-copy"
import { Image } from "@/components/image"
import { LangText } from "@/components/lang-text"
import { LocaleLink } from "@/components/locale-link"
import type { BlogPost } from "@/lib/blog"
import type { DisplayLocale } from "@/lib/currency"
import { latestGuides } from "@/lib/guides"
import { requestLocale } from "@/lib/request-locale"
import { cn } from "@/lib/utils"

const card =
  "group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm outline-none transition-[translate,box-shadow] duration-200 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const imageZoom =
  "object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transition-none"

/** Replaces the old closing CTA. Hidden when this locale has no published guides. */
export async function LatestGuides() {
  const locale = await requestLocale()
  const posts = await latestGuides(locale, 3)
  if (posts.length === 0) return null

  const [featured, ...rest] = posts
  const paired = rest.length === 2

  return (
    <section className="bg-background py-16 md:py-24" aria-labelledby="visa-guides-heading">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 md:mb-10">
          <h2 id="visa-guides-heading" className="text-foreground">
            <LangText en="Visa guides" ar="أدلة التأشيرة" />
          </h2>
          <LocaleLink
            href="/news"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <LangText en="All guides" ar="كل الأدلة" />
            <ArrowRight className="size-4" aria-hidden="true" />
          </LocaleLink>
        </div>

        <ul
          className={cn(
            "grid grid-cols-1 items-stretch gap-4",
            rest.length > 0 && "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-5",
            paired && "lg:grid-rows-2",
          )}
        >
          <li className={cn("min-w-0", paired && "lg:row-span-2")}>
            <FeaturedGuide post={featured} locale={locale} />
          </li>
          {rest.map((post) => (
            <li key={post.slug} className="min-w-0">
              <CompactGuide post={post} locale={locale} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function CategoryPill({ category }: { category: string }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
      <NewsCategory category={category} />
    </span>
  )
}

function GuideMeta({ publishedAt, readTime }: { publishedAt: string; readTime: string }) {
  return (
    <p className="text-sm leading-normal text-muted-foreground">
      <time dateTime={publishedAt}>
        <NewsDate iso={publishedAt} />
      </time>
      <span aria-hidden="true"> · </span>
      <NewsReadTime value={readTime} />
    </p>
  )
}

function FeaturedGuide({ post, locale }: { post: BlogPost; locale: DisplayLocale }) {
  const alt = newsTitleText(locale, post.slug, post.title)
  return (
    <LocaleLink href={`/news/${post.slug}`} className={card}>
      <div className="relative aspect-[3/2] shrink-0 grow overflow-hidden bg-muted">
        <Image
          src={post.featuredImage}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 640px, 100vw"
          className={imageZoom}
        />
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <CategoryPill category={post.category} />
          <GuideMeta publishedAt={post.publishedAt} readTime={post.readTime} />
        </div>
        <h3 className="break-words text-foreground !text-xl !leading-snug md:!text-2xl">
          <NewsTitle slug={post.slug} fallback={post.title} />
        </h3>
        <p className="text-base leading-relaxed text-muted-foreground">
          <NewsExcerpt slug={post.slug} fallback={post.excerpt} />
        </p>
        <p className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-medium text-primary">
          <LangText en="Read guide" ar="اقرأ الدليل" />
          <ArrowRight className="size-4" aria-hidden="true" />
        </p>
      </div>
    </LocaleLink>
  )
}

function CompactGuide({ post, locale }: { post: BlogPost; locale: DisplayLocale }) {
  const alt = newsTitleText(locale, post.slug, post.title)
  return (
    <LocaleLink href={`/news/${post.slug}`} className={card}>
      <div className="relative aspect-[3/2] w-full shrink-0 grow overflow-hidden bg-muted">
        <Image
          src={post.featuredImage}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 420px, 100vw"
          className={imageZoom}
        />
      </div>
      <div className="flex flex-col gap-2 p-5">
        <CategoryPill category={post.category} />
        <h3 className="break-words text-foreground !text-base !leading-snug lg:!text-lg">
          <NewsTitle slug={post.slug} fallback={post.title} />
        </h3>
        <GuideMeta publishedAt={post.publishedAt} readTime={post.readTime} />
      </div>
    </LocaleLink>
  )
}
