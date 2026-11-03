import type { JobAnalysis, RequirementCheck, SelectedProject, EvidenceItem } from "../types"

export interface LedgerEvidence {
  id: string
  projectId: string
  source: EvidenceItem["source"]
  skillIds: string[]
  snippet: string
  url?: string
}

export interface LedgerRequirement {
  id: string
  skillId: string
  label: string
  tier: "must" | "nice"
  quote: string
}

export interface EvidenceLedger {
  analysisId: string
  createdAt: string
  expiresAt: number
  roleTitle: string
  jobText: string
  values: string[]
  evidence: LedgerEvidence[]
  requirements: LedgerRequirement[]
  checks: RequirementCheck[]
  selectedProjects: SelectedProject[]
}

export function createLedger(
  analysisId: string,
  jobText: string,
  analysis: JobAnalysis,
  checks: RequirementCheck[],
  selectedProjects: SelectedProject[],
  items: EvidenceItem[],
): EvidenceLedger {
  const requirements = [...analysis.mustHaveRequirements, ...analysis.niceToHaveRequirements].map((requirement, index) => ({
    id: `R${index + 1}`,
    skillId: requirement.skillId,
    label: requirement.label,
    tier: requirement.tier,
    quote: requirement.quote,
  }))
  const evidence = items.slice(0, 500).map((item, index) => ({
    id: `E${index + 1}`,
    projectId: item.projectId,
    source: item.source,
    skillIds: [item.skill],
    snippet: item.snippet.slice(0, 300),
  }))
  return {
    analysisId,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    roleTitle: analysis.roleTitle,
    jobText: jobText.slice(0, 15000),
    values: analysis.values,
    evidence,
    requirements,
    checks,
    selectedProjects,
  }
}
