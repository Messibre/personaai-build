import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GitHubInputError, GitHubRateLimitError, fetchRepoDeepDive } from "@/lib/github"
import { canvasFlowReplies, stubGitHubFetch } from "./helpers"

beforeEach(() => {
  vi.stubEnv("GITHUB_TOKEN", "")
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("fetchRepoDeepDive", () => {
  it("parses a recorded-style fixture", async () => {
    stubGitHubFetch()
    const dive = await fetchRepoDeepDive("alexchen-ui", "canvas-flow")

    expect(dive).toMatchObject({
      owner: "alexchen-ui",
      name: "canvas-flow",
      description: "GPU-accelerated infinite canvas and diagramming engine built with WebGL and React",
      homepage: "https://canvasflow.dev/",
      stars: 3840,
      forks: 290,
      topics: ["canvas", "webgl", "react", "diagrams", "typescript"],
      degraded: [],
    })
    expect(dive.languages.TypeScript).toBeCloseTo(82, 0)
    expect(Object.values(dive.languages).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 0)
    expect(dive.readme).toContain("infinite canvas")
    expect(dive.commits).toEqual([
      "Add spatial index for hit testing",
      "Fix pointer capture on touch devices",
      "Introduce offscreen WebGL scene",
    ])
  })

  it("still returns the rest when one sub-call fails", async () => {
    stubGitHubFetch({
      ...canvasFlowReplies,
      "/languages": { status: 500, text: "boom" },
      "/commits?per_page=10": new TypeError("network down"),
    })
    const dive = await fetchRepoDeepDive("alexchen-ui", "canvas-flow")

    expect(dive.degraded.sort()).toEqual(["commits", "languages"])
    expect(dive.languages).toEqual({})
    expect(dive.commits).toEqual([])
    expect(dive.description).toContain("GPU-accelerated")
    expect(dive.readme).toContain("canvas-flow")
  })

  it.each([403, 429])("turns HTTP %i into a typed rate-limit error", async (status) => {
    stubGitHubFetch({ ...canvasFlowReplies, "/readme": { status, text: "rate limited" } })
    await expect(fetchRepoDeepDive("alexchen-ui", "canvas-flow")).rejects.toBeInstanceOf(GitHubRateLimitError)
  })

  it.each([
    ["user", "../etc"],
    ["user", "a/b"],
    ["user", "a b"],
    ["user", ".."],
    ["user", ""],
    ["user", "x".repeat(101)],
    ["bad name", "repo"],
    ["us/er", "repo"],
    ["..", "repo"],
    ["", "repo"],
  ])("rejects %j / %j without any fetch call", async (username, repo) => {
    const { fetchMock } = stubGitHubFetch()
    await expect(fetchRepoDeepDive(username, repo)).rejects.toBeInstanceOf(GitHubInputError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("sends Authorization only when GITHUB_TOKEN is set", async () => {
    const without = stubGitHubFetch()
    await fetchRepoDeepDive("alexchen-ui", "canvas-flow")
    expect(without.calls.length).toBeGreaterThan(0)
    for (const call of without.calls) expect(call.headers).not.toHaveProperty("Authorization")

    vi.stubEnv("GITHUB_TOKEN", "ghp_test_token")
    const withToken = stubGitHubFetch()
    await fetchRepoDeepDive("alexchen-ui", "canvas-flow")
    for (const call of withToken.calls) expect(call.headers.Authorization).toBe("Bearer ghp_test_token")
  })

  it("only talks to api.github.com and never exceeds 3 requests in flight", async () => {
    const stub = stubGitHubFetch()
    await fetchRepoDeepDive("alexchen-ui", "canvas-flow")
    expect(stub.calls).toHaveLength(4)
    for (const call of stub.calls) expect(call.url.startsWith("https://api.github.com/repos/alexchen-ui/canvas-flow")).toBe(true)
    expect(stub.maxInFlight()).toBeLessThanOrEqual(3)
  })

  it("caps the README and drops non-http homepages", async () => {
    stubGitHubFetch({
      ...canvasFlowReplies,
      "": { json: { description: "x", homepage: "javascript:alert(1)", stargazers_count: 1, forks_count: 0, topics: [] } },
      "/readme": { text: "a".repeat(20_000) },
    })
    const dive = await fetchRepoDeepDive("alexchen-ui", "canvas-flow")
    expect(dive.readme).toHaveLength(6000)
    expect(dive.homepage).toBeNull()
  })
})
