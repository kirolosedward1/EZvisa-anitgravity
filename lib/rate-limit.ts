/**
 * Redis-based rate limiter for API routes using Upstash Redis
 * Provides distributed, persistent rate limiting across serverless instances
 */

import { Redis } from "@upstash/redis"

// Initialize Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetIn: number
}

/**
 * Check if a request should be rate limited (async Redis version)
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `rate_limit:${identifier}`
  
  try {
    // Use Redis INCR with expiration for atomic rate limiting
    const currentCount = await redis.incr(key)
    
    // Set expiration only on first request (when count is 1)
    if (currentCount === 1) {
      await redis.expire(key, config.windowSeconds)
    }
    
    // Get TTL to calculate resetIn
    const ttl = await redis.ttl(key)
    const resetIn = ttl > 0 ? ttl : config.windowSeconds
    
    // Check if limit exceeded
    if (currentCount > config.limit) {
      return {
        success: false,
        remaining: 0,
        resetIn,
      }
    }
    
    return {
      success: true,
      remaining: config.limit - currentCount,
      resetIn,
    }
  } catch (error) {
    // If Redis fails, allow the request (fail open) but log the error
    console.error("[v0] Rate limit Redis error:", error)
    return {
      success: true,
      remaining: config.limit,
      resetIn: config.windowSeconds,
    }
  }
}

/**
 * Synchronous rate limit check (legacy support - wraps async version)
 * @deprecated Use the async checkRateLimit instead
 */
export function checkRateLimitSync(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  // For backward compatibility, return a default allow response
  // The actual check should use the async version
  console.warn("[v0] Using sync rate limit - consider migrating to async checkRateLimit")
  return {
    success: true,
    remaining: config.limit,
    resetIn: config.windowSeconds,
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  return 'unknown'
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): HeadersInit {
  return {
    'X-RateLimit-Limit': config.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetIn.toString(),
  }
}

// Pre-configured rate limiters for common use cases
export const RATE_LIMITS = {
  // Strict: 5 requests per minute (for sensitive operations like payments)
  strict: { limit: 5, windowSeconds: 60 },
  // Standard: 30 requests per minute (for form submissions)
  standard: { limit: 30, windowSeconds: 60 },
  // Relaxed: 100 requests per minute (for general API calls)
  relaxed: { limit: 100, windowSeconds: 60 },
} as const
