import assert from "node:assert/strict"
import test from "node:test"
import { analyzeJob } from "./analyzer"
import { fetchJobPosting, validateJobUrl } from "./fetch-job"
import { checkRequirements } from "./matcher"
import type { ProfileEvidence } from "./types"

const profile: ProfileEvidence = {
  login: "test-user",
  fetchedAt: new Date().toISOString(),
  projects: [{ id: "github:site", name: "site", url: "https://github.com/test/site", evidence: [] }],
  items: [{ skill: "react", source: "dependency", strength: 1, projectId: "github:site", projectName: "site", snippet: "package.json dependency: react" }],
}

test("extracts requirements from a messy posting", async () => {
  const result = await analyzeJob("Senior Frontend Engineer\n\nRequirements:\n- Strong React and TypeScript experience.\n\nNice to have:\n- Kubernetes familiarity.\n\nBenefits and legal text")
  assert.equal(result.roleType, "frontend")
  assert.equal(result.mustHaveRequirements.some((item) => item.skillId === "react"), true)
  assert.equal(result.niceToHaveRequirements.some((item) => item.skillId === "kubernetes"), true)
})

test("never marks an unsupported required skill as covered", async () => {
  const analysis = await analyzeJob("Backend Engineer\nRequirements:\n- Kubernetes experience")
  const result = checkRequirements(profile, [], analysis)
  assert.equal(result.checks[0]?.status, "missing")
})

test("rejects private URLs and provides paste fallback on fetch failure", async () => {
  assert.throws(() => validateJobUrl("http://127.0.0.1/job"), /valid|cannot/i)
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error("network unavailable") }
  await assert.rejects(() => fetchJobPosting("https://jobs.example.com/posting"), /paste/i)
  globalThis.fetch = originalFetch
})
