import skillsData from "@/lib/job-match/skills.json"
import { deterministicAnalysis, matchesFor } from "@/lib/job-match/analyzer"
import type { Requirement } from "@/lib/schemas/job"

// Re-exported, not copied: one set of word-boundary rules for posting analysis and evidence matching.
export { deterministicAnalysis, matchesFor }

export type TaxonomySkill = (typeof skillsData)[number]

export const SKILLS: readonly TaxonomySkill[] = skillsData

const SKILLS_BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]))

export const REQUIREMENT_ID_PREFIX = "req-"

export function getSkill(id: string): TaxonomySkill | undefined {
  return SKILLS_BY_ID.get(id)
}

/** Lower-cases and flattens typographic characters so matching sees plain text. */
export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[•●▪]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

/** Taxonomy skill ids mentioned in the text, in taxonomy order, with the analyzer's word-boundary rules. */
export function findSkillIds(text: string): string[] {
  if (!text.trim()) return []
  return matchesFor(normalize(text)).map((skill) => skill.id)
}

/** Resolves a `related`/`implies` entry that may be an id, a name or an alias. */
function resolveRef(ref: string): string | undefined {
  if (SKILLS_BY_ID.has(ref)) return ref
  const value = ref.toLowerCase()
  return SKILLS.find(
    (skill) => skill.name.toLowerCase() === value || skill.aliases.some((alias) => alias.toLowerCase() === value),
  )?.id
}

/**
 * Skills that are adjacent to `id` in either direction: the ones `id` lists as related/implied,
 * and the ones that list `id` as related/implied. Never includes `id` itself.
 */
export function adjacentSkillIds(id: string): string[] {
  const out = new Set<string>()
  const skill = SKILLS_BY_ID.get(id)
  if (skill) {
    for (const ref of [...skill.related, ...skill.implies]) {
      const resolved = resolveRef(ref)
      if (resolved) out.add(resolved)
    }
  }
  for (const other of SKILLS) {
    if (other.id === id) continue
    if ([...other.related, ...other.implies].some((ref) => resolveRef(ref) === id)) out.add(other.id)
  }
  out.delete(id)
  return SKILLS.filter((candidate) => out.has(candidate.id)).map((candidate) => candidate.id)
}

/** The taxonomy skill behind a requirement, when the requirement came from the taxonomy. */
export function requirementSkillId(requirement: Requirement): string | undefined {
  if (!requirement.id.startsWith(REQUIREMENT_ID_PREFIX)) return undefined
  const id = requirement.id.slice(REQUIREMENT_ID_PREFIX.length)
  return SKILLS_BY_ID.has(id) ? id : undefined
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Case-insensitive, word-boundary containment using the same boundary characters as the analyzer. */
export function containsTerm(haystack: string, term: string): boolean {
  const value = normalize(term)
  if (!value) return false
  return new RegExp(`(?<![a-z0-9+#.])${escapeRegExp(value)}(?![a-z0-9+#])`, "i").test(normalize(haystack))
}

export interface Evidence {
  skillIds: ReadonlySet<string>
  text: string
}

/**
 * A skill's `implies` list names skills it cannot be used without (FastAPI is a Python API framework),
 * so evidence for it is evidence for them. `related` stays a partial match only.
 */
function withImplied(ids: Iterable<string>): Set<string> {
  const out = new Set<string>()
  const queue = [...ids]
  while (queue.length > 0) {
    const id = queue.pop() as string
    if (out.has(id)) continue
    out.add(id)
    for (const ref of SKILLS_BY_ID.get(id)?.implies ?? []) {
      const resolved = resolveRef(ref)
      if (resolved && !out.has(resolved)) queue.push(resolved)
    }
  }
  return out
}

export function buildEvidence(texts: readonly string[]): Evidence {
  const found: string[] = []
  for (const text of texts) found.push(...findSkillIds(text))
  return { skillIds: withImplied(found), text: texts.join("\n") }
}

/** Taxonomy requirements match by skill id; any other requirement matches by one of its keywords. */
export function evidenceCovers(requirement: Requirement, evidence: Evidence): boolean {
  const skillId = requirementSkillId(requirement)
  if (skillId) return evidence.skillIds.has(skillId)
  return requirement.keywords.some((keyword) => containsTerm(evidence.text, keyword))
}
