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

const linkFocus =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const imageZoom =
  "object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transition-none"

/** Replaces the old closing CTA. Hidden when this locale has no published guides. */
export async function LatestGuides() {
  const locale = await requestLocale()
  const posts = await latestGuides(locale, 3)
  if (posts.length === 0) return null

  const [featured, ...rest] = posts

  return (
    <section className="bg-background py-16 md:py-24" aria-labelledby="visa-guides-heading">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 md:mb-10">
          <h2 id="visa-guides-heading" className="text-foreground">
            <LangText en="Visa guides" ar="أدلة التأشيرة" />
          </h2>
          <LocaleLink
            href="/news"
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary",
              linkFocus,
            )}
          >
            <LangText en="All guides" ar="كل الأدلة" />
            <ArrowRight className="size-4" aria-hidden="true" />
          </LocaleLink>
        </div>

        <div className={cn("grid grid-cols-1 items-start gap-8 lg:gap-10", rest.length > 0 && "lg:grid-cols-5")}>
          <FeaturedGuide post={featured} locale={locale} wide={rest.length > 0} />
          {rest.length > 0 && (
            <ul className="flex min-w-0 flex-col border-t border-border lg:col-span-2 lg:border-s lg:border-t-0 lg:ps-10">
              {rest.map((post, index) => (
                <li key={post.slug} className="min-w-0">
                  <CompactGuide post={post} locale={locale} divided={index > 0} first={index === 0} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function FeaturedGuide({ post, locale, wide }: { post: BlogPost; locale: DisplayLocale; wide: boolean }) {
  const alt = newsTitleText(locale, post.slug, post.title)
  return (
    <LocaleLink
      href={`/news/${post.slug}`}
      className={cn("group flex min-w-0 flex-col gap-5 rounded-xl", wide && "lg:col-span-3", linkFocus)}
    >
      <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-muted ring-1 ring-border">
        <Image
          src={post.featuredImage}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 640px, 100vw"
          className={imageZoom}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-sm leading-normal text-muted-foreground">
          <span className="font-medium text-primary">
            <NewsCategory category={post.category} />
          </span>
          <span aria-hidden="true"> · </span>
          <time dateTime={post.publishedAt}>
            <NewsDate iso={post.publishedAt} />
          </time>
        </p>
        <h3 className="text-balance break-words text-foreground underline-offset-4 group-hover:underline group-focus-visible:underline !text-xl !leading-snug md:!text-2xl">
          <NewsTitle slug={post.slug} fallback={post.title} />
        </h3>
        <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
          <NewsExcerpt slug={post.slug} fallback={post.excerpt} />
        </p>
      </div>
    </LocaleLink>
  )
}

function CompactGuide({
  post,
  locale,
  divided,
  first,
}: {
  post: BlogPost
  locale: DisplayLocale
  divided: boolean
  first: boolean
}) {
  const alt = newsTitleText(locale, post.slug, post.title)
  return (
    <LocaleLink
      href={`/news/${post.slug}`}
      className={cn(
        "group flex min-h-11 items-start gap-4 rounded-lg py-5 lg:py-6",
        first && "lg:pt-0",
        divided && "border-t border-border",
        linkFocus,
      )}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border sm:size-28">
        <Image
          src={post.featuredImage}
          alt={alt}
          fill
          sizes="(min-width: 640px) 112px, 96px"
          className={imageZoom}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
        <p className="text-sm font-medium leading-normal text-primary">
          <NewsCategory category={post.category} />
        </p>
        <h3 className="text-balance break-words text-foreground underline-offset-4 group-hover:underline group-focus-visible:underline !text-base !leading-snug lg:!text-lg">
          <NewsTitle slug={post.slug} fallback={post.title} />
        </h3>
        <p className="text-sm leading-normal text-muted-foreground">
          <NewsReadTime value={post.readTime} />
        </p>
      </div>
    </LocaleLink>
  )
}
