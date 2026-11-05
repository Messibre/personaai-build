import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { MockClient } from "@/lib/llm/mock"
import { analyzeJob, NOT_ENOUGH_REQUIREMENTS } from "@/lib/job/analyze"
import { getSkill, REQUIREMENT_ID_PREFIX } from "@/lib/job/skills"
import type { JobProfile } from "@/lib/schemas/job"

export function loadPosting(name: string): string {
  return readFileSync(join(process.cwd(), "fixtures", "jobs", `${name}.txt`), "utf8")
}

const llm = new MockClient({ responses: [] })

async function profileFor(name: string): Promise<JobProfile> {
  const result = await analyzeJob(llm, loadPosting(name))
  if (!result.ok) throw new Error(`expected ok for ${name}: ${result.error}`)
  return result.data
}

const ids = (profile: JobProfile, level: "must" | "nice") =>
  profile.requirements.filter((requirement) => requirement.level === level).map((requirement) => requirement.id)

describe("analyzeJob", () => {
  it("reads the UX engineer posting", async () => {
    const profile = await profileFor("ux-engineer")
    expect(profile.roleType).toBe("ux-engineer")
    expect(profile.title).toBe("Senior UX Engineer, Design Systems")
    expect(ids(profile, "must")).toEqual(expect.arrayContaining(["req-accessibility", "req-design-systems", "req-react"]))
    expect(ids(profile, "nice")).toEqual(expect.arrayContaining(["req-storybook", "req-design-tokens"]))
  })

  it("reads the frontend posting", async () => {
    const profile = await profileFor("frontend-engineer")
    expect(profile.roleType).toBe("frontend")
    expect(ids(profile, "must")).toEqual(expect.arrayContaining(["req-react", "req-next.js", "req-css"]))
    expect(ids(profile, "nice")).toEqual(expect.arrayContaining(["req-playwright", "req-graphql"]))
  })

  it("reads the AI engineer posting", async () => {
    const profile = await profileFor("ai-engineer")
    expect(profile.roleType).toBe("ai-ml")
    expect(ids(profile, "must")).toEqual(expect.arrayContaining(["req-llm", "req-rag", "req-python"]))
    expect(ids(profile, "nice")).toEqual(expect.arrayContaining(["req-pytorch", "req-langchain"]))
  })

  it("never lists a requirement as both must and nice", async () => {
    for (const name of ["ux-engineer", "frontend-engineer", "ai-engineer"]) {
      const profile = await profileFor(name)
      const all = profile.requirements.map((requirement) => requirement.id)
      expect(new Set(all).size).toBe(all.length)
    }
  })

  it("builds topThree from must labels first, at most three, no duplicates", async () => {
    for (const name of ["ux-engineer", "frontend-engineer", "ai-engineer"]) {
      const profile = await profileFor(name)
      expect(profile.topThree.length).toBeGreaterThan(0)
      expect(profile.topThree.length).toBeLessThanOrEqual(3)
      expect(new Set(profile.topThree.map((item) => item.toLowerCase())).size).toBe(profile.topThree.length)
      const mustLabels = profile.requirements.filter((r) => r.level === "must").map((r) => r.label)
      expect(profile.topThree).toEqual(mustLabels.slice(0, profile.topThree.length))
    }
  })

  it("only uses taxonomy labels and aliases for requirements", async () => {
    for (const name of ["ux-engineer", "frontend-engineer", "ai-engineer", "injected"]) {
      const profile = await profileFor(name)
      for (const requirement of profile.requirements) {
        const skill = getSkill(requirement.id.slice(REQUIREMENT_ID_PREFIX.length))
        expect(skill).toBeDefined()
        expect(requirement.label).toBe(skill?.name)
        const allowed = new Set([...(skill?.aliases ?? []), skill?.name].map((value) => value?.toLowerCase()))
        for (const keyword of requirement.keywords) expect(allowed.has(keyword.toLowerCase())).toBe(true)
      }
    }
  })

  it("does not let an injected instruction reach the profile", async () => {
    const profile = await profileFor("injected")
    expect(profile.title).toBe("Frontend Engineer, Checkout")
    const serialized = JSON.stringify(profile).toLowerCase()
    expect(serialized).not.toContain("google")
    expect(serialized).not.toContain("ignore all previous")
    expect(serialized).not.toContain("founded")
    expect(ids(profile, "must")).toEqual(expect.arrayContaining(["req-react", "req-typescript"]))
  })

  it("refuses a posting that is too short to read", async () => {
    const result = await analyzeJob(llm, "Engineer wanted. Python.")
    expect(result).toEqual({ ok: false, error: NOT_ENOUGH_REQUIREMENTS })
  })

  it("never calls the model", async () => {
    const calls: unknown[] = []
    const spy = new MockClient({ responses: [(req) => { calls.push(req); return "{}" }] })
    await analyzeJob(spy, loadPosting("ux-engineer"))
    expect(calls).toHaveLength(0)
  })
})
