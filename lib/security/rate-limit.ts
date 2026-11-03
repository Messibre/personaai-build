import { createHash } from "node:crypto"

/** Hard cap on tracked keys so memory cannot grow without bound. */
export const MAX_TRACKED_KEYS = 10_000

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number }

export type RateLimiter = {
  check(key: string): RateLimitResult
  /** Number of keys currently tracked. */
  size(): number
}

export type RateLimiterOptions = {
  windowMs: number
  max: number
  maxKeys?: number
}

/**
 * In-memory sliding-window limiter.
 *
 * Best-effort only: on serverless platforms each instance keeps its own map and instances are
 * recycled at will, so the effective limit is per warm instance, not global. It protects the
 * model quota from accidental loops and casual abuse; it is not a substitute for a shared store.
 */
export function createRateLimiter({ windowMs, max, maxKeys = MAX_TRACKED_KEYS }: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>()
  let lastSweep = Date.now()

  function sweep(now: number): void {
    const cutoff = now - windowMs
    for (const [key, stamps] of hits) {
      if (stamps.length === 0 || stamps[stamps.length - 1] <= cutoff) hits.delete(key)
    }
    lastSweep = now
  }

  function enforceCap(now: number): void {
    if (hits.size <= maxKeys) return
    sweep(now)
    // Map iteration follows insertion order and keys are re-inserted on use, so the first key is the least recently used.
    for (const key of hits.keys()) {
      if (hits.size <= maxKeys) break
      hits.delete(key)
    }
  }

  return {
    check(key) {
      const now = Date.now()
      if (now - lastSweep >= windowMs) sweep(now)

      const cutoff = now - windowMs
      const recent = (hits.get(key) ?? []).filter((stamp) => stamp > cutoff)

      if (recent.length >= max) {
        hits.delete(key)
        hits.set(key, recent)
        const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000))
        return { allowed: false, retryAfterSeconds }
      }

      recent.push(now)
      hits.delete(key)
      hits.set(key, recent)
      enforceCap(now)
      return { allowed: true }
    },
    size() {
      return hits.size
    },
  }
}

/**
 * Limiter key: SHA-256 of the first x-forwarded-for entry (or "unknown") combined with the route name.
 * The raw address is never stored. On Vercel the platform sets x-forwarded-for; elsewhere a client can spoof it.
 */
export function clientKey(request: Request, route: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const address = forwarded ? forwarded : "unknown"
  const digest = createHash("sha256").update(address).digest("hex")
  return `${route}:${digest}`
}
