// Simple in-memory rate limiter
// Not perfect for distributed serverless but provides basic burst protection
// Upgrade to Upstash Redis for production scale

type RateLimitEntry = { count: number; resetAt: number }
const store = new Map<string, RateLimitEntry>()

type Options = {
  limit: number      // max requests
  windowMs: number   // time window in ms
}

export function rateLimit(key: string, options: Options): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true, remaining: options.limit - 1 }
  }

  if (entry.count >= options.limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: options.limit - entry.count }
}
