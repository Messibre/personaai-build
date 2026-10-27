import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MockClient } from "@/lib/llm/mock"
import { alexChenPersona } from "@/fixtures/personas"
import { canvasFlowReplies, stubGitHubFetch } from "./helpers"

const llmState = vi.hoisted(() => ({ client: null as unknown }))

vi.mock("@/lib/llm", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/llm")>()
  return { ...original, getLLMClient: () => llmState.client }
})

import { POST as postRepos } from "@/app/api/import/repos/route"
import { POST as postResume } from "@/app/api/import/resume/route"

function request(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.stubEnv("GITHUB_TOKEN", "")
  vi.spyOn(console, "error").mockImplementation(() => undefined)
  llmState.client = new MockClient()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("POST /api/import/repos", () => {
  it("rejects more than 6 repos with 400 and no GitHub calls", async () => {
    const { fetchMock } = stubGitHubFetch()
    const repoNames = Array.from({ length: 7 }, (_, index) => `repo-${index}`)
    const response = await postRepos(request("/api/import/repos", { username: "alexchen-ui", repoNames }))
    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ["not json", "{nope"],
    ["missing username", { repoNames: ["a"] }],
    ["empty repo list", { username: "alexchen-ui", repoNames: [] }],
    ["traversal username", { username: "../x", repoNames: ["a"] }],
    ["slash in repo", { username: "alexchen-ui", repoNames: ["a/b"] }],
    ["dot repo", { username: "alexchen-ui", repoNames: [".."] }],
    ["non-string repo", { username: "alexchen-ui", repoNames: [1] }],
  ])("rejects an invalid body (%s) with 400 and no GitHub calls", async (_label, body) => {
    const { fetchMock } = stubGitHubFetch()
    const response = await postRepos(request("/api/import/repos", body))
    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns one unconfirmed project draft per repo", async () => {
    stubGitHubFetch()
    const response = await postRepos(
      request("/api/import/repos", { username: "alexchen-ui", repoNames: ["canvas-flow", "Canvas-Flow"] }),
    )
    expect(response.status).toBe(200)
    const projects = (await response.json()) as Array<{ name: string; facts: Array<{ confirmed: boolean; source: string }> }>
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe("canvas-flow")
    expect(projects[0].facts.length).toBeGreaterThan(0)
    expect(projects[0].facts.every((entry) => !entry.confirmed && entry.source === "github")).toBe(true)
  })

  it("maps a GitHub rate limit to 429", async () => {
    stubGitHubFetch({ ...canvasFlowReplies, "/languages": { status: 403, text: "limit" } })
    const response = await postRepos(request("/api/import/repos", { username: "alexchen-ui", repoNames: ["canvas-flow"] }))
    expect(response.status).toBe(429)
    expect(await response.json()).toMatchObject({ code: "rate_limited" })
  })
})

describe("POST /api/import/resume", () => {
  it.each([
    ["not json", "{nope"],
    ["missing text", {}],
    ["non-string text", { text: 42 }],
  ])("rejects an invalid body (%s) with 400", async (_label, body) => {
    const response = await postResume(request("/api/import/resume", body))
    expect(response.status).toBe(400)
  })

  it("rejects oversize text with 413", async () => {
    const response = await postResume(request("/api/import/resume", { text: "a".repeat(30_001) }))
    expect(response.status).toBe(413)
  })

  it("returns the verified extraction", async () => {
    llmState.client = new MockClient({
      responses: [
        JSON.stringify({
          experience: [],
          projects: [],
          skills: [
            { name: "TypeScript", evidence: "TypeScript" },
            { name: "Made up", evidence: "Totally absent phrase" },
          ],
          education: [],
        }),
      ],
    })
    const response = await postResume(request("/api/import/resume", { text: alexChenPersona.resumeText }))
    expect(response.status).toBe(200)
    const data = (await response.json()) as { skills: Array<{ name: string }>; dropped: number }
    expect(data.skills.map((skill) => skill.name)).toEqual(["TypeScript"])
    expect(data.dropped).toBe(1)
  })

  it("maps unreadable model output to 502 without crashing", async () => {
    llmState.client = new MockClient({ responses: ["garbage", "more garbage"] })
    const response = await postResume(request("/api/import/resume", { text: alexChenPersona.resumeText }))
    expect(response.status).toBe(502)
  })

  it("maps an LLM rate limit to 429", async () => {
    llmState.client = new MockClient({ responses: [{ ok: false, error: { kind: "rate_limited", retryable: true } }] })
    const response = await postResume(request("/api/import/resume", { text: alexChenPersona.resumeText }))
    expect(response.status).toBe(429)
  })
})
