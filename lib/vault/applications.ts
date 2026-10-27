import { applicationSchema, type Application, type Vault } from "@/lib/schemas/vault"
import { VaultOpError, nextTimestamp } from "./ops"

export interface ApplicationInput {
  jobTitle: string
  company?: string
  jobText: string
}

export function normalizeJobText(jobText: string): string {
  return jobText.replace(/\s+/g, " ").trim().toLowerCase()
}

export async function hashJobText(jobText: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeJobText(jobText))
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/** Returns the same vault object when this posting was already recorded. */
export async function recordApplication(vault: Vault, input: ApplicationInput): Promise<Vault> {
  if (normalizeJobText(input.jobText).length === 0) {
    throw new VaultOpError("Job text must not be empty.")
  }

  const jobTextHash = await hashJobText(input.jobText)
  if (vault.applications.some((application) => application.jobTextHash === jobTextHash)) {
    return vault
  }

  const candidate: Application = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    jobTitle: input.jobTitle.trim(),
    jobTextHash,
    ...(input.company ? { company: input.company.trim() } : {}),
  }
  const result = applicationSchema.safeParse(candidate)
  if (!result.success) throw new VaultOpError("Application failed validation.")

  return {
    ...vault,
    applications: [...vault.applications, result.data],
    updatedAt: nextTimestamp(vault.updatedAt),
  }
}
