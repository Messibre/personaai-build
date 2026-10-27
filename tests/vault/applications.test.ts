import { describe, expect, it } from "vitest"
import { vaultSchema } from "@/lib/schemas/vault"
import { VaultOpError } from "@/lib/vault/ops"
import { hashJobText, normalizeJobText, recordApplication } from "@/lib/vault/applications"
import { loadAlexVault } from "./helpers"

const JOB = "Senior Frontend Engineer\n\nWe need React, TypeScript and WebGL experience."

describe("hashJobText", () => {
  it("produces a stable SHA-256 hex digest", async () => {
    const hash = await hashJobText("hello")
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824")
  })

  it("ignores case and whitespace differences", async () => {
    expect(normalizeJobText("  Hello \n  WORLD ")).toBe("hello world")
    expect(await hashJobText("Hello   World")).toBe(await hashJobText("hello\nworld "))
  })

  it("differs for different text", async () => {
    expect(await hashJobText("job a")).not.toBe(await hashJobText("job b"))
  })
})

describe("recordApplication", () => {
  it("records a new application with a hash of the job text and no copy of the text", async () => {
    const vault = loadAlexVault()
    const next = await recordApplication(vault, { jobTitle: "Senior Frontend Engineer", company: "Acme", jobText: JOB })

    expect(vault.applications).toHaveLength(0)
    expect(next.applications).toHaveLength(1)
    const [application] = next.applications
    expect(application.jobTextHash).toBe(await hashJobText(JOB))
    expect(application.company).toBe("Acme")
    expect(JSON.stringify(next)).not.toContain("WebGL experience")
    expect(next.updatedAt > vault.updatedAt).toBe(true)
    expect(vaultSchema.safeParse(next).success).toBe(true)
  })

  it("dedupes the same posting, even when reformatted, and returns the vault unchanged", async () => {
    const once = await recordApplication(loadAlexVault(), { jobTitle: "Eng", jobText: JOB })
    const again = await recordApplication(once, { jobTitle: "Eng (reposted)", jobText: `  ${JOB.toUpperCase()}  ` })
    expect(again).toBe(once)
    expect(again.applications).toHaveLength(1)
  })

  it("adds a second application for a different posting", async () => {
    const once = await recordApplication(loadAlexVault(), { jobTitle: "Eng", jobText: JOB })
    const twice = await recordApplication(once, { jobTitle: "Staff Eng", jobText: "A completely different posting." })
    expect(twice.applications).toHaveLength(2)
    expect(new Set(twice.applications.map((a) => a.id)).size).toBe(2)
  })

  it("rejects blank job text and blank titles", async () => {
    const vault = loadAlexVault()
    await expect(recordApplication(vault, { jobTitle: "Eng", jobText: "  \n " })).rejects.toBeInstanceOf(VaultOpError)
    await expect(recordApplication(vault, { jobTitle: "   ", jobText: JOB })).rejects.toBeInstanceOf(VaultOpError)
  })
})
