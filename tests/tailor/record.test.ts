import { describe, expect, it, vi } from "vitest"
import { recordIfGenerated, planApplicationRecord } from "@/lib/tailor/record"
import { generateStage } from "@/lib/tailor/pipeline"
import type { ApplicationInput } from "@/lib/vault/applications"
import { loadAlexVault, makeDeps, POSTING, uxJob, uxPicks } from "./helpers"

const context = { job: uxJob, postingText: POSTING, company: "Acme" }

async function generated() {
  const vault = loadAlexVault()
  const result = await generateStage(makeDeps(), { vault, job: uxJob, picks: uxPicks, template: "minimal-clean", colorScheme: "ocean" })
  return { vault, result }
}

describe("recording applications", () => {
  it("records exactly once after a successful generate", async () => {
    const { vault, result } = await generated()
    expect(result.ok).toBe(true)
    const record = vi.fn(async (v: typeof vault, _input: ApplicationInput) => v)
    await recordIfGenerated(vault, result, context, record)
    expect(record).toHaveBeenCalledTimes(1)
    expect(record.mock.calls[0][1]).toEqual({ jobTitle: uxJob.title, jobText: POSTING, company: "Acme" })
  })

  it("never records when generate failed", async () => {
    const vault = loadAlexVault()
    const result = await generateStage(
      makeDeps({ checkDraft: async () => { throw new Error("down") } }),
      { vault, job: uxJob, picks: uxPicks, template: "minimal-clean", colorScheme: "ocean" },
    )
    expect(result.ok).toBe(false)
    const record = vi.fn(async (v: typeof vault) => v)
    const after = await recordIfGenerated(vault, result, context, record)
    expect(record).not.toHaveBeenCalled()
    expect(after).toBe(vault)
  })

  it("leaves out an empty company", async () => {
    const { result } = await generated()
    expect(planApplicationRecord(result, { ...context, company: "  " })).not.toHaveProperty("company")
  })

  it("recording the same posting twice adds one application", async () => {
    const { vault, result } = await generated()
    const once = await recordIfGenerated(vault, result, context)
    const twice = await recordIfGenerated(once, result, context)
    expect(once.applications).toHaveLength(vault.applications.length + 1)
    expect(twice).toBe(once)
  })
})
