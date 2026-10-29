import { getPostBySlug, getAllPostsForBuild } from "@/lib/blog"
import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { Footer } from "@/components/footer"
import { BlogPostHeader } from "@/components/blog/blog-post-header"
import { BlogContent } from "@/components/blog/blog-content"
import { ShareButtons } from "@/components/blog/share-buttons"
import { BackToTop } from "@/components/blog/back-to-top"
import { RelatedPosts } from "@/components/blog/related-posts"
import { LocaleLink } from "@/components/locale-link"
import { Msg } from "@/components/msg"
import { NewsTag, newsExcerptText, newsTitleText } from "@/components/blog/news-copy"
import { ARABIC_POSTS } from "@/lib/blog-ar"
import { requestLocale } from "@/lib/request-locale"
import { withArabicMeta } from "@/lib/page-meta"
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

  const locale = await requestLocale()
  const content = locale === "ar" ? ARABIC_POSTS[slug]?.content ?? post.content : post.content

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
      <main id="main-content" className="ez-article flex-1">
        <article className="ez-journal-shell">
          <nav className="ez-article-breadcrumb" aria-label={locale === "ar" ? "مسار التنقل" : "Breadcrumb"}>
            <LocaleLink href="/"><Msg id="news.home" /></LocaleLink>
            <span aria-hidden="true">/</span>
            <LocaleLink href="/news"><Msg id="news.crumb" /></LocaleLink>
          </nav>
          <BlogPostHeader post={post} />
          <div className="ez-article-layout">
            <div className="ez-article-reading">
              <BlogContent content={content} />
              {post.tags?.length > 0 && (
                <div className="ez-article-tags">
                  {post.tags.map((tag) => <span key={tag}>#<NewsTag tag={tag} /></span>)}
                </div>
              )}
              <ShareButtons title={newsTitleText(locale, slug, post.title)} url={`/news/${slug}`} />
            </div>
            <aside className="ez-article-sidebar">
              <div className="ez-article-sidebar-sticky">
                <TableOfContents content={content} />
                <div className="ez-article-application"><StartApplicationBox /></div>
              </div>
            </aside>
          </div>
          <RelatedPosts currentSlug={slug} category={post.category} />
        </article>
      </main>
      <Footer />
      <BackToTop />
    </div>
  )
}
