import { MockClient } from "@/lib/llm/mock"
import { rewriteForJob } from "@/lib/rewrite/rewrite"
import type { Draft } from "@/lib/schemas/draft"
import type { Vault } from "@/lib/schemas/vault"
import type { TailorDeps } from "@/lib/tailor/ports"
import { draftFollowingLeads, leadFollowingClient, uxJob, uxPicks } from "../rewrite/helpers"

export { loadAlexVault, loadResumeOnlyVault, uxJob, uxPicks } from "../outputs/helpers"

export const POSTING = `${"We are hiring a UX Engineer to build accessible, motion-aware interfaces with React and design systems. ".repeat(3)}`.trim()

export function unconfirmed(vault: Vault): Vault {
  return {
    ...vault,
    projects: vault.projects.map((project) => ({
      ...project,
      facts: project.facts.map((fact) => ({ ...fact, confirmed: false })),
    })),
  }
}

export function passThroughCheck(draft: Draft) {
  return Promise.resolve({ clean: draft, removed: [] })
}

export function makeDeps(overrides: Partial<TailorDeps> = {}): TailorDeps {
  return {
    llm: leadFollowingClient(),
    analyzeJob: async () => ({ ok: true, data: uxJob }),
    detectGaps: () => [],
    pickProjects: (_job, vault) =>
      uxPicks.filter((pick) => vault.projects.some((project) => project.id === pick.projectId)),
    checkDraft: passThroughCheck,
    rewriteForJob,
    now: () => new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  }
}

export { draftFollowingLeads, MockClient }
