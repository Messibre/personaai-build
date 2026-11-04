import { describe, expect, it } from "vitest"
import type { LLMGenerateRequest } from "@/lib/llm/types"
import { REWRITE_SYSTEM_PROMPT, rewriteForJob } from "@/lib/rewrite/rewrite"
import type { JobProfile } from "@/lib/schemas/job"
import { leadFollowingClient, loadAlexVault, uxJob, uxPicks } from "./helpers"

const RAW_POSTING_MARKER = "ZZRAWPOSTING4410"
const RAW_POSTING = `${RAW_POSTING_MARKER}: We want a rockstar ninja who thrives in a fast-paced family. Apply today.`

async function capture(job: JobProfile): Promise<LLMGenerateRequest> {
  const captured: LLMGenerateRequest[] = []
  const result = await rewriteForJob(leadFollowingClient(captured), { vault: loadAlexVault(), job, picks: uxPicks })
  expect(result.ok).toBe(true)
  expect(captured).toHaveLength(1)
  return captured[0]
}

describe("rewrite prompt content", () => {
  it("states the no-invention rules in the system prompt sent to the model", async () => {
    const request = await capture(uxJob)
    const system = request.system ?? ""

    expect(system).toBe(REWRITE_SYSTEM_PROMPT)
    expect(system).toContain("Use ONLY the facts provided")
    expect(system).toContain("factIds for EVERY sentence")
    expect(system).toContain("Never add numbers, technologies, outcomes, company names or adjectives")
    expect(system).toContain("leadFactId")
    for (const banned of ["passionate", "dedicated", "results-driven"]) expect(system).toContain(banned)
  })

  it("states the keep-ownership rule in the system prompt sent to the model", async () => {
    const request = await capture(uxJob)
    const system = request.system ?? ""

    expect(system).toContain("Keep the person's verbs and ownership exactly")
    expect(system).toContain('"contributed to" must never become "led"')
  })

  it("never contains the raw job posting, even when the job object carries it", async () => {
    const leakyJob = { ...uxJob, rawText: RAW_POSTING, description: RAW_POSTING } as unknown as JobProfile
    const request = await capture(leakyJob)

    expect(request.prompt).not.toContain(RAW_POSTING_MARKER)
    expect(request.prompt).not.toContain("rockstar")
    expect(request.system ?? "").not.toContain(RAW_POSTING_MARKER)
  })

  it("does give the model the structured job profile instead", async () => {
    const request = await capture(uxJob)

    expect(request.prompt).toContain(uxJob.title)
    for (const line of uxJob.topThree) expect(request.prompt).toContain(line)
    expect(request.prompt).toContain(uxJob.requirements[0].label)
  })
})
