import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("node:dns/promises", () => ({
  default: { lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]) },
}))

import dns from "node:dns/promises"
import { analyzeJob } from "@/lib/job-match/analyzer"
import { fetchJobPosting, validateJobUrl } from "@/lib/job-match/fetch-job"
import { checkRequirements } from "@/lib/job-match/matcher"
import type { ProfileEvidence } from "@/lib/job-match/types"
import { isPrivateAddress, safeFetch } from "@/lib/security/safe-fetch"

const profile: ProfileEvidence = {
  login: "test-user",
  fetchedAt: new Date().toISOString(),
  projects: [{ id: "github:site", name: "site", url: "https://github.com/test/site", evidence: [] }],
  items: [{ skill: "react", source: "dependency", strength: 1, projectId: "github:site", projectName: "site", snippet: "package.json dependency: react" }],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("job match", () => {
  it("extracts requirements from a messy posting", async () => {
    const result = await analyzeJob("Senior Frontend Engineer\n\nRequirements:\n- Strong React and TypeScript experience.\n\nNice to have:\n- Kubernetes familiarity.\n\nBenefits and legal text")
    expect(result.roleType).toBe("frontend")
    expect(result.mustHaveRequirements.some((item) => item.skillId === "react")).toBe(true)
    expect(result.niceToHaveRequirements.some((item) => item.skillId === "kubernetes")).toBe(true)
  })

  it("never marks an unsupported required skill as covered", async () => {
    const analysis = await analyzeJob("Backend Engineer\nRequirements:\n- Kubernetes experience")
    const result = checkRequirements(profile, [], analysis)
    expect(result.checks[0]?.status).toBe("missing")
  })

  it("rejects private URLs", () => {
    expect(() => validateJobUrl("http://127.0.0.1/job")).toThrow(/valid|cannot/i)
    expect(() => validateJobUrl("http://localhost/job")).toThrow(/cannot/i)
    expect(() => validateJobUrl("ftp://example.com/job")).toThrow(/valid/i)
  })

  it("provides paste fallback on fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network unavailable") }))
    await expect(fetchJobPosting("https://jobs.example.com/posting")).rejects.toThrow(/paste/i)
  })

  it("asks users to paste for sites that block reading", async () => {
    await expect(fetchJobPosting("https://www.linkedin.com/jobs/view/1")).rejects.toThrow(/paste/i)
  })
})

describe("safeFetch", () => {
  it("detects private and reserved addresses", () => {
    for (const address of ["10.0.0.1", "127.0.0.1", "172.20.1.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateAddress(address)).toBe(true)
    }
    expect(isPrivateAddress("93.184.216.34")).toBe(false)
  })

  it("blocks hosts that resolve to private addresses", async () => {
    vi.mocked(dns.lookup).mockResolvedValueOnce([{ address: "10.0.0.5", family: 4 }] as never)
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    await expect(safeFetch("https://internal.example.com")).rejects.toMatchObject({ code: "blocked_host" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("re-validates redirect targets", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } })))
    await expect(safeFetch("https://example.com")).rejects.toMatchObject({ code: "blocked_host" })
  })

  it("stops after too many redirects", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://example.com/next" } })))
    await expect(safeFetch("https://example.com", { maxRedirects: 2 })).rejects.toMatchObject({ code: "too_many_redirects" })
  })
})
