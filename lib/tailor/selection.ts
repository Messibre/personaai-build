import type { ProjectPick } from "@/lib/schemas/job"

export interface SelectableProject extends ProjectPick {
  included: boolean
}

export const MIN_SELECTED = 1
export const MAX_SELECTED = 4

export function toSelectable(picks: ProjectPick[]): SelectableProject[] {
  return picks.slice(0, MAX_SELECTED).map((pick) => ({ ...pick, included: true }))
}

export function includedCount(items: SelectableProject[]): number {
  return items.filter((item) => item.included).length
}

/** Excluding the last remaining project is refused, so a generate request always has at least one. */
export function toggleIncluded(items: SelectableProject[], projectId: string): SelectableProject[] {
  const target = items.find((item) => item.projectId === projectId)
  if (!target) return items
  if (target.included && includedCount(items) <= MIN_SELECTED) return items
  if (!target.included && includedCount(items) >= MAX_SELECTED) return items
  return items.map((item) => (item.projectId === projectId ? { ...item, included: !item.included } : item))
}

export function moveItem(items: SelectableProject[], projectId: string, direction: -1 | 1): SelectableProject[] {
  const from = items.findIndex((item) => item.projectId === projectId)
  const to = from + direction
  if (from < 0 || to < 0 || to >= items.length) return items
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function toPicksPayload(items: SelectableProject[]): ProjectPick[] {
  return items
    .filter((item) => item.included)
    .map(({ projectId, matchedRequirementIds, score }) => ({ projectId, matchedRequirementIds, score }))
}
