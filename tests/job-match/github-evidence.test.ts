import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:dns/promises", () => ({
  default: { lookup: vi.fn().mockResolvedValue([{ address: "140.82.112.5", family: 4 }]) },
}))

import { fetchProfileEvidence } from "@/lib/job-match/github-evidence"

const restRepos = [
  { name: "uniShare", description: "Campus sharing app built with Next.js and TypeScript", html_url: "https://github.com/u/uniShare", pushed_at: new Date().toISOString(), stargazers_count: 3, archived: false, fork: false, language: "TypeScript", topics: ["nextjs"] },
  { name: "forked-lib", description: "A fork", html_url: "https://github.com/u/forked-lib", pushed_at: new Date().toISOString(), stargazers_count: 0, archived: false, fork: true, language: "Go", topics: [] },
  { name: "old-thing", description: "Old", html_url: "https://github.com/u/old-thing", pushed_at: new Date().toISOString(), stargazers_count: 0, archived: true, fork: false, language: "Python", topics: [] },
]

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init })
}

describe("fetchProfileEvidence", () => {
  const fetchMock = vi.fn()
  let counter = 0
  const nextLogin = () => `user-${(counter += 1)}`

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
    vi.stubEnv("GITHUB_TOKEN", "")
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("reads the public REST listing when no token is configured", async () => {
    fetchMock.mockResolvedValue(jsonResponse(restRepos))
    const evidence = await fetchProfileEvidence(nextLogin())

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain("https://api.github.com/users/")
    expect(String(url)).toContain("/repos")
    expect(init.headers.Authorization).toBeUndefined()
    expect(evidence.projects.map((project) => project.name)).toEqual(["uniShare"])
    expect(evidence.items.some((item) => item.skill === "typescript")).toBe(true)
  })

  it("uses authenticated GraphQL when a token is configured", async () => {
    vi.stubEnv("GITHUB_TOKEN", "test-token")
    fetchMock.mockResolvedValue(jsonResponse({ data: { user: { repositories: { nodes: [] } } } }))
    await fetchProfileEvidence(nextLogin())

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.github.com/graphql")
    expect(init.headers.Authorization).toBe("bearer test-token")
  })

  it("distinguishes rate limiting from other 403 responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } }))
    await expect(fetchProfileEvidence(nextLogin())).rejects.toThrow(/rate limit/i)

    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 403 }))
    await expect(fetchProfileEvidence(nextLogin())).rejects.toThrow(/GITHUB_TOKEN/)
  })

  it("maps 404 to a user-not-found error and 401 to a bad-token error", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 404 }))
    await expect(fetchProfileEvidence(nextLogin())).rejects.toThrow(/not found/i)

    vi.stubEnv("GITHUB_TOKEN", "bad")
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 401 }))
    await expect(fetchProfileEvidence(nextLogin())).rejects.toThrow(/rejected GITHUB_TOKEN/)
  })
})
