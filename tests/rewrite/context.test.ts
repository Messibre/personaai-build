import { describe, expect, it } from "vitest"
import { buildRewriteContext, pickLeadFactId } from "@/lib/rewrite/context"
import { rewriteForJob } from "@/lib/rewrite/rewrite"
import type { LLMGenerateRequest } from "@/lib/llm/types"
import type { Vault } from "@/lib/schemas/vault"
import {
  CANVAS_FLOW,
  MOTION_TOKENS,
  TREE_GRID,
  leadFollowingClient,
  loadAlexVault,
  uxJob,
  uxPicks,
} from "./helpers"

const MARKER = "ZZUNCONFIRMEDMARKER7731"

/** An unconfirmed fact that would win the lead if it were not filtered out. */
function withUnconfirmedMarker(): Vault {
  const vault = loadAlexVault()
  const canvas = vault.projects.find((project) => project.id === CANVAS_FLOW)!
  canvas.facts.unshift({
    id: "fact_marker_project",
    text: `${MARKER} accessibility wcag assistive reduced motion`,
    kind: "outcome",
    source: "ai-draft",
    evidence: `${MARKER} evidence`,
    confirmed: false,
  })
  vault.experience[0].facts.unshift({
    id: "fact_marker_experience",
    text: `${MARKER} experience claim`,
    kind: "metric",
    source: "resume",
    confirmed: false,
  })
  return vault
}

describe("buildRewriteContext", () => {
  it("keeps unconfirmed facts out of the context entirely", () => {
    const vault = withUnconfirmedMarker()
    const context = buildRewriteContext({ vault, job: uxJob, picks: uxPicks })
    const json = JSON.stringify(context)

    expect(json).not.toContain(MARKER)
    expect(json).not.toContain("fact_marker_project")
    expect(json).not.toContain("fact_marker_experience")
    // Unconfirmed facts that ship in the fixture must not leak either.
    expect(json).not.toContain("60fps pan/zoom on 4K displays")
    expect(json).not.toContain("Adopted by 45+ product teams")
    expect(json).not.toContain("Improved Largest Contentful Paint")
  })

  it("never sends an unconfirmed fact to the model, including on the repair call", async () => {
    const vault = withUnconfirmedMarker()
    const captured: LLMGenerateRequest[] = []
    const client = leadFollowingClient(captured)
    client.enqueue("{}")

    const result = await rewriteForJob(client, { vault, job: uxJob, picks: uxPicks })

    expect(result.ok).toBe(true)
    expect(captured).toHaveLength(1)
    for (const request of captured) {
      expect(request.prompt).not.toContain(MARKER)
      expect(request.system ?? "").not.toContain(MARKER)
      expect(request.prompt).not.toContain("fact_marker_project")
    }
  })

  it("does not let an unconfirmed fact become the lead, however well it matches", () => {
    const context = buildRewriteContext({ vault: withUnconfirmedMarker(), job: uxJob, picks: uxPicks })
    const canvas = context.projects.find((project) => project.projectId === CANVAS_FLOW)!
    expect(canvas.leadFactId).toBe("fact_cf-decided")
  })

  it("returns projects in pick order and skips picks that are not in the vault", () => {
    const context = buildRewriteContext({
      vault: loadAlexVault(),
      job: uxJob,
      picks: [
        { projectId: "proj_missing", matchedRequirementIds: [], score: 1 },
        { projectId: TREE_GRID, matchedRequirementIds: [], score: 0.5 },
        { projectId: MOTION_TOKENS, matchedRequirementIds: ["req_a11y"], score: 0.4 },
        { projectId: TREE_GRID, matchedRequirementIds: [], score: 0.1 },
      ],
    })
    expect(context.projects.map((project) => project.projectId)).toEqual([TREE_GRID, MOTION_TOKENS])
  })

  it("exposes only id, text and kind per fact, plus matched labels and keywords", () => {
    const context = buildRewriteContext({ vault: loadAlexVault(), job: uxJob, picks: uxPicks })
    const motion = context.projects[0]

    expect(motion.matchedLabels).toEqual([uxJob.requirements[0].label])
    expect(motion.matchedKeywords).toEqual(uxJob.requirements[0].keywords)
    expect(motion.techs).toEqual(["TypeScript", "CSS"])
    for (const fact of motion.facts) expect(Object.keys(fact).sort()).toEqual(["id", "kind", "text"])
    expect(motion.facts.map((fact) => fact.id)).toEqual([
      "fact_mt-built",
      "fact_mt-decided",
      "fact_mt-reduced-motion",
      "fact_mt-hard",
    ])
  })

  it("includes confirmed experience facts and drops experience with none", () => {
    const context = buildRewriteContext({ vault: loadAlexVault(), job: uxJob, picks: uxPicks })
    expect(context.experience.map((entry) => entry.company)).toEqual([
      "DesignOS",
      "LoomFlow Technologies",
      "Apex Interactive",
    ])
    const loom = context.experience.find((entry) => entry.company === "LoomFlow Technologies")!
    expect(loom.facts.map((fact) => fact.id)).toEqual(["fact_lf-outcome"])
  })
})

describe("pickLeadFactId", () => {
  const facts = [
    { id: "a", text: "Built a dashboard in React", kind: "built" as const },
    { id: "b", text: "Wrote React and TypeScript tooling", kind: "built" as const },
    { id: "c", text: "Reactive streams", kind: "built" as const },
  ]

  it("picks the fact with the most keyword overlap", () => {
    expect(pickLeadFactId(facts, ["react", "typescript"])).toBe("b")
  })

  it("breaks ties by taking the earliest fact", () => {
    expect(pickLeadFactId(facts, ["react"])).toBe("a")
  })

  it("matches case-insensitively and by whole word only", () => {
    expect(pickLeadFactId(facts, ["REACT"])).toBe("a")
    expect(pickLeadFactId([facts[2]], ["react"])).toBeNull()
  })

  it("returns null when nothing overlaps or there are no keywords", () => {
    expect(pickLeadFactId(facts, ["kubernetes"])).toBeNull()
    expect(pickLeadFactId(facts, [])).toBeNull()
    expect(pickLeadFactId([], ["react"])).toBeNull()
  })
})
