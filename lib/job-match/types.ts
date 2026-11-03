export type JobRoleType = "frontend" | "ux-engineer" | "ai-ml" | "fullstack" | "backend" | "devops" | "mobile" | "other"

export type EvidenceSource = "dependency" | "language" | "topic" | "readme" | "description" | "resume" | "config"

export interface EvidenceItem {
  skill: string
  source: EvidenceSource
  strength: number
  projectId: string
  projectName: string
  snippet: string
}

export interface ProfileProject {
  id: string
  name: string
  url?: string
  pushedAt?: string
  archived?: boolean
  evidence: EvidenceItem[]
}

export interface ProfileEvidence {
  login: string
  projects: ProfileProject[]
  items: EvidenceItem[]
  fetchedAt: string
}

export interface JobRequirement {
  skillId: string
  label: string
  aliases: string[]
  tier: "must" | "nice"
  quote: string
  confidence: number
}

export interface JobAnalysis {
  roleTitle: string
  roleType: JobRoleType
  roleMargin: number
  mustHaveRequirements: JobRequirement[]
  niceToHaveRequirements: JobRequirement[]
  values: string[]
}

export interface SelectedProject {
  project: { id: string; name: string; url?: string }
  score: number
  covers: string[]
  evidence: string[]
  reason: string
}

export type RequirementStatus = "covered" | "partial" | "missing"

export interface RequirementCheck {
  requirement: JobRequirement
  status: RequirementStatus
  evidence: string[]
  projects: string[]
  explanation: string
}

export interface MatchSummary {
  mustHave: { covered: number; partial: number; missing: number }
  totalRequirements: number
}
