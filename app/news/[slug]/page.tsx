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
import Link from "next/link"
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
    return {
      title: "Post Not Found",
    }
  }

  return {
    title: post.seo.metaTitle,
    description: post.seo.metaDescription,
    keywords: post.seo.keywords,
    authors: [{ name: post.author }],
    alternates: {
      canonical: `https://ezvisa.net/news/${slug}`,
    },
    openGraph: {
      title: post.seo.metaTitle,
      description: post.seo.metaDescription,
      images: [
        {
          url: post.featuredImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author],
      url: `https://ezvisa.net/news/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.seo.metaTitle,
      description: post.seo.metaDescription,
      images: [post.featuredImage],
    },
  }
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
        url: "https://ezvisa.net/images/logo-main.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://ezvisa.net/news/${slug}`,
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
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <span className="mx-2">/</span>
              <Link href="/news" className="hover:text-primary transition-colors">
                News
              </Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">{post.title}</span>
            </nav>

            <div className="flex flex-col xl:flex-row xl:gap-8 gap-12">
              <div className="flex-1 xl:max-w-[calc(100%-320px-2rem)] min-w-0">
                <BlogPostHeader post={post} />
                <BlogContent content={post.content} />

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-12 pt-8 border-t">
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium"
                        >
                          #{tag}
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
                  <TableOfContents content={post.content} />
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
