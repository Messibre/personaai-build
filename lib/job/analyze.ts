import type { LLMClient } from "@/lib/llm/types"
import { jobProfileSchema, type JobProfile, type Requirement } from "@/lib/schemas/job"
import type { AnalyzeJobResult } from "@/lib/tailor/ports"
import { deterministicAnalysis, REQUIREMENT_ID_PREFIX } from "./skills"

export const MIN_REQUIREMENTS = 2

export const NOT_ENOUGH_REQUIREMENTS =
  "We could not find enough concrete requirements in this posting. Paste the full job description, including the requirements section."

function dedupeCaseInsensitive(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    const key = trimmed.toLowerCase()
    if (!trimmed || seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

/**
 * Deterministic and offline: the llm parameter is accepted to fit TailorDeps but never called,
 * so a pasted posting cannot spend quota or steer a model.
 * The profile only ever contains taxonomy labels/aliases, the posting's first line as the title,
 * and the analyzer's fixed list of value words. No other posting text is copied in.
 */
export async function analyzeJob(_llm: LLMClient, postingText: string): Promise<AnalyzeJobResult> {
  const analysis = deterministicAnalysis(postingText)

  const requirements: Requirement[] = [...analysis.mustHaveRequirements, ...analysis.niceToHaveRequirements].map(
    (item) => ({
      id: `${REQUIREMENT_ID_PREFIX}${item.skillId}`,
      label: item.label,
      level: item.tier,
      keywords: dedupeCaseInsensitive([...item.aliases, item.label]).filter((keyword) => keyword.length <= 100),
    }),
  )

  if (requirements.length < MIN_REQUIREMENTS) return { ok: false, error: NOT_ENOUGH_REQUIREMENTS }

  const topThree = dedupeCaseInsensitive([
    ...analysis.mustHaveRequirements.map((item) => item.label),
    ...analysis.niceToHaveRequirements.map((item) => item.label),
    ...analysis.values,
  ]).slice(0, 3)

  const profile: JobProfile = {
    title: analysis.roleTitle.slice(0, 200),
    roleType: analysis.roleType,
    requirements,
    topThree,
  }

  const parsed = jobProfileSchema.safeParse(profile)
  if (!parsed.success) return { ok: false, error: NOT_ENOUGH_REQUIREMENTS }
  return { ok: true, data: parsed.data }
}
