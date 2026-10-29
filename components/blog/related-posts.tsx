import { getAllPosts } from "@/lib/blog"
import { BlogCard } from "@/components/blog/blog-card"
import { Msg } from "@/components/msg"

export async function RelatedPosts({ currentSlug, category }: { currentSlug: string; category: string }) {
  const allPosts = await getAllPosts()
  const relatedPosts = allPosts.filter((post) => post.category === category && post.slug !== currentSlug).slice(0, 3)
  if (!relatedPosts.length) return null
  return (
    <section className="ez-journal-related" aria-labelledby="related-articles">
      <div className="ez-journal-section-title"><h2 id="related-articles"><Msg id="news.related" /></h2></div>
      <div className="ez-journal-grid">{relatedPosts.map((post) => <BlogCard key={post.slug} post={post} />)}</div>
    </section>
  )
}
