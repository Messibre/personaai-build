import { describe, expect, it } from "vitest"
import { withApplicationFeedback } from "@/lib/metrics/feedback"
import { vaultSchema } from "@/lib/schemas/vault"
import { recordApplication } from "@/lib/vault/applications"
import { VaultOpError } from "@/lib/vault/ops"
import { loadAlexVault } from "../vault/helpers"

async function vaultWithApplication(text = "We are hiring a senior designer.") {
  const recorded = await recordApplication(loadAlexVault(), { jobTitle: "Designer", jobText: text })
  return { vault: recorded, hash: recorded.applications[recorded.applications.length - 1].jobTextHash }
}

describe("withApplicationFeedback", () => {
  it("stores feedback on the matching application and keeps the vault valid", async () => {
    const { vault, hash } = await vaultWithApplication()
    const updated = withApplicationFeedback(vault, hash, { accurate: false, note: "  tone is off  " })
    const application = updated.applications.find((a) => a.jobTextHash === hash)
    expect(application?.feedback).toEqual({ accurate: false, note: "tone is off" })
    expect(vaultSchema.safeParse(updated).success).toBe(true)
    expect(updated.updatedAt > vault.updatedAt).toBe(true)
  })

  it("does not mutate the input vault", async () => {
    const { vault, hash } = await vaultWithApplication()
    const before = structuredClone(vault)
    withApplicationFeedback(vault, hash, { accurate: true })
    expect(vault).toEqual(before)
  })

  it("replaces earlier feedback instead of adding another entry", async () => {
    const { vault, hash } = await vaultWithApplication()
    const once = withApplicationFeedback(vault, hash, { accurate: false })
    const twice = withApplicationFeedback(once, hash, { accurate: true })
    expect(twice.applications).toHaveLength(vault.applications.length)
    expect(twice.applications.find((a) => a.jobTextHash === hash)?.feedback).toEqual({ accurate: true })
  })

  it("drops a blank note", async () => {
    const { vault, hash } = await vaultWithApplication()
    const updated = withApplicationFeedback(vault, hash, { accurate: true, note: "   " })
    expect(updated.applications.find((a) => a.jobTextHash === hash)?.feedback).toEqual({ accurate: true })
  })

  it("rejects a note over 500 characters", async () => {
    const { vault, hash } = await vaultWithApplication()
    expect(() => withApplicationFeedback(vault, hash, { accurate: false, note: "x".repeat(501) })).toThrow(VaultOpError)
  })

  it("throws when no application matches", async () => {
    const { vault } = await vaultWithApplication()
    expect(() => withApplicationFeedback(vault, "f".repeat(64), { accurate: true })).toThrow(VaultOpError)
  })
})
