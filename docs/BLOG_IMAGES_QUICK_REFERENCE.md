# Blog Images Quick Reference

## Status: ✅ Complete

### Coverage: 100%
- **17/17** posts with featured images
- **12/12** Visa Guides complete
- **5/5** Travel Tips complete
- **0** placeholder images remaining

---

## Adding Images to New Posts

### 1. Featured Image (Required)
\`\`\`sql
UPDATE blog_posts 
SET featured_image = '/images/blog/your-image.jpg'
WHERE slug = 'your-post-slug';
\`\`\`

### 2. Inline Images (Optional)
\`\`\`markdown
## Your Section

![Alt text description](/images/blog/inline-image.jpg)

Your content continues...
\`\`\`

---

## Image Specifications

| Type | Size | Format | Max File Size |
|------|------|--------|---------------|
| Featured | 1200x600px | JPG/WebP | 200KB |
| Inline | 800x500px | JPG/WebP | 150KB |

---

## File Locations

\`\`\`
/public/images/blog/         ← All blog images
/docs/BLOG_IMAGES_GUIDE.md  ← Full documentation
/scripts/update-blog-images.ts  ← Automation script
\`\`\`

---

## Quick Commands

\`\`\`bash
# Audit images
npm run update-blog-images audit

# Update all posts
npm run update-blog-images update-all

# Update specific post
npm run update-blog-images update <slug>
\`\`\`

---

## Image Naming Convention

✅ Good: `schengen-visa-application-checklist.jpg`  
❌ Bad: `IMG_1234.jpg`

---

## Alt Text Best Practices

✅ Good: `Schengen visa application form with passport`  
❌ Bad: `Image of visa stuff`

---

## Optimization Checklist

- [ ] Resize to correct dimensions
- [ ] Compress to target size
- [ ] Use descriptive filename
- [ ] Add meaningful alt text
- [ ] Test on mobile/desktop
- [ ] Verify lazy loading works

---

## Need Help?

📖 Full Guide: `/docs/BLOG_IMAGES_GUIDE.md`  
📋 Summary: `/docs/BLOG_IMAGES_IMPLEMENTATION_SUMMARY.md`
