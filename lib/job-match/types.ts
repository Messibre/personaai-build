import type { EnrichedGitHubRepo } from "@/lib/types"

export type JobRoleType = "frontend" | "ux-engineer" | "ai-ml" | "fullstack" | "backend" | "other"

export interface JobRequirement {
  label: string
  synonyms: string[]
  quote: string
  priority: "must-have" | "nice-to-have"
}

export interface JobAnalysis {
  roleTitle: string
  roleType: JobRoleType
  mustHaveRequirements: JobRequirement[]
  niceToHaveRequirements: JobRequirement[]
  values: string[]
}

export interface JobProject {
  id: string
  name: string
  source: "github" | "resume"
  url?: string
  evidence: string[]
  searchableText: string
}

export interface SelectedProject {
  project: JobProject
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
  mustHave: {
    covered: number
    partial: number
    missing: number
  }
  totalRequirements: number
}

export interface ProjectInput {
  githubRepos: EnrichedGitHubRepo[]
  resumeText: string
}
