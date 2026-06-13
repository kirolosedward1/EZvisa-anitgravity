/**
 * Script to easily add new blog posts to the database
 *
 * Usage:
 * 1. Edit the blogPost object below with your content
 * 2. Run this script to insert the post
 *
 * This is a template - copy and modify for each new post
 */

import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_ezvisaSUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function addBlogPost() {
  // Define your blog post here
  const blogPost = {
    slug: "your-blog-post-slug-here",
    title: "Your Blog Post Title",
    excerpt: "A compelling excerpt that summarizes your post in 1-2 sentences.",
    content: `
## Introduction

Your blog post content goes here in Markdown format.

### Subheading

More content...

---

## Another Section

Continue writing your comprehensive content here.

**Remember to include:**
- Clear structure with headings
- Practical tips and examples
- Tables where helpful
- Call-to-action at the end
    `,
    category: "Visa Guides", // or 'Travel Tips', 'Country Guides', etc.
    tags: ["tag1", "tag2", "tag3"],
    featured_image: "/placeholder.svg?height=600&width=1200",
    published_at: new Date().toISOString(),
    read_time: "10 min read",
    meta_title: "SEO-Optimized Title for Search Engines",
    meta_description: "SEO meta description between 150-160 characters that includes target keywords.",
    keywords: ["keyword1", "keyword2", "keyword3", "keyword4"],
  }

  // Insert the blog post
  const { data, error } = await supabase.from("blog_posts").insert([blogPost]).select()

  if (error) {
    console.error("Error adding blog post:", error)
    return
  }

  console.log("✅ Blog post added successfully!")
  console.log("📝 Post details:", data)
  console.log(`🔗 View at: /news/${blogPost.slug}`)
}

// Run the script
addBlogPost()
