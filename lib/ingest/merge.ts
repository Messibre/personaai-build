import { nextTimestamp } from "@/lib/vault/ops"
import type { Education, Experience, Fact, Project, Skill, Vault } from "@/lib/schemas/vault"

export const MAX_IMPORT_REPOS = 6
export const DEFAULT_VAULT_NAME = "New vault"

export interface ImportBundle {
  projects?: Project[]
  experience?: Experience[]
  skills?: Skill[]
  education?: Education[]
  githubUsername?: string
  personName?: string
}

export interface MergeOptions {
  /** Timestamp used when the merge changes the vault. Defaults to the next monotonic time. */
  now?: string
}

const key = (value: string | undefined): string => (value ?? "").trim().toLowerCase()
const factKey = (text: string): string => text.replace(/\s+/g, " ").trim().toLowerCase()

/** Imported facts never arrive confirmed, and never reuse an id that is already taken. */
function adoptFacts(existing: Fact[], incoming: Fact[], usedIds: Set<string>): Fact[] {
  const seen = new Set(existing.map((fact) => factKey(fact.text)))
  const added: Fact[] = []
  for (const fact of incoming) {
    const textKey = factKey(fact.text)
    if (seen.has(textKey)) continue
    seen.add(textKey)
    const id = usedIds.has(fact.id) ? crypto.randomUUID() : fact.id
    usedIds.add(id)
    added.push({ ...fact, id, confirmed: false })
  }
  return added
}

function unionStrings(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map(key))
  const added = incoming.filter((value) => {
    const k = key(value)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return added.length === 0 ? existing : [...existing, ...added]
}

function collectFactIds(vault: Vault): Set<string> {
  return new Set([
    ...vault.projects.flatMap((project) => project.facts.map((fact) => fact.id)),
    ...vault.experience.flatMap((entry) => entry.facts.map((fact) => fact.id)),
  ])
}

/**
 * Pure: returns a new vault and leaves the input untouched. Existing data is never dropped,
 * existing facts keep their confirmed state, and merging the same bundle twice changes nothing.
 */
export function mergeImport(vault: Vault, imported: ImportBundle, options: MergeOptions = {}): Vault {
  let changed = false
  const usedIds = collectFactIds(vault)
  let result: Vault = structuredClone(vault)

  const projects = result.projects
  for (const incoming of imported.projects ?? []) {
    const index = projects.findIndex((project) => key(project.name) === key(incoming.name))
    if (index === -1) {
      const facts = adoptFacts([], incoming.facts, usedIds)
      projects.push({ ...structuredClone(incoming), facts })
      changed = true
      continue
    }

    const current = projects[index]
    const newFacts = adoptFacts(current.facts, incoming.facts, usedIds)
    const techs = unionStrings(current.techs, incoming.techs)
    const fills: Partial<Project> = {}
    if (current.url === undefined && incoming.url !== undefined) fills.url = incoming.url
    if (current.primaryLanguage === undefined && incoming.primaryLanguage !== undefined) {
      fills.primaryLanguage = incoming.primaryLanguage
    }
    if (current.stats === undefined && incoming.stats !== undefined) fills.stats = incoming.stats
    if (current.sourceSnapshot === undefined && incoming.sourceSnapshot !== undefined) {
      fills.sourceSnapshot = structuredClone(incoming.sourceSnapshot)
    }

    if (newFacts.length > 0 || techs !== current.techs || Object.keys(fills).length > 0) {
      projects[index] = { ...current, ...fills, techs, facts: [...current.facts, ...newFacts] }
      changed = true
    }
  }

  for (const incoming of imported.experience ?? []) {
    const index = result.experience.findIndex(
      (entry) => key(entry.company) === key(incoming.company) && key(entry.title) === key(incoming.title),
    )
    if (index === -1) {
      result.experience.push({ ...structuredClone(incoming), facts: adoptFacts([], incoming.facts, usedIds) })
      changed = true
      continue
    }
    const current = result.experience[index]
    const newFacts = adoptFacts(current.facts, incoming.facts, usedIds)
    if (newFacts.length > 0) {
      result.experience[index] = { ...current, facts: [...current.facts, ...newFacts] }
      changed = true
    }
  }

  const skillKeys = new Set(result.skills.map((skill) => key(skill.name)))
  for (const incoming of imported.skills ?? []) {
    if (skillKeys.has(key(incoming.name))) continue
    skillKeys.add(key(incoming.name))
    result.skills.push({ ...incoming, confirmed: false })
    changed = true
  }

  const educationKeys = new Set(result.education.map((entry) => `${key(entry.institution)}|${key(entry.degree)}`))
  for (const incoming of imported.education ?? []) {
    const k = `${key(incoming.institution)}|${key(incoming.degree)}`
    if (educationKeys.has(k)) continue
    educationKeys.add(k)
    result.education.push(structuredClone(incoming))
    changed = true
  }

  if (imported.githubUsername && result.github === undefined) {
    result = { ...result, github: { username: imported.githubUsername } }
    changed = true
  }

  const personName = imported.personName?.trim()
  if (personName && result.person.name === DEFAULT_VAULT_NAME && personName !== DEFAULT_VAULT_NAME) {
    result = { ...result, person: { ...result.person, name: personName.slice(0, 200) } }
    changed = true
  }

  if (!changed) return vault
  return { ...result, updatedAt: options.now ?? nextTimestamp(vault.updatedAt) }
}
