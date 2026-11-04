import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clientKey, createRateLimiter } from "@/lib/security/rate-limit"

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("createRateLimiter", () => {
  it("allows up to max requests then refuses with a retry delay", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 })
    expect(limiter.check("a").allowed).toBe(true)
    expect(limiter.check("a").allowed).toBe(true)
    expect(limiter.check("a").allowed).toBe(true)

    vi.advanceTimersByTime(10_000)
    const blocked = limiter.check("a")
    expect(blocked.allowed).toBe(false)
    if (!blocked.allowed) expect(blocked.retryAfterSeconds).toBe(50)
  })

  it("allows again once the window has passed", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 })
    expect(limiter.check("a").allowed).toBe(true)
    expect(limiter.check("a").allowed).toBe(false)
    vi.advanceTimersByTime(60_001)
    expect(limiter.check("a").allowed).toBe(true)
  })

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 })
    expect(limiter.check("a").allowed).toBe(true)
    expect(limiter.check("b").allowed).toBe(true)
    expect(limiter.check("a").allowed).toBe(false)
  })

  it("never tracks more than maxKeys", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 5, maxKeys: 50 })
    for (let i = 0; i < 500; i++) limiter.check(`k${i}`)
    expect(limiter.size()).toBeLessThanOrEqual(50)
  })

  it("evicts the least recently used key first when over the cap", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, maxKeys: 2 })
    limiter.check("a")
    limiter.check("b")
    limiter.check("a") // refreshes a, so b is now the oldest
    limiter.check("c")
    expect(limiter.size()).toBe(2)
    expect(limiter.check("b").allowed).toBe(true) // b was evicted, so it starts fresh
  })

  it("sweeps expired keys", () => {
    const limiter = createRateLimiter({ windowMs: 1_000, max: 5 })
    for (let i = 0; i < 20; i++) limiter.check(`k${i}`)
    vi.advanceTimersByTime(2_000)
    limiter.check("fresh")
    expect(limiter.size()).toBe(1)
  })
})

describe("clientKey", () => {
  const request = (headers: Record<string, string>) => new Request("http://localhost/x", { headers })

  it("hashes the first forwarded address and includes the route", () => {
    const key = clientKey(request({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }), "tailor/analyze")
    expect(key).toMatch(/^tailor\/analyze:[0-9a-f]{64}$/)
    expect(key).not.toContain("203.0.113.9")
  })

  it("is stable per address and differs across addresses and routes", () => {
    const a = clientKey(request({ "x-forwarded-for": "203.0.113.9" }), "r")
    expect(clientKey(request({ "x-forwarded-for": "203.0.113.9, 1.1.1.1" }), "r")).toBe(a)
    expect(clientKey(request({ "x-forwarded-for": "203.0.113.10" }), "r")).not.toBe(a)
    expect(clientKey(request({ "x-forwarded-for": "203.0.113.9" }), "s")).not.toBe(a)
  })

  it("falls back to one shared bucket when no address is present", () => {
    expect(clientKey(request({}), "r")).toBe(clientKey(request({ "x-forwarded-for": "" }), "r"))
  })
})
