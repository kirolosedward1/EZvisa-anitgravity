const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables!")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBlogPosts() {
  console.log("Checking database connection...")
  const { data, error, count } = await supabase
    .from("blog_posts")
    .select("*", { count: "exact", head: true })

  if (error) {
    console.error("Error querying blog_posts table:", error)
  } else {
    console.log(`Successfully connected! Found ${count} blog posts in table 'blog_posts'.`)
  }
}

checkBlogPosts()
