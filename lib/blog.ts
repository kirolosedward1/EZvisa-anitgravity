import { createClient, createBuildClient } from "@/lib/supabase/server"

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

export async function getAllPostsForBuild(): Promise<BlogPost[]> {
  const supabase = createBuildClient()

  const { data, error } = await supabase.from("blog_posts").select("*").order("published_at", { ascending: false })

  if (error) {
    console.error("Error fetching blog posts:", error)
    return []
  }

  return (
    data?.map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      tags: post.tags,
      featuredImage: post.featured_image,
      publishedAt: post.published_at,
      readTime: post.read_time,
      content: post.content,
      author: post.author || "EZvisa Team",
      seo: {
        metaTitle: post.meta_title,
        metaDescription: post.meta_description,
        keywords: post.keywords,
      },
    })) || []
  )
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("blog_posts").select("*").order("published_at", { ascending: false })

  if (error) {
    console.error("Error fetching blog posts:", error)
    return []
  }

  // Transform database format to BlogPost interface
  return (
    data?.map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      tags: post.tags,
      featuredImage: post.featured_image,
      publishedAt: post.published_at,
      readTime: post.read_time,
      content: post.content,
      author: post.author || "EZvisa Team",
      seo: {
        metaTitle: post.meta_title,
        metaDescription: post.meta_description,
        keywords: post.keywords,
      },
    })) || []
  )
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("blog_posts").select("*").eq("slug", slug).single()

  if (error || !data) {
    console.error("Error fetching blog post:", error)
    return null
  }

  // Transform database format to BlogPost interface
  return {
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt,
    category: data.category,
    tags: data.tags,
    featuredImage: data.featured_image,
    publishedAt: data.published_at,
    readTime: data.read_time,
    content: data.content,
    author: data.author || "EZvisa Team",
    seo: {
      metaTitle: data.meta_title,
      metaDescription: data.meta_description,
      keywords: data.keywords,
    },
  }
}

export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
  const allPosts = await getAllPosts()
  if (category === "All") return allPosts
  return allPosts.filter((post) => post.category === category)
}

export const categories = ["All", "Visa Guides", "Travel Tips", "Country Guides", "Success Stories", "Updates"]
