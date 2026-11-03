import assert from "node:assert/strict"
import test from "node:test"
import { analyzeJob } from "./analyzer"
import { fetchJobPosting, validateJobUrl } from "./fetch-job"
import { checkRequirements } from "./matcher"
import type { JobAnalysis } from "./types"

const analysis: JobAnalysis = {
  roleTitle: "Frontend Engineer",
  roleType: "frontend",
  mustHaveRequirements: [
    { label: "React", synonyms: ["React.js"], quote: "Build React applications", priority: "must-have" },
    { label: "Kubernetes", synonyms: ["K8s"], quote: "Operate Kubernetes workloads", priority: "must-have" },
  ],
  niceToHaveRequirements: [],
  values: ["shipping"],
}

test("analyzes messy posting JSON through the injected LLM", async () => {
  const result = await analyzeJob("We need a frontend engineer. Benefits and legal text follow.", async () => JSON.stringify({
    roleTitle: "Frontend Engineer", roleType: "frontend",
    mustHaveRequirements: [{ label: "React", synonyms: ["React.js"], quote: "Build React applications", priority: "must-have" }],
    niceToHaveRequirements: [], values: ["shipping"],
  }))
  assert.equal(result.roleType, "frontend")
  assert.equal(result.mustHaveRequirements[0].label, "React")
})

test("never marks an unsupported required skill as covered", () => {
  const result = checkRequirements({
    githubRepos: [{ name: "site", description: "A React site", language: "TypeScript", stargazers_count: 0, forks_count: 0, html_url: "https://github.com/x/site", fork: false, topics: [], homepage: null, readmeText: "React app", detectedTech: "TypeScript" }],
    resumeText: "Built a React interface.",
  }, analysis)
  assert.equal(result.checks.find((check) => check.requirement.label === "Kubernetes")?.status, "missing")
})

test("rejects private job URLs and gives a paste fallback when fetching fails", async () => {
  assert.throws(() => validateJobUrl("http://127.0.0.1/job"), /paste the job description/i)
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error("network unavailable") }
  await assert.rejects(() => fetchJobPosting("https://jobs.example.com/posting"), /paste the job description/i)
  globalThis.fetch = originalFetch
})
