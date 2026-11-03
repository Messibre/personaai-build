import type { LLMClient } from "@/lib/llm/types"
import type { Draft } from "@/lib/schemas/draft"
import type { JobProfile, ProjectPick } from "@/lib/schemas/job"
import type { CheckResult, Gap } from "@/lib/schemas/tailor"
import type { Vault } from "@/lib/schemas/vault"
import type { AnalyzeJobResult } from "./ports"

/*
 * TEMPORARY. These stand in for teammate G's modules until they merge. They throw on purpose:
 * a fake success here would let unchecked or invented content reach a user.
 */
export const G_MODULE_NOT_MERGED = "G module not merged"

export class GModuleNotMergedError extends Error {
  constructor(readonly fn: string) {
    super(`${G_MODULE_NOT_MERGED}: ${fn}`)
    this.name = "GModuleNotMergedError"
  }
}

export async function analyzeJob(_llm: LLMClient, _postingText: string): Promise<AnalyzeJobResult> {
  throw new GModuleNotMergedError("analyzeJob")
}

export function detectGaps(_job: JobProfile, _vault: Vault): Gap[] {
  throw new GModuleNotMergedError("detectGaps")
}

export function pickProjects(_job: JobProfile, _vault: Vault, _opts: { max: number }): ProjectPick[] {
  throw new GModuleNotMergedError("pickProjects")
}

export async function checkDraft(_draft: Draft, _vault: Vault, _llm?: LLMClient): Promise<CheckResult> {
  throw new GModuleNotMergedError("checkDraft")
}
