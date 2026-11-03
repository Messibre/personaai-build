import type { JobAnalysis, RequirementCheck, SelectedProject } from "../types"

export const COMPATIBILITY_THRESHOLDS = {
  strong: 0.8,
  good: 0.6,
  partial: 0.35,
}

export type CompatibilityLabel = "Strong match" | "Good match" | "Partial match" | "Stretch"
export type Confidence = "high" | "medium" | "low"

export interface CompatibilityReport {
  label: CompatibilityLabel
  confidence: Confidence
  reasonCodes: string[]
  coreGaps: string[]
}

function isCore(requirement: RequirementCheck, analysis: JobAnalysis): boolean {
  if (requirement.requirement.tier !== "must") return false
  const title = analysis.roleTitle.toLowerCase()
  const quote = requirement.requirement.quote.toLowerCase()
  return title.includes(requirement.requirement.label.toLowerCase()) ||
    (quote.match(new RegExp(requirement.requirement.label.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length >= 2 ||
    analysis.mustHaveRequirements[0]?.skillId === requirement.requirement.skillId
}

export function calculateCompatibility(
  analysis: JobAnalysis,
  checks: RequirementCheck[],
  projects: SelectedProject[],
  evidenceCount: number,
): CompatibilityReport {
  const must = checks.filter((check) => check.requirement.tier === "must")
  const nice = checks.filter((check) => check.requirement.tier === "nice")
  const credit = (status: RequirementCheck["status"]) => status === "covered" ? 1 : status === "partial" ? 0.5 : 0
  const weighted = (items: RequirementCheck[]) => {
    const denominator = items.reduce((sum, item) => sum + (isCore(item, analysis) ? 2 : 1), 0)
    return denominator ? items.reduce((sum, item) => sum + credit(item.status) * (isCore(item, analysis) ? 2 : 1), 0) / denominator : 0
  }
  const mustScore = weighted(must)
  weighted(nice)
  const coreGaps = must.filter((check) => isCore(check, analysis) && check.status === "missing").map((check) => check.requirement.skillId)
  const reasonCodes: string[] = []
  if (mustScore >= COMPATIBILITY_THRESHOLDS.strong) reasonCodes.push("MUST_COVERAGE_HIGH")
  else if (mustScore >= COMPATIBILITY_THRESHOLDS.partial) reasonCodes.push("MUST_COVERAGE_PARTIAL")
  else reasonCodes.push("MUST_COVERAGE_LOW")
  coreGaps.forEach((gap) => reasonCodes.push(`CORE_GAP:${gap}`))
  if (projects.some((project) => project.covers.length >= 2)) reasonCodes.push(`STRONG_PROJECT_ALIGNMENT:${projects[0]?.project.id || "none"}`)
  if (evidenceCount < 5) reasonCodes.push("LIMITED_PROFILE_DATA")
  if (checks.length < 4) reasonCodes.push("FEW_REQUIREMENTS_DETECTED")
  const label: CompatibilityLabel = mustScore >= COMPATIBILITY_THRESHOLDS.strong && coreGaps.length === 0
    ? "Strong match"
    : mustScore >= COMPATIBILITY_THRESHOLDS.good && coreGaps.length <= 1
      ? "Good match"
      : mustScore >= COMPATIBILITY_THRESHOLDS.partial ? "Partial match" : "Stretch"
  const confidence: Confidence = checks.length < 4 || evidenceCount < 5 ? "low" : mustScore >= COMPATIBILITY_THRESHOLDS.good ? "high" : "medium"
  return { label, confidence, reasonCodes, coreGaps }
}
