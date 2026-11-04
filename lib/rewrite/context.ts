import type { JobProfile, ProjectPick } from "@/lib/schemas/job"
import type { Fact, FactKind, Vault } from "@/lib/schemas/vault"

export interface RewriteFact {
  id: string
  text: string
  kind: FactKind
}

export interface RewriteProjectContext {
  projectId: string
  name: string
  techs: string[]
  matchedLabels: string[]
  matchedKeywords: string[]
  facts: RewriteFact[]
  leadFactId: string | null
}

export interface RewriteExperienceContext {
  company: string
  title: string
  facts: RewriteFact[]
}

/** Everything the model is allowed to see. Nothing outside this shape is ever put in a prompt. */
export interface RewriteContext {
  person: { name: string }
  job: { title: string; topThree: string[] }
  projects: RewriteProjectContext[]
  experience: RewriteExperienceContext[]
}

export interface BuildRewriteContextInput {
  vault: Vault
  job: JobProfile
  picks: ProjectPick[]
}

/** The single place where unconfirmed facts are filtered out. */
function toRewriteFacts(facts: Fact[]): RewriteFact[] {
  return facts
    .filter((fact) => fact.confirmed === true)
    .map((fact) => ({ id: fact.id, text: fact.text, kind: fact.kind }))
}

/** Lowercased alphanumeric words; "prefers-reduced-motion" becomes three words, "c++" stays one. */
function words(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+(?:[+#]+)?/g) ?? []
}

/**
 * A keyword matches a fact when every one of its words appears as a whole word in the fact.
 * Whole-word matching keeps "react" from matching "reactive".
 */
function countKeywordOverlap(factText: string, keywords: string[]): number {
  const factWords = new Set(words(factText))
  let matched = 0
  for (const keyword of keywords) {
    const keywordWords = words(keyword)
    if (keywordWords.length > 0 && keywordWords.every((word) => factWords.has(word))) matched += 1
  }
  return matched
}

/** Highest keyword overlap wins; ties go to the earliest fact; no overlap means no lead. */
export function pickLeadFactId(facts: RewriteFact[], keywords: string[]): string | null {
  let bestId: string | null = null
  let bestScore = 0
  for (const fact of facts) {
    const score = countKeywordOverlap(fact.text, keywords)
    if (score > bestScore) {
      bestScore = score
      bestId = fact.id
    }
  }
  return bestId
}

function unique(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }
  return result
}

export function buildRewriteContext({ vault, job, picks }: BuildRewriteContextInput): RewriteContext {
  const requirementsById = new Map(job.requirements.map((requirement) => [requirement.id, requirement]))
  const seenProjectIds = new Set<string>()
  const projects: RewriteProjectContext[] = []

  for (const pick of picks) {
    if (seenProjectIds.has(pick.projectId)) continue
    const project = vault.projects.find((candidate) => candidate.id === pick.projectId)
    if (!project) continue
    seenProjectIds.add(pick.projectId)

    const matched = pick.matchedRequirementIds
      .map((id) => requirementsById.get(id))
      .filter((requirement): requirement is NonNullable<typeof requirement> => requirement !== undefined)
    const matchedKeywords = unique(matched.flatMap((requirement) => requirement.keywords))
    const facts = toRewriteFacts(project.facts)

    projects.push({
      projectId: project.id,
      name: project.name,
      techs: [...project.techs],
      matchedLabels: unique(matched.map((requirement) => requirement.label)),
      matchedKeywords,
      facts,
      leadFactId: pickLeadFactId(facts, matchedKeywords),
    })
  }

  const experience: RewriteExperienceContext[] = vault.experience
    .map((entry) => ({ company: entry.company, title: entry.title, facts: toRewriteFacts(entry.facts) }))
    .filter((entry) => entry.facts.length > 0)

  return {
    person: { name: vault.person.name },
    job: { title: job.title, topThree: [...job.topThree] },
    projects,
    experience,
  }
}

/** Every fact id the model may cite, grouped so project sentences can be held to their own project. */
export function collectFactIds(context: RewriteContext): {
  all: Set<string>
  byProject: Map<string, Set<string>>
} {
  const all = new Set<string>()
  const byProject = new Map<string, Set<string>>()
  for (const project of context.projects) {
    const ids = new Set(project.facts.map((fact) => fact.id))
    byProject.set(project.projectId, ids)
    for (const id of ids) all.add(id)
  }
  for (const entry of context.experience) {
    for (const fact of entry.facts) all.add(fact.id)
  }
  return { all, byProject }
}
