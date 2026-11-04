import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { NoteView } from "@/components/outputs/note-view"
import { ResumeView } from "@/components/outputs/resume-view"
import { buildResumeHtml, buildResumeModel, buildResumePlainText } from "@/lib/outputs/resume"
import { e } from "@/lib/templates/shared/escape"
import {
  UNDEFINED_LIKE,
  allUrls,
  draftFor,
  jobWithKeywords,
  loadAlexVault,
  loadResumeOnlyVault,
  makeFact,
  picksForAll,
  uxJob,
  uxPicks,
} from "./helpers"

function render(vault = loadAlexVault(), job = uxJob, picks = uxPicks, draft = draftFor(vault, job, picks)) {
  const model = buildResumeModel({ vault, draft, job, picks })
  return { model, html: buildResumeHtml(model), text: buildResumePlainText(model), vault, draft }
}

describe("resume XSS safety", () => {
  it("never leaves live script, handlers or javascript: links", () => {
    const vault = loadAlexVault()
    vault.person.name = "<script>alert(1)</script>Alex"
    vault.person.links = ["javascript:alert(1)", "https://ok.example.com/me"]
    vault.experience[0].company = '"><img src=x onerror=alert(1)>'
    const draft = draftFor(vault, uxJob, uxPicks)
    draft.tagline = "<img src=x onerror=alert(1)>"
    draft.projects[0].sentences[0].text = "<script>steal()</script> onerror=alert(2)"
    const { html, text } = render(vault, uxJob, uxPicks, draft)

    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/<img/i)
    expect(html).not.toMatch(/<[a-z][^>]*\sonerror=/i)
    expect(html).not.toMatch(/href="javascript:/i)
    expect(html).not.toContain("javascript:")
    expect(html).toContain("https://ok.example.com/me")
    expect(text).not.toContain("javascript:")
  })

  it("renders the preview in an iframe with an empty sandbox attribute", () => {
    const { html, text } = render()
    const markup = renderToStaticMarkup(createElement(ResumeView, { html, text, fileStem: "alex-chen" }))
    expect(markup).toContain('sandbox=""')
    expect(markup).not.toContain("allow-")
    expect(markup).toContain("srcDoc=")
  })

  it("drops http and malformed links", () => {
    const vault = loadAlexVault()
    vault.person.links = ["http://insecure.example.com", "not a url at all", "https://good.example.com"]
    const { model } = render(vault)
    expect(model.links.map((link) => link.url)).toEqual(["https://good.example.com"])
  })
})

describe("resume content rules", () => {
  it("never includes unconfirmed facts or skills", () => {
    const vault = loadAlexVault()
    vault.experience[0].facts.push(makeFact("f_unconfirmed", "UNCONFIRMED_EXPERIENCE_MARKER", false))
    vault.skills.push({ name: "UNCONFIRMED_SKILL_MARKER", source: "resume", confirmed: false })
    const { html, text } = render(vault)
    for (const output of [html, text]) {
      expect(output).not.toContain("UNCONFIRMED_EXPERIENCE_MARKER")
      expect(output).not.toContain("UNCONFIRMED_SKILL_MARKER")
      expect(output).not.toContain("Storybook")
      expect(output).not.toContain("Three.js")
    }
  })

  it("omits headings for empty sections", () => {
    const vault = loadAlexVault()
    vault.experience = []
    vault.education = []
    vault.skills = []
    const draft = draftFor(vault, uxJob, uxPicks)
    draft.tagline = ""
    draft.resumeBullets = []
    draft.projects = []
    const { html, text } = render(vault, uxJob, uxPicks, draft)
    for (const heading of ["Experience", "Education", "Skills", "Summary", "Highlights", "Projects"]) {
      expect(html).not.toContain(`<h2>${heading}</h2>`)
      expect(text).not.toContain(heading.toUpperCase())
    }
    expect(html).toContain("<h1>Alex Chen</h1>")
  })

  it("only shows Highlights when resume bullets exist, capped at 6", () => {
    const vault = loadAlexVault()
    const draft = draftFor(vault, uxJob, uxPicks)
    draft.resumeBullets = Array.from({ length: 9 }, (_, i) => ({ text: `Highlight ${i + 1}`, factIds: [] }))
    const { html, model } = render(vault, uxJob, uxPicks, draft)
    expect(html).toContain("<h2>Highlights</h2>")
    expect(model.highlights).toHaveLength(6)
  })

  it("caps project bullets at 3 and role bullets at 4", () => {
    const vault = loadAlexVault()
    const draft = draftFor(vault, uxJob, uxPicks)
    draft.projects[0].sentences = Array.from({ length: 6 }, (_, i) => ({ text: `Sentence ${i}`, factIds: [] }))
    vault.experience[0].facts = Array.from({ length: 7 }, (_, i) => makeFact(`f${i}`, `Role fact ${i}`))
    const { model } = render(vault, uxJob, uxPicks, draft)
    expect(model.projects[0].bullets).toHaveLength(3)
    expect(model.experience[0].bullets).toHaveLength(4)
  })

  it("keeps experience facts verbatim", () => {
    const vault = loadAlexVault()
    const { model } = render(vault)
    const confirmed = vault.experience[0].facts.filter((fact) => fact.confirmed).map((fact) => fact.text)
    for (const bullet of model.experience[0].bullets) expect(confirmed).toContain(bullet)
  })

  it("works for the resume-only fixture with no placeholder text", () => {
    const vault = loadResumeOnlyVault()
    const picks = picksForAll(vault)
    const { html, text } = render(vault, uxJob, picks)
    expect(html).not.toMatch(UNDEFINED_LIKE)
    expect(text).not.toMatch(UNDEFINED_LIKE)
    expect(html).not.toContain("N/A")
  })

  it("has no placeholder text for the alex-chen fixture", () => {
    const { html, text } = render()
    expect(html).not.toMatch(UNDEFINED_LIKE)
    expect(text).not.toMatch(UNDEFINED_LIKE)
  })
})

describe("resume ordering", () => {
  it("lists skills that match the job first", () => {
    const vault = loadAlexVault()
    vault.skills = [
      { name: "Storybook", source: "user", confirmed: true },
      { name: "Go", source: "user", confirmed: true },
      { name: "React", source: "user", confirmed: true },
      { name: "WebGL", source: "user", confirmed: true },
    ]
    const job = jobWithKeywords(["react", "webgl"])
    const { model } = render(vault, job, uxPicks, draftFor(vault, job, uxPicks))
    expect(model.skills).toEqual(["React", "WebGL", "Storybook", "Go"])
  })

  it("moves a fact matching a job keyword up within its role, ties keep order", () => {
    const vault = loadAlexVault()
    vault.experience[0].facts = [
      makeFact("a", "Mentored two engineers"),
      makeFact("b", "Shipped the WebGL renderer"),
      makeFact("c", "Ran design reviews"),
    ]
    const job = jobWithKeywords(["webgl"])
    const { model } = render(vault, job, uxPicks, draftFor(vault, job, uxPicks))
    expect(model.experience[0].bullets).toEqual([
      "Shipped the WebGL renderer",
      "Mentored two engineers",
      "Ran design reviews",
    ])
  })

  it("keeps roles in vault order", () => {
    const vault = loadAlexVault()
    const { model } = render(vault)
    expect(model.experience.map((role) => role.company)).toEqual(vault.experience.map((role) => role.company))
  })

  it("orders projects exactly like the picks", () => {
    const vault = loadAlexVault()
    const picks = [...uxPicks].reverse()
    const { model } = render(vault, uxJob, picks, draftFor(vault, uxJob, picks))
    expect(model.projects.map((project) => project.projectId)).toEqual(picks.map((pick) => pick.projectId))
  })

  it("skips picks that are missing from the vault or have no draft sentences", () => {
    const vault = loadAlexVault()
    const picks = [{ projectId: "proj_unknown", matchedRequirementIds: [], score: 1 }, ...uxPicks]
    const draft = draftFor(vault, uxJob, uxPicks)
    const { model } = render(vault, uxJob, picks, draft)
    expect(model.projects.map((project) => project.projectId)).toEqual(uxPicks.map((pick) => pick.projectId))
  })
})

describe("resume output consistency", () => {
  it("plain text carries the same bullets as the HTML", () => {
    const { model, html, text } = render()
    const bullets = [
      ...model.highlights,
      ...model.projects.flatMap((project) => project.bullets),
      ...model.experience.flatMap((role) => role.bullets),
    ]
    expect(bullets.length).toBeGreaterThan(0)
    for (const bullet of bullets) {
      expect(html).toContain(`<li>${e(bullet)}</li>`)
      expect(text).toContain(`- ${bullet}`)
    }
  })

  it("makes no external requests and links only to the person's own URLs", () => {
    const { html, vault, model } = render()
    expect(html).not.toMatch(/<script|<link|<img|<iframe|@import|url\(|\ssrc=/i)
    const allowed = new Set([
      ...vault.person.links.map((link) => new URL(link).href),
      ...model.projects.flatMap((project) => (project.url ? [new URL(project.url).href] : [])),
    ])
    for (const url of allUrls(html)) {
      expect(allowed.has(new URL(url).href)).toBe(true)
    }
  })

  it("is an accessible, printable document", () => {
    const { html } = render()
    expect(html).toContain('<html lang="en">')
    expect(html).toContain("<h1>")
    expect(html).toContain("@page")
    expect(html).toContain("@media print")
    expect(html).toContain("break-inside:avoid")
  })
})

describe("note view", () => {
  it("shows a read-only textarea with the note", () => {
    const markup = renderToStaticMarkup(createElement(NoteView, { text: "Hello,\n\nBody\n\nBest,\nAlex", wordCount: 4 }))
    expect(markup).toContain("readOnly")
    expect(markup).toContain("Body")
  })

  it("explains an empty note instead of rendering an empty textarea", () => {
    const markup = renderToStaticMarkup(createElement(NoteView, { text: "", wordCount: 0 }))
    expect(markup).not.toContain("<textarea")
  })
})
