import type { Fact, Vault } from "@/lib/schemas/vault"

export interface FactCounts {
  total: number
  unconfirmed: number
}

export function countFacts(facts: Fact[]): FactCounts {
  return { total: facts.length, unconfirmed: facts.filter((fact) => !fact.confirmed).length }
}

export function countVaultFacts(vault: Vault): FactCounts {
  const all = [...vault.projects.flatMap((project) => project.facts), ...vault.experience.flatMap((entry) => entry.facts)]
  return countFacts(all)
}
