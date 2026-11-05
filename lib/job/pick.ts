/**
 * pickProjects: deterministic project selection for one job.
 *
 * Eligibility: a project needs at least one confirmed fact. Unconfirmed facts and `project.techs`
 * are never evidence.
 *
 * Matching: a requirement is matched by a project when that project's confirmed facts mention the
 * requirement's taxonomy skill (or, for a non-taxonomy requirement, one of its keywords).
 *
 * Score: 20 per matched must + 8 per matched nice + min(confirmedFacts, 5) * 0.5.
 *
 * Greedy selection, repeated until `max` picks or no matched candidate is left. Among the remaining
 * projects with at least one match, the next pick is the one with, in order:
 *   1. the highest gain on requirements not yet covered by earlier picks (20 per must, 8 per nice),
 *   2. the highest score,
 *   3. the most confirmed facts,
 *   4. the earliest position in vault.projects.
 *
 * Fallback: when no eligible project matches anything, return up to min(2, max) eligible projects
 * with the most confirmed facts (ties: earliest in vault.projects), matchedRequirementIds [].
 */
import type { JobProfile, ProjectPick } from "@/lib/schemas/job"
import type { Project, Vault } from "@/lib/schemas/vault"
import { buildEvidence, evidenceCovers } from "./skills"

const MUST_WEIGHT = 20
const NICE_WEIGHT = 8
const FACT_WEIGHT = 0.5
const FACT_CAP = 5
export const FALLBACK_MAX = 2

interface Candidate {
  projectId: string
  index: number
  confirmedFacts: number
  matched: string[]
  score: number
}

function confirmedTexts(project: Project): string[] {
  return project.facts.filter((fact) => fact.confirmed).map((fact) => fact.text)
}

export function pickProjects(job: JobProfile, vault: Vault, opts: { max: number }): ProjectPick[] {
  const max = Math.max(0, Math.floor(opts.max))
  if (max === 0) return []

  const levelById = new Map(job.requirements.map((requirement) => [requirement.id, requirement.level]))
  const weight = (id: string) => (levelById.get(id) === "must" ? MUST_WEIGHT : NICE_WEIGHT)

  const candidates: Candidate[] = []
  vault.projects.forEach((project, index) => {
    const texts = confirmedTexts(project)
    if (texts.length === 0) return
    const evidence = buildEvidence(texts)
    const matched = job.requirements.filter((requirement) => evidenceCovers(requirement, evidence)).map((r) => r.id)
    const score = matched.reduce((sum, id) => sum + weight(id), 0) + Math.min(texts.length, FACT_CAP) * FACT_WEIGHT
    candidates.push({ projectId: project.id, index, confirmedFacts: texts.length, matched, score })
  })

  const toPick = (candidate: Candidate): ProjectPick => ({
    projectId: candidate.projectId,
    matchedRequirementIds: [...candidate.matched],
    score: candidate.score,
  })

  const remaining = candidates.filter((candidate) => candidate.matched.length > 0)
  if (remaining.length === 0) {
    return [...candidates]
      .sort((a, b) => b.confirmedFacts - a.confirmedFacts || a.index - b.index)
      .slice(0, Math.min(FALLBACK_MAX, max))
      .map((candidate) => ({ ...toPick(candidate), matchedRequirementIds: [] }))
  }

  const covered = new Set<string>()
  const picks: ProjectPick[] = []
  while (picks.length < max && remaining.length > 0) {
    const gain = (candidate: Candidate) =>
      candidate.matched.filter((id) => !covered.has(id)).reduce((sum, id) => sum + weight(id), 0)
    remaining.sort(
      (a, b) =>
        gain(b) - gain(a) || b.score - a.score || b.confirmedFacts - a.confirmedFacts || a.index - b.index,
    )
    const next = remaining.shift() as Candidate
    for (const id of next.matched) covered.add(id)
    picks.push(toPick(next))
  }
  return picks
}
