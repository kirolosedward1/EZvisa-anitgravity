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
  // Force using static blog posts so our newly generated content appears
  return STATIC_BLOG_POSTS;
})

export const getPostBySlug = cache(async (slug: string): Promise<BlogPost | null> => {
  const fallback = STATIC_BLOG_POSTS.find((p) => p.slug === slug)
  return fallback || null
})

export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
  const allPosts = await getAllPosts()
  if (category === "All") return allPosts
  return allPosts.filter((post) => post.category === category)
}

export const categories = ["All", "Visa Guides", "Travel Tips", "Country Guides", "Success Stories", "Updates"]
