import { describe, expect, it } from "vitest"
import { vaultSchema, type Project } from "@/lib/schemas/vault"
import {
  VaultOpError,
  addFacts,
  confirmFact,
  createEmptyVault,
  editFact,
  getConfirmedFacts,
  getConfirmedProjectFacts,
  removeFact,
  upsertProject,
} from "@/lib/vault/ops"
import { loadAlexVault } from "./helpers"

const PROJECT = { type: "project", id: "proj_canvas-flow" } as const
const EXPERIENCE = { type: "experience", id: "exp_designos" } as const

function findFact(vault: ReturnType<typeof loadAlexVault>, id: string) {
  return [...vault.projects.flatMap((p) => p.facts), ...vault.experience.flatMap((e) => e.facts)].find(
    (f) => f.id === id,
  )
}

describe("createEmptyVault", () => {
  it("creates a schema-valid vault with a path-safe id", () => {
    const vault = createEmptyVault("  Sam Doe ")
    expect(vaultSchema.safeParse(vault).success).toBe(true)
    expect(vault.person.name).toBe("Sam Doe")
    expect(vault.projects).toEqual([])
  })

  it("rejects an empty name", () => {
    expect(() => createEmptyVault("   ")).toThrow(VaultOpError)
  })
})

describe("addFacts", () => {
  it("adds facts as unconfirmed and bumps updatedAt, without mutating the input", () => {
    const vault = loadAlexVault()
    const before = structuredClone(vault)
    const next = addFacts(vault, PROJECT, [{ text: "Added by import", kind: "built", source: "github" }])

    expect(vault).toEqual(before)
    const project = next.projects.find((p) => p.id === PROJECT.id)!
    const added = project.facts.at(-1)!
    expect(added.text).toBe("Added by import")
    expect(added.confirmed).toBe(false)
    expect(next.updatedAt > vault.updatedAt).toBe(true)
  })

  it("lets only user-authored facts arrive confirmed; model or document facts cannot self-confirm", () => {
    const next = addFacts(loadAlexVault(), EXPERIENCE, [
      { text: "Mine", kind: "role", source: "user", confirmed: true },
      { text: "From a model", kind: "role", source: "ai-draft", confirmed: true },
      { text: "From a resume", kind: "role", source: "resume", confirmed: true },
    ])
    const facts = next.experience.find((e) => e.id === EXPERIENCE.id)!.facts.slice(-3)
    expect(facts.map((f) => f.confirmed)).toEqual([true, false, false])
  })

  it("generates unique ids", () => {
    const next = addFacts(loadAlexVault(), PROJECT, [
      { text: "one", kind: "tech", source: "user" },
      { text: "two", kind: "tech", source: "user" },
    ])
    const ids = next.projects.flatMap((p) => p.facts.map((f) => f.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("rejects invalid fact text and unknown targets", () => {
    const vault = loadAlexVault()
    expect(() => addFacts(vault, PROJECT, [{ text: "", kind: "tech", source: "user" }])).toThrow(VaultOpError)
    expect(() => addFacts(vault, PROJECT, [{ text: "x".repeat(501), kind: "tech", source: "user" }])).toThrow(
      VaultOpError,
    )
    expect(() =>
      addFacts(vault, { type: "project", id: "missing" }, [{ text: "ok", kind: "tech", source: "user" }]),
    ).toThrow(VaultOpError)
    expect(() =>
      addFacts(vault, { type: "experience", id: "missing" }, [{ text: "ok", kind: "tech", source: "user" }]),
    ).toThrow(VaultOpError)
  })
})

describe("confirmFact / editFact / removeFact", () => {
  it("confirms an unconfirmed fact in a project", () => {
    const vault = loadAlexVault()
    expect(findFact(vault, "fact_cf-outcome")!.confirmed).toBe(false)
    const next = confirmFact(vault, "fact_cf-outcome")
    expect(findFact(next, "fact_cf-outcome")!.confirmed).toBe(true)
    expect(findFact(vault, "fact_cf-outcome")!.confirmed).toBe(false)
    expect(next.updatedAt > vault.updatedAt).toBe(true)
  })

  it("confirms facts that live under experience too", () => {
    const next = confirmFact(loadAlexVault(), "fact_lf-metric")
    expect(findFact(next, "fact_lf-metric")!.confirmed).toBe(true)
  })

  it("edit makes the user the author and confirms the fact", () => {
    const next = editFact(loadAlexVault(), "fact_lf-metric", "Cut LCP by roughly two thirds")
    const edited = findFact(next, "fact_lf-metric")!
    expect(edited.text).toBe("Cut LCP by roughly two thirds")
    expect(edited.source).toBe("user")
    expect(edited.confirmed).toBe(true)
  })

  it("edit rejects empty or oversized text and leaves the vault untouched", () => {
    const vault = loadAlexVault()
    const before = structuredClone(vault)
    expect(() => editFact(vault, "fact_lf-metric", "")).toThrow(VaultOpError)
    expect(() => editFact(vault, "fact_lf-metric", "y".repeat(501))).toThrow(VaultOpError)
    expect(vault).toEqual(before)
  })

  it("removes a fact everywhere it appears", () => {
    const next = removeFact(loadAlexVault(), "fact_cf-hard")
    expect(findFact(next, "fact_cf-hard")).toBeUndefined()
    expect(findFact(next, "fact_cf-decided")).toBeDefined()
  })

  it("throws on unknown fact ids", () => {
    const vault = loadAlexVault()
    expect(() => confirmFact(vault, "nope")).toThrow(VaultOpError)
    expect(() => editFact(vault, "nope", "text")).toThrow(VaultOpError)
    expect(() => removeFact(vault, "nope")).toThrow(VaultOpError)
  })

  it("keeps results schema-valid", () => {
    const next = removeFact(editFact(confirmFact(loadAlexVault(), "fact_cf-outcome"), "fact_lf-metric", "ok"), "fact_cf-hard")
    expect(vaultSchema.safeParse(next).success).toBe(true)
  })
})

describe("confirmed-fact selectors", () => {
  it("returns only confirmed facts, across projects and experience", () => {
    const vault = loadAlexVault()
    const confirmed = getConfirmedFacts(vault)
    expect(confirmed.length).toBeGreaterThan(0)
    expect(confirmed.every((f) => f.confirmed)).toBe(true)
    expect(confirmed.map((f) => f.id)).not.toContain("fact_cf-outcome")
    expect(confirmed.map((f) => f.id)).toContain("fact_dos-metric")
  })

  it("filters a single project's facts and returns copies", () => {
    const vault = loadAlexVault()
    const project = vault.projects[0]
    const facts = getConfirmedProjectFacts(project)
    expect(facts.map((f) => f.id)).not.toContain("fact_cf-metric")
    facts[0].text = "tampered"
    expect(project.facts.find((f) => f.id === facts[0].id)!.text).not.toBe("tampered")
  })
})

describe("upsertProject", () => {
  const project: Project = {
    id: "proj_new",
    name: "new-thing",
    techs: ["Go"],
    facts: [],
  }

  it("appends a new project and replaces an existing one by id", () => {
    const vault = loadAlexVault()
    const added = upsertProject(vault, project)
    expect(added.projects).toHaveLength(vault.projects.length + 1)

    const replaced = upsertProject(added, { ...project, name: "renamed" })
    expect(replaced.projects).toHaveLength(added.projects.length)
    expect(replaced.projects.find((p) => p.id === "proj_new")!.name).toBe("renamed")
  })

  it("rejects an invalid project (javascript: URL)", () => {
    expect(() => upsertProject(loadAlexVault(), { ...project, url: "javascript:alert(1)" })).toThrow(VaultOpError)
  })
})
