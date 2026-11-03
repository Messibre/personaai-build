import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const timingSafeEqualSpy = vi.hoisted(() => vi.fn())

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>()
  timingSafeEqualSpy.mockImplementation(actual.timingSafeEqual)
  return { ...actual, timingSafeEqual: timingSafeEqualSpy }
})

import { checkBetaGate } from "@/lib/security/beta-gate"
import { withGuards } from "@/lib/security/guard"

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/x", { method: "POST", headers })
}

const ok = async () => Response.json({ ok: true })

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe("checkBetaGate", () => {
  it("is open when BETA_ACCESS_CODE is unset or empty", () => {
    vi.stubEnv("BETA_ACCESS_CODE", "")
    expect(checkBetaGate(req())).toBeNull()
    expect(checkBetaGate(req({ "x-beta-code": "anything" }))).toBeNull()
  })

  it("accepts the right code", () => {
    vi.stubEnv("BETA_ACCESS_CODE", "s3cret")
    expect(checkBetaGate(req({ "x-beta-code": "s3cret" }))).toBeNull()
  })

  it("answers missing and wrong codes identically with 401", async () => {
    vi.stubEnv("BETA_ACCESS_CODE", "s3cret")
    const missing = checkBetaGate(req())
    const wrong = checkBetaGate(req({ "x-beta-code": "nope" }))
    expect(missing?.status).toBe(401)
    expect(wrong?.status).toBe(401)
    const missingBody = await missing?.text()
    expect(missingBody).toBe(await wrong?.text())
    expect(missingBody).not.toContain("s3cret")
  })

  it("compares with timingSafeEqual, including when lengths differ", () => {
    vi.stubEnv("BETA_ACCESS_CODE", "s3cret")
    timingSafeEqualSpy.mockClear()
    expect(checkBetaGate(req({ "x-beta-code": "x" }))?.status).toBe(401)
    expect(timingSafeEqualSpy).toHaveBeenCalledTimes(1)
  })
})

describe("withGuards", () => {
  beforeEach(() => {
    vi.stubEnv("BETA_ACCESS_CODE", "")
  })

  it("passes requests through under the limit and returns 429 with Retry-After over it", async () => {
    const guarded = withGuards(ok, { route: "t", max: 2, windowMs: 60_000 })
    expect((await guarded(req())).status).toBe(200)
    expect((await guarded(req())).status).toBe(200)

    const blocked = await guarded(req())
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0)
    expect(await blocked.json()).toMatchObject({ code: "too_many_requests" })
  })

  it("limits each client separately", async () => {
    const guarded = withGuards(ok, { route: "t", max: 1, windowMs: 60_000 })
    expect((await guarded(req({ "x-forwarded-for": "1.1.1.1" }))).status).toBe(200)
    expect((await guarded(req({ "x-forwarded-for": "2.2.2.2" }))).status).toBe(200)
    expect((await guarded(req({ "x-forwarded-for": "1.1.1.1" }))).status).toBe(429)
  })

  it("recovers after the window", async () => {
    vi.useFakeTimers()
    const guarded = withGuards(ok, { route: "t", max: 1, windowMs: 1_000 })
    expect((await guarded(req())).status).toBe(200)
    expect((await guarded(req())).status).toBe(429)
    vi.advanceTimersByTime(1_001)
    expect((await guarded(req())).status).toBe(200)
  })

  it("checks the beta gate before the handler runs", async () => {
    vi.stubEnv("BETA_ACCESS_CODE", "s3cret")
    const handler = vi.fn(ok)
    const guarded = withGuards(handler, { route: "t", max: 5, windowMs: 60_000 })

    expect((await guarded(req())).status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
    expect((await guarded(req({ "x-beta-code": "s3cret" }))).status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it("does not spend rate-limit budget on refused (401) requests", async () => {
    vi.stubEnv("BETA_ACCESS_CODE", "s3cret")
    const guarded = withGuards(ok, { route: "t", max: 1, windowMs: 60_000 })
    await guarded(req())
    await guarded(req())
    expect((await guarded(req({ "x-beta-code": "s3cret" }))).status).toBe(200)
  })
})
