import { describe, expect, it } from "vitest"
import { rewriteForJob } from "@/lib/rewrite/rewrite"
import { buildTemplateData } from "@/lib/rewrite/to-template"
import { buildPortfolioHtml } from "@/lib/templates"
import type { Draft } from "@/lib/schemas/draft"
import type { JobProfile, ProjectPick } from "@/lib/schemas/job"
import type { Vault } from "@/lib/schemas/vault"
import type { PortfolioConfig, TemplateStyle } from "@/lib/types"
import { ALL_SECTIONS, TEMPLATES, stripScriptsAndStyles, textContent } from "../templates/helpers"
import { leadFollowingClient, loadAlexVault, loadResumeOnlyVault, uxJob, uxPicks } from "./helpers"

const TEMPLATES_WITH_HARDCODED_FOLLOWERS = new Set<TemplateStyle>()

/** Markup and text only: the templates' own inline JS legitimately contains the keyword `null`. */
function expectNoLeakedValues(html: string): void {
  const markup = stripScriptsAndStyles(html)
  expect(markup).not.toMatch(/undefined/)
  expect(markup).not.toMatch(/\bnull\b/)
  expect(markup).not.toMatch(/\bNaN\b/)
}

function configFor(template: TemplateStyle): PortfolioConfig {
  return { template, colorScheme: "ocean", sections: [...ALL_SECTIONS], socialLinks: {} }
}

async function draftFor(vault: Vault, job: JobProfile, picks: ProjectPick[]): Promise<Draft> {
  const result = await rewriteForJob(leadFollowingClient(), { vault, job, picks })
  if (!result.ok) throw new Error("rewrite failed")
  return result.draft
}

describe("buildTemplateData", () => {
  it("maps the draft and vault onto TemplateData", async () => {
    const vault = loadAlexVault()
    const draft = await draftFor(vault, uxJob, uxPicks)
    const data = buildTemplateData({ vault, draft, picks: uxPicks, config: configFor("minimal-clean"), job: uxJob })

    expect(data.aiProjects?.map((project) => project.name)).toEqual(["motion-tokens", "canvas-flow"])
    expect(data.aiProjects?.[0]).toEqual({
      name: "motion-tokens",
      url: "https://github.com/alexchen-ui/motion-tokens",
      language: "TypeScript",
      description: draft.projects[0].sentences.map((sentence) => sentence.text).join(" "),
      stars: 1250,
      forks: 84,
    })
    expect(data.heroTagline).toBe(draft.tagline)
    expect(data.aiBio).toBe(draft.about.map((sentence) => sentence.text).join(" "))
    expect(data.targetRole).toBeNull()
    expect(data.config.sections).not.toContain("now")
    expect(data.aiResume?.highlights).toEqual(vault.experience.flatMap((item) => item.facts.filter((fact) => fact.confirmed).map((fact) => `${item.title} · ${item.company}: ${fact.text}`)))
    expect(data.repos.length).toBeGreaterThan(0)
    expect(data.repos.every((repo) => repo.description === null && repo.fork === false)).toBe(true)
    expect(data.repos[0]).toMatchObject({ name: "motion-tokens", language: "TypeScript" })
    expect(data.profile.avatar_url).toBe("https://github.com/alexchen-ui.png?size=460")
    expect(data.profile.username).toBe("alexchen-ui")
    expect(data.socialLinks).toEqual({ linkedin: "https://linkedin.com/in/alexchen-ui", blog: "https://alexchen.dev", ...(vault.person.email ? { email: vault.person.email } : {}) })
  })

  it("omits invented profile statistics even with a GitHub username and preserves the input config", async () => {
    const vault = loadAlexVault()
    const config = configFor("minimal-clean")
    const data = buildTemplateData({ vault, draft: await draftFor(vault, uxJob, uxPicks), picks: uxPicks, config })

    expect(data.config.sections).not.toContain("github-stats")
    expect(config.sections).toEqual(ALL_SECTIONS)
  })

  it("removes github-stats when the vault has no GitHub username", async () => {
    const vault = loadResumeOnlyVault()
    const config = configFor("minimal-clean")
    const data = buildTemplateData({ vault, draft: await draftFor(vault, uxJob, []), picks: [], config })

    expect(data.config.sections).not.toContain("github-stats")
    expect(config.sections).toContain("github-stats")
  })

  it("uses '#' for a project without a URL and null for a missing language", async () => {
    const vault = loadAlexVault()
    const project = vault.projects.find((candidate) => candidate.id === "proj_motion-tokens")!
    delete project.url
    delete project.primaryLanguage
    delete project.stats

    const draft = await draftFor(vault, uxJob, uxPicks)
    const data = buildTemplateData({ vault, draft, picks: uxPicks, config: configFor("minimal-clean") })
    const adapted = data.aiProjects!.find((candidate) => candidate.name === "motion-tokens")!

    expect(adapted).toMatchObject({ url: "#", language: null, stars: 0, forks: 0 })
  })

  it("reports no tagline or bio as null so templates use their own empty state", () => {
    const vault = loadAlexVault()
    const draft: Draft = { tagline: "", about: [], projects: [], resumeBullets: [], note: [] }
    const data = buildTemplateData({ vault, draft, picks: [], config: configFor("minimal-clean") })

    expect(data.heroTagline).toBeNull()
    expect(data.aiBio).toBeNull()
    expect(data.aiProjects).toEqual([])
  })
})

describe("rendered HTML", () => {
  describe.each(TEMPLATES)("%s", (template) => {
    it("renders the alex-chen vault without leaked values and with the first project sentence", async () => {
      const vault = loadAlexVault()
      const draft = await draftFor(vault, uxJob, uxPicks)
      const html = buildPortfolioHtml(
        buildTemplateData({ vault, draft, picks: uxPicks, config: configFor(template), job: uxJob }),
      )

      expectNoLeakedValues(html)

      const firstSentence = draft.projects[0].sentences[0].text
      expect(textContent(html)).toContain(firstSentence)
    })

    async function renderResumeOnly(): Promise<string> {
      const vault = loadResumeOnlyVault()
      const draft = await draftFor(vault, uxJob, [])
      return buildPortfolioHtml(buildTemplateData({ vault, draft, picks: [], config: configFor(template), job: uxJob }))
    }

    it("renders the resume-only vault without leaked values", async () => {
      expectNoLeakedValues(await renderResumeOnly())
    })

    it("renders selected education and local initials without external avatar requests", async () => {
      const vault = loadResumeOnlyVault()
      vault.education = [{ id: "education_selected", institution: "Selected University", degree: "Computer Science" }]
      const draft = await draftFor(vault, uxJob, [])
      const html = buildPortfolioHtml(buildTemplateData({ vault, draft, picks: [], config: configFor(template) }))
      expect(html).toContain('id="education"')
      expect(textContent(html)).toContain("Selected University")
      expect(html).not.toContain("ui-avatars.com")
      expect(html).not.toContain('src=""')
    })

    // These templates hard-code a "Followers" stat in the hero for every portfolio. Remove the
    // template from the set (it.fails will error) once the template itself is fixed.
    const knownFollowersLeak = TEMPLATES_WITH_HARDCODED_FOLLOWERS.has(template)
    const followersTest = knownFollowersLeak ? it.fails : it
    followersTest("renders the resume-only vault without followers", async () => {
      expect((await renderResumeOnly()).toLowerCase()).not.toContain("followers")
    })
  })
})
