import { getPostBySlug, getAllPostsForBuild } from "@/lib/blog"
import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { BlogPostHeader } from "@/components/blog/blog-post-header"
import { BlogContent } from "@/components/blog/blog-content"
import { ShareButtons } from "@/components/blog/share-buttons"
import { BackToTop } from "@/components/blog/back-to-top"
import { RelatedPosts } from "@/components/blog/related-posts"
import { Button } from "@/components/ui/button"
import { LocaleLink } from "@/components/locale-link"
import { Msg } from "@/components/msg"
import { NewsTag, NewsTitle, newsExcerptText, newsTitleText } from "@/components/blog/news-copy"
import { ARABIC_POSTS } from "@/lib/blog-ar"
import { requestLocale } from "@/lib/request-locale"
import { withArabicMeta } from "@/lib/page-meta"
import { Rocket } from "lucide-react"
import { TableOfContents } from "@/components/blog/table-of-contents"
import { StartApplicationBox } from "@/components/start-application-box"
import { notFound } from "next/navigation"

export async function generateStaticParams() {
  const posts = await getAllPostsForBuild()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    return withArabicMeta({ title: "Post Not Found" }, { title: "المقال غير موجود", path: "/ar/news" })
  }

  // Most posts have no SEO overrides: fall back to the post's own title and excerpt so the tab title is never empty.
  const metaTitle = post.seo?.metaTitle?.trim() || post.title
  const metaDescription = post.seo?.metaDescription?.trim() || post.excerpt
  const arTitle = newsTitleText("ar", slug, metaTitle)
  const arDescription = newsExcerptText("ar", slug, metaDescription)

  return withArabicMeta(
    {
      title: metaTitle,
      description: metaDescription,
      keywords: post.seo.keywords,
      authors: [{ name: post.author }],
      alternates: {
        canonical: `https://www.ezvisa.net/news/${slug}`,
      },
      openGraph: {
        title: metaTitle,
        description: metaDescription,
        images: [
          {
            url: post.featuredImage,
            width: 1200,
            height: 630,
            alt: (await requestLocale()) === "ar" ? arTitle : post.title,
          },
        ],
        type: "article",
        publishedTime: post.publishedAt,
        authors: [post.author],
        url: `https://www.ezvisa.net/news/${slug}`,
      },
      twitter: {
        card: "summary_large_image",
        title: metaTitle,
        description: metaDescription,
        images: [post.featuredImage],
      },
    },
    {
      title: arTitle,
      description: arDescription,
      path: `/ar/news/${slug}`,
    },
  )
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "EZvisa",
      logo: {
        "@type": "ImageObject",
        url: "https://www.ezvisa.net/images/logo-main.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://www.ezvisa.net/news/${slug}`,
    },
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <SiteHeader forceBackground={true} />
      <main className="flex-1">
        <article className="pt-28 pb-8 md:pt-36 md:pb-12">
          <div className="container mx-auto px-4 max-w-7xl">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm text-muted-foreground">
              <LocaleLink href="/" className="hover:text-primary transition-colors">
                <Msg id="news.home" />
              </LocaleLink>
              <span className="mx-2">/</span>
              <LocaleLink href="/news" className="hover:text-primary transition-colors">
                <Msg id="news.crumb" />
              </LocaleLink>
              <span className="mx-2">/</span>
              <span className="text-foreground"><NewsTitle slug={slug} fallback={post.title} /></span>
            </nav>

            <div className="flex flex-col xl:flex-row xl:gap-8 gap-12">
              <div className="flex-1 xl:max-w-[calc(100%-320px-2rem)] min-w-0">
                <BlogPostHeader post={post} />
                <div className="rtl:hidden">
                  <BlogContent content={post.content} />
                </div>
                <div className="hidden rtl:block">
                  <BlogContent content={ARABIC_POSTS[slug]?.content ?? post.content} />
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-12 pt-8 border-t">
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium"
                        >
                          #<NewsTag tag={tag} />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Share Buttons */}
                <div className="mt-8">
                  <ShareButtons title={post.title} url={`/news/${slug}`} />
                </div>

                {/* Start Application Box - Mobile Only */}
                <div className="mt-12 xl:hidden">
                  <StartApplicationBox />
                </div>
              </div>

              <aside className="xl:w-[320px] xl:flex-shrink-0 order-first xl:order-last">
                <div className="xl:sticky xl:top-0 xl:pt-8 space-y-8">
                  <div className="rtl:hidden">
                    <TableOfContents content={post.content} />
                  </div>
                  <div className="hidden rtl:block">
                    <TableOfContents content={ARABIC_POSTS[slug]?.content ?? post.content} />
                  </div>
                  {/* Start Application Box - Desktop Only */}
                  <div className="hidden xl:block">
                    <StartApplicationBox />
                  </div>
                </div>
              </aside>
            </div>

            {/* Related Posts */}
            <div className="mt-16">
              <RelatedPosts currentSlug={slug} category={post.category} />
            </div>
          </div>
        </article>
      </main>
      <Footer />
      <BackToTop />
    </div>
  )
}
