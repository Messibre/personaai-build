import type { LLMClient } from "@/lib/llm/types"
import type { RewriteInput, RewriteResult } from "@/lib/rewrite/rewrite"
import type { Draft } from "@/lib/schemas/draft"
import type { JobProfile, ProjectPick } from "@/lib/schemas/job"
import type { CheckResult, Gap } from "@/lib/schemas/tailor"
import type { Vault } from "@/lib/schemas/vault"

export type AnalyzeJobResult = { ok: true; data: JobProfile } | { ok: false; error: string }

export interface TailorDeps {
  llm: LLMClient
  analyzeJob(llm: LLMClient, postingText: string): Promise<AnalyzeJobResult>
  detectGaps(job: JobProfile, vault: Vault): Gap[]
  pickProjects(job: JobProfile, vault: Vault, opts: { max: number }): ProjectPick[]
  checkDraft(draft: Draft, vault: Vault, llm?: LLMClient, options?: { jobTitle?: string }): Promise<CheckResult>
  rewriteForJob(llm: LLMClient, input: RewriteInput): Promise<RewriteResult>
  now(): Date
}
