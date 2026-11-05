import { describe, expect, it } from "vitest"
import { analyzeStage, generateStage, validatePicks, POSTING_LIMITS } from "@/lib/tailor/pipeline"
import { checkDraft as realCheckDraft } from "@/lib/check/check-draft"
import { analyzeJob as realAnalyzeJob } from "@/lib/job/analyze"
import { detectGaps as realDetectGaps } from "@/lib/job/gaps"
import { pickProjects as realPickProjects } from "@/lib/job/pick"
import { CANVAS_FLOW, clientReturning, MOTION_TOKENS } from "../rewrite/helpers"
import { stripScriptsAndStyles } from "../templates/helpers"
import { draftFollowingLeads, loadAlexVault, loadResumeOnlyVault, makeDeps, POSTING, unconfirmed, uxJob, uxPicks } from "./helpers"

const style = { template: "minimal-clean", colorScheme: "ocean" } as const
const INTERNAL = "internal stack detail 7f3a"

describe("analyzeStage", () => {
  it("rejects a posting that is too short or too long", async () => {
    const vault = loadAlexVault()
    const short = await analyzeStage(makeDeps(), { vault, postingText: "x".repeat(POSTING_LIMITS.min - 1) })
    const long = await analyzeStage(makeDeps(), { vault, postingText: "x".repeat(POSTING_LIMITS.max + 1) })
    expect(short).toMatchObject({ ok: false, error: { code: "too_short" } })
    expect(long).toMatchObject({ ok: false, error: { code: "too_long" } })
  })

  it("returns job, gaps and picks for a confirmed vault", async () => {
    const result = await analyzeStage(makeDeps(), { vault: loadAlexVault(), postingText: POSTING })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.job.title).toBe(uxJob.title)
      expect(result.data.picks.length).toBeGreaterThan(0)
    }
  })

  it("reports vault_empty when no project has a confirmed fact", async () => {
    const result = await analyzeStage(makeDeps(), { vault: unconfirmed(loadAlexVault()), postingText: POSTING })
    expect(result).toMatchObject({ ok: false, error: { code: "vault_empty" } })
  })

  it("drops picks for unknown or unconfirmed projects and duplicates", async () => {
    const deps = makeDeps({
      pickProjects: () => [
        ...uxPicks,
        { projectId: MOTION_TOKENS, matchedRequirementIds: [], score: 0.1 },
        { projectId: "proj_ghost", matchedRequirementIds: [], score: 0.1 },
      ],
    })
    const result = await analyzeStage(deps, { vault: loadAlexVault(), postingText: POSTING })
    expect(result.ok && result.data.picks.map((pick) => pick.projectId)).toEqual([MOTION_TOKENS, CANVAS_FLOW])
  })

  it("never reports success when a G module throws, and does not leak the error", async () => {
    const boom = () => {
      throw new Error(INTERNAL)
    }
    const deps = makeDeps({ analyzeJob: async () => boom(), detectGaps: boom, pickProjects: boom })
    const result = await analyzeStage(deps, { vault: loadAlexVault(), postingText: POSTING })
    expect(result).toMatchObject({ ok: false, error: { code: "unavailable" } })
    expect(JSON.stringify(result)).not.toContain(INTERNAL)
  })

  it("runs end to end with the real G modules", async () => {
    const deps = makeDeps({ analyzeJob: realAnalyzeJob, detectGaps: realDetectGaps, pickProjects: realPickProjects })
    const result = await analyzeStage(deps, { vault: loadAlexVault(), postingText: POSTING })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.job.requirements.length).toBeGreaterThanOrEqual(2)
    expect(result.data.picks.length).toBeGreaterThan(0)
  })

  it("maps an analyzer failure to a friendly error", async () => {
    const deps = makeDeps({ analyzeJob: async () => ({ ok: false, error: "boom" }) })
    const result = await analyzeStage(deps, { vault: loadAlexVault(), postingText: POSTING })
    expect(result).toMatchObject({ ok: false, error: { code: "analyze_failed" } })
    expect(JSON.stringify(result)).not.toContain("boom")
  })
})

describe("validatePicks", () => {
  const vault = loadAlexVault()
  it("accepts good picks", () => expect(validatePicks(vault, uxPicks)).toBeNull())
  it("rejects empty, duplicate, unknown and unconfirmed picks", () => {
    expect(validatePicks(vault, [])).not.toBeNull()
    expect(validatePicks(vault, [uxPicks[0], uxPicks[0]])).not.toBeNull()
    expect(validatePicks(vault, [{ projectId: "nope", matchedRequirementIds: [], score: 1 }])).not.toBeNull()
    expect(validatePicks(unconfirmed(vault), uxPicks)).not.toBeNull()
  })
})

describe("generateStage", () => {
  it("produces portfolio, resume and note with no placeholder leaks", async () => {
    const result = await generateStage(makeDeps(), { vault: loadAlexVault(), job: uxJob, picks: uxPicks, ...style })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // The templates' inline JS legitimately contains the keyword `null`, so check markup only.
    for (const html of [result.data.portfolioHtml, result.data.resumeHtml]) {
      expect(stripScriptsAndStyles(html)).not.toMatch(/undefined|\bnull\b|\bNaN\b/)
    }
    for (const text of [result.data.resumeText, result.data.noteText]) {
      expect(text).not.toMatch(/undefined|\bnull\b|\bNaN\b/)
    }
    expect(result.data.removed).toEqual([])
  })

  it("works for a resume-only vault", async () => {
    const vault = loadResumeOnlyVault()
    const picks = vault.projects.filter((p) => p.facts.some((f) => f.confirmed)).map((p) => ({ projectId: p.id, matchedRequirementIds: [], score: 1 }))
    if (picks.length === 0) return
    const result = await generateStage(makeDeps(), { vault, job: uxJob, picks: picks.slice(0, 4), ...style })
    expect(result.ok).toBe(true)
  })

  it("reports what the checker removed and drops a project left with no sentences", async () => {
    const checkDraft = async (draft: ReturnType<typeof draftFollowingLeads>) => ({
      clean: { ...draft, projects: draft.projects.map((p) => (p.projectId === CANVAS_FLOW ? { ...p, sentences: [] } : p)) },
      removed: [{ section: "project" as const, projectId: CANVAS_FLOW, text: "Invented claim", reason: "unsupported" as const }],
    })
    const result = await generateStage(makeDeps({ checkDraft }), { vault: loadAlexVault(), job: uxJob, picks: uxPicks, ...style })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.picks.map((p) => p.projectId)).toEqual([MOTION_TOKENS])
    expect(result.data.draft.projects.map((p) => p.projectId)).toEqual([MOTION_TOKENS])
    expect(result.data.removed).toHaveLength(1)
  })

  it("fails closed when the checker throws, with no output", async () => {
    const result = await generateStage(makeDeps({ checkDraft: async () => { throw new Error("down") } }), { vault: loadAlexVault(), job: uxJob, picks: uxPicks, ...style })
    expect(result).toMatchObject({ ok: false, error: { code: "check_failed" } })
    expect(result).not.toHaveProperty("data")
  })

  it("fails closed when the checker returns malformed output", async () => {
    const result = await generateStage(makeDeps({ checkDraft: (async () => ({ nope: true })) as never }), { vault: loadAlexVault(), job: uxJob, picks: uxPicks, ...style })
    expect(result).toMatchObject({ ok: false, error: { code: "check_failed" } })
  })

  it("rejects a checker that adds a sentence that was not in the draft", async () => {
    const checkDraft = async (draft: ReturnType<typeof draftFollowingLeads>) => ({
      clean: { ...draft, about: [...draft.about, { text: "Invented by the checker.", factIds: [] }] },
      removed: [],
    })
    const result = await generateStage(makeDeps({ checkDraft }), { vault: loadAlexVault(), job: uxJob, picks: uxPicks, ...style })
    expect(result).toMatchObject({ ok: false, error: { code: "check_failed" } })
  })

  it("rejects invalid picks before calling the model", async () => {
    let called = false
    const deps = makeDeps({ rewriteForJob: async () => { called = true; throw new Error("no") } })
    const result = await generateStage(deps, { vault: unconfirmed(loadAlexVault()), job: uxJob, picks: uxPicks, ...style })
    expect(result).toMatchObject({ ok: false, error: { code: "invalid_picks" } })
    expect(called).toBe(false)
  })

  it("never runs a throwing checker to success, and does not leak the error", async () => {
    const result = await generateStage(makeDeps({ checkDraft: async () => { throw new Error(INTERNAL) } }), { vault: loadAlexVault(), job: uxJob, picks: uxPicks, ...style })
    expect(result).toMatchObject({ ok: false, error: { code: "check_failed" } })
    expect(JSON.stringify(result)).not.toContain(INTERNAL)
  })

  it("the real checker removes a number the cited fact does not support, before any output", async () => {
    const lie = "Rendering 25,000+ DOM nodes as SVG had become a bottleneck"
    const draft = {
      tagline: "",
      about: [],
      projects: [
        { projectId: CANVAS_FLOW, sentences: [{ text: lie, factIds: ["fact_cf-hard"] }, { text: "Built with WebGL and React", factIds: ["fact_cf-tech"] }] },
        { projectId: MOTION_TOKENS, sentences: [{ text: "Enforces prefers-reduced-motion: reduce across all animated primitives", factIds: ["fact_mt-reduced-motion"] }] },
      ],
      resumeBullets: [{ text: lie, factIds: ["fact_cf-hard"] }],
      note: [],
    }
    const deps = makeDeps({ llm: clientReturning(draft), checkDraft: (d, v) => realCheckDraft(d, v) })
    const result = await generateStage(deps, { vault: loadAlexVault(), job: uxJob, picks: uxPicks, ...style })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.removed.filter((r) => r.reason === "number_mismatch")).toHaveLength(2)
    for (const output of [result.data.portfolioHtml, result.data.resumeHtml, result.data.resumeText, result.data.noteText]) {
      expect(output).not.toContain("25,000")
    }
  })
})
