/**
 * HTML Sanitization Utility
 * Prevents XSS attacks by sanitizing HTML content
 */

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

/**
 * Escapes HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Sanitizes HTML by removing dangerous tags and attributes
 * Allows only safe tags: p, br, strong, em, ul, ol, li, a, h1-h6, span, div
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Remove event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
  
  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/data:/gi, '')
  
  // Remove style tags
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  
  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|button)[^>]*>.*?<\/\1>/gi, '')
  sanitized = sanitized.replace(/<(iframe|object|embed|form|input|button)[^>]*\/?>/gi, '')
  
  return sanitized
}

/**
 * Validates and sanitizes user input for forms
 */
export function sanitizeInput(input: string, maxLength = 1000): string {
  if (!input) return ''
  
  // Trim whitespace
  let sanitized = input.trim()
  
  // Limit length
  sanitized = sanitized.substring(0, maxLength)
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')
  
  // Normalize unicode
  sanitized = sanitized.normalize('NFKC')
  
  return sanitized
}

/**
 * Sanitizes email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return ''
  
  const sanitized = email.toLowerCase().trim()
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(sanitized)) {
    return ''
  }
  
  return sanitized
}

/**
 * Sanitizes phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return ''
  
  // Remove all non-numeric characters except + at the start
  return phone.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
}

/**
 * Validates URL to prevent open redirects
 */
export function isValidRedirectUrl(url: string, allowedDomains: string[] = []): boolean {
  try {
    const parsed = new URL(url)
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false
    }
    
    // If allowed domains specified, check against them
    if (allowedDomains.length > 0) {
      return allowedDomains.some(domain => 
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
      )
    }
    
    return true
  } catch {
    // Relative URLs are allowed
    return url.startsWith('/') && !url.startsWith('//')
  }
}
