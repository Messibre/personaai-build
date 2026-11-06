import type { Vault } from "@/lib/schemas/vault"
import type { ContentSelection, TailoringPreferences } from "@/lib/schemas/tailoring-preferences"
import type { SelectableProject } from "./selection"

export function reconcileSelection(vault: Vault, saved?: ContentSelection): ContentSelection {
  if (!saved) return {
    experience: vault.experience.filter((item) => item.facts.some((fact) => fact.confirmed)).map((item) => item.id),
    education: vault.education.map((item) => item.id),
    contacts: [],
    github: false,
  }
  const contacts = new Set([...vault.person.links, ...(vault.person.email ? ["email"] : [])])
  return {
    experience: [...new Set(saved.experience)].filter((id) => vault.experience.some((item) => item.id === id)),
    education: [...new Set(saved.education)].filter((id) => vault.education.some((item) => item.id === id)),
    contacts: [...new Set(saved.contacts)].filter((link) => contacts.has(link)),
    github: saved.github && Boolean(vault.github),
  }
}

export function reconcilePreferences(vault: Vault, saved: TailoringPreferences): TailoringPreferences {
  const seen = new Set<string>()
  return { ...saved, selection: reconcileSelection(vault, saved.selection), projects: saved.projects.filter((item) => {
    if (seen.has(item.projectId) || !vault.projects.some((project) => project.id === item.projectId)) return false
    seen.add(item.projectId)
    return true
  }) }
}

export function restoreProjectChoices(items: SelectableProject[], saved: TailoringPreferences | undefined, postingText: string): SelectableProject[] {
  if (!saved || saved.postingText !== postingText || !saved.projects.length) return items
  const order = new Map(saved.projects.map((item, index) => [item.projectId, index]))
  const restored = items.map((item) => ({ ...item, included: saved.projects.find((choice) => choice.projectId === item.projectId)?.included ?? item.included }))
    .sort((a, b) => (order.get(a.projectId) ?? 500) - (order.get(b.projectId) ?? 500))
  if (restored.length && !restored.some((item) => item.included)) restored[0].included = true
  return restored
}
