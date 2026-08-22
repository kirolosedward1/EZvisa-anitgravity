import { createBuildClient } from "@/lib/supabase/server"
import { cache } from "react"
import { STATIC_BLOG_POSTS } from "./blog-static-data"

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  category: string
  tags: string[]
  featuredImage: string
  publishedAt: string
  readTime: string
  content: string
  author: string
  seo: {
    metaTitle: string
    metaDescription: string
    keywords: string[]
  }
}

export const getAllPostsForBuild = cache(async (): Promise<BlogPost[]> => {
  return getAllPosts()
})

export const getAllPosts = cache(async (): Promise<BlogPost[]> => {
  try {
    const supabase = createBuildClient()
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("published_at", { ascending: false })

    if (!error && data && data.length > 0) {
      return data.map((post) => ({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        tags: post.tags || [],
        featuredImage: post.featured_image || "/images/travel-itinerary-new.jpg",
        publishedAt: post.published_at,
        readTime: post.read_time || "5 min read",
        content: post.content,
        author: post.author || "EZvisa Team",
        seo: {
          metaTitle: post.meta_title || post.title,
          metaDescription: post.meta_description || post.excerpt,
          keywords: post.keywords || [],
        },
      }))
    }
  } catch (err) {
    console.error("Supabase fetch failed, utilizing static fallback posts:", err)
  }

  // Fallback guaranteed static posts for 100% reliability on production deployments
  return STATIC_BLOG_POSTS
})

export const getPostBySlug = cache(async (slug: string): Promise<BlogPost | null> => {
  try {
    const supabase = createBuildClient()
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .single()

    if (!error && data) {
      return {
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        category: data.category,
        tags: data.tags || [],
        featuredImage: data.featured_image || "/images/travel-itinerary-new.jpg",
        publishedAt: data.published_at,
        readTime: data.read_time || "5 min read",
        content: data.content,
        author: data.author || "EZvisa Team",
        seo: {
          metaTitle: data.meta_title || data.title,
          metaDescription: data.meta_description || data.excerpt,
          keywords: data.keywords || [],
        },
      }
    }
  } catch (err) {
    console.error("Supabase post lookup failed, using fallback:", err)
  }

  const fallback = STATIC_BLOG_POSTS.find((p) => p.slug === slug)
  return fallback || null
})

export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
  const allPosts = await getAllPosts()
  if (category === "All") return allPosts
  return allPosts.filter((post) => post.category === category)
}

export const categories = ["All", "Visa Guides", "Travel Tips", "Country Guides", "Success Stories", "Updates"]
