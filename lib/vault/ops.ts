import {
  experienceSchema,
  factSchema,
  projectSchema,
  vaultSchema,
  type Experience,
  type Fact,
  type FactKind,
  type FactSource,
  type Project,
  type Vault,
} from "@/lib/schemas/vault"

export class VaultOpError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "VaultOpError"
  }
}

export interface NewFact {
  text: string
  kind: FactKind
  source: FactSource
  evidence?: string
  confirmed?: boolean
}

export type FactTarget = { type: "project"; id: string } | { type: "experience"; id: string }

/** Strictly increasing even when two ops land in the same millisecond. */
export function nextTimestamp(previous: string): string {
  const now = new Date().toISOString()
  return now > previous ? now : new Date(Date.parse(previous) + 1).toISOString()
}

export function withBumpedTimestamp(vault: Vault): Vault {
  return { ...vault, updatedAt: nextTimestamp(vault.updatedAt) }
}

export function createEmptyVault(name: string): Vault {
  const now = new Date().toISOString()
  const vault: Vault = {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    person: { name: name.trim(), links: [] },
    projects: [],
    experience: [],
    education: [],
    skills: [],
    applications: [],
  }
  const result = vaultSchema.safeParse(vault)
  if (!result.success) throw new VaultOpError("A vault needs a non-empty name.")
  return result.data
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const exists = items.some((existing) => existing.id === item.id)
  return exists ? items.map((existing) => (existing.id === item.id ? item : existing)) : [...items, item]
}

export function upsertProject(vault: Vault, project: Project): Vault {
  const result = projectSchema.safeParse(project)
  if (!result.success) throw new VaultOpError("Project failed validation.")
  return withBumpedTimestamp({ ...vault, projects: upsertById(vault.projects, structuredClone(result.data)) })
}

export function upsertExperience(vault: Vault, experience: Experience): Vault {
  const result = experienceSchema.safeParse(experience)
  if (!result.success) throw new VaultOpError("Experience failed validation.")
  return withBumpedTimestamp({
    ...vault,
    experience: upsertById(vault.experience, structuredClone(result.data)),
  })
}

/**
 * New facts start unconfirmed. Only a fact the user wrote themselves (source "user")
 * may arrive pre-confirmed; anything derived from a document or a model needs an explicit confirmFact.
 */
export function addFacts(vault: Vault, target: FactTarget, facts: NewFact[]): Vault {
  const created: Fact[] = facts.map((input) => {
    const candidate: Fact = {
      id: crypto.randomUUID(),
      text: input.text,
      kind: input.kind,
      source: input.source,
      confirmed: input.confirmed === true && input.source === "user",
      ...(input.evidence === undefined ? {} : { evidence: input.evidence }),
    }
    const result = factSchema.safeParse(candidate)
    if (!result.success) throw new VaultOpError("Fact failed validation.")
    return result.data
  })

  if (target.type === "project") {
    if (!vault.projects.some((project) => project.id === target.id)) {
      throw new VaultOpError("Project not found.")
    }
    return withBumpedTimestamp({
      ...vault,
      projects: vault.projects.map((project) =>
        project.id === target.id ? { ...project, facts: [...project.facts, ...created] } : project,
      ),
    })
  }

  if (!vault.experience.some((entry) => entry.id === target.id)) {
    throw new VaultOpError("Experience not found.")
  }
  return withBumpedTimestamp({
    ...vault,
    experience: vault.experience.map((entry) =>
      entry.id === target.id ? { ...entry, facts: [...entry.facts, ...created] } : entry,
    ),
  })
}

/** Applies `update` to the fact with this id wherever it lives; `null` removes it. Throws if no fact matches. */
function mapFact(vault: Vault, factId: string, update: (fact: Fact) => Fact | null): Vault {
  let found = false
  const apply = (facts: Fact[]): Fact[] => {
    const next: Fact[] = []
    for (const fact of facts) {
      if (fact.id !== factId) {
        next.push(fact)
        continue
      }
      found = true
      const updated = update(fact)
      if (updated) next.push(updated)
    }
    return next
  }

  const projects = vault.projects.map((project) => ({ ...project, facts: apply(project.facts) }))
  const experience = vault.experience.map((entry) => ({ ...entry, facts: apply(entry.facts) }))
  if (!found) throw new VaultOpError("Fact not found.")
  return withBumpedTimestamp({ ...vault, projects, experience })
}

export function confirmFact(vault: Vault, factId: string): Vault {
  return mapFact(vault, factId, (fact) => ({ ...fact, confirmed: true }))
}

/** A user edit makes the user the author: source becomes "user" and the fact is confirmed. */
export function editFact(vault: Vault, factId: string, newText: string): Vault {
  return mapFact(vault, factId, (fact) => {
    const edited: Fact = { ...fact, text: newText, source: "user", confirmed: true }
    const result = factSchema.safeParse(edited)
    if (!result.success) throw new VaultOpError("Fact text must be 1 to 500 characters.")
    return result.data
  })
}

export function removeFact(vault: Vault, factId: string): Vault {
  return mapFact(vault, factId, () => null)
}

export function getConfirmedProjectFacts(project: Project): Fact[] {
  return project.facts.filter((fact) => fact.confirmed === true).map((fact) => ({ ...fact }))
}

export function getConfirmedFacts(vault: Vault): Fact[] {
  return [
    ...vault.projects.flatMap((project) => getConfirmedProjectFacts(project)),
    ...vault.experience.flatMap((entry) =>
      entry.facts.filter((fact) => fact.confirmed === true).map((fact) => ({ ...fact })),
    ),
  ]
}
