import { getLLMClient } from "@/lib/llm"
import { rewriteForJob } from "@/lib/rewrite/rewrite"
import type { TailorDeps } from "./ports"
// TODO(G merge): replace this import with the four real modules, for example
//   import { analyzeJob } from "@/lib/job/analyze"
//   import { detectGaps } from "@/lib/job/gaps"
//   import { pickProjects } from "@/lib/job/pick"
//   import { checkDraft } from "@/lib/check/check-draft"
// All four are currently STUBBED in ./stubs (they throw "G module not merged").
import { analyzeJob, checkDraft, detectGaps, pickProjects } from "./stubs"

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
