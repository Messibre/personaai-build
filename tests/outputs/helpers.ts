import { buildRewriteContext } from "@/lib/rewrite/context"
import type { Draft } from "@/lib/schemas/draft"
import type { JobProfile, ProjectPick } from "@/lib/schemas/job"
import type { Fact, Vault } from "@/lib/schemas/vault"
import { draftFollowingLeads, loadAlexVault, loadResumeOnlyVault, uxJob, uxPicks } from "../rewrite/helpers"

export { loadAlexVault, loadResumeOnlyVault, uxJob, uxPicks }

export function draftFor(vault: Vault, job: JobProfile, picks: ProjectPick[]): Draft {
  return draftFollowingLeads(buildRewriteContext({ vault, job, picks }))
}

export function picksForAll(vault: Vault): ProjectPick[] {
  return vault.projects.map((project, index) => ({
    projectId: project.id,
    matchedRequirementIds: [],
    score: 1 - index / 10,
  }))
}

export function makeFact(id: string, text: string, confirmed = true): Fact {
  return { id, text, kind: "built", source: "user", confirmed }
}

export function jobWithKeywords(keywords: string[]): JobProfile {
  return {
    title: "Frontend Engineer",
    requirements: [{ id: "req_1", label: "Anything", level: "must", keywords }],
    topThree: ["Anything"],
  }
}

export const UNDEFINED_LIKE = /undefined|\bnull\b|NaN/

export function allUrls(html: string): string[] {
  return html.match(/https?:\/\/[^\s"'<>)]+/g) ?? []
}
