-- Create blog_posts table for storing blog content
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  featured_image TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_time TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- SEO fields
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT[] DEFAULT '{}'
);

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);

-- Create index for published date ordering
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC);

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Allow public read access (no authentication needed for viewing blogs)
CREATE POLICY "Allow public read access to blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (true);

-- Only authenticated users can insert (for future admin panel)
CREATE POLICY "Allow authenticated users to insert blog posts"
  ON public.blog_posts
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can update (for future admin panel)
CREATE POLICY "Allow authenticated users to update blog posts"
  ON public.blog_posts
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Only authenticated users can delete (for future admin panel)
CREATE POLICY "Allow authenticated users to delete blog posts"
  ON public.blog_posts
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER set_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();
