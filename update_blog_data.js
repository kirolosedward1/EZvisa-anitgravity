const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, 'content/blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.mdx'));

const posts = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
  const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]+)$/);
  
  if (!match) continue;
  
  const yaml = match[1];
  const body = match[2].trim();
  
  const getVal = (key) => {
    const m = yaml.match(new RegExp(`^${key}:\\s*"?(.*?)"?$`, 'm'));
    return m ? m[1] : '';
  };

  const getArray = (key) => {
    const m = yaml.match(new RegExp(`^${key}:\\s*\\[(.*?)\\]$`, 'm'));
    if (!m) return [];
    return m[1].split(',').map(s => s.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''));
  };

  posts.push({
    slug: getVal('slug'),
    title: getVal('title'),
    excerpt: getVal('excerpt'),
    category: getVal('category'),
    tags: getArray('tags'),
    featuredImage: getVal('featuredImage'),
    publishedAt: getVal('publishedAt') + "T00:00:00+00:00",
    readTime: getVal('readTime'),
    content: body,
    author: "EZvisa Team",
    seo: {
      metaTitle: getVal('metaTitle'),
      metaDescription: getVal('metaDescription'),
      keywords: getArray('keywords')
    }
  });
}

// Sort posts by date descending
posts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

const output = `import { BlogPost } from "./blog"

export const STATIC_BLOG_POSTS: BlogPost[] = ${JSON.stringify(posts, null, 2)}
`;

fs.writeFileSync(path.join(__dirname, 'lib/blog-static-data.ts'), output);
console.log('Successfully updated lib/blog-static-data.ts');
