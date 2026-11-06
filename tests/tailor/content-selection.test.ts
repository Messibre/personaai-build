import { describe, expect, it } from "vitest"
import { selectedVault } from "@/components/tailor/content-selection"
import { createVaultUpdateQueue } from "@/lib/vault/update-queue"
import { loadAlexVault } from "../rewrite/helpers"

 describe("output selection", () => {
  it("excludes private contacts and career records without mutating the vault", () => {
    const vault = loadAlexVault()
    const before = structuredClone(vault)
    const selected = selectedVault(vault, { experience: [], education: [], contacts: [], github: false })
    expect(selected.person).toEqual({ name: vault.person.name, links: [] })
    expect(selected.github).toBeUndefined()
    expect(selected.experience).toEqual([])
    expect(selected.education).toEqual([])
    expect(selected.projects).toEqual(vault.projects)
    expect(vault).toEqual(before)
  })

  it("includes only individually selected contacts", () => {
    const vault = loadAlexVault()
    vault.person.email = "alex@example.com"
    const selected = selectedVault(vault, { experience: [], education: [], contacts: ["email", vault.person.links[0]], github: true })
    expect(selected.person.email).toBe("alex@example.com")
    expect(selected.person.links).toEqual([vault.person.links[0]])
    expect(selected.github).toEqual(vault.github)
  })

  it("serializes updates and recovers after a rejected save", async () => {
    const queue = createVaultUpdateQueue()
    const events: string[] = []
    const first = queue(async () => { events.push("first"); throw new Error("save failed") })
    const next = queue(async () => { events.push("second"); return loadAlexVault() })
    await expect(first).rejects.toThrow("save failed")
    await expect(next).resolves.toHaveProperty("id")
    expect(events).toEqual(["first", "second"])
  })
})
