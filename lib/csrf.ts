/**
 * CSRF Protection Utility
 * Validates origin and referer headers for API routes
 */

const ALLOWED_ORIGINS = [
  'https://ezvisa.net',
  'https://www.ezvisa.net',
  'http://localhost:3000',
  'http://localhost:3001',
]

// Add Vercel preview URLs dynamically
const VERCEL_URL = process.env.VERCEL_URL
if (VERCEL_URL) {
  ALLOWED_ORIGINS.push(`https://${VERCEL_URL}`)
}

/**
 * Validates that the request comes from an allowed origin
 */
export function validateOrigin(request: Request): { valid: boolean; error?: string } {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  // For same-origin requests, origin might be null
  if (!origin && !referer) {
    // Allow requests without origin/referer in development
    if (process.env.NODE_ENV === 'development') {
      return { valid: true }
    }
    return { valid: false, error: 'Missing origin header' }
  }
  
  const requestOrigin = origin || (referer ? new URL(referer).origin : null)
  
  if (!requestOrigin) {
    return { valid: false, error: 'Could not determine request origin' }
  }
  
  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.some(allowed => 
    requestOrigin === allowed || 
    requestOrigin.endsWith('.vercel.app') ||
    requestOrigin.endsWith('.ezvisa.net')
  )
  
  if (!isAllowed) {
    return { valid: false, error: `Origin not allowed: ${requestOrigin}` }
  }
  
  return { valid: true }
}

/**
 * Middleware-style CSRF check that can be used in API routes
 */
export function csrfProtection(request: Request): Response | null {
  const validation = validateOrigin(request)
  
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ error: 'CSRF validation failed', message: validation.error }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  return null // Validation passed
}
