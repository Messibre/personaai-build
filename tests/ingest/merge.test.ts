import { describe, expect, it } from "vitest"
import { DEFAULT_VAULT_NAME, mergeImport, type ImportBundle } from "@/lib/ingest/merge"
import type { Fact, Project } from "@/lib/schemas/vault"
import { vaultSchema } from "@/lib/schemas/vault"
import { createEmptyVault } from "@/lib/vault/ops"
import { loadAlexVault } from "../vault/helpers"

const NOW = "2030-01-01T00:00:00.000Z"

function fact(id: string, text: string, source: Fact["source"], confirmed = false): Fact {
  return { id, text, kind: "built", source, evidence: text, confirmed }
}

function project(name: string, facts: Fact[], extra: Partial<Project> = {}): Project {
  return { id: `proj_${name}`, name, techs: [], facts, ...extra }
}

describe("mergeImport", () => {
  it("is idempotent: merging twice equals merging once", () => {
    const bundle: ImportBundle = {
      projects: [
        project("canvas-flow", [fact("f1", "Renders with WebGL", "github")], {
          url: "https://github.com/a/canvas-flow",
          techs: ["TypeScript"],
        }),
      ],
      skills: [{ name: "React", source: "resume", confirmed: false }],
      githubUsername: "a",
    }
    const base = createEmptyVault("Someone")
    const once = mergeImport(base, bundle, { now: NOW })
    const twice = mergeImport(once, bundle, { now: "2031-01-01T00:00:00.000Z" })

    expect(twice).toEqual(once)
    expect(twice).toBe(once)
    expect(vaultSchema.safeParse(once).success).toBe(true)
  })

  it("is idempotent against a richer vault too", () => {
    const base = loadAlexVault()
    const bundle: ImportBundle = {
      projects: [project("canvas-flow", [fact("new1", "Brand new fact", "github")], { techs: ["Rust"] })],
    }
    const once = mergeImport(base, bundle, { now: NOW })
    expect(mergeImport(once, bundle, { now: NOW })).toEqual(once)
  })

  it("merges a GitHub repo into the resume project of the same name instead of duplicating it", () => {
    const base = mergeImport(
      createEmptyVault("Someone"),
      { projects: [project("Canvas-Flow", [fact("r1", "Led the rendering rewrite", "resume")])] },
      { now: NOW },
    )
    const merged = mergeImport(
      base,
      {
        projects: [
          project("canvas-flow", [fact("g1", "Written mostly in TypeScript (82% of the code)", "github")], {
            url: "https://github.com/a/canvas-flow",
            primaryLanguage: "TypeScript",
            stats: { stars: 5, forks: 1 },
            techs: ["TypeScript"],
          }),
        ],
      },
      { now: "2030-02-01T00:00:00.000Z" },
    )

    expect(merged.projects).toHaveLength(1)
    const [only] = merged.projects
    expect(only.name).toBe("Canvas-Flow")
    expect(only.url).toBe("https://github.com/a/canvas-flow")
    expect(only.primaryLanguage).toBe("TypeScript")
    expect(only.stats).toEqual({ stars: 5, forks: 1 })
    expect(only.techs).toEqual(["TypeScript"])
    expect(only.facts.map((entry) => entry.source).sort()).toEqual(["github", "resume"])
  })

  it("keeps confirmed facts confirmed and never confirms incoming ones", () => {
    const base = loadAlexVault()
    const existing = base.projects[0]
    const confirmedFact = existing.facts.find((entry) => entry.confirmed)
    expect(confirmedFact).toBeDefined()

    const merged = mergeImport(
      base,
      {
        projects: [
          project(
            existing.name,
            [
              { ...confirmedFact!, id: "dup-id", confirmed: false },
              fact("fresh", "A different, new claim", "github", true),
            ],
          ),
        ],
      },
      { now: NOW },
    )

    const after = merged.projects[0]
    expect(after.facts.filter((entry) => entry.text === confirmedFact!.text)).toHaveLength(1)
    expect(after.facts.find((entry) => entry.id === confirmedFact!.id)?.confirmed).toBe(true)
    expect(after.facts.find((entry) => entry.text === "A different, new claim")?.confirmed).toBe(false)
    for (const original of existing.facts) {
      expect(after.facts.find((entry) => entry.id === original.id)).toEqual(original)
    }
  })

  it("does not mutate its input and regenerates colliding fact ids", () => {
    const base = loadAlexVault()
    const snapshot = structuredClone(base)
    const takenId = base.projects[0].facts[0].id
    const merged = mergeImport(
      base,
      { projects: [project("brand-new", [fact(takenId, "Unrelated claim", "github")])] },
      { now: NOW },
    )
    expect(base).toEqual(snapshot)
    const ids = merged.projects.flatMap((entry) => entry.facts.map((item) => item.id))
    expect(new Set(ids).size).toBe(ids.length)
    expect(vaultSchema.safeParse(merged).success).toBe(true)
  })

  it("dedupes skills, experience and education case-insensitively", () => {
    const base = createEmptyVault("Someone")
    const bundle: ImportBundle = {
      skills: [
        { name: "TypeScript", source: "resume", confirmed: false },
        { name: "typescript", source: "resume", confirmed: false },
      ],
      experience: [{ id: "e1", company: "DesignOS", title: "Staff Engineer", facts: [fact("x1", "Led RFCs", "resume")] }],
      education: [{ id: "ed1", institution: "MIT", degree: "BS" }],
    }
    const once = mergeImport(base, bundle, { now: NOW })
    expect(once.skills).toHaveLength(1)

    const again = mergeImport(
      once,
      {
        experience: [{ id: "e2", company: "designos", title: "staff engineer", facts: [fact("x2", "Mentored 8 engineers", "resume")] }],
        education: [{ id: "ed2", institution: "mit", degree: "bs" }],
      },
      { now: "2030-03-01T00:00:00.000Z" },
    )
    expect(again.experience).toHaveLength(1)
    expect(again.experience[0].facts.map((entry) => entry.text)).toEqual(["Led RFCs", "Mentored 8 engineers"])
    expect(again.education).toHaveLength(1)
  })

  it("fills the placeholder name and github username only when absent", () => {
    const base = createEmptyVault(DEFAULT_VAULT_NAME)
    const named = mergeImport(base, { personName: "Alex Chen", githubUsername: "alexchen-ui" }, { now: NOW })
    expect(named.person.name).toBe("Alex Chen")
    expect(named.github).toEqual({ username: "alexchen-ui" })

    const kept = mergeImport(named, { personName: "Someone Else", githubUsername: "other" }, { now: "2031-01-01T00:00:00.000Z" })
    expect(kept).toBe(named)
  })
})
