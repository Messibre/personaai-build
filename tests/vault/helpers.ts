import alexChenJson from "@/fixtures/vaults/alex-chen.json"
import resumeOnlyJson from "@/fixtures/vaults/resume-only.json"
import { vaultSchema, type Vault } from "@/lib/schemas/vault"

export function loadAlexVault(): Vault {
  return vaultSchema.parse(structuredClone(alexChenJson))
}

export function loadResumeOnlyVault(): Vault {
  return vaultSchema.parse(structuredClone(resumeOnlyJson))
}

export function rawAlexVault(): Record<string, unknown> {
  return structuredClone(alexChenJson) as Record<string, unknown>
}
