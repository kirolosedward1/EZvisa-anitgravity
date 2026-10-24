import Image from "next/image"
import type { BlogPost } from "@/lib/blog"
import { Calendar, Clock } from "lucide-react"
import { NewsCategory, NewsDate, NewsReadTime, NewsTitle } from "@/components/blog/news-copy"

export function BlogPostHeader({ post }: { post: BlogPost }) {
  return (
    <header className="mb-12">
      {/* Category Badge */}
      <div className="mb-4">
        <span className="px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full">
          <NewsCategory category={post.category} />
        </span>
      </div>

      {/* Title */}
      <h1 className="mb-6 text-balance font-medium text-2xl"><NewsTitle slug={post.slug} fallback={post.title} /></h1>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-6 text-muted-foreground mb-8">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <time>
            <NewsDate iso={post.publishedAt} />
          </time>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <span><NewsReadTime value={post.readTime} /></span>
        </div>
      </div>

      <div className="relative w-full max-w-3xl mx-auto aspect-[21/9] rounded-2xl overflow-hidden bg-muted">
        <Image src={post.featuredImage || "/placeholder.svg"} alt={post.title} fill className="object-cover" priority />
      </div>
    </header>
  )
}
