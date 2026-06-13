# EZvisa.net - Visual Sitemap Structure

## Site Architecture Overview

\`\`\`
ezvisa.net (Homepage)
│
├── 🏠 Main Pages (Priority: High)
│   ├── / (Homepage) - Priority: 1.0
│   ├── /apply (Application Form) - Priority: 0.95
│   ├── /how-it-works (Process Guide) - Priority: 0.75
│   ├── /pricing (Pricing Plans) - Priority: 0.80
│   ├── /about (About Us) - Priority: 0.70
│   └── /contact (Contact) - Priority: 0.65
│
├── 📄 Documents Hub (Priority: High)
│   ├── /documents (Main Documents Page) - Priority: 0.90
│   │
│   └── Country-Specific Pages (29 pages) - Priority: 0.85
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-austria
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-belgium
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-bulgaria
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-croatia
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-czech-republic
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-denmark
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-estonia
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-finland
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-france
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-germany
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-greece
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-hungary
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-iceland
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-italy
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-latvia
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-liechtenstein
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-lithuania
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-luxembourg
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-malta
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-netherlands
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-norway
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-poland
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-portugal
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-romania
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-slovakia
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-slovenia
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-spain
│       ├── /documents/required-documents-to-apply-for-a-tourist-visa-in-sweden
│       └── /documents/required-documents-to-apply-for-a-tourist-visa-in-switzerland
│
├── 📰 Content & Resources (Priority: Medium-High)
│   ├── /news (Blog Listing) - Priority: 0.85
│   │   └── /news/[slug] (Individual Posts) - Priority: 0.75
│   │
│   └── /videos (Video Gallery) - Priority: 0.85
│
├── 💳 Transaction Pages (Priority: Medium - No Index)
│   ├── /payment-success (Success Page) - No Index
│   └── /payment-failed (Failed Page) - No Index
│
└── ⚖️ Legal Pages (Priority: Low)
    ├── /privacy-policy - Priority: 0.30
    ├── /terms-of-service - Priority: 0.30
    └── /refund-policy - Priority: 0.30
\`\`\`

---

## Page Hierarchy by Priority

### Priority 1.0 (Highest)
**Homepage** - Main entry point
- Target Keywords: "Schengen visa", "Europe visa UAE", "tourist visa Europe"
- Update Frequency: Weekly
- Schema: Organization, WebSite, Service, FAQPage, BreadcrumbList

### Priority 0.95
**Application Form** - Primary conversion page
- Target Keywords: "apply for Schengen visa", "Schengen visa application"
- Update Frequency: Weekly
- Schema: Service, HowTo

### Priority 0.90
**Documents Hub** - Information gateway
- Target Keywords: "Schengen visa documents", "visa requirements"
- Update Frequency: Weekly
- Schema: BreadcrumbList

### Priority 0.85 (High Value)
**Country Pages (29)** - Long-tail keyword targets
- Target Keywords: "[Country] tourist visa", "[Country] visa requirements"
- Update Frequency: Weekly
- Schema: HowTo, FAQPage, BreadcrumbList

**News/Blog** - Fresh content hub
- Target Keywords: Various long-tail keywords
- Update Frequency: Daily
- Schema: Article, BreadcrumbList

**Videos** - Multimedia content
- Target Keywords: "Schengen visa guide", "how to apply visa"
- Update Frequency: Weekly
- Schema: VideoObject, BreadcrumbList

### Priority 0.75-0.80
**Supporting Pages** - How It Works, Pricing
- Update Frequency: Monthly
- Schema: Service, HowTo, FAQPage

### Priority 0.65-0.70
**About & Contact** - Trust and communication
- Update Frequency: Monthly
- Schema: Organization, ContactPage

### Priority 0.30
**Legal Pages** - Required but low traffic
- Update Frequency: Yearly
- Schema: WebPage

---

## Internal Linking Strategy

### Hub Model (Documents Section)
\`\`\`
Documents Hub (Main Page)
    ↓
    ├→ France → Related: Germany, Belgium, Spain
    ├→ Germany → Related: Austria, Poland, Czech Republic
    ├→ Italy → Related: France, Spain, Greece
    └→ Spain → Related: France, Portugal
\`\`\`

### Content Clusters

#### Cluster 1: Application Process
\`\`\`
How It Works (Hub)
    ↓
    ├→ Complete Visa Application Guide
    ├→ Step-by-Step Process
    ├→ Document Preparation
    └→ Interview Tips
\`\`\`

#### Cluster 2: Document Requirements
\`\`\`
Documents Hub (Hub)
    ↓
    ├→ Passport Requirements
    ├→ Bank Statement Guide
    ├→ Cover Letter Template
    ├→ Itinerary Planning
    └→ Travel Insurance Guide
\`\`\`

#### Cluster 3: Country Guides
\`\`\`
Each Country Page Links To:
    ├→ Related neighboring countries (2-3)
    ├→ Travel guide for that country
    ├→ Main documents hub
    └→ Application page (CTA)
\`\`\`

---

## URL Structure Guidelines

### Format
\`\`\`
https://ezvisa.net/[category]/[keyword-rich-slug]
\`\`\`

### Best Practices
✅ **Good URLs**:
- `/documents/required-documents-to-apply-for-a-tourist-visa-in-france`
- `/news/schengen-visa-rejection-reasons`
- `/how-to-write-visa-cover-letter`

❌ **Bad URLs**:
- `/page?id=123&category=visa`
- `/2024/01/post-title`
- `/documents_france_2024`

### URL Optimization Rules
1. Use hyphens (-) not underscores (_)
2. All lowercase
3. Include target keyword
4. Keep under 60 characters when possible
5. No special characters or parameters
6. Descriptive and readable

---

## Navigation Structure

### Primary Navigation (Header)
\`\`\`
Logo | How It Works? | Documents | Pricing | News | Videos | About | Contact | [Apply Now - CTA]
\`\`\`

### Secondary Navigation (Footer)
\`\`\`
Column 1: Services        Column 2: Resources       Column 3: Company       Column 4: Legal
├─ Apply Now             ├─ Documents             ├─ About Us            ├─ Privacy Policy
├─ How It Works          ├─ News                  ├─ Contact             ├─ Terms of Service
├─ Pricing               ├─ Videos                └─ FAQ                 └─ Refund Policy
└─ Countries             └─ Visa Requirements
\`\`\`

### Mobile Navigation
- Hamburger menu
- Same structure as desktop
- Apply CTA prominent
- One-tap call/WhatsApp buttons

---

## Crawl Budget Optimization

### High Priority (Crawl Frequently)
- Homepage: Daily
- Application page: Daily
- News section: Daily
- Country pages: Weekly
- Documents hub: Weekly

### Medium Priority (Crawl Less Frequently)
- How It Works: Monthly
- Pricing: Monthly
- About: Monthly
- Videos: Weekly

### Low Priority (Crawl Rarely)
- Legal pages: Yearly
- Old blog posts: Quarterly

### Blocked from Crawling (robots.txt)
- `/api/*` - API routes
- `/payment-success` - Private
- `/payment-failed` - Private
- `/_next/*` - Next.js internals
- `/static/*` - Static files

---

## XML Sitemap Details

### Location
`https://ezvisa.net/sitemap.xml`

### Update Frequency
- Automatic updates when content changes
- Dynamic generation via Next.js
- Includes all public pages
- Real-time blog post inclusion

### Sitemap Contents
\`\`\`xml
<urlset>
  <!-- Main Pages (12 URLs) -->
  <url>
    <loc>https://ezvisa.net/</loc>
    <lastmod>2024-02-05</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Country Pages (29 URLs) -->
  <url>
    <loc>https://ezvisa.net/documents/...</loc>
    <lastmod>2024-02-05</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
  
  <!-- Blog Posts (Dynamic count) -->
  <url>
    <loc>https://ezvisa.net/news/[slug]</loc>
    <lastmod>[post-date]</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
  </url>
  
  <!-- Legal Pages (3 URLs) -->
  <url>
    <loc>https://ezvisa.net/privacy-policy</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
\`\`\`

---

## Breadcrumb Implementation

### Format
\`\`\`
Home > [Category] > [Subcategory] > [Page]
\`\`\`

### Examples
\`\`\`
Home > Documents > France Visa Requirements
Home > News > How to Write a Visa Cover Letter
Home > Apply
Home > How It Works
\`\`\`

### Schema Markup
Every page includes BreadcrumbList schema showing navigation path.

---

## Search Engine Submission Status

### Google
- [x] Sitemap submitted
- [x] Property verified
- [ ] All pages indexed (in progress)
- [ ] Rich results testing

### Bing
- [ ] Webmaster Tools setup
- [ ] Sitemap submitted
- [ ] Property verified

### Yandex (Optional)
- [ ] Webmaster setup
- [ ] Verification code added

---

## Page Types Summary

| Page Type | Count | Priority | Update Freq | Indexed |
|-----------|-------|----------|-------------|---------|
| Homepage | 1 | 1.0 | Weekly | ✅ Yes |
| Core Pages | 6 | 0.65-0.95 | Monthly | ✅ Yes |
| Documents Hub | 1 | 0.90 | Weekly | ✅ Yes |
| Country Pages | 29 | 0.85 | Weekly | ✅ Yes |
| Blog Posts | 50+ | 0.75 | Monthly | ✅ Yes |
| Videos | 10+ | 0.85 | Weekly | ✅ Yes |
| Legal Pages | 3 | 0.30 | Yearly | ✅ Yes |
| Transaction | 2 | N/A | N/A | ❌ No |
| **Total** | **102+** | | | |

---

## Sitemap Maintenance

### Weekly Tasks
- [ ] Verify sitemap is accessible
- [ ] Check for errors in Google Search Console
- [ ] Ensure new blog posts are included
- [ ] Monitor crawl stats

### Monthly Tasks
- [ ] Review all URLs in sitemap
- [ ] Update lastmod dates for changed pages
- [ ] Adjust priorities if needed
- [ ] Check for broken URLs
- [ ] Verify all pages are indexed

### Quarterly Tasks
- [ ] Full site audit
- [ ] Remove outdated URLs
- [ ] Add new sections if applicable
- [ ] Review and optimize structure
- [ ] Update documentation

---

## Future Expansion Plans

### Phase 2 (Q2 2024)
- Country-specific travel guides (29 pages)
- City guides (major European cities)
- Visa comparison tools
- Visa fee calculator

### Phase 3 (Q3 2024)
- Multi-language support (Arabic)
- Student visa section
- Business visa section
- Immigration services

### Phase 4 (Q4 2024)
- User accounts/dashboard
- Visa tracking system
- Document management portal
- Community forum

---

**Visual representation of site architecture created for:**
- SEO planning and optimization
- Internal linking strategy
- Content planning
- Development roadmap
- Stakeholder communication

**Last Updated**: February 2026  
**Owner**: SEO & Development Team
