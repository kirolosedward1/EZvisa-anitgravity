// Content-Security-Policy (legal audit, Low). Report-Only first: violations show in the browser console
// without blocking anything. Switch the header key to 'Content-Security-Policy' once it runs clean.
const SUPABASE = 'https://dravvaykssrbktztmrlj.supabase.co'
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://client.crisp.chat https://settings.crisp.chat https://va.vercel-scripts.com https://vercel.live https://accounts.google.com https://apis.google.com",
  "style-src 'self' 'unsafe-inline' https://client.crisp.chat https://fonts.googleapis.com https://accounts.google.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://client.crisp.chat https://fonts.gstatic.com",
  `connect-src 'self' ${SUPABASE} wss://dravvaykssrbktztmrlj.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://stats.g.doubleclick.net https://client.crisp.chat https://storage.crisp.chat wss://client.relay.crisp.chat wss://stream.relay.crisp.chat https://*.ziina.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://vercel.live wss://ws-us3.pusher.com https://accounts.google.com`,
  "frame-src 'self' https://www.googletagmanager.com https://*.ziina.com https://accounts.google.com https://www.youtube.com https://www.youtube-nocookie.com https://game.crisp.chat https://vercel.live",
  "media-src 'self' blob: https://videos.pexels.com https://client.crisp.chat",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' https://*.ziina.com https://accounts.google.com ${SUPABASE}`,
  "frame-ancestors 'self'",
  // Where violations are sent (WebKit warns and ignores a report-only policy without one).
  "report-uri /api/csp-report",
  "report-to csp",
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Footer copyright year: fixed per build so server and client never render different text (hydration #418).
  env: { NEXT_PUBLIC_BUILD_YEAR: String(new Date().getUTCFullYear()) },
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns', 'recharts'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 31536000,
  },
  async redirects() {
    // /reviews (hardcoded testimonials) was removed; keep old links working.
    return [
      { source: '/reviews', destination: '/', permanent: true },
      { source: '/ar/reviews', destination: '/ar', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/flags/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Reporting-Endpoints',
            value: 'csp="/api/csp-report"',
          },
          {
            key: 'Content-Security-Policy-Report-Only',
            value: csp,
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  },
}

export default nextConfig
