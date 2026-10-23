import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /_next/ is not blocked: crawlers need the JS and CSS to render pages.
        disallow: ['/api/', '/admin/', '/private/', '/payment-success', '/payment-failed', '/track/', '/dashboard', '/account'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/payment-success', '/payment-failed', '/track/', '/dashboard', '/account'],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: '/',
      },
    ],
    sitemap: 'https://www.ezvisa.net/sitemap.xml',
    host: 'https://www.ezvisa.net',
  }
}
