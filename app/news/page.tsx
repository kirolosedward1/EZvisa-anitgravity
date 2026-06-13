import { getAllPosts, categories } from "@/lib/blog"
import { BlogHero } from "@/components/blog/blog-hero"
import { CategoryFilter } from "@/components/blog/category-filter"
import { BlogCard } from "@/components/blog/blog-card"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Schengen Visa News, Guides & Travel Tips | EZvisa Blog",
  description:
    "Latest Schengen visa guides, travel tips, and document requirements for 2026. Expert advice on European visa applications, common mistakes, and success stories. Stay updated with visa policy changes.",
  keywords: [
    "Schengen visa blog",
    "visa news",
    "travel tips Europe",
    "visa guides",
    "visa requirements 2026",
    "travel blog",
  ],
  alternates: {
    canonical: "https://ezvisa.net/news",
  },
  openGraph: {
    title: "Schengen Visa News, Guides & Travel Tips",
    description: "Expert advice and latest updates on European visa applications.",
    url: "https://ezvisa.net/news",
    type: "website",
  },
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const selectedCategory = params.category || "All"
  const allPosts = await getAllPosts()
  const filteredPosts =
    selectedCategory === "All" ? allPosts : allPosts.filter((post) => post.category === selectedCategory)

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader forceBackground={true} />
      <main className="flex-1">
        <BlogHero />
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <CategoryFilter categories={categories} selectedCategory={selectedCategory} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {filteredPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">No posts found in this category.</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
