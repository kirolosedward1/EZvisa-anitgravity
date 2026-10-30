import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /_next/ is not blocked: crawlers need the JS and CSS to render pages.
        disallow: ['/api/', '/private/', '/payment-success', '/payment-failed', '/track/', '/dashboard', '/account', '/appointment'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/payment-success', '/payment-failed', '/track/', '/dashboard', '/account', '/appointment'],
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
