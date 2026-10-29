"use client"

import { ArrowUpRight } from "lucide-react"
import { Image } from "@/components/image"
import type { BlogPost } from "@/lib/blog"
import { LocaleLink } from "@/components/locale-link"
import { Msg } from "@/components/msg"
import { useSiteLocale } from "@/components/locale-provider"
import { NewsCategory, NewsDate, NewsExcerpt, NewsReadTime, NewsTitle, newsTitleText } from "@/components/blog/news-copy"

export function BlogCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  const alt = newsTitleText(useSiteLocale(), post.slug, post.title)
  return (
    <article data-site-reveal="rise" className={`ez-journal-story${featured ? " ez-journal-feature" : ""}`}>
      <LocaleLink href={`/news/${post.slug}`} className="ez-story-link">
        <div className="ez-story-image">
          <Image src={post.featuredImage || "/placeholder.svg"} alt={alt} fill priority={featured}
            sizes={featured ? "(max-width: 767px) 100vw, 60vw" : "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"}
            className="object-cover" />
        </div>
        <div className="ez-story-copy">
          {featured ? <h2><NewsTitle slug={post.slug} fallback={post.title} /></h2> : <h3><NewsTitle slug={post.slug} fallback={post.title} /></h3>}
          <p className="ez-story-excerpt"><NewsExcerpt slug={post.slug} fallback={post.excerpt} /></p>
          <div className="ez-story-meta">
            <span className="ez-story-category"><NewsCategory category={post.category} /></span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.publishedAt}><NewsDate iso={post.publishedAt} /></time>
            <span aria-hidden="true">·</span>
            <span><NewsReadTime value={post.readTime} /></span>
          </div>
          {featured && <span className="ez-story-read"><Msg id="news.readMore" /><ArrowUpRight aria-hidden="true" size={20} /></span>}
        </div>
      </LocaleLink>
    </article>
  )
}
