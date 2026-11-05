import { checkDraft } from "@/lib/check/check-draft"
import { analyzeJob } from "@/lib/job/analyze"
import { detectGaps } from "@/lib/job/gaps"
import { pickProjects } from "@/lib/job/pick"
import { getLLMClient } from "@/lib/llm"
import { rewriteForJob } from "@/lib/rewrite/rewrite"
import type { TailorDeps } from "./ports"

/** The one place that connects the pipeline to real implementations. */
export function getTailorDeps(): TailorDeps {
  return {
    llm: getLLMClient(),
    analyzeJob,
    detectGaps,
    pickProjects,
    checkDraft,
    rewriteForJob,
    now: () => new Date(),
  }
}
