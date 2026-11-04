import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchRepoDeepDive } from "@/lib/github"
import { repoToProjectDraft } from "@/lib/ingest/github"
import { mergeImport } from "@/lib/ingest/merge"
import { extractResume } from "@/lib/ingest/resume"
import { countFacts, countVaultFacts } from "@/lib/ingest/summary"
import { MockClient } from "@/lib/llm/mock"
import { createEmptyVault } from "@/lib/vault/ops"
import { alexChenPersona } from "@/fixtures/personas"
import { stubGitHubFetch } from "./helpers"

const MIGRATION_LINE =
  "Architected and led the company-wide migration to a unified design token engine (motion-tokens), used by 45+ product teams across web, iOS, and Android."

afterEach(() => vi.unstubAllGlobals())

describe("alex-chen import walk-through (fixtures, no network)", () => {
  it("builds the vault the /vault page renders after both imports", async () => {
    stubGitHubFetch()
    const dive = await fetchRepoDeepDive("alexchen-ui", "canvas-flow")
    const repoProject = repoToProjectDraft(dive)

    const llm = new MockClient({
      responses: [
        JSON.stringify({
          experience: [
            {
              company: "DesignOS",
              title: "Staff Frontend Engineer",
              evidence: "DesignOS",
              facts: [{ text: "Led migration to a unified design token engine", kind: "outcome", evidence: MIGRATION_LINE }],
            },
          ],
          projects: [{ name: "canvas-flow", techs: ["TypeScript"], evidence: "canvas-flow", facts: [] }],
          skills: [{ name: "TypeScript", evidence: "TypeScript" }],
          education: [],
        }),
      ],
    })
    const extraction = await extractResume(llm, alexChenPersona.resumeText)
    expect(extraction.ok).toBe(true)
    if (!extraction.ok) return

    const afterRepos = mergeImport(createEmptyVault("New vault"), {
      projects: [repoProject],
      githubUsername: "alexchen-ui",
      personName: "Alex Chen",
    })
    const vault = mergeImport(afterRepos, {
      projects: extraction.data.projects,
      experience: extraction.data.experience,
      skills: extraction.data.skills,
      education: extraction.data.education,
    })

    const summary = {
      name: vault.person.name,
      totals: countVaultFacts(vault),
      projects: vault.projects.map((p) => ({ name: p.name, ...countFacts(p.facts), lang: p.primaryLanguage })),
      experience: vault.experience.map((e) => `${e.title} at ${e.company}: ${countFacts(e.facts).total}`),
      skills: vault.skills.length,
    }
    expect(summary.name).toBe("Alex Chen")
    expect(summary.totals).toEqual({ total: 6, unconfirmed: 6 })
    expect(summary.projects).toEqual([{ name: "canvas-flow", total: 5, unconfirmed: 5, lang: "TypeScript" }])
    expect(summary.experience).toEqual(["Staff Frontend Engineer at DesignOS: 1"])
    expect(summary.skills).toBe(1)
    expect(vault.projects.filter((p) => p.name === "canvas-flow")).toHaveLength(1)
  })
})
