import { describe, expect, it } from "vitest"
import { MockClient } from "@/lib/llm/mock"
import type { LLMGenerateRequest } from "@/lib/llm/types"
import { createEmptyVault } from "@/lib/vault/ops"
import { rewriteForJob } from "@/lib/rewrite/rewrite"
import type { Draft } from "@/lib/schemas/draft"
import {
  CANVAS_FLOW,
  MOTION_TOKENS,
  TREE_GRID,
  clientReturning,
  emptyDraft,
  loadAlexVault,
  uxJob,
  uxPicks,
} from "./helpers"

const vault = loadAlexVault()

async function rewrite(draft: unknown) {
  const result = await rewriteForJob(clientReturning(draft), { vault, job: uxJob, picks: uxPicks })
  if (!result.ok) throw new Error(`rewrite failed: ${JSON.stringify(result.error)}`)
  return result
}

function words(count: number): string {
  return Array.from({ length: count }, (_, index) => `word${index}`).join(" ")
}

describe("rewriteForJob post-processing", () => {
  it("drops a sentence that cites an unknown fact id and keeps its valid neighbours", async () => {
    const result = await rewrite({
      ...emptyDraft(),
      about: [
        { text: "Staff frontend engineer.", factIds: ["fact_dos-role"] },
        { text: "Invented claim.", factIds: ["fact_does-not-exist"] },
        { text: "Mixed citation.", factIds: ["fact_dos-role", "fact_does-not-exist"] },
      ],
    } satisfies Draft)

    expect(result.draft.about).toEqual([{ text: "Staff frontend engineer.", factIds: ["fact_dos-role"] }])
    expect(result.dropped).toBe(2)
  })

  it("drops a sentence with empty factIds and never invents replacement text", async () => {
    const result = await rewrite({
      ...emptyDraft(),
      projects: [
        {
          projectId: MOTION_TOKENS,
          sentences: [
            { text: "Uncited sentence.", factIds: [] },
            { text: "Cited sentence.", factIds: ["fact_mt-built"] },
          ],
        },
      ],
    } satisfies Draft)

    expect(result.draft.projects).toEqual([
      { projectId: MOTION_TOKENS, sentences: [{ text: "Cited sentence.", factIds: ["fact_mt-built"] }] },
    ])
    expect(result.dropped).toBe(1)
  })

  it("drops a sentence that cites an unconfirmed fact", async () => {
    const result = await rewrite({
      ...emptyDraft(),
      about: [{ text: "Adopted by 45 teams.", factIds: ["fact_mt-outcome"] }],
    } satisfies Draft)
    expect(result.draft.about).toEqual([])
    expect(result.dropped).toBe(1)
  })

  it("drops projects that were not picked, including known ones and unknown ones", async () => {
    const result = await rewrite({
      ...emptyDraft(),
      projects: [
        { projectId: TREE_GRID, sentences: [{ text: "Tree grid.", factIds: ["fact_htg-built"] }] },
        { projectId: "proj_unknown", sentences: [{ text: "Ghost.", factIds: ["fact_mt-built"] }] },
        { projectId: MOTION_TOKENS, sentences: [{ text: "Tokens.", factIds: ["fact_mt-built"] }] },
      ],
    } satisfies Draft)

    expect(result.draft.projects.map((project) => project.projectId)).toEqual([MOTION_TOKENS])
    expect(result.dropped).toBe(2)
  })

  it("drops a project sentence that cites a fact from a different project", async () => {
    const result = await rewrite({
      ...emptyDraft(),
      projects: [
        {
          projectId: MOTION_TOKENS,
          sentences: [
            { text: "Borrowed claim.", factIds: ["fact_cf-built"] },
            { text: "Own claim.", factIds: ["fact_mt-built"] },
          ],
        },
      ],
    } satisfies Draft)

    expect(result.draft.projects[0].sentences.map((sentence) => sentence.text)).toEqual(["Own claim."])
    expect(result.dropped).toBe(1)
  })

  it("forces project order to follow the picks, whatever order the model used", async () => {
    const result = await rewrite({
      ...emptyDraft(),
      projects: [
        { projectId: CANVAS_FLOW, sentences: [{ text: "Canvas.", factIds: ["fact_cf-built"] }] },
        { projectId: MOTION_TOKENS, sentences: [{ text: "Tokens.", factIds: ["fact_mt-built"] }] },
      ],
    } satisfies Draft)

    expect(uxPicks.map((pick) => pick.projectId)).toEqual([MOTION_TOKENS, CANVAS_FLOW])
    expect(result.draft.projects.map((project) => project.projectId)).toEqual([MOTION_TOKENS, CANVAS_FLOW])
  })

  it("keeps only the first entry when the model repeats a project", async () => {
    const result = await rewrite({
      ...emptyDraft(),
      projects: [
        { projectId: MOTION_TOKENS, sentences: [{ text: "First.", factIds: ["fact_mt-built"] }] },
        { projectId: MOTION_TOKENS, sentences: [{ text: "Second.", factIds: ["fact_mt-decided"] }] },
      ],
    } satisfies Draft)

    expect(result.draft.projects).toHaveLength(1)
    expect(result.draft.projects[0].sentences[0].text).toBe("First.")
    expect(result.dropped).toBe(1)
  })

  it("truncates an over-long note by dropping whole sentences, never mid-sentence", async () => {
    const sentenceText = (label: string) => `${label} ${words(39)}.`
    const result = await rewrite({
      ...emptyDraft(),
      note: [
        { text: sentenceText("One"), factIds: ["fact_dos-role"] },
        { text: sentenceText("Two"), factIds: ["fact_dos-role"] },
        { text: sentenceText("Three"), factIds: ["fact_dos-metric"] },
        { text: "Four.", factIds: ["fact_dos-metric"] },
      ],
    } satisfies Draft)

    expect(result.draft.note.map((sentence) => sentence.text)).toEqual([sentenceText("One"), sentenceText("Two")])
    const total = result.draft.note.reduce((sum, sentence) => sum + sentence.text.split(/\s+/).length, 0)
    expect(total).toBeLessThanOrEqual(110)
    expect(result.dropped).toBe(2)
  })

  it("keeps a note that is exactly at the word budget", async () => {
    const text = words(110)
    const result = await rewrite({ ...emptyDraft(), note: [{ text, factIds: ["fact_dos-role"] }] } satisfies Draft)
    expect(result.draft.note).toEqual([{ text, factIds: ["fact_dos-role"] }])
    expect(result.dropped).toBe(0)
  })

  it("enforces the sentence caps for projects, about and resume bullets", async () => {
    const many = (prefix: string, count: number, factId: string) =>
      Array.from({ length: count }, (_, index) => ({ text: `${prefix} ${index}.`, factIds: [factId] }))

    const result = await rewrite({
      ...emptyDraft(),
      about: many("About", 5, "fact_dos-role"),
      projects: [{ projectId: MOTION_TOKENS, sentences: many("Project", 5, "fact_mt-built") }],
      resumeBullets: many("Bullet", 10, "fact_dos-metric"),
    } satisfies Draft)

    expect(result.draft.about).toHaveLength(3)
    expect(result.draft.projects[0].sentences).toHaveLength(3)
    expect(result.draft.resumeBullets).toHaveLength(8)
    expect(result.draft.about.map((sentence) => sentence.text)).toEqual(["About 0.", "About 1.", "About 2."])
    expect(result.dropped).toBe(2 + 2 + 2)
  })

  it("blanks a tagline over ten words instead of cutting it, and keeps one of exactly ten", async () => {
    const tooLong = await rewrite({ ...emptyDraft(), tagline: words(11) } satisfies Draft)
    expect(tooLong.draft.tagline).toBe("")
    expect(tooLong.dropped).toBe(1)

    const exact = await rewrite({ ...emptyDraft(), tagline: words(10) } satisfies Draft)
    expect(exact.draft.tagline).toBe(words(10))
    expect(exact.dropped).toBe(0)
  })

  it("accepts a draft that is entirely empty", async () => {
    const result = await rewrite(emptyDraft())
    expect(result.draft).toEqual(emptyDraft())
    expect(result.dropped).toBe(0)
  })

  it("returns a typed invalid_output error after two invalid responses, without throwing", async () => {
    const client = new MockClient({ responses: ["definitely not json", "{ still: not json"] })
    const result = await rewriteForJob(client, { vault, job: uxJob, picks: uxPicks })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe("invalid_output")
  })

  it("rejects output that does not match the Draft schema", async () => {
    const client = new MockClient({ responses: ['{"tagline": 3}', '{"projects": "nope"}'] })
    const result = await rewriteForJob(client, { vault, job: uxJob, picks: uxPicks })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe("invalid_output")
  })

  it("recovers when the repair attempt returns a valid draft", async () => {
    const client = new MockClient({ responses: ["oops", JSON.stringify(emptyDraft())] })
    const result = await rewriteForJob(client, { vault, job: uxJob, picks: uxPicks })
    expect(result.ok).toBe(true)
  })

  it("does not call the model when there are no confirmed facts to write from", async () => {
    const captured: LLMGenerateRequest[] = []
    const client = clientReturning(emptyDraft(), captured)
    const result = await rewriteForJob(client, { vault: createEmptyVault("Nobody"), job: uxJob, picks: [] })

    expect(captured).toHaveLength(0)
    expect(result).toEqual({ ok: true, draft: emptyDraft(), dropped: 0 })
  })
})
