import { describe, expect, it } from "vitest"

import { checkDraft } from "@/lib/check/check-draft"
import { MockClient } from "@/lib/llm/mock"
import type { Draft, Sentence } from "@/lib/schemas/draft"
import type { Removed } from "@/lib/schemas/tailor"
import type { Vault } from "@/lib/schemas/vault"
import { loadAlexVault } from "../vault/helpers"

const CANVAS_FLOW = "proj_canvas-flow"
const MOTION_TOKENS = "proj_motion-tokens"
const TREE_GRID = "proj_headless-tree-grid"

function vault(): Vault {
  const v = structuredClone(loadAlexVault())
  v.experience[2].facts.push({
    id: "fact_apex-contrib",
    text: "Contributed to the checkout redesign",
    kind: "role",
    source: "user",
    confirmed: true,
  })
  return v
}

const s = (text: string, factIds: string[]): Sentence => ({ text, factIds })

const LIES = {
  inventedNumber: s("Rendering 25,000+ DOM nodes as SVG had become a bottleneck", ["fact_cf-hard"]),
  inventedTech: s("Built with WebGL, React and Vue", ["fact_cf-tech"]),
  inflatedVerb: s("Led the checkout redesign", ["fact_apex-contrib"]),
  fabricatedId: s("Mentored 8 senior engineers", ["fact_does-not-exist"]),
  unconfirmed: s("60fps pan/zoom on 4K displays, even on mid-range laptops", ["fact_cf-outcome"]),
  crossProject: s("Supports 100k+ rows", ["fact_htg-metric"]),
  noFactIds: s("Passionate about delightful interfaces", []),
  inventedPercent: s("Improved Largest Contentful Paint by 65%", ["fact_lf-outcome"]),
}

const TRUE = {
  reworded: s("It enforces prefers-reduced-motion across every animated primitive", ["fact_mt-reduced-motion"]),
  mentor: s("Mentored 8 senior engineers at DesignOS", ["fact_dos-mentor", "fact_dos-role"]),
  rows: s("Handles hierarchical tables with 100k+ rows", ["fact_htg-metric", "fact_htg-built"]),
  tech: s("Built with WebGL and React", ["fact_cf-tech"]),
}

const LYING_TAGLINE = "Alex Chen, Principal Engineer at Google"

function lyingDraft(): Draft {
  return {
    tagline: LYING_TAGLINE,
    about: [LIES.fabricatedId, TRUE.mentor],
    projects: [
      { projectId: CANVAS_FLOW, sentences: [LIES.inventedNumber, TRUE.tech, LIES.inventedTech, LIES.unconfirmed, LIES.crossProject] },
      { projectId: MOTION_TOKENS, sentences: [TRUE.reworded] },
      { projectId: TREE_GRID, sentences: [TRUE.rows] },
    ],
    resumeBullets: [LIES.inflatedVerb, LIES.inventedPercent],
    note: [LIES.noFactIds],
  }
}

function reasonFor(removed: Removed[], text: string): Removed["reason"] | undefined {
  return removed.find((entry) => entry.text === text)?.reason
}

function allSentences(draft: Draft): Sentence[] {
  return [...draft.about, ...draft.projects.flatMap((p) => p.sentences), ...draft.resumeBullets, ...draft.note]
}

describe("checkDraft", () => {
  it("removes each planted lie with the right reason", async () => {
    const { removed } = await checkDraft(lyingDraft(), vault())
    expect(reasonFor(removed, LIES.inventedNumber.text)).toBe("number_mismatch")
    expect(reasonFor(removed, LIES.inventedPercent.text)).toBe("number_mismatch")
    expect(reasonFor(removed, LIES.inventedTech.text)).toBe("unsupported")
    expect(reasonFor(removed, LIES.inflatedVerb.text)).toBe("unsupported")
    expect(reasonFor(removed, LIES.fabricatedId.text)).toBe("unknown_fact")
    expect(reasonFor(removed, LIES.unconfirmed.text)).toBe("unconfirmed_fact")
    expect(reasonFor(removed, LIES.crossProject.text)).toBe("unsupported")
    expect(reasonFor(removed, LIES.noFactIds.text)).toBe("unsupported")
    expect(removed.find((entry) => entry.section === "tagline")).toEqual({
      section: "tagline",
      text: LYING_TAGLINE,
      reason: "unsupported",
    })
  })

  it("records the section and project of a removed project sentence", async () => {
    const { removed } = await checkDraft(lyingDraft(), vault())
    expect(removed.find((entry) => entry.text === LIES.crossProject.text)).toMatchObject({
      section: "project",
      projectId: CANVAS_FLOW,
    })
  })

  it("keeps faithful sentences, including a reworded one, in the original order", async () => {
    const { clean } = await checkDraft(lyingDraft(), vault())
    expect(clean.tagline).toBe("")
    expect(clean.about).toEqual([TRUE.mentor])
    expect(clean.projects).toEqual([
      { projectId: CANVAS_FLOW, sentences: [TRUE.tech] },
      { projectId: MOTION_TOKENS, sentences: [TRUE.reworded] },
      { projectId: TREE_GRID, sentences: [TRUE.rows] },
    ])
    expect(clean.resumeBullets).toEqual([])
    expect(clean.note).toEqual([])
  })

  it("keeps a tagline whose claims are all in confirmed facts, skills or the name", async () => {
    const draft = { ...lyingDraft(), tagline: "Alex Chen, Staff Frontend Engineer working in React" }
    const { clean } = await checkDraft(draft, vault())
    expect(clean.tagline).toBe(draft.tagline)
  })

  it("never outputs text that was not in the input", async () => {
    const input = lyingDraft()
    const inputTexts = new Set(allSentences(input).map((sentence) => sentence.text))
    const { clean } = await checkDraft(input, vault())
    for (const sentence of allSentences(clean)) expect(inputTexts.has(sentence.text)).toBe(true)
    expect(["", input.tagline]).toContain(clean.tagline)
  })

  it("keeps the deterministic result when the LLM pass returns invalid JSON", async () => {
    const deterministic = await checkDraft(lyingDraft(), vault())
    const broken = new MockClient({ responses: ["not json", "still not json", "nope"] })
    expect(await checkDraft(lyingDraft(), vault(), broken)).toEqual(deterministic)
  })

  it("keeps the deterministic result when the LLM pass throws", async () => {
    const deterministic = await checkDraft(lyingDraft(), vault())
    const throwing = new MockClient({
      responses: [
        () => {
          throw new Error("quota")
        },
      ],
    })
    expect(await checkDraft(lyingDraft(), vault(), throwing)).toEqual(deterministic)
  })

  it("lets the LLM pass remove more, never add", async () => {
    const deterministic = await checkDraft(lyingDraft(), vault())
    // Survivors are checked in order about, projects, resume, note; index 0 is TRUE.mentor.
    const judge = new MockClient({ responses: [JSON.stringify({ results: [{ index: 0, supported: false }] })] })
    const judged = await checkDraft(lyingDraft(), vault(), judge)
    expect(judged.clean.about).toEqual([])
    expect(judged.removed).toHaveLength(deterministic.removed.length + 1)
    expect(reasonFor(judged.removed, TRUE.mentor.text)).toBe("unsupported")
    expect(judged.clean.projects).toEqual(deterministic.clean.projects)
  })

  it("does not call the model when nothing survives", async () => {
    const calls: unknown[] = []
    const spy = new MockClient({ responses: [(req) => { calls.push(req); return "{}" }] })
    const draft: Draft = { tagline: "", about: [LIES.fabricatedId], projects: [], resumeBullets: [], note: [] }
    await checkDraft(draft, vault(), spy)
    expect(calls).toHaveLength(0)
  })
})
