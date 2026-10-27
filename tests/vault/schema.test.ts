import { describe, expect, it } from "vitest"
import { alexChenPersona, priyaPatelPersona } from "@/fixtures/personas"
import { draftSchema } from "@/lib/schemas/draft"
import { jobProfileSchema, projectPickSchema } from "@/lib/schemas/job"
import { factSchema, vaultSchema, type Fact, type Vault } from "@/lib/schemas/vault"
import { loadAlexVault, loadResumeOnlyVault, rawAlexVault } from "./helpers"

function allFacts(vault: Vault): Fact[] {
  return [...vault.projects.flatMap((p) => p.facts), ...vault.experience.flatMap((e) => e.facts)]
}

describe("vault schema: fixtures", () => {
  it("accepts both vault fixtures and survives a JSON round trip", () => {
    for (const vault of [loadAlexVault(), loadResumeOnlyVault()]) {
      expect(vaultSchema.parse(JSON.parse(JSON.stringify(vault)))).toEqual(vault)
    }
  })

  it("covers every fact kind and source, confirmed and unconfirmed", () => {
    const facts = allFacts(loadAlexVault())
    expect(new Set(facts.map((f) => f.kind))).toEqual(
      new Set(["built", "hard", "decided", "outcome", "metric", "tech", "role"]),
    )
    expect(new Set(facts.map((f) => f.source))).toEqual(
      new Set(["github", "notion", "resume", "user", "ai-draft"]),
    )
    expect(facts.some((f) => f.confirmed)).toBe(true)
    expect(facts.some((f) => !f.confirmed)).toBe(true)
  })

  it("only keeps evidence that appears verbatim in the persona's source text", () => {
    const cases: Array<[Vault, string]> = [
      [
        loadAlexVault(),
        [
          alexChenPersona.notionContent,
          alexChenPersona.resumeText,
          ...alexChenPersona.github.repos.map((r) => r.description ?? ""),
        ].join("\n"),
      ],
      [loadResumeOnlyVault(), priyaPatelPersona.resumeText],
    ]
    for (const [vault, haystack] of cases) {
      for (const fact of allFacts(vault)) {
        if (fact.evidence) expect(haystack, `evidence for ${fact.id}`).toContain(fact.evidence)
      }
    }
  })
})

describe("vault schema: rejects bad input", () => {
  it("rejects unknown top-level keys, nested keys, and a wrong schemaVersion", () => {
    expect(vaultSchema.safeParse({ ...rawAlexVault(), admin: true }).success).toBe(false)
    expect(vaultSchema.safeParse({ ...rawAlexVault(), schemaVersion: 2 }).success).toBe(false)

    const nested = rawAlexVault() as { projects: Array<Record<string, unknown>> }
    nested.projects[0].extra = "nope"
    expect(vaultSchema.safeParse(nested).success).toBe(false)
  })

  it.each(["../etc/passwd", "a/b", "..", "short", "has.dot_1234", "x".repeat(65), "", "white space id"])(
    "rejects vault id %j",
    (id) => {
      expect(vaultSchema.safeParse({ ...rawAlexVault(), id }).success).toBe(false)
    },
  )

  it("rejects empty, blank and over-long fact text", () => {
    const base: Fact = { id: "f1", text: "ok", kind: "built", source: "user", confirmed: true }
    expect(factSchema.safeParse(base).success).toBe(true)
    expect(factSchema.safeParse({ ...base, text: "" }).success).toBe(false)
    expect(factSchema.safeParse({ ...base, text: "   " }).success).toBe(false)
    expect(factSchema.safeParse({ ...base, text: "x".repeat(501) }).success).toBe(false)
    expect(factSchema.safeParse({ ...base, text: "x".repeat(500) }).success).toBe(true)
  })

  it("rejects unknown fact kinds and sources", () => {
    const base = { id: "f1", text: "ok", kind: "built", source: "user", confirmed: true }
    expect(factSchema.safeParse({ ...base, kind: "rumour" }).success).toBe(false)
    expect(factSchema.safeParse({ ...base, source: "twitter" }).success).toBe(false)
  })

  it("rejects non-http(s) project and profile URLs (malicious javascript: link)", () => {
    const withProjectUrl = rawAlexVault() as { projects: Array<Record<string, unknown>> }
    withProjectUrl.projects[0].url = "javascript:alert(1)"
    expect(vaultSchema.safeParse(withProjectUrl).success).toBe(false)

    const withLink = rawAlexVault() as { person: { links: string[] } }
    withLink.person.links.push("data:text/html,<script>alert(1)</script>")
    expect(vaultSchema.safeParse(withLink).success).toBe(false)
  })

  it("rejects negative or fractional stats and malformed timestamps or hashes", () => {
    const stats = rawAlexVault() as { projects: Array<{ stats: { stars: number } }> }
    stats.projects[0].stats.stars = -1
    expect(vaultSchema.safeParse(stats).success).toBe(false)

    expect(vaultSchema.safeParse({ ...rawAlexVault(), updatedAt: "yesterday" }).success).toBe(false)

    const hash = { ...rawAlexVault(), applications: [{ id: "a1", createdAt: "2026-01-15T10:00:00.000Z", jobTitle: "Eng", jobTextHash: "not-a-hash" }] }
    expect(vaultSchema.safeParse(hash).success).toBe(false)
  })
})

describe("job and draft schemas", () => {
  it("accepts a well-formed job profile and rejects bad levels and extra keys", () => {
    const profile = {
      title: "Senior Frontend Engineer",
      requirements: [{ id: "r1", label: "React", level: "must", keywords: ["react"] }],
      topThree: ["React"],
    }
    expect(jobProfileSchema.safeParse(profile).success).toBe(true)
    expect(
      jobProfileSchema.safeParse({ ...profile, requirements: [{ ...profile.requirements[0], level: "maybe" }] }).success,
    ).toBe(false)
    expect(jobProfileSchema.safeParse({ ...profile, salary: 1 }).success).toBe(false)
  })

  it("rejects non-finite project pick scores", () => {
    const pick = { projectId: "p1", matchedRequirementIds: ["r1"], score: 0.8 }
    expect(projectPickSchema.safeParse(pick).success).toBe(true)
    expect(projectPickSchema.safeParse({ ...pick, score: Number.POSITIVE_INFINITY }).success).toBe(false)
    expect(projectPickSchema.safeParse({ ...pick, score: "high" }).success).toBe(false)
  })

  it("requires every draft sentence to be non-empty and to list its fact ids", () => {
    const draft = {
      tagline: "Builds fast canvases",
      about: [{ text: "Alex builds canvases.", factIds: ["fact_cf-built"] }],
      projects: [{ projectId: "proj_canvas-flow", sentences: [{ text: "GPU canvas.", factIds: ["fact_cf-built"] }] }],
      resumeBullets: [],
      note: [],
    }
    expect(draftSchema.safeParse(draft).success).toBe(true)
    expect(draftSchema.safeParse({ ...draft, about: [{ text: "", factIds: [] }] }).success).toBe(false)
    expect(draftSchema.safeParse({ ...draft, about: [{ text: "x" }] }).success).toBe(false)
  })
})
