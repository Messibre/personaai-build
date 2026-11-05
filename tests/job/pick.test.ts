import { describe, expect, it } from "vitest"

import { pickProjects } from "@/lib/job/pick"
import type { JobProfile, Requirement } from "@/lib/schemas/job"
import type { Vault } from "@/lib/schemas/vault"
import { loadAlexVault } from "../vault/helpers"

const CANVAS_FLOW = "proj_canvas-flow"
const MOTION_TOKENS = "proj_motion-tokens"
const TREE_GRID = "proj_headless-tree-grid"

function req(skillId: string, label: string, level: "must" | "nice"): Requirement {
  return { id: `req-${skillId}`, label, level, keywords: [label] }
}

function jobOf(requirements: Requirement[]): JobProfile {
  return { title: "Test role", roleType: "frontend", requirements, topThree: [requirements[0].label] }
}

function alex(): Vault {
  return structuredClone(loadAlexVault())
}

const uxJob = jobOf([
  req("accessibility", "Accessibility", "must"),
  req("motion", "Motion design", "must"),
  req("design-tokens", "Design tokens", "nice"),
  req("react", "React", "nice"),
])

const perfJob = jobOf([req("performance", "Performance", "must"), req("react", "React", "nice")])

const unmatchedJob = jobOf([req("python", "Python", "must"), req("rust", "Rust", "nice")])

describe("pickProjects", () => {
  it("matches requirements from each project's own confirmed facts", () => {
    const picks = pickProjects(uxJob, alex(), { max: 3 })
    expect(picks.map((pick) => pick.projectId)).toEqual([MOTION_TOKENS, CANVAS_FLOW])
    expect(picks[0].matchedRequirementIds).toEqual(["req-accessibility", "req-motion", "req-design-tokens"])
    expect(picks[1].matchedRequirementIds).toEqual(["req-accessibility", "req-react"])
  })

  it("scores 20 per must, 8 per nice and 0.5 per confirmed fact up to 5", () => {
    const [motion, canvas] = pickProjects(uxJob, alex(), { max: 2 })
    expect(motion.score).toBe(20 + 20 + 8 + 4 * 0.5)
    expect(canvas.score).toBe(20 + 8 + 4 * 0.5)
  })

  it("picks differently for a different job when the facts differ", () => {
    const ux = pickProjects(uxJob, alex(), { max: 2 })
    const perf = pickProjects(perfJob, alex(), { max: 2 })
    expect(ux.map((pick) => pick.projectId)).not.toContain(TREE_GRID)
    expect(perf.map((pick) => pick.projectId)).toEqual([TREE_GRID, CANVAS_FLOW])
    expect(ux.find((pick) => pick.projectId === CANVAS_FLOW)?.matchedRequirementIds).not.toEqual(
      perf.find((pick) => pick.projectId === CANVAS_FLOW)?.matchedRequirementIds,
    )
  })

  it("only treats confirmed facts as evidence and only confirmed-fact projects as eligible", () => {
    const vault = alex()
    vault.projects.push({
      id: "proj_unconfirmed-only",
      name: "unconfirmed-only",
      techs: ["Python"],
      facts: [
        { id: "fact_uo-1", text: "Python service for data import", kind: "built", source: "ai-draft", confirmed: false },
      ],
    } as Vault["projects"][number])
    vault.projects[2].facts.push({
      id: "fact_htg-python",
      text: "Python scripts generate the benchmark tables",
      kind: "tech",
      source: "ai-draft",
      confirmed: false,
    })
    const picks = pickProjects(unmatchedJob, vault, { max: 5 })
    expect(picks.map((pick) => pick.projectId)).not.toContain("proj_unconfirmed-only")
    for (const pick of picks) expect(pick.matchedRequirementIds).toEqual([])
  })

  it("falls back to the projects with the most confirmed facts when nothing matches", () => {
    const picks = pickProjects(unmatchedJob, alex(), { max: 3 })
    expect(picks.map((pick) => pick.projectId)).toEqual([CANVAS_FLOW, MOTION_TOKENS])
    for (const pick of picks) expect(pick.matchedRequirementIds).toEqual([])
  })

  it("returns nothing when no project has a confirmed fact", () => {
    const vault = alex()
    for (const project of vault.projects) for (const fact of project.facts) fact.confirmed = false
    expect(pickProjects(uxJob, vault, { max: 3 })).toEqual([])
  })

  it("respects max", () => {
    expect(pickProjects(uxJob, alex(), { max: 1 })).toHaveLength(1)
    expect(pickProjects(unmatchedJob, alex(), { max: 1 })).toHaveLength(1)
    expect(pickProjects(uxJob, alex(), { max: 0 })).toEqual([])
  })

  it("is deterministic", () => {
    expect(pickProjects(uxJob, alex(), { max: 3 })).toEqual(pickProjects(uxJob, alex(), { max: 3 }))
    expect(pickProjects(unmatchedJob, alex(), { max: 3 })).toEqual(pickProjects(unmatchedJob, alex(), { max: 3 }))
  })
})
