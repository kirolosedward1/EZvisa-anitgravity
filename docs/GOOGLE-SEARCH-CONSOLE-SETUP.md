# Google Search Console Setup Guide

Complete step-by-step instructions for setting up and optimizing Google Search Console for EZvisa.net.

---

## Part 1: Initial Setup & Verification

### Step 1: Create Google Search Console Account
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Sign in with your Google account (business account recommended)
3. Click **"Add Property"**

### Step 2: Choose Property Type
**Recommended**: Domain property (covers all subdomains and protocols)

\`\`\`
Domain: ezvisa.net
\`\`\`

This will cover:
- https://ezvisa.net
- https://www.ezvisa.net  
- http://ezvisa.net
- Any subdomains

### Step 3: Verify Ownership

#### Method 1: DNS Verification (Recommended)
1. Google will provide a TXT record
2. Log in to your domain registrar (Namecheap, GoDaddy, etc.)
3. Go to DNS settings
4. Add new TXT record:
   \`\`\`
   Type: TXT
   Host: @ (or leave blank)
   Value: google-site-verification=XXXXXXXXXX
   TTL: 3600 (or default)
   \`\`\`
5. Save changes
6. Wait 5-10 minutes for propagation
7. Click "Verify" in Google Search Console

#### Method 2: HTML File Upload (Alternative)
1. Download verification file from GSC
2. Upload to `/public/` directory in your project
3. Verify file is accessible at: `https://ezvisa.net/google-verification-file.html`
4. Click "Verify" in GSC

#### Method 3: Meta Tag (Already Implemented!)
Your site already has verification meta tag in `/app/layout.tsx`:
\`\`\`typescript
verification: {
  google: "YOUR_ACTUAL_GOOGLE_CODE", // Replace this
}
\`\`\`

**To use this method:**
1. Get verification code from GSC
2. Update the code in `/app/layout.tsx`
3. Deploy changes
4. Click "Verify" in GSC

---

## Part 2: Submit Sitemap

### Step 1: Verify Sitemap Exists
1. Visit: `https://ezvisa.net/sitemap.xml`
2. Verify it loads correctly
3. Check that all major pages are included

### Step 2: Submit to Google Search Console
1. In GSC, go to **Sitemaps** (left sidebar)
2. Enter sitemap URL: `sitemap.xml`
3. Click **Submit**
4. Wait 24-48 hours for initial crawl

### Expected Result
\`\`\`
Status: Success
Discovered URLs: 102+
\`\`\`

---

## Part 3: Initial Configuration

### Enable Email Notifications
1. Go to **Settings** → **Users and permissions**
2. Add your email as owner
3. Enable notifications for:
   - Critical issues
   - Manual actions
   - Security issues
   - New coverage issues

### Set Preferred Domain (if using www)
1. Go to **Settings** → **Site Settings**
2. Set preferred version (https://ezvisa.net recommended)
3. Ensure redirects work correctly

### Submit URL Inspection for Key Pages
Manually request indexing for important pages:
1. Go to **URL Inspection** (top of GSC)
2. Enter URL to test
3. Click **Request Indexing**

Priority pages to submit first:
- `https://ezvisa.net/` (Homepage)
- `https://ezvisa.net/apply`
- `https://ezvisa.net/documents`
- `https://ezvisa.net/how-it-works`
- `https://ezvisa.net/pricing`

---

## Part 4: Performance Monitoring Setup

### Overview Dashboard
The Overview page shows:
- Total clicks
- Total impressions
- Average CTR
- Average position
- Coverage status
- Core Web Vitals

**Check this weekly** for any anomalies.

### Performance Reports
1. Go to **Performance** → **Search Results**
2. Customize date range (Last 3 months recommended)
3. Add comparisons (vs previous period)
4. Export data weekly for tracking

#### Key Metrics to Monitor
- **Clicks**: Actual visits from Google search
- **Impressions**: How often site appears in search
- **CTR (Click-Through Rate)**: Clicks ÷ Impressions
- **Position**: Average ranking position

#### Filters to Use
- **Query**: See what people search for
- **Page**: Best/worst performing pages
- **Country**: Geographic performance (UAE focus)
- **Device**: Mobile vs Desktop vs Tablet

### Set Up Custom Reports

#### Report 1: Top Performing Keywords
**Filters:**
- Date: Last 28 days
- Metric: Clicks
- Sort: Descending
- Export: Weekly

**Purpose**: Track which keywords drive traffic

#### Report 2: Low CTR High Impressions
**Filters:**
- Impressions: >1000
- CTR: <3%
- Sort by: Impressions descending

**Purpose**: Find optimization opportunities

#### Report 3: Near Top Rankings
**Filters:**
- Position: 4-10
- Impressions: >500

**Purpose**: Identify keywords close to page 1

---

## Part 5: Coverage & Indexing

### Monitor Index Coverage
1. Go to **Coverage** report
2. Review four categories:
   - ✅ **Valid**: Indexed successfully
   - ⚠️ **Valid with warnings**: Indexed but has issues
   - ❌ **Error**: Not indexed due to errors
   - 📊 **Excluded**: Not indexed by choice

### Common Issues & Solutions

#### Issue: "Crawled - currently not indexed"
**Cause**: Page is low quality or low priority
**Solution**:
- Improve content quality (1,000+ words)
- Add more internal links to the page
- Improve page speed
- Add schema markup

#### Issue: "Discovered - currently not indexed"
**Cause**: Google knows about page but hasn't crawled yet
**Solution**:
- Request indexing via URL Inspection
- Add more internal links pointing to page
- Submit sitemap again
- Be patient (can take 2-4 weeks)

#### Issue: "Submitted URL not found (404)"
**Cause**: Page doesn't exist or returns 404
**Solution**:
- Fix broken link or URL
- Remove from sitemap if intentional
- Set up proper redirect if page moved

#### Issue: "Duplicate without user-selected canonical"
**Cause**: Multiple URLs with same content
**Solution**:
- Add canonical tags (already implemented)
- Ensure one version is preferred
- Use 301 redirects for duplicates

---

## Part 6: Mobile Usability

### Check Mobile Issues
1. Go to **Mobile Usability** report
2. Review any errors:
   - Content wider than screen
   - Text too small
   - Clickable elements too close
   - Viewport not set

### How to Fix Issues
Your site is built mobile-first with Next.js, but if issues appear:
1. Test on actual mobile devices
2. Use Chrome DevTools device emulation
3. Fix CSS/responsive issues
4. Request validation in GSC

---

## Part 7: Core Web Vitals

### Understanding Core Web Vitals

#### LCP (Largest Contentful Paint)
**Target**: <2.5 seconds
**What it measures**: How long main content takes to load
**How to improve**:
- Optimize images
- Minimize CSS/JS
- Use CDN (already using Vercel)
- Implement lazy loading

#### FID (First Input Delay)
**Target**: <100ms
**What it measures**: How long before page responds to user input
**How to improve**:
- Minimize JavaScript
- Break up long tasks
- Use web workers
- Optimize third-party scripts

#### CLS (Cumulative Layout Shift)
**Target**: <0.1
**What it measures**: Visual stability (unexpected layout shifts)
**How to improve**:
- Set image dimensions
- Reserve space for ads/embeds
- Avoid inserting content above existing content
- Use transform animations instead of layout-changing properties

### Monitoring Core Web Vitals
1. Go to **Core Web Vitals** report
2. Check URL status (Poor, Need Improvement, Good)
3. Click on issue type to see affected URLs
4. Fix issues and request validation

---

## Part 8: Security & Manual Actions

### Security Issues
Check **Security & Manual Actions** section regularly:
- Hacked content
- Malware
- Phishing
- Manual penalties

**If you see issues**:
1. Fix the underlying problem immediately
2. Request review
3. Change all passwords
4. Scan server for malware

### Manual Actions
If Google applies a manual penalty:
1. Read the explanation carefully
2. Fix all issues mentioned
3. Request reconsideration
4. Be detailed in your explanation

**Prevention**:
- Follow Google Webmaster Guidelines
- Never buy links
- Don't use cloaking or sneaky redirects
- Create genuine, valuable content

---

## Part 9: Links Report

### Internal Links
1. Go to **Links** → **Internal links**
2. Check:
   - Most linked pages (should be important pages)
   - Orphan pages (pages with no internal links)
   - Link equity distribution

**Action**: Improve internal linking to important pages

### External Links (Backlinks)
1. Go to **Links** → **External links**
2. Monitor:
   - Top linking sites
   - Top linked pages
   - Anchor text used

**Actions**:
- Disavow toxic links if found
- Reach out to linking sites for corrections
- Track link building progress

### Disavow Links (If Needed)
If you have spammy backlinks:
1. Create disavow file: `disavow.txt`
2. List toxic domains:
   \`\`\`
   # Spam links from bad sites
   domain:spamsite.com
   domain:anotherbadsite.com
   \`\`\`
3. Upload to **Disavow Links Tool**
4. Wait 2-4 weeks for effect

---

## Part 10: Rich Results & Structured Data

### Monitor Rich Results
1. Go to **Rich Results** (if available)
2. Check which pages qualify for:
   - FAQ snippets
   - How-to snippets
   - Article snippets
   - Video snippets
   - Breadcrumbs

### Test Structured Data
Use these tools:
1. [Rich Results Test](https://search.google.com/test/rich-results)
2. [Schema Markup Validator](https://validator.schema.org/)

**To test a page**:
1. Enter URL or code
2. Review detected structured data
3. Fix any errors
4. Retest until valid

### Common Schema Errors
- Missing required fields
- Invalid date format
- Incorrect image dimensions
- Missing @type or @context
- Nested schema errors

---

## Part 11: Weekly Monitoring Checklist

### Every Monday Morning
- [ ] Check Overview dashboard
- [ ] Review Performance report (clicks, impressions, CTR)
- [ ] Check for new Coverage issues
- [ ] Monitor Core Web Vitals
- [ ] Review top queries and pages
- [ ] Check for manual actions or security issues
- [ ] Document any major changes

### Data to Export Weekly
1. **Performance Data**
   - Last 28 days
   - Queries, pages, devices
   - Export as CSV

2. **Top Pages**
   - Sorted by clicks
   - Top 50 pages

3. **Top Queries**
   - Sorted by impressions
   - Top 100 keywords

---

## Part 12: Monthly Reporting Template

### SEO Performance Report - [Month Year]

#### Executive Summary
- Total organic clicks: [NUMBER] (+/- X% vs last month)
- Total impressions: [NUMBER] (+/- X% vs last month)
- Average CTR: [X.X]%
- Average position: [X.X]

#### Top Performers
**Best Pages** (by clicks)
1. Page 1 - [X] clicks
2. Page 2 - [X] clicks
3. Page 3 - [X] clicks

**Best Keywords** (by impressions)
1. Keyword 1 - [X] impressions, Position [X]
2. Keyword 2 - [X] impressions, Position [X]
3. Keyword 3 - [X] impressions, Position [X]

#### Issues & Actions
**Coverage Issues**: [X] errors, [X] warnings
- List specific issues
- Actions taken

**Core Web Vitals**: [X] URLs need improvement
- List problem pages
- Optimization plans

#### Next Month Goals
- Target: [X]% increase in organic traffic
- Focus keywords: [List]
- Pages to optimize: [List]
- Link building target: [X] new backlinks

---

## Part 13: Advanced Features

### URL Parameters
If you use URL parameters (tracking, filters):
1. Go to **Settings** → **URL Parameters**
2. Tell Google how to handle them
3. Options: Let Googlebot decide, or specify behavior

### International Targeting
If you expand internationally:
1. Go to **Settings** → **International Targeting**
2. Set hreflang tags
3. Specify target country

### Change of Address
If you move domains:
1. Set up 301 redirects from old to new
2. Use **Change of Address** tool in GSC
3. Keep both properties for 180 days

---

## Part 14: Integration with Other Tools

### Link with Google Analytics
1. In GSC, go to **Settings**
2. Click **Associate Google Analytics property**
3. Select your GA4 property
4. Approve connection

**Benefits**:
- See GSC data in GA4
- Better attribution
- Unified reporting

### Third-Party Integrations
Export GSC data to:
- **Data Studio**: Create custom dashboards
- **Google Sheets**: Automated reporting
- **SEO Tools**: Ahrefs, SEMrush can import GSC data

---

## Part 15: Troubleshooting Common Issues

### Problem: No Data Showing
**Solution**:
- Wait 24-48 hours after verification
- Check date range is correct
- Verify site has traffic
- Check if using correct property

### Problem: Sitemap Error
**Solution**:
- Test sitemap URL directly in browser
- Validate XML syntax
- Ensure all URLs are accessible
- Check for redirect chains

### Problem: Sudden Traffic Drop
**Investigation steps**:
1. Check Coverage report for indexing issues
2. Review Manual Actions
3. Check Core Web Vitals
4. Look for algorithm updates
5. Compare with Google Analytics data
6. Check competitors

### Problem: URLs Not Indexing
**Solutions**:
- Request indexing via URL Inspection
- Improve content quality
- Add more internal links
- Check robots.txt isn't blocking
- Verify page isn't noindexed
- Be patient (can take 2-4 weeks)

---

## Part 16: Best Practices

### Do's
✅ Check GSC weekly minimum
✅ Fix critical errors within 24 hours
✅ Keep sitemap updated
✅ Monitor Core Web Vitals monthly
✅ Track performance data in spreadsheet
✅ Request indexing for new important pages
✅ Validate structured data regularly
✅ Monitor backlink profile

### Don'ts
❌ Ignore error notifications
❌ Submit too many URLs for indexing (spam)
❌ Panic over small ranking fluctuations
❌ Delete old data (keep historical records)
❌ Ignore mobile usability issues
❌ Forget to check Security section
❌ Miss manual action notices

---

## Resources

### Official Google Documentation
- [Search Central](https://developers.google.com/search)
- [GSC Help Center](https://support.google.com/webmasters)
- [SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)

### Tools
- [Google Search Console](https://search.google.com/search-console)
- [URL Inspection Tool](https://search.google.com/search-console/url-inspection)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [PageSpeed Insights](https://pagespeed.web.dev/)

---

## Quick Reference

### Important URLs
- GSC Dashboard: `https://search.google.com/search-console`
- Sitemap: `https://ezvisa.net/sitemap.xml`
- Robots.txt: `https://ezvisa.net/robots.txt`

### Key Contacts
- **GSC Property Owner**: [email@example.com]
- **Technical Contact**: [dev@example.com]
- **SEO Manager**: [seo@example.com]

### Review Schedule
- **Daily**: Check for critical errors (automated email)
- **Weekly**: Performance review, data export
- **Monthly**: Comprehensive report, strategy review
- **Quarterly**: Full SEO audit, goal adjustment

---

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Next Review**: May 2026
