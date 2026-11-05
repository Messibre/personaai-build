import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createEmptyVault } from "@/lib/vault/ops"
import { loadAlexVault } from "../vault/helpers"
import { COLOR_SCHEME, JOBS, TEMPLATE, isolatedEnv, json, postRequest, scriptedLLM, vaultRequest } from "../helpers/e2e"

const holder = vi.hoisted(() => ({
  client: undefined as unknown,
  checkThrows: false,
}))
vi.mock("@/lib/llm", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/llm")>()), getLLMClient: () => holder.client }))
vi.mock("@/lib/check/check-draft", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/check/check-draft")>()
  return {
    ...actual,
    checkDraft: (...args: Parameters<typeof actual.checkDraft>) => {
      if (holder.checkThrows) throw new Error("checker exploded")
      return actual.checkDraft(...args)
    },
  }
})

import { GET as getVault, PUT as putVault } from "@/app/api/vault/[id]/route"
import { POST as analyze } from "@/app/api/tailor/analyze/route"
import { POST as generate } from "@/app/api/tailor/generate/route"

async function analysisFor(vault = loadAlexVault()) {
  const response = await analyze(postRequest("/api/tailor/analyze", { vault, postingText: JOBS.ux }))
  expect(response.status).toBe(200)
  return { vault, ...(await json<{ job: unknown; picks: unknown[] }>(response)) }
}

async function generateWith(vault: ReturnType<typeof loadAlexVault>, job: unknown, picks: unknown[]) {
  return generate(postRequest("/api/tailor/generate", { vault, job, picks, template: TEMPLATE, colorScheme: COLOR_SCHEME }))
}

describe("J7: failure paths answer with clear errors and never ship unchecked text", () => {
  beforeEach(() => {
    isolatedEnv()
    holder.client = scriptedLLM().client
    holder.checkThrows = false
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("an LLM timeout during rewrite is a 5xx with an error code and no output", async () => {
    const { vault, job, picks } = await analysisFor()
    holder.client = scriptedLLM({ rewrite: () => ({ ok: false, error: { kind: "timeout", message: "timed out" } }) as never }).client
    const response = await generateWith(vault, job, picks)
    expect(response.status).toBeGreaterThanOrEqual(500)
    const body = await json<Record<string, unknown>>(response)
    expect(typeof body.error).toBe("string")
    expect(body.portfolioHtml).toBeUndefined()
    expect(body.draft).toBeUndefined()
  })

  it("a throwing checker means nothing is shipped (no portfolio, no draft)", async () => {
    const { vault, job, picks } = await analysisFor()
    holder.checkThrows = true
    const response = await generateWith(vault, job, picks)
    expect(response.status).toBeGreaterThanOrEqual(500)
    const body = await json<Record<string, unknown>>(response)
    expect(body.portfolioHtml).toBeUndefined()
    expect(body.resumeHtml).toBeUndefined()
    expect(body.draft).toBeUndefined()
  })

  it("rate limiting answers 429 with Retry-After", async () => {
    const vault = loadAlexVault()
    let limited: Response | undefined
    for (let attempt = 0; attempt < 60 && !limited; attempt += 1) {
      const response = await analyze(postRequest("/api/tailor/analyze", { vault, postingText: JOBS.ux }, { "x-forwarded-for": "203.0.113.7" }))
      if (response.status === 429) limited = response
      else expect(response.status).toBe(200)
    }
    expect(limited).toBeDefined()
    expect(Number(limited!.headers.get("Retry-After"))).toBeGreaterThan(0)
  })

  it("the beta gate answers 401 when a code is configured and missing", async () => {
    vi.stubEnv("BETA_ACCESS_CODE", "letmein-e2e")
    const response = await analyze(postRequest("/api/tailor/analyze", { vault: loadAlexVault(), postingText: JOBS.ux }))
    expect(response.status).toBe(401)
  })

  it("vault routes answer 501 on Vercel without Upstash, and work with a file store locally", async () => {
    const vault = createEmptyVault("Store Check")
    vi.stubEnv("VERCEL", "1")
    const onVercel = await putVault(...vaultRequest("PUT", vault.id, vault))
    expect(onVercel.status).toBe(501)
    expect(await json(onVercel)).toMatchObject({ error: "Vault storage is not available on this deployment." })
    expect((await getVault(...vaultRequest("GET", vault.id))).status).toBe(501)

    vi.stubEnv("VERCEL", "")
    expect((await putVault(...vaultRequest("PUT", vault.id, vault))).status).toBe(200)
  })

  it("oversized bodies answer 413", async () => {
    const huge = JSON.stringify({ vault: loadAlexVault(), postingText: "x".repeat(1_100_000) })
    const response = await analyze(postRequest("/api/tailor/analyze", huge))
    expect(response.status).toBe(413)
  })
})
