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

const TEMPLATES_WITH_HARDCODED_FOLLOWERS = new Set<TemplateStyle>(["bold-portrait", "brutalist", "bento-grid"])

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
    expect(data.targetRole).toBe("UX Engineer")
    expect(data.aiResume).toBeNull()
    expect(data.repos).toEqual([])
    expect(data.profile.username).toBe("alexchen-ui")
    expect(data.socialLinks).toEqual({ linkedin: "https://linkedin.com/in/alexchen-ui", blog: "https://alexchen.dev" })
  })

  it("keeps github-stats when the vault has a GitHub username and does not mutate the input config", async () => {
    const vault = loadAlexVault()
    const config = configFor("minimal-clean")
    const data = buildTemplateData({ vault, draft: await draftFor(vault, uxJob, uxPicks), picks: uxPicks, config })

    expect(data.config.sections).toContain("github-stats")
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

    // These templates hard-code a "Followers" stat in the hero for every portfolio. Remove the
    // template from the set (it.fails will error) once the template itself is fixed.
    const knownFollowersLeak = TEMPLATES_WITH_HARDCODED_FOLLOWERS.has(template)
    const followersTest = knownFollowersLeak ? it.fails : it
    followersTest("renders the resume-only vault without followers", async () => {
      expect((await renderResumeOnly()).toLowerCase()).not.toContain("followers")
    })
  })
})
