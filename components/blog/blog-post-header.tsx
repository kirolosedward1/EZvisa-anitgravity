import { Image } from "@/components/image"
import type { BlogPost } from "@/lib/blog"
import { NewsCategory, NewsDate, NewsExcerpt, NewsReadTime, NewsTitle, newsTitleText } from "@/components/blog/news-copy"
import { requestLocale } from "@/lib/request-locale"

export async function BlogPostHeader({ post }: { post: BlogPost }) {
  const alt = newsTitleText(await requestLocale(), post.slug, post.title)
  return (
    <header className="ez-article-header">
      <h1><NewsTitle slug={post.slug} fallback={post.title} /></h1>
      <p className="ez-article-deck"><NewsExcerpt slug={post.slug} fallback={post.excerpt} /></p>
      <div className="ez-story-meta">
        <span className="ez-story-category"><NewsCategory category={post.category} /></span><span aria-hidden="true">·</span>
        <time dateTime={post.publishedAt}><NewsDate iso={post.publishedAt} /></time>
        <span aria-hidden="true">·</span><span><NewsReadTime value={post.readTime} /></span>
      </div>
      <div className="ez-article-cover">
        <Image src={post.featuredImage || "/placeholder.svg"} alt={alt} fill sizes="(max-width: 1280px) 100vw, 1200px" className="object-cover" priority />
      </div>
    </header>
  )
}
