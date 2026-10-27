import { describe, expect, it } from "vitest"
import type { RepoDeepDive } from "@/lib/github"
import { repoToProjectDraft } from "@/lib/ingest/github"
import { projectSchema } from "@/lib/schemas/vault"

function dive(overrides: Partial<RepoDeepDive> = {}): RepoDeepDive {
  return {
    owner: "alexchen-ui",
    name: "canvas-flow",
    readme: "# canvas-flow",
    languages: { TypeScript: 82, GLSL: 11.5, CSS: 5.5, HTML: 1 },
    commits: ["Add spatial index"],
    topics: ["canvas", "webgl", "TypeScript"],
    homepage: "https://canvasflow.dev/",
    description: "GPU-accelerated infinite canvas built with WebGL",
    stars: 3840,
    forks: 290,
    degraded: [],
    ...overrides,
  }
}

describe("repoToProjectDraft", () => {
  it("makes every fact unconfirmed, github-sourced and backed by evidence", () => {
    const project = repoToProjectDraft(dive())
    expect(projectSchema.safeParse(project).success).toBe(true)
    expect(project.facts.length).toBeGreaterThan(0)
    for (const fact of project.facts) {
      expect(fact.confirmed).toBe(false)
      expect(fact.source).toBe("github")
      expect((fact.evidence ?? "").trim().length).toBeGreaterThan(0)
    }
  })

  it("never mentions stars in a fact, but keeps them in stats", () => {
    const project = repoToProjectDraft(dive())
    for (const fact of project.facts) {
      expect(fact.text).not.toMatch(/star/i)
      expect(fact.evidence ?? "").not.toMatch(/star/i)
    }
    expect(project.stats).toEqual({ stars: 3840, forks: 290 })
  })

  it("produces no description-based built fact when the description is empty", () => {
    for (const description of [null, "   "]) {
      const project = repoToProjectDraft(
        dive({ description: description as string | null, homepage: null }),
      )
      expect(project.facts.filter((fact) => fact.kind === "built")).toEqual([])
    }
  })

  it("describes languages honestly and skips tiny ones", () => {
    const project = repoToProjectDraft(dive())
    const texts = project.facts.map((fact) => fact.text)
    expect(texts).toContain("Written mostly in TypeScript (82% of the code)")
    expect(texts).toContain("Includes GLSL (12% of the code)")
    expect(texts.some((text) => text.includes("HTML"))).toBe(false)
    expect(project.primaryLanguage).toBe("TypeScript")
  })

  it("dedupes techs case-insensitively and builds a canonical url", () => {
    const project = repoToProjectDraft(dive())
    expect(project.techs.filter((tech) => tech.toLowerCase() === "typescript")).toHaveLength(1)
    expect(project.url).toBe("https://github.com/alexchen-ui/canvas-flow")
    expect(project.sourceSnapshot?.commits).toEqual(["Add spatial index"])
  })
})
