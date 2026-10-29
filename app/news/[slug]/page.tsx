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
import { ORGANIZATION_LOGO, SITE_URL, generateStructuredData } from "@/lib/seo"
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
      translated: slug in ARABIC_POSTS,
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

  const arabicBody = locale === "ar" && slug in ARABIC_POSTS
  const articleUrl = `${SITE_URL}${arabicBody ? "/ar" : ""}/news/${slug}`
  // "EZvisa Team" is the company, not a person: credit it as the Organization.
  const teamAuthor = post.author === "EZvisa Team"
  const articleJsonLd = generateStructuredData(
    {
      "@type": "Article",
      "@id": `${articleUrl}#article`,
      headline: arabicBody ? newsTitleText("ar", slug, post.title) : post.title,
      description: arabicBody ? newsExcerptText("ar", slug, post.excerpt) : post.excerpt,
      image: post.featuredImage.startsWith("http") ? post.featuredImage : `${SITE_URL}${post.featuredImage}`,
      datePublished: post.publishedAt,
      dateModified: post.publishedAt,
      inLanguage: arabicBody ? "ar" : "en",
      author: teamAuthor
        ? { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "EZvisa", url: `${SITE_URL}/about` }
        : { "@type": "Person", name: post.author },
      publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "EZvisa", logo: ORGANIZATION_LOGO },
      mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: locale === "ar" ? "الرئيسية" : "Home", item: `${SITE_URL}${locale === "ar" ? "/ar" : "/"}` },
        { "@type": "ListItem", position: 2, name: locale === "ar" ? "المدونة" : "Blog", item: `${SITE_URL}${locale === "ar" ? "/ar" : ""}/news` },
        { "@type": "ListItem", position: 3, name: arabicBody ? newsTitleText("ar", slug, post.title) : post.title, item: articleUrl },
      ],
    },
  )

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
