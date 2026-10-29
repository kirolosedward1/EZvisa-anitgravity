import { hasArabicGuideCopy } from "@/components/blog/news-copy"
import { getAllPosts, type BlogPost } from "@/lib/blog"
import { ARABIC_POSTS } from "@/lib/blog-ar"
import type { DisplayLocale } from "@/lib/currency"

/** Newest published guides for one locale. Arabic never falls back to English copy. */
export async function latestGuides(locale: DisplayLocale, limit = 3): Promise<BlogPost[]> {
  const posts = await getAllPosts()
  return posts
    .filter((post) => published(post) && inLocale(locale, post))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit)
}

function inLocale(locale: DisplayLocale, post: BlogPost) {
  if (locale === "en") return true
  return hasArabicGuideCopy(post.slug, post.category) && Boolean(ARABIC_POSTS[post.slug]?.content?.trim())
}

function published(post: BlogPost) {
  return Boolean(post.publishedAt && post.featuredImage && post.title.trim() && post.excerpt.trim() && post.content.trim())
}
