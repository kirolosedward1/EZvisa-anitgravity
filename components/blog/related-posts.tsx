import { getAllPosts } from "@/lib/blog"
import Image from "next/image"
import Link from "next/link"
import { Calendar, Clock } from "lucide-react"

export async function RelatedPosts({
  currentSlug,
  category,
}: {
  currentSlug: string
  category: string
}) {
  const allPosts = await getAllPosts()

  // Filter posts by same category, exclude current post, limit to 3
  const relatedPosts = allPosts.filter((post) => post.category === category && post.slug !== currentSlug).slice(0, 3)

  if (!relatedPosts || relatedPosts.length === 0) return null

  return (
    <section className="py-16 bg-muted/30 border-t">
      <div className="container mx-auto px-4" style={{ maxWidth: "85%" }}>
        <h2 className="text-3xl font-bold mb-8">Related Articles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {relatedPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/news/${post.slug}`}
              className="group block bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={post.featuredImage || "/placeholder.svg"}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium mb-2">
                  {post.category}
                </span>
                <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.readTime}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
