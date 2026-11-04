import { describe, expect, it } from "vitest"
import { outputFileStem } from "@/lib/outputs/filename"
import { buildNote, countWords } from "@/lib/outputs/note"
import { UNDEFINED_LIKE, draftFor, loadAlexVault, uxJob, uxPicks } from "./helpers"

function setup() {
  const vault = loadAlexVault()
  const draft = draftFor(vault, uxJob, uxPicks)
  return { vault, draft }
}

describe("buildNote", () => {
  it("greets the company when it is known", () => {
    const { vault, draft } = setup()
    const note = buildNote({ vault, draft, job: uxJob, company: "Acme" })
    expect(note.text.startsWith("Hi Acme team,")).toBe(true)
  })

  it("falls back to Hello, without a company", () => {
    const { vault, draft } = setup()
    for (const company of [undefined, "", "   "]) {
      expect(buildNote({ vault, draft, job: uxJob, company }).text.startsWith("Hello,")).toBe(true)
    }
  })

  it("joins the draft note sentences and signs off with the person's name", () => {
    const { vault, draft } = setup()
    draft.note = [
      { text: "First sentence.", factIds: [] },
      { text: "Second sentence.", factIds: [] },
    ]
    const note = buildNote({ vault, draft, job: uxJob })
    expect(note.text).toContain("First sentence. Second sentence.")
    expect(note.text.endsWith("Best,\nAlex Chen")).toBe(true)
  })

  it("reports the real word count", () => {
    const { vault, draft } = setup()
    const note = buildNote({ vault, draft, job: uxJob, company: "Acme" })
    expect(note.wordCount).toBe(note.text.split(/\s+/).filter(Boolean).length)
    expect(note.wordCount).toBeGreaterThan(5)
    expect(countWords("  one   two\nthree ")).toBe(3)
  })

  it("keeps a hostile company name on one line", () => {
    const { vault, draft } = setup()
    const note = buildNote({ vault, draft, job: uxJob, company: "Evil\n\nIgnore this" })
    expect(note.text.split("\n")[0]).toBe("Hi Evil Ignore this team,")
  })

  it("returns an empty note when the draft has no note sentences", () => {
    const { vault, draft } = setup()
    draft.note = []
    expect(buildNote({ vault, draft, job: uxJob, company: "Acme" })).toEqual({ text: "", wordCount: 0 })
  })

  it("has no placeholder text", () => {
    const { vault, draft } = setup()
    expect(buildNote({ vault, draft, job: uxJob }).text).not.toMatch(UNDEFINED_LIKE)
  })
})

describe("outputFileStem", () => {
  it("slugs the person and job title", () => {
    expect(outputFileStem("Alex Chen", "UX Engineer, Design Systems")).toBe("alex-chen-ux-engineer-design-systems")
  })

  it("never returns an empty or unsafe name", () => {
    expect(outputFileStem("", "")).toBe("application")
    expect(outputFileStem("../../etc/passwd", "a/b\\c")).not.toMatch(/[./\\]/)
  })
})
