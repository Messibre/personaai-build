import type { JobProfile } from "@/lib/schemas/job"
import type { Vault } from "@/lib/schemas/vault"
import { recordApplication, type ApplicationInput } from "@/lib/vault/applications"
import type { GenerateOutput, StageResult } from "./pipeline"

export interface RecordContext {
  job: Pick<JobProfile, "title">
  postingText: string
  company?: string
}

/** Decides whether an application should be recorded. Only a successful generate counts; analyze never does. */
export function planApplicationRecord(result: StageResult<GenerateOutput>, context: RecordContext): ApplicationInput | null {
  if (!result.ok) return null
  const company = context.company?.trim()
  return {
    jobTitle: context.job.title,
    jobText: context.postingText,
    ...(company ? { company } : {}),
  }
}

type Recorder = (vault: Vault, input: ApplicationInput) => Promise<Vault>

/** Returns the same vault object when nothing should be recorded. */
export async function recordIfGenerated(
  vault: Vault,
  result: StageResult<GenerateOutput>,
  context: RecordContext,
  record: Recorder = recordApplication,
): Promise<Vault> {
  const plan = planApplicationRecord(result, context)
  return plan ? record(vault, plan) : vault
}
