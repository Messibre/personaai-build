import type { JobProfile, Requirement } from "@/lib/schemas/job"
import type { Gap } from "@/lib/schemas/tailor"
import type { Vault } from "@/lib/schemas/vault"
import { adjacentSkillIds, buildEvidence, evidenceCovers, getSkill, requirementSkillId, type Evidence } from "./skills"

/** Only confirmed facts and confirmed skills count as evidence. */
export function confirmedEvidence(vault: Vault): Evidence {
  const texts: string[] = []
  for (const owner of [...vault.projects, ...vault.experience]) {
    for (const fact of owner.facts) if (fact.confirmed) texts.push(fact.text)
  }
  for (const skill of vault.skills) if (skill.confirmed) texts.push(skill.name)
  return buildEvidence(texts)
}

export function missingMessage(label: string): string {
  return `The posting asks for ${label}. Nothing in your confirmed facts shows it. If you have done this, add it to your vault; otherwise leave it out.`
}

export function partialMessage(label: string, related: readonly string[]): string {
  return `The posting asks for ${label}. You have related work (${related.join(", ")}), but nothing confirmed shows ${label} itself.`
}

type Status = { kind: "covered" } | { kind: "partial"; via: string[] } | { kind: "missing" }

function statusFor(requirement: Requirement, evidence: Evidence): Status {
  if (evidenceCovers(requirement, evidence)) return { kind: "covered" }
  const skillId = requirementSkillId(requirement)
  if (!skillId) return { kind: "missing" }
  const via = adjacentSkillIds(skillId)
    .filter((id) => evidence.skillIds.has(id))
    .map((id) => getSkill(id)?.name ?? id)
  return via.length > 0 ? { kind: "partial", via } : { kind: "missing" }
}

/**
 * Deterministic. One gap per requirement that confirmed evidence does not fully cover.
 * Order: must before nice, then missing before partial, then the job's own requirement order.
 */
export function detectGaps(job: JobProfile, vault: Vault): Gap[] {
  const evidence = confirmedEvidence(vault)
  const ranked: Array<{ gap: Gap; rank: number; index: number }> = []

  job.requirements.forEach((requirement, index) => {
    const status = statusFor(requirement, evidence)
    if (status.kind === "covered") return
    const message = status.kind === "missing" ? missingMessage(requirement.label) : partialMessage(requirement.label, status.via)
    const rank = (requirement.level === "must" ? 0 : 2) + (status.kind === "missing" ? 0 : 1)
    ranked.push({
      gap: { requirementId: requirement.id, label: requirement.label, level: requirement.level, message: message.slice(0, 500) },
      rank,
      index,
    })
  })

  return ranked.sort((a, b) => a.rank - b.rank || a.index - b.index).map((entry) => entry.gap)
}
