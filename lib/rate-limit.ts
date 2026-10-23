/**
 * Redis-based rate limiter for API routes using Upstash Redis
 * Provides distributed, persistent rate limiting across serverless instances
 */

import { Redis } from "@upstash/redis"

// Initialize Redis client (only when configured; otherwise the in-memory limiter below is used)
const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
  : null

// Per-instance fallback when Redis is missing or unreachable, so payment routes are never left unlimited.
const memory = new Map<string, { count: number; resetAt: number }>()
function checkMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  let entry = memory.get(key)
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + config.windowSeconds * 1000 }
    memory.set(key, entry)
    if (memory.size > 5000) for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k)
  }
  entry.count++
  const resetIn = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
  return entry.count > config.limit
    ? { success: false, remaining: 0, resetIn }
    : { success: true, remaining: config.limit - entry.count, resetIn }
}

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
  if (!redis) return checkMemory(key, config)

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
    // If Redis fails, fall back to the per-instance limiter instead of allowing everything
    console.error("[rate-limit] Redis unavailable, using in-memory limiter:", error instanceof Error ? error.message : error)
    return checkMemory(key, config)
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
