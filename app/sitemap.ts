import type { MetadataRoute } from "next"
import { SCHENGEN_COUNTRIES } from "@/lib/countries"
import { getAllPostsForBuild } from "@/lib/blog"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.ezvisa.net"
  const currentDate = new Date()

  // Static pages with SEO-optimized priorities
  const staticPages = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/apply`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.95,
    },
    {
      url: `${baseUrl}/documents`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/destinations`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: currentDate,
      changeFrequency: "daily" as const,
      priority: 0.85,
    },
    {
      url: `${baseUrl}/videos`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: currentDate,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: currentDate,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/refund-policy`,
      lastModified: currentDate,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ]

  // Country-specific document pages (high SEO value)
  const countryPages = SCHENGEN_COUNTRIES.map((country) => ({
    url: `${baseUrl}/documents/required-documents-to-apply-for-a-tourist-visa-in-${country.toLowerCase().replace(/\s+/g, "-")}`,
    lastModified: currentDate,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }))

  // Country-specific destination landing pages (high SEO value)
  const destinationLandingPages = SCHENGEN_COUNTRIES.map((country) => ({
    url: `${baseUrl}/destinations/${country.toLowerCase().replace(/\s+/g, "-")}`,
    lastModified: currentDate,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }))

  // Blog posts (important for organic traffic) - dynamically fetched from database
  const posts = await getAllPostsForBuild()
  const blogPosts = posts.map((post) => ({
    url: `${baseUrl}/news/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }))

  return [...staticPages, ...countryPages, ...destinationLandingPages, ...blogPosts]
}
