import { describe, expect, it } from "vitest"
import { buildRewriteContext } from "@/lib/rewrite/context"
import { rewriteForJob } from "@/lib/rewrite/rewrite"
import {
  CANVAS_FLOW,
  MOTION_TOKENS,
  TREE_GRID,
  aiJob,
  aiPicks,
  leadFollowingClient,
  loadAlexVault,
  uxJob,
  uxPicks,
} from "./helpers"

function leadOf(context: ReturnType<typeof buildRewriteContext>, projectId: string): string | null {
  return context.projects.find((project) => project.projectId === projectId)!.leadFactId
}

describe("the same project leads with different facts for different jobs", () => {
  const vault = loadAlexVault()
  const ux = buildRewriteContext({ vault, job: uxJob, picks: uxPicks })
  const ai = buildRewriteContext({ vault, job: aiJob, picks: aiPicks })

  it("leads canvas-flow with the accessibility decision for a UX engineer posting", () => {
    expect(leadOf(ux, CANVAS_FLOW)).toBe("fact_cf-decided")
  })

  it("leads canvas-flow with the 10,000-node bottleneck for an AI posting", () => {
    expect(leadOf(ai, CANVAS_FLOW)).toBe("fact_cf-hard")
  })

  it("never uses the same lead for canvas-flow across the two jobs", () => {
    expect(leadOf(ux, CANVAS_FLOW)).not.toBe(leadOf(ai, CANVAS_FLOW))
  })

  it("leads motion-tokens with the reduced-motion fact, ahead of an earlier single-keyword match", () => {
    expect(leadOf(ux, MOTION_TOKENS)).toBe("fact_mt-reduced-motion")
  })

  it("leads headless-tree-grid with the 100k+ rows fact for the AI posting", () => {
    expect(leadOf(ai, TREE_GRID)).toBe("fact_htg-built")
  })

  it("has no lead when none of the matched keywords appear in a project's facts", () => {
    const context = buildRewriteContext({
      vault,
      job: aiJob,
      picks: [{ projectId: MOTION_TOKENS, matchedRequirementIds: ["req_scale"], score: 0.1 }],
    })
    expect(leadOf(context, MOTION_TOKENS)).toBeNull()
  })

  it("carries the lead into the first sentence of the rewritten project", async () => {
    const uxResult = await rewriteForJob(leadFollowingClient(), { vault, job: uxJob, picks: uxPicks })
    const aiResult = await rewriteForJob(leadFollowingClient(), { vault, job: aiJob, picks: aiPicks })
    if (!uxResult.ok || !aiResult.ok) throw new Error("rewrite failed")

    const uxCanvas = uxResult.draft.projects.find((project) => project.projectId === CANVAS_FLOW)!
    const aiCanvas = aiResult.draft.projects.find((project) => project.projectId === CANVAS_FLOW)!

    expect(uxCanvas.sentences[0].factIds).toEqual(["fact_cf-decided"])
    expect(aiCanvas.sentences[0].factIds).toEqual(["fact_cf-hard"])
    expect(uxCanvas.sentences[0].text).not.toBe(aiCanvas.sentences[0].text)
  })
})
