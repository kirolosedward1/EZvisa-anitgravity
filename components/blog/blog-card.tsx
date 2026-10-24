"use client"

import { Image } from "@/components/image"
import type { BlogPost } from "@/lib/blog"
import { Calendar, Clock } from "lucide-react"
import { motion } from "framer-motion"
import { LocaleLink } from "@/components/locale-link"
import { Msg } from "@/components/msg"
import { useSiteLocale } from "@/components/locale-provider"
import { NewsCategory, NewsDate, NewsExcerpt, NewsReadTime, NewsTag, NewsTitle, newsTitleText } from "@/components/blog/news-copy"

export function BlogCard({ post }: { post: BlogPost }) {
  const alt = newsTitleText(useSiteLocale(), post.slug, post.title)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <LocaleLink
        href={`/news/${post.slug}`}
        className="group block h-full bg-background border border-border rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        <div className="flex flex-col h-full">
          {/* Featured Image */}
          <div className="relative w-full h-48 flex-shrink-0 overflow-hidden bg-muted">
            <Image
              src={post.featuredImage || "/placeholder.svg"}
              alt={alt}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-lg">
                <NewsCategory category={post.category} />
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 flex-1 flex flex-col">
            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <time>
                  <NewsDate iso={post.publishedAt} />
                </time>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span><NewsReadTime value={post.readTime} /></span>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              <NewsTitle slug={post.slug} fallback={post.title} />
            </h3>

            {/* Excerpt */}
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
              <NewsExcerpt slug={post.slug} fallback={post.excerpt} />
            </p>

            {/* Tags - Added for richer content */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {post.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-md">
                    <NewsTag tag={tag} />
                  </span>
                ))}
              </div>
            )}

            {/* Read More */}
            <div className="text-primary text-sm font-semibold group-hover:gap-2 flex items-center gap-1 transition-all mt-auto">
              <Msg id="news.readMore" />
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </div>
      </LocaleLink>
    </motion.div>
  )
}
