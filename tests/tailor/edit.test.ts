import { describe, expect, it, vi } from "vitest"
import type { Draft } from "@/lib/schemas/draft"
import type { Vault } from "@/lib/schemas/vault"
import type { CheckResult, Removed } from "@/lib/schemas/tailor"
import {
  MAX_EDIT_CHARS,
  addUnconfirmedUserFact,
  applyEdit,
  defaultFactTarget,
  deleteSentence,
  picksForDraft,
  renderFromDraft,
  textAt,
  type EditDeps,
} from "@/lib/tailor/edit"
import { generateStage } from "@/lib/tailor/pipeline"
import { confirmFact, getConfirmedFacts } from "@/lib/vault/ops"
import { draftFollowingLeads, loadAlexVault, makeDeps, uxJob, uxPicks } from "./helpers"

const WATCHED_TECH = ["kubernetes", "rust", "graphql", "kafka"]

/** A deterministic stand-in for the fact checker: numbers and watched technologies must appear in confirmed facts. */
function fakeCheck(draft: Draft, vault: Vault): CheckResult {
  const known = getConfirmedFacts(vault)
    .map((fact) => fact.text.toLowerCase())
    .join(" ")
  const removed: Removed[] = []

  function verdict(text: string): Removed["reason"] | null {
    const lower = text.toLowerCase()
    const numbers = lower.match(/\d[\d,.]*\+?%?/g) ?? []
    if (numbers.some((value) => !known.includes(value))) return "number_mismatch"
    if (WATCHED_TECH.some((tech) => lower.includes(tech) && !known.includes(tech))) return "unknown_fact"
    return null
  }

  const keep = (sentences: Draft["about"], section: Removed["section"], projectId?: string) =>
    sentences.filter((sentence) => {
      const reason = verdict(sentence.text)
      if (reason) removed.push({ section, text: sentence.text, reason, ...(projectId ? { projectId } : {}) })
      return reason === null
    })

  let tagline = draft.tagline
  const taglineReason = tagline ? verdict(tagline) : null
  if (taglineReason) {
    removed.push({ section: "tagline", text: tagline, reason: taglineReason })
    tagline = ""
  }
  const clean: Draft = {
    tagline,
    about: keep(draft.about, "about"),
    projects: draft.projects.map((project) => ({ projectId: project.projectId, sentences: keep(project.sentences, "project", project.projectId) })),
    resumeBullets: keep(draft.resumeBullets, "resume"),
    note: keep(draft.note, "note"),
  }
  return { clean, removed }
}

function deps(check: EditDeps["checkDraft"] = async (draft, vault) => fakeCheck(draft, vault)): EditDeps {
  return { checkDraft: check }
}

function makeDraft(vault: Vault): Draft {
  const base = draftFollowingLeads
  void base
  return {
    tagline: "UX engineer building accessible interfaces",
    about: [{ text: "I build accessible interfaces with React and WebGL.", factIds: ["fact_cf-tech"] }],
    projects: [
      {
        projectId: "proj_canvas-flow",
        sentences: [
          { text: "Built a GPU-accelerated canvas engine with WebGL and React.", factIds: ["fact_cf-built"] },
          { text: "Replaced SVG rendering with a dual-layer canvas.", factIds: ["fact_cf-decided"] },
        ],
      },
    ],
    resumeBullets: [{ text: "Built a GPU-accelerated canvas engine.", factIds: ["fact_cf-built"] }],
    note: [{ text: "I would love to talk about accessible canvas work.", factIds: [] }],
  }
  void vault
}

const vault = loadAlexVault()
const ref = { section: "project", projectId: "proj_canvas-flow", index: 0 } as const

describe("applyEdit", () => {
  it("applies a supported edit and keeps the original fact links", async () => {
    const draft = makeDraft(vault)
    const result = await applyEdit(draft, ref, "Built a canvas engine on WebGL and React.", vault, deps())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(textAt(result.draft, ref)).toBe("Built a canvas engine on WebGL and React.")
    expect(result.draft.projects[0]?.sentences[0]?.factIds).toEqual(["fact_cf-built"])
    expect(textAt(draft, ref)).toBe("Built a GPU-accelerated canvas engine with WebGL and React.")
  })

  it("rejects an unsupported edit, explains why, and leaves the draft untouched", async () => {
    const draft = makeDraft(vault)
    const before = structuredClone(draft)
    const result = await applyEdit(draft, ref, "Ran the canvas engine on Kubernetes.", vault, deps())
    expect(result).toMatchObject({ ok: false, reason: "unknown_fact", suggestion: { kind: "add_fact", factText: "Ran the canvas engine on Kubernetes." } })
    expect(draft).toEqual(before)
  })

  it("rejects a number the confirmed facts do not contain", async () => {
    const result = await applyEdit(makeDraft(vault), ref, "Cut render time by 73%.", vault, deps())
    expect(result).toMatchObject({ ok: false, reason: "number_mismatch" })
  })

  it("never lets an unconfirmed fact back an edit", async () => {
    const result = await applyEdit(makeDraft(vault), ref, "Adopted by 45+ product teams.", vault, deps())
    expect(result.ok).toBe(false)
  })

  it("edits the tagline, which carries no fact ids", async () => {
    const draft = makeDraft(vault)
    const ok = await applyEdit(draft, { section: "tagline" }, "Engineer of accessible canvas tools", vault, deps())
    expect(ok.ok && ok.draft.tagline).toBe("Engineer of accessible canvas tools")
    const bad = await applyEdit(draft, { section: "tagline" }, "Rust expert for 12 years", vault, deps())
    expect(bad.ok).toBe(false)
  })

  it("rejects when the checker changes the text instead of only removing", async () => {
    const rewriting = deps(async (draft) => ({
      clean: { ...draft, projects: draft.projects.map((p) => ({ ...p, sentences: [{ text: "Something the checker wrote", factIds: [] }] })) },
      removed: [],
    }))
    const result = await applyEdit(makeDraft(vault), ref, "A harmless edit.", vault, rewriting)
    expect(result.ok).toBe(false)
  })

  it("fails closed when the checker throws or returns junk", async () => {
    const draft = makeDraft(vault)
    const throwing = await applyEdit(draft, ref, "A harmless edit.", vault, deps(() => Promise.reject(new Error("boom"))))
    expect(throwing).toMatchObject({ ok: false, reason: "check_unavailable" })
    const junk = await applyEdit(draft, ref, "A harmless edit.", vault, deps(async () => ({ nope: true }) as unknown as CheckResult))
    expect(junk).toMatchObject({ ok: false, reason: "check_unavailable" })
    expect(JSON.stringify(throwing)).not.toContain("boom")
  })

  it("rejects empty, over-long and missing targets without calling the checker", async () => {
    const check = vi.fn(async (draft: Draft, v: Vault) => fakeCheck(draft, v))
    const draft = makeDraft(vault)
    expect(await applyEdit(draft, ref, "   ", vault, deps(check))).toMatchObject({ ok: false, reason: "empty" })
    expect(await applyEdit(draft, ref, "x".repeat(MAX_EDIT_CHARS + 1), vault, deps(check))).toMatchObject({ ok: false, reason: "too_long" })
    expect(await applyEdit(draft, { ...ref, index: 9 }, "Fine text.", vault, deps(check))).toMatchObject({ ok: false, reason: "not_found" })
    expect(check).not.toHaveBeenCalled()
  })

  it("only attaches facts that are confirmed in the vault", async () => {
    const draft = makeDraft(vault)
    const unconfirmedAttach = await applyEdit(draft, ref, "Fine text.", vault, deps(), { attachFactIds: ["fact_cf-outcome"] })
    expect(unconfirmedAttach).toMatchObject({ ok: false, reason: "bad_fact" })
    const ghost = await applyEdit(draft, ref, "Fine text.", vault, deps(), { attachFactIds: ["ghost"] })
    expect(ghost).toMatchObject({ ok: false, reason: "bad_fact" })
    const good = await applyEdit(draft, ref, "Fine text.", vault, deps(), { attachFactIds: ["fact_cf-hard", "fact_cf-hard"] })
    expect(good.ok && good.draft.projects[0]?.sentences[0]?.factIds).toEqual(["fact_cf-built", "fact_cf-hard"])
  })
})

describe("add a fact, confirm it, then edit", () => {
  it("only passes the re-check once the user has confirmed the new fact", async () => {
    const draft = makeDraft(vault)
    const text = "Ran the canvas engine on Kubernetes."
    const rejected = await applyEdit(draft, ref, text, vault, deps())
    expect(rejected.ok).toBe(false)

    const target = defaultFactTarget(ref, vault, uxPicks)
    expect(target).toEqual({ type: "project", id: "proj_canvas-flow" })
    const { vault: withFact, factId } = addUnconfirmedUserFact(vault, target!, text)
    const added = withFact.projects.flatMap((p) => p.facts).find((fact) => fact.id === factId)
    expect(added).toMatchObject({ text, source: "user", confirmed: false })
    expect(getConfirmedFacts(withFact).some((fact) => fact.id === factId)).toBe(false)

    const stillRejected = await applyEdit(draft, ref, text, withFact, deps())
    expect(stillRejected.ok).toBe(false)
    const attachUnconfirmed = await applyEdit(draft, ref, text, withFact, deps(), { attachFactIds: [factId] })
    expect(attachUnconfirmed).toMatchObject({ ok: false, reason: "bad_fact" })

    const confirmed = confirmFact(withFact, factId)
    const accepted = await applyEdit(draft, ref, text, confirmed, deps(), { attachFactIds: [factId] })
    expect(accepted.ok).toBe(true)
    if (accepted.ok) expect(accepted.draft.projects[0]?.sentences[0]?.factIds).toContain(factId)
  })

  it("chooses the first picked project when the edited section is not a project", () => {
    expect(defaultFactTarget({ section: "about", index: 0 }, vault, uxPicks)).toMatchObject({ type: "project" })
  })
})

describe("deleteSentence", () => {
  it("removes a sentence without any check and does not mutate the input", () => {
    const draft = makeDraft(vault)
    const before = structuredClone(draft)
    const next = deleteSentence(draft, ref)
    expect(next.projects[0]?.sentences).toHaveLength(1)
    expect(draft).toEqual(before)
  })

  it("drops a project that has no sentences left and clears the tagline", () => {
    let draft = makeDraft(vault)
    draft = deleteSentence(draft, ref)
    draft = deleteSentence(draft, ref)
    expect(draft.projects).toEqual([])
    expect(picksForDraft(draft, uxPicks).some((pick) => pick.projectId === "proj_canvas-flow")).toBe(false)
    expect(deleteSentence(draft, { section: "tagline" }).tagline).toBe("")
  })
})

describe("renderFromDraft", () => {
  const style = { template: "minimal-clean", colorScheme: "ocean" } as const

  it("matches the generate stage output for an unedited draft", async () => {
    const result = await generateStage(makeDeps(), { vault, job: uxJob, picks: uxPicks, ...style })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const out = result.data
    const rendered = renderFromDraft({ vault, job: uxJob, draft: out.draft, picks: out.picks, ...style })
    expect(rendered.portfolioHtml).toBe(out.portfolioHtml)
    expect(rendered.resumeText).toBe(out.resumeText)
    expect(rendered.noteText).toBe(out.noteText)
  })

  it("shows an accepted edit and no longer shows a deleted sentence", async () => {
    const result = await generateStage(makeDeps(), { vault, job: uxJob, picks: uxPicks, ...style })
    if (!result.ok) throw new Error("generate failed")
    const draft = makeDraft(vault)
    const edited = await applyEdit(draft, ref, "Built a canvas engine on WebGL and React.", vault, deps())
    if (!edited.ok) throw new Error("edit failed")
    const withEdit = renderFromDraft({ vault, job: uxJob, draft: edited.draft, picks: result.data.picks, ...style })
    expect(withEdit.portfolioHtml).toContain("Built a canvas engine on WebGL and React.")
    const withoutSecond = renderFromDraft({ vault, job: uxJob, draft: deleteSentence(edited.draft, { ...ref, index: 1 }), picks: result.data.picks, ...style })
    expect(withoutSecond.portfolioHtml).not.toContain("Replaced SVG rendering with a dual-layer canvas.")
  })
})
