/**
 * Redis-based rate limiter for API routes using Upstash Redis.
 * The client is created only when KV_REST_API_URL is an https URL and the token is set.
 */

import { Redis } from "@upstash/redis"

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

export interface RateLimitOptions {
  /**
   * What to do when Redis throws or times out.
   * "open" allows the request. "memory" applies an in-memory window with the same limit.
   * Default is "open".
   */
  onError?: "open" | "memory"
  /** Give up on Redis after this many milliseconds and take the onError path. */
  timeoutMs?: number
}

let redis: Redis | null = null
let rateLimitDisabledWarned = false

const memoryBuckets = new Map<string, { count: number; resetAt: number }>()

function warnRateLimitDisabled() {
  if (rateLimitDisabledWarned) return
  rateLimitDisabledWarned = true
  console.warn(
    "[v0] Rate limiting is disabled. KV_REST_API_URL must start with https:// and KV_REST_API_TOKEN must be non-empty.",
  )
}

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN?.trim() ?? ""
  if (!url?.startsWith("https://") || token.length === 0) {
    warnRateLimitDisabled()
    return null
  }
  if (!redis) {
    redis = new Redis({ url, token })
  }
  return redis
}

function allow(config: RateLimitConfig): RateLimitResult {
  return {
    success: true,
    remaining: config.limit,
    resetIn: config.windowSeconds,
  }
}

function memoryLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  if (memoryBuckets.size > 1000) {
    for (const [key, bucket] of memoryBuckets) {
      if (bucket.resetAt <= now) memoryBuckets.delete(key)
    }
  }

  let bucket = memoryBuckets.get(identifier)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + config.windowSeconds * 1000 }
    memoryBuckets.set(identifier, bucket)
  }

  bucket.count += 1
  const resetIn = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  if (bucket.count > config.limit) {
    return { success: false, remaining: 0, resetIn }
  }
  return {
    success: true,
    remaining: config.limit - bucket.count,
    resetIn,
  }
}

function resultFromCount(count: number, ttl: number, config: RateLimitConfig): RateLimitResult {
  const resetIn = ttl > 0 ? ttl : config.windowSeconds
  if (count > config.limit) {
    return { success: false, remaining: 0, resetIn }
  }
  return {
    success: true,
    remaining: Math.max(0, config.limit - count),
    resetIn,
  }
}

async function readRedisLimit(
  client: Redis,
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const key = `rate_limit:${identifier}`
  // One transaction: increment, set the window only if the key has no TTL yet, then read that TTL.
  const [count, , ttl] = await client
    .multi()
    .incr(key)
    .expire(key, config.windowSeconds, "NX")
    .ttl(key)
    .exec()

  const currentCount = Number(count)
  if (!Number.isFinite(currentCount)) {
    throw new Error("Rate limit Redis returned a non-numeric count")
  }
  return resultFromCount(currentCount, Number(ttl), config)
}

/**
 * Check if a request should be rate limited (async Redis version)
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  options?: RateLimitOptions,
): Promise<RateLimitResult> {
  const onError = options?.onError ?? "open"
  const client = getRedis()
  if (!client) return allow(config)

  let redisResult: RateLimitResult | undefined
  let redisError: unknown
  const settled = readRedisLimit(client, identifier, config).then(
    (result) => {
      redisResult = result
    },
    (error: unknown) => {
      redisError = error
    },
  )

  const timeoutMs = options?.timeoutMs
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    if (timeoutMs != null && timeoutMs > 0) {
      await Promise.race([
        settled,
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, timeoutMs)
        }),
      ])
    } else {
      await settled
    }

    if (redisError) throw redisError
    if (redisResult) return redisResult
    throw new Error(`Rate limit Redis timed out after ${timeoutMs}ms`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown"
    if (onError === "memory") {
      console.warn(`[v0] Rate limit Redis error; using in-memory limiter. ${message}`)
      return memoryLimit(identifier, config)
    }
    console.warn(`[v0] Rate limit Redis error; allowing request. ${message}`)
    return allow(config)
  } finally {
    if (timer) clearTimeout(timer)
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
