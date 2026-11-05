import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { computeLoopMetrics } from "@/lib/metrics/return-loop"
import type { Vault } from "@/lib/schemas/vault"
import { recordApplication } from "@/lib/vault/applications"
import { createEmptyVault } from "@/lib/vault/ops"
import { JOBS, isolatedEnv, vaultRequest } from "../helpers/e2e"

import { PUT as putVault } from "@/app/api/vault/[id]/route"
import { GET as adminMetrics } from "@/app/api/admin/metrics/route"

const T0 = Date.parse("2026-05-01T09:00:00.000Z")
const MINUTE = 60_000

async function record(vault: Vault, at: number, jobText: string, jobTitle: string): Promise<Vault> {
  vi.setSystemTime(at)
  return recordApplication(vault, { jobTitle, jobText })
}

describe("J6: the return loop is counted from distinct postings over time", () => {
  beforeEach(() => {
    isolatedEnv({ ADMIN_TOKEN: "admin-e2e-token" })
    vi.useFakeTimers({ toFake: ["Date"] })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it("classifies returned, same-sitting and repeat-posting users, and the admin route agrees", async () => {
    vi.setSystemTime(T0)
    let returner = createEmptyVault("Returning User")
    let sitter = createEmptyVault("Same Sitting User")
    let repeater = createEmptyVault("Repeat Posting User")

    returner = await record(returner, T0, JOBS.ux, "UX Engineer")
    returner = await record(returner, T0 + 2 * 60 * MINUTE, JOBS.ai, "AI Engineer")

    sitter = await record(sitter, T0, JOBS.ux, "UX Engineer")
    sitter = await record(sitter, T0 + 10 * MINUTE, JOBS.frontend, "Frontend Engineer")

    repeater = await record(repeater, T0, JOBS.ux, "UX Engineer")
    repeater = await record(repeater, T0 + 3 * 60 * MINUTE, JOBS.ux, "UX Engineer")
    expect(repeater.applications).toHaveLength(1)

    const now = T0 + 24 * 60 * MINUTE
    const metrics = computeLoopMetrics([returner, sitter, repeater], now)
    const statusByName = Object.fromEntries(metrics.perUser.map((user) => [user.name, user.status]))
    expect(statusByName).toEqual({ "Returning User": "returned", "Same Sitting User": "same_sitting", "Repeat Posting User": "one" })
    expect(metrics.returners).toBe(1)
    expect(metrics.sameSittingSecond).toBe(1)

    vi.setSystemTime(now)
    for (const vault of [returner, sitter, repeater]) {
      expect((await putVault(...vaultRequest("PUT", vault.id, vault))).status).toBe(200)
    }

    expect((await adminMetrics(new Request("http://localhost/api/admin/metrics"))).status).toBe(401)
    const response = await adminMetrics(new Request("http://localhost/api/admin/metrics", { headers: { authorization: "Bearer admin-e2e-token" } }))
    expect(response.status).toBe(200)
    const raw = await response.text()
    for (const vault of [returner, sitter, repeater]) expect(raw).not.toContain(vault.id)
    const body = JSON.parse(raw) as { metrics?: { returners: number; sameSittingSecond: number }; returners?: number; sameSittingSecond?: number }
    const served = body.metrics ?? body
    expect(served.returners).toBe(1)
    expect(served.sameSittingSecond).toBe(1)
  })
})
