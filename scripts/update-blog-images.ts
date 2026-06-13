/**
 * Script to update blog posts with featured and inline images
 * 
 * This script enhances blog posts by:
 * 1. Adding featured images for posts that don't have them
 * 2. Inserting inline images at strategic points in the content
 * 3. Ensuring all images have proper alt text and are optimized
 * 
 * Usage: Run specific functions to update individual posts or batch update
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Image mapping for each post category and topic
const imageLibrary = {
  // Visa Guide Images
  visaApplication: '/images/blog/visa-application-form-passport.jpg',
  visaDocuments: '/images/blog/visa-documents-checklist.jpg',
  visaInterview: '/images/blog/visa-interview-embassy.jpg',
  visaRejection: '/images/blog/visa-rejection-appeal-documents.jpg',
  visaInsurance: '/images/blog/travel-insurance-policy-documents.jpg',
  bankStatement: '/images/blog/bank-statement-financial-proof.jpg',
  multipleEntry: '/images/blog/passport-multiple-visa-stamps.jpg',
  processingTime: '/images/blog/calendar-waiting-time-visa.jpg',
  firstTimer: '/images/blog/first-time-traveler-passport-new.jpg',
  visaFees: '/euro-currency-money-travel-budget-planning.jpg',
  
  // Travel Tips Images
  europeanCities: '/images/blog/european-cities-skyline-collage.jpg',
  itinerary: '/images/blog/europe-map-route-planning.jpg',
  budgetTravel: '/images/blog/budget-travel-europe-backpacker.jpg',
  hiddenGems: '/images/blog/hidden-european-village-authentic.jpg',
  autumnTravel: '/images/blog/autumn-europe-fall-colors-landscape.jpg',
  
  // General inline images
  passportStamps: '/passport-with-schengen-visa-stamp-europe-travel.jpg',
  schengenArea: '/schengen-visa-passport-europe.jpg',
  embassyBuilding: '/images/blog/embassy-consulate-building-exterior.jpg',
  travelDocuments: '/visa-documents-checklist-passport.jpg',
}

// Post-specific image configurations
const postImageConfigs: Record<string, {
  featuredImage: string
  inlineImages: Array<{ insertAfter: string; image: string; alt: string }>
}> = {
  'schengen-visa-rejection-reasons-reapply': {
    featuredImage: imageLibrary.visaRejection,
    inlineImages: [
      {
        insertAfter: '## Common Reasons for Schengen Visa Rejection',
        image: imageLibrary.visaDocuments,
        alt: 'Common visa rejection reasons with documents spread on desk'
      },
      {
        insertAfter: '## How to Reapply Successfully',
        image: imageLibrary.visaApplication,
        alt: 'Person filling out visa reapplication form carefully'
      }
    ]
  },
  'schengen-travel-insurance-requirements-guide': {
    featuredImage: imageLibrary.visaInsurance,
    inlineImages: [
      {
        insertAfter: '## What is Schengen Travel Insurance?',
        image: imageLibrary.visaInsurance,
        alt: 'Travel insurance policy document with Schengen visa requirements'
      }
    ]
  },
  'bank-statement-requirements-schengen-visa': {
    featuredImage: imageLibrary.bankStatement,
    inlineImages: [
      {
        insertAfter: '## How Much Money Do You Need?',
        image: '/images/blog/euro-currency-money-calculator.jpg',
        alt: 'Euro currency notes with calculator showing financial requirements'
      }
    ]
  },
  'multiple-entry-schengen-visa-how-to-get': {
    featuredImage: imageLibrary.multipleEntry,
    inlineImages: [
      {
        insertAfter: '## Types of Multiple Entry Visas',
        image: imageLibrary.passportStamps,
        alt: 'Passport with multiple Schengen visa stamps'
      }
    ]
  },
  'schengen-visa-processing-time-how-long': {
    featuredImage: imageLibrary.processingTime,
    inlineImages: [
      {
        insertAfter: '## Standard Processing Times',
        image: '/images/blog/calendar-visa-appointment-schedule.jpg',
        alt: 'Calendar marking visa processing timeline'
      }
    ]
  },
  'first-time-schengen-visa-applicant-guide': {
    featuredImage: imageLibrary.firstTimer,
    inlineImages: [
      {
        insertAfter: '## Step-by-Step Application Process',
        image: imageLibrary.visaApplication,
        alt: 'First-time applicant with passport and application form'
      },
      {
        insertAfter: '## Required Documents',
        image: imageLibrary.travelDocuments,
        alt: 'Complete visa document checklist laid out'
      }
    ]
  },
  'best-european-cities-visit-summer-2026': {
    featuredImage: imageLibrary.europeanCities,
    inlineImages: [
      {
        insertAfter: '## Top 15 Cities',
        image: '/images/blog/paris-eiffel-tower-summer.jpg',
        alt: 'Paris Eiffel Tower during beautiful summer day'
      }
    ]
  },
  '10-day-europe-itinerary-first-timers': {
    featuredImage: imageLibrary.itinerary,
    inlineImages: [
      {
        insertAfter: '## Day-by-Day Itinerary',
        image: '/images/blog/europe-travel-route-map.jpg',
        alt: 'Europe travel route map with highlighted cities'
      }
    ]
  },
  'budget-europe-travel-guide-affordable-cities': {
    featuredImage: imageLibrary.budgetTravel,
    inlineImages: [
      {
        insertAfter: '## 20 Affordable Cities',
        image: '/images/blog/budget-accommodation-hostel-europe.jpg',
        alt: 'Affordable European hostel accommodation'
      }
    ]
  },
  'hidden-gems-europe-underrated-cities': {
    featuredImage: imageLibrary.hiddenGems,
    inlineImages: [
      {
        insertAfter: '## 12 Hidden Gems',
        image: '/images/blog/charming-european-old-town-authentic.jpg',
        alt: 'Charming old town in lesser-known European city'
      }
    ]
  },
  'europe-autumn-fall-travel-guide': {
    featuredImage: imageLibrary.autumnTravel,
    inlineImages: [
      {
        insertAfter: '## Best Places to Visit',
        image: '/images/blog/autumn-vineyard-europe-fall-colors.jpg',
        alt: 'European vineyard with beautiful autumn colors'
      }
    ]
  }
}

/**
 * Insert inline images into post content
 */
function insertInlineImages(content: string, images: Array<{ insertAfter: string; image: string; alt: string }>): string {
  let updatedContent = content

  for (const { insertAfter, image, alt } of images) {
    const lines = updatedContent.split('\n')
    const insertIndex = lines.findIndex(line => line.includes(insertAfter))
    
    if (insertIndex !== -1) {
      // Insert image after the heading and a blank line
      const imageMarkdown = `\n![${alt}](${image})\n`
      lines.splice(insertIndex + 1, 0, imageMarkdown)
      updatedContent = lines.join('\n')
    }
  }

  return updatedContent
}

/**
 * Update a single post with images
 */
async function updatePostImages(slug: string) {
  const config = postImageConfigs[slug]
  if (!config) {
    console.log(`No image configuration found for: ${slug}`)
    return
  }

  // Get current post
  const { data: post, error: fetchError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single()

  if (fetchError || !post) {
    console.error(`Error fetching post ${slug}:`, fetchError)
    return
  }

  // Update content with inline images
  const updatedContent = insertInlineImages(post.content, config.inlineImages)

  // Update post with featured image and enhanced content
  const { error: updateError } = await supabase
    .from('blog_posts')
    .update({
      featured_image: config.featuredImage,
      content: updatedContent,
      updated_at: new Date().toISOString()
    })
    .eq('slug', slug)

  if (updateError) {
    console.error(`Error updating post ${slug}:`, updateError)
  } else {
    console.log(`✅ Successfully updated post: ${slug}`)
    console.log(`   - Featured image: ${config.featuredImage}`)
    console.log(`   - Inline images: ${config.inlineImages.length}`)
  }
}

/**
 * Update all posts that need images
 */
async function updateAllPosts() {
  const slugs = Object.keys(postImageConfigs)
  
  console.log(`Updating ${slugs.length} blog posts with images...\n`)
  
  for (const slug of slugs) {
    await updatePostImages(slug)
  }
  
  console.log(`\n✅ Finished updating all posts`)
}

/**
 * List all posts and their current image status
 */
async function auditPostImages() {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('slug, title, featured_image')
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching posts:', error)
    return
  }

  console.log('\n📊 Blog Post Image Audit:\n')
  
  let withImages = 0
  let withoutImages = 0
  let withPlaceholders = 0

  posts?.forEach((post) => {
    if (!post.featured_image) {
      console.log(`❌ ${post.slug}`)
      withoutImages++
    } else if (post.featured_image.includes('placeholder')) {
      console.log(`⚠️  ${post.slug} (placeholder)`)
      withPlaceholders++
    } else {
      console.log(`✅ ${post.slug}`)
      withImages++
    }
  })

  console.log(`\nSummary:`)
  console.log(`✅ With images: ${withImages}`)
  console.log(`⚠️  With placeholders: ${withPlaceholders}`)
  console.log(`❌ Without images: ${withoutImages}`)
  console.log(`📝 Total posts: ${posts?.length}`)
}

// Export functions for use
export { updatePostImages, updateAllPosts, auditPostImages }

// Run if executed directly
if (require.main === module) {
  const command = process.argv[2]
  
  if (command === 'audit') {
    auditPostImages()
  } else if (command === 'update-all') {
    updateAllPosts()
  } else if (command === 'update') {
    const slug = process.argv[3]
    if (slug) {
      updatePostImages(slug)
    } else {
      console.log('Please provide a slug: npm run update-blog-images update <slug>')
    }
  } else {
    console.log('Usage:')
    console.log('  npm run update-blog-images audit       - Show image status')
    console.log('  npm run update-blog-images update-all  - Update all posts')
    console.log('  npm run update-blog-images update <slug> - Update specific post')
  }
}
