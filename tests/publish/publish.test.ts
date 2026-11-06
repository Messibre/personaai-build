import { describe, expect, it, vi } from "vitest"
import { issueStatusToken, verifyStatusToken } from "@/lib/publish/capability"
import { DAILY_PUBLISH_LIMIT, projectNameFor, publishPortfolio, renderPublicHtml, type PublishDeps } from "@/lib/publish/publish"
import { MemoryPublishRecords } from "@/lib/publish/records"
import { publishRequestSchema, type PublishRequest } from "@/lib/publish/requests"
import { getDeploymentStatus, type FetchLike } from "@/lib/publish/vercel"
import { reconcileSelection } from "@/lib/tailor/preferences"
import { TEMPLATE_OPTIONS } from "@/lib/types"
import type { Vault } from "@/lib/schemas/vault"
import { draftFor, loadAlexVault, uxJob, uxPicks } from "../outputs/helpers"

const SECRET = "test-secret-value"

function buildRequest(vault: Vault, overrides: Partial<PublishRequest> = {}): PublishRequest {
  const picks = uxPicks.filter((pick) => vault.projects.some((project) => project.id === pick.projectId))
  return {
    vaultId: vault.id,
    selection: reconcileSelection(vault),
    job: uxJob,
    draft: draftFor(vault, uxJob, picks),
    picks,
    template: "minimal-clean",
    colorScheme: "ocean",
    confirmPublic: true,
    ...overrides,
  }
}

interface Calls {
  urls: string[]
  bodies: unknown[]
}

function fakeVercel(calls: Calls, deploymentId = "dpl_123"): FetchLike {
  return async (input, init) => {
    calls.urls.push(input)
    if (typeof init.body === "string") calls.bodies.push(JSON.parse(init.body))
    if (input.includes("/v10/projects")) return Response.json({ id: "prj" }, { status: 200 })
    if (input.includes("/v13/deployments")) return Response.json({ id: deploymentId }, { status: 200 })
    return Response.json({}, { status: 404 })
  }
}

function makeDeps(vault: Vault, calls: Calls, overrides: Partial<PublishDeps> = {}): PublishDeps {
  return {
    loadVault: async (id) => (id === vault.id ? vault : null),
    records: new MemoryPublishRecords(),
    vercel: { token: "tok", fetchImpl: fakeVercel(calls) },
    secret: SECRET,
    ...overrides,
  }
}

describe("publishPortfolio", () => {
  it("creates a deployment from server-rendered HTML and returns a status token", async () => {
    const vault = loadAlexVault()
    const calls: Calls = { urls: [], bodies: [] }
    const result = await publishPortfolio(buildRequest(vault), makeDeps(vault, calls))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.reused).toBe(false)
    expect(result.project).toBe(projectNameFor(vault))
    expect(verifyStatusToken(result.statusToken, SECRET)).toMatchObject({ deploymentId: "dpl_123", project: result.project })

    const deployment = calls.bodies.find((body) => (body as { files?: unknown }).files) as { files: Array<{ file: string; data: string }>; target: string }
    expect(deployment.target).toBe("production")
    const index = deployment.files.find((file) => file.file === "index.html")
    expect(index?.data).toContain("<html")
  })

  it("is idempotent for an identical request and does not deploy twice", async () => {
    const vault = loadAlexVault()
    const calls: Calls = { urls: [], bodies: [] }
    const deps = makeDeps(vault, calls)
    const first = await publishPortfolio(buildRequest(vault), deps)
    const second = await publishPortfolio(buildRequest(vault), deps)
    expect(first.ok && second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(second.reused).toBe(true)
      expect(second.deploymentId).toBe(first.deploymentId)
    }
    expect(calls.urls.filter((url) => url.includes("/v13/deployments"))).toHaveLength(1)
  })

  it("rejects an unknown vault", async () => {
    const vault = loadAlexVault()
    const calls: Calls = { urls: [], bodies: [] }
    const result = await publishPortfolio(buildRequest(vault, { vaultId: "vault_missing_1" }), makeDeps(vault, calls))
    expect(result).toMatchObject({ ok: false, code: "vault_not_found", status: 404 })
    expect(calls.urls).toHaveLength(0)
  })

  it("rejects a draft that is not backed by confirmed facts", async () => {
    const vault = loadAlexVault()
    const calls: Calls = { urls: [], bodies: [] }
    const request = buildRequest(vault)
    const deps = makeDeps(vault, calls)

    const inventedSentence = structuredClone(request.draft)
    const existing = inventedSentence.about[0] ?? inventedSentence.projects[0].sentences[0]
    existing.text = "Increased revenue by 900% at a company that does not exist in the vault."
    expect(await publishPortfolio({ ...request, draft: inventedSentence }, deps)).toMatchObject({ ok: false, code: "unsupported_content", status: 422 })

    const inventedFact = structuredClone(request.draft)
    inventedFact.resumeBullets.push({ text: "Led a team of fifty engineers.", factIds: ["fact_does_not_exist"] })
    expect(await publishPortfolio({ ...request, draft: inventedFact }, deps)).toMatchObject({ ok: false, code: "unsupported_content", status: 422 })

    const inventedTagline = { ...structuredClone(request.draft), tagline: "Led the Kubernetes platform at Google serving 40M users" }
    expect(await publishPortfolio({ ...request, draft: inventedTagline }, deps)).toMatchObject({ ok: false, code: "unsupported_content", status: 422 })

    expect(calls.urls).toHaveLength(0)
  })

  it("rejects picks that are not in the vault", async () => {
    const vault = loadAlexVault()
    const calls: Calls = { urls: [], bodies: [] }
    const result = await publishPortfolio(
      buildRequest(vault, { picks: [{ projectId: "proj_unknown", matchedRequirementIds: [], score: 1 }] }),
      makeDeps(vault, calls),
    )
    expect(result).toMatchObject({ ok: false, code: "invalid_selection", status: 400 })
    expect(calls.urls).toHaveLength(0)
  })

  it("enforces the daily limit per vault", async () => {
    const vault = loadAlexVault()
    const calls: Calls = { urls: [], bodies: [] }
    const deps = makeDeps(vault, calls)
    const results = []
    for (const option of TEMPLATE_OPTIONS.slice(0, DAILY_PUBLISH_LIMIT + 1)) {
      results.push(await publishPortfolio(buildRequest(vault, { template: option.id }), deps))
    }
    expect(results.slice(0, DAILY_PUBLISH_LIMIT).every((result) => result.ok)).toBe(true)
    expect(results[DAILY_PUBLISH_LIMIT]).toMatchObject({ ok: false, code: "limit_reached", status: 429 })
  })

  it("releases the lock and reports a generic error when the provider fails", async () => {
    const vault = loadAlexVault()
    const failing: FetchLike = async () => Response.json({ error: { message: "secret provider detail" } }, { status: 500 })
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const records = new MemoryPublishRecords()
    const result = await publishPortfolio(buildRequest(vault), { ...makeDeps(vault, { urls: [], bodies: [] }), records, vercel: { token: "tok", fetchImpl: failing } })
    errors.mockRestore()
    expect(result).toMatchObject({ ok: false, code: "unavailable", status: 502 })
    if (!result.ok) expect(result.message).not.toContain("secret provider detail")

    const calls: Calls = { urls: [], bodies: [] }
    const retry = await publishPortfolio(buildRequest(vault), { ...makeDeps(vault, calls), records })
    expect(retry.ok).toBe(true)
  })

  it("does not render unselected content into the public page", () => {
    const vault = loadAlexVault()
    const request = buildRequest(vault, { selection: { experience: [], education: [], contacts: [], github: false } })
    const rendered = renderPublicHtml(vault, request)
    expect("html" in rendered).toBe(true)
    if ("html" in rendered && vault.person.email) expect(rendered.html).not.toContain(vault.person.email)
  })
})

describe("publish request schema", () => {
  it("requires explicit public confirmation and rejects extra keys", () => {
    const vault = loadAlexVault()
    const base = buildRequest(vault)
    expect(publishRequestSchema.safeParse(base).success).toBe(true)
    expect(publishRequestSchema.safeParse({ ...base, confirmPublic: false }).success).toBe(false)
    expect(publishRequestSchema.safeParse({ ...base, html: "<script>alert(1)</script>" }).success).toBe(false)
  })
})

describe("status tokens", () => {
  it("round-trips, and rejects tampering, wrong secrets and expiry", () => {
    const now = 1_000_000
    const token = issueStatusToken({ deploymentId: "dpl_1", project: "portfolio-x" }, SECRET, now)
    expect(verifyStatusToken(token, SECRET, now + 1000)).toMatchObject({ deploymentId: "dpl_1" })
    expect(verifyStatusToken(token, "other-secret", now + 1000)).toBeNull()
    expect(verifyStatusToken(`${token}x`, SECRET, now + 1000)).toBeNull()
    expect(verifyStatusToken(token, SECRET, now + 2 * 60 * 60 * 1000)).toBeNull()
    expect(verifyStatusToken("garbage", SECRET)).toBeNull()
  })
})

describe("getDeploymentStatus", () => {
  const respond = (json: unknown, status = 200): FetchLike => async () => Response.json(json, { status })

  it("maps provider states and prefers the project alias", async () => {
    expect(await getDeploymentStatus("d", "p", { token: "t", fetchImpl: respond({ readyState: "BUILDING" }) })).toEqual({ state: "building" })
    expect(await getDeploymentStatus("d", "p", { token: "t", fetchImpl: respond({ readyState: "ERROR" }) })).toEqual({ state: "failed" })
    expect(
      await getDeploymentStatus("d", "p", { token: "t", fetchImpl: respond({ readyState: "READY", alias: ["other.example.com", "p.vercel.app"], url: "p-abc.vercel.app" }) }),
    ).toEqual({ state: "ready", url: "https://p.vercel.app" })
  })

  it("surfaces rejected credentials as an auth error", async () => {
    await expect(getDeploymentStatus("d", "p", { token: "t", fetchImpl: respond({}, 403) })).rejects.toMatchObject({ code: "auth" })
  })
})
