import { getAllPosts } from "@/lib/blog"
import { BlogHero } from "@/components/blog/blog-hero"
import { CategoryFilter } from "@/components/blog/category-filter"
import { BlogCard } from "@/components/blog/blog-card"
import { LangText } from "@/components/lang-text"
import { Msg } from "@/components/msg"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"
import { withArabicMeta } from "@/lib/page-meta"

export const revalidate = 3600

export function generateMetadata(): Promise<Metadata> {
  return withArabicMeta(
    {
  title: "Schengen Visa News, Guides & Travel Tips",
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
    canonical: "https://www.ezvisa.net/news",
  },
  openGraph: {
    title: "Schengen Visa News, Guides & Travel Tips",
    description: "Expert advice and latest updates on European visa applications.",
    url: "https://www.ezvisa.net/news",
    type: "website",
  },
    },
    {
      title: "أخبار وأدلة تأشيرة شنغن",
      description: "أدلة ومستندات ومواعيد تأشيرة شنغن للمقيمين في الإمارات في 2026.",
      path: "/ar/news",
    },
  )
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const selectedCategory = params.category || "All"
  const allPosts = await getAllPosts()
  const categories = ["All", ...new Set(allPosts.map((post) => post.category))]
  const filteredPosts =
    selectedCategory === "All" ? allPosts : allPosts.filter((post) => post.category === selectedCategory)

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader forceBackground={true} />
      <main id="main-content" className="ez-journal flex-1">
        <div className="ez-journal-shell">
          <BlogHero />
          <CategoryFilter categories={categories} selectedCategory={selectedCategory} />
          {filteredPosts[0] && <BlogCard post={filteredPosts[0]} featured />}
          {filteredPosts.length > 1 && (
            <section className="ez-journal-library" aria-labelledby="journal-library-title">
              <div data-site-reveal="rise" className="ez-journal-section-title">
                <h2 id="journal-library-title"><LangText en="More for your journey" ar="المزيد لرحلتك" /></h2>
                <span><LangText en={`${filteredPosts.length - 1} articles`} ar={`${filteredPosts.length - 1} مقالات`} /></span>
              </div>
              <div data-site-stagger className="ez-journal-grid">
                {filteredPosts.slice(1).map((post) => <BlogCard key={post.slug} post={post} />)}
              </div>
            </section>
          )}
          {filteredPosts.length === 0 && (
            <div className="text-center py-16"><p className="text-muted-foreground text-lg"><Msg id="news.empty" /></p></div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
