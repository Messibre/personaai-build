import { applicationSchema, type Application, type Vault } from "@/lib/schemas/vault"
import { VaultOpError, nextTimestamp } from "@/lib/vault/ops"

export type ApplicationFeedback = NonNullable<Application["feedback"]>

/** Sets feedback on the application recorded for this posting. Pure: returns a new vault. */
export function withApplicationFeedback(vault: Vault, jobTextHash: string, feedback: ApplicationFeedback): Vault {
  const index = vault.applications.findIndex((application) => application.jobTextHash === jobTextHash)
  if (index === -1) throw new VaultOpError("No application found for this posting.")

  const note = feedback.note?.trim()
  const candidate: Application = {
    ...vault.applications[index],
    feedback: { accurate: feedback.accurate, ...(note ? { note } : {}) },
  }
  const parsed = applicationSchema.safeParse(candidate)
  if (!parsed.success) throw new VaultOpError("Feedback failed validation.")

  const applications = vault.applications.map((application, i) => (i === index ? parsed.data : application))
  return { ...vault, applications, updatedAt: nextTimestamp(vault.updatedAt) }
}
