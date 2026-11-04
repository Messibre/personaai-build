import { describe, expect, it } from "vitest"
import { POST as analyze } from "@/app/api/tailor/analyze/route"
import { POST as generate } from "@/app/api/tailor/generate/route"
import { MAX_BODY_BYTES } from "@/lib/tailor/requests"
import { G_MODULE_NOT_MERGED } from "@/lib/tailor/stubs"
import { loadAlexVault, POSTING, uxJob, uxPicks } from "./helpers"

function post(handler: (request: Request) => Promise<Response>, body: string) {
  return handler(new Request("http://localhost/api/tailor", { method: "POST", body, headers: { "Content-Type": "application/json" } }))
}

describe("/api/tailor/analyze", () => {
  it("rejects invalid JSON and invalid bodies with 400", async () => {
    expect((await post(analyze, "{nope")).status).toBe(400)
    expect((await post(analyze, JSON.stringify({ postingText: POSTING }))).status).toBe(400)
    expect((await post(analyze, JSON.stringify({ vault: loadAlexVault(), postingText: POSTING, extra: 1 }))).status).toBe(400)
  })

  it("rejects an oversize body with 413", async () => {
    const response = await post(analyze, JSON.stringify({ pad: "x".repeat(MAX_BODY_BYTES + 10) }))
    expect(response.status).toBe(413)
  })

  it("rejects a short posting with 400 before any model call", async () => {
    const response = await post(analyze, JSON.stringify({ vault: loadAlexVault(), postingText: "too short" }))
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("too_short")
  })

  it("answers 503 without leaking internals while G modules are stubs", async () => {
    const response = await post(analyze, JSON.stringify({ vault: loadAlexVault(), postingText: POSTING }))
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain(G_MODULE_NOT_MERGED)
  })
})

describe("/api/tailor/generate", () => {
  const base = { vault: loadAlexVault(), job: uxJob, picks: uxPicks, template: "minimal-clean", colorScheme: "ocean" }

  it("rejects invalid bodies with 400", async () => {
    expect((await post(generate, JSON.stringify({ ...base, picks: [] }))).status).toBe(400)
    expect((await post(generate, JSON.stringify({ ...base, template: "nope" }))).status).toBe(400)
  })

  it("rejects picks for unknown projects with 400", async () => {
    const response = await post(generate, JSON.stringify({ ...base, picks: [{ projectId: "ghost", matchedRequirementIds: [], score: 1 }] }))
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("invalid_picks")
  })
})
