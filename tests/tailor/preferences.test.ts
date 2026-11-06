import { describe, expect, it } from "vitest"
import { loadAlexVault } from "../rewrite/helpers"
import { vaultSchema } from "@/lib/schemas/vault"
import { tailoringPreferencesSchema, type TailoringPreferences } from "@/lib/schemas/tailoring-preferences"
import { reconcilePreferences, reconcileSelection, restoreProjectChoices } from "@/lib/tailor/preferences"
import { selectedVault } from "@/components/tailor/content-selection"

const preferences: TailoringPreferences = {
  postingText: "Private job context", company: "Private company", template: "terminal", colorScheme: "forest",
  selection: { experience: [], education: [], contacts: [], github: false }, projects: [],
}

describe("saved tailoring preferences", () => {
  it("keeps old vaults valid and contacts private by default", () => {
    const vault = loadAlexVault()
    expect(vaultSchema.parse(vault).tailoringPreferences).toBeUndefined()
    expect(reconcileSelection(vault).contacts).toEqual([])
    expect(reconcileSelection(vault).github).toBe(false)
  })
  it("round-trips saved inputs, explicit exclusions and design", () => {
    const vault = { ...loadAlexVault(), tailoringPreferences: preferences }
    expect(vaultSchema.parse(JSON.parse(JSON.stringify(vault))).tailoringPreferences).toEqual(preferences)
    expect(reconcileSelection(vault, preferences.selection).experience).toEqual([])
  })
  it("rejects invalid templates, unbounded input and unexpected fields", () => {
    expect(tailoringPreferencesSchema.safeParse({ ...preferences, template: "made-up" }).success).toBe(false)
    expect(tailoringPreferencesSchema.safeParse({ ...preferences, postingText: "x".repeat(200_001) }).success).toBe(false)
    expect(tailoringPreferencesSchema.safeParse({ ...preferences, html: "<script>bad</script>" }).success).toBe(false)
  })
  it("removes stale and duplicate record references", () => {
    const vault = loadAlexVault()
    const id = vault.projects[0].id
    const result = reconcilePreferences(vault, { ...preferences, projects: [{ projectId: id, included: true }, { projectId: id, included: false }, { projectId: "missing", included: true }], selection: { ...preferences.selection, experience: ["missing"], contacts: ["https://unknown.example", "email"] } })
    expect(result.projects).toEqual([{ projectId: id, included: true }])
    expect(result.selection.experience).toEqual([])
    expect(result.selection.contacts).not.toContain("https://unknown.example")
  })
  it("does not send saved private posting or company to output context", () => {
    const selected = selectedVault({ ...loadAlexVault(), tailoringPreferences: preferences }, preferences.selection)
    expect(JSON.stringify(selected)).not.toContain(preferences.postingText)
    expect(selected.tailoringPreferences).toBeUndefined()
  })
  it("restores order and inclusion but never reuses stale scores or requirement matches", () => {
    const items = [{ projectId: "a", included: true, score: 4, matchedRequirementIds: ["new"] }, { projectId: "b", included: true, score: 2, matchedRequirementIds: [] }]
    const saved = { ...preferences, projects: [{ projectId: "b", included: false }, { projectId: "a", included: true }] }
    expect(restoreProjectChoices(items, saved, preferences.postingText)).toEqual([{ ...items[1], included: false }, items[0]])
    expect(restoreProjectChoices(items, saved, "Different job")).toBe(items)
    expect(items[1].included).toBe(true)
  })
})
