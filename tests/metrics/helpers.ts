import type { Application, Vault } from "@/lib/schemas/vault"
import { loadAlexVault } from "../vault/helpers"

export const HOUR = 60 * 60 * 1000
export const DAY = 24 * HOUR
export const T0 = Date.parse("2025-06-01T09:00:00.000Z")
export const NOW = T0 + 60 * DAY

export function hashOf(letter: string): string {
  return letter.repeat(64)
}

export function app(letter: string, at: number, extra: Partial<Application> = {}): Application {
  return {
    id: `app-${letter}-${at}`,
    createdAt: new Date(at).toISOString(),
    jobTitle: `Job ${letter}`,
    jobTextHash: hashOf(letter),
    ...extra,
  }
}

export function vaultWith(id: string, applications: Application[], name = "Alex Chen"): Vault {
  const base = loadAlexVault()
  return { ...base, id, person: { ...base.person, name }, applications }
}
