import { createHash } from "node:crypto"
import { checkDraft } from "@/lib/check/check-draft"
import { buildTemplateData } from "@/lib/rewrite/to-template"
import type { Vault } from "@/lib/schemas/vault"
import { validatePicks } from "@/lib/tailor/pipeline"
import { selectedVault } from "@/lib/tailor/selected-vault"
import { buildPortfolioHtml } from "@/lib/templates"
import type { PortfolioConfig } from "@/lib/types"
import { issueStatusToken } from "./capability"
import type { PublishRecords } from "./records"
import type { PublishRequest } from "./requests"
import { PublishError, createDeployment, ensureProject, type VercelConfig } from "./vercel"

export const DAILY_PUBLISH_LIMIT = 5
export const MAX_HTML_BYTES = 900_000
const DAY_SECONDS = 24 * 60 * 60
const RECORD_SECONDS = 7 * DAY_SECONDS
const LOCK_SECONDS = 90
const SECTIONS: PortfolioConfig["sections"] = ["about", "skills", "projects", "experience", "education", "github-stats", "contact"]

export type PublishFailure =
  | "vault_not_found"
  | "invalid_selection"
  | "unsupported_content"
  | "too_large"
  | "limit_reached"
  | "in_progress"
  | "unavailable"

export type PublishResult =
  | { ok: true; deploymentId: string; project: string; statusToken: string; reused: boolean }
  | { ok: false; code: PublishFailure; message: string; status: number }

export interface PublishDeps {
  loadVault: (id: string) => Promise<Vault | null>
  records: PublishRecords
  vercel: VercelConfig
  secret: string
  now?: () => number
}

const fail = (code: PublishFailure, message: string, status: number): PublishResult => ({ ok: false, code, message, status })
const sha = (value: string) => createHash("sha256").update(value).digest("hex")

export function projectNameFor(vault: Pick<Vault, "id" | "person">): string {
  const slug = vault.person.name
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  return `portfolio-${slug || "me"}-${sha(vault.id).slice(0, 8)}`
}

/** Renders from the stored vault and the checked draft only. Browser-supplied HTML is never accepted. */
export function renderPublicHtml(vault: Vault, request: PublishRequest): { html: string } | { problem: string } {
  const chosen = selectedVault(vault, request.selection)
  const pickProblem = validatePicks(chosen, request.picks)
  if (pickProblem) return { problem: pickProblem }
  const allowedProjects = new Set(request.picks.map((pick) => pick.projectId))
  if (!request.draft.projects.every((project) => allowedProjects.has(project.projectId))) {
    return { problem: "The draft includes a project that is not selected." }
  }
  const config: PortfolioConfig = { template: request.template, colorScheme: request.colorScheme, sections: [...SECTIONS], socialLinks: {} }
  const data = buildTemplateData({ vault: chosen, draft: request.draft, picks: request.picks, config, job: request.job })
  return { html: buildPortfolioHtml(data) }
}

export async function publishPortfolio(request: PublishRequest, deps: PublishDeps): Promise<PublishResult> {
  const vault = await deps.loadVault(request.vaultId)
  if (!vault) return fail("vault_not_found", "That vault could not be found.", 404)

  const chosen = selectedVault(vault, request.selection)
  const pickProblem = validatePicks(chosen, request.picks)
  if (pickProblem) return fail("invalid_selection", pickProblem, 400)

  // Deterministic re-check against confirmed facts only; nothing the browser sent is trusted.
  const checked = await checkDraft(request.draft, chosen, undefined, { jobTitle: request.job.title })
  if (checked.removed.length > 0) {
    return fail("unsupported_content", "Some text is no longer backed by your confirmed facts. Regenerate the draft before publishing.", 422)
  }

  const rendered = renderPublicHtml(vault, request)
  if ("problem" in rendered) return fail("invalid_selection", rendered.problem, 400)
  if (Buffer.byteLength(rendered.html, "utf8") > MAX_HTML_BYTES) return fail("too_large", "The portfolio is too large to publish.", 413)

  const project = projectNameFor(vault)
  const vaultKey = sha(vault.id).slice(0, 32)
  const recordKey = `publish:rec:${vaultKey}:${sha(rendered.html)}`
  const issue = (deploymentId: string, reused: boolean): PublishResult => ({
    ok: true,
    deploymentId,
    project,
    statusToken: issueStatusToken({ deploymentId, project }, deps.secret, deps.now?.()),
    reused,
  })

  try {
    const existing = await deps.records.get(recordKey)
    if (existing && existing !== "pending") return issue(existing, true)
    if (existing === "pending") return fail("in_progress", "This portfolio is already being published. Please wait a moment.", 409)

    const claimed = await deps.records.setIfAbsent(recordKey, "pending", LOCK_SECONDS)
    if (!claimed) return fail("in_progress", "This portfolio is already being published. Please wait a moment.", 409)

    try {
      const day = new Date(deps.now?.() ?? Date.now()).toISOString().slice(0, 10)
      const count = await deps.records.increment(`publish:cap:${vaultKey}:${day}`, DAY_SECONDS)
      if (count > DAILY_PUBLISH_LIMIT) {
        await deps.records.delete(recordKey)
        return fail("limit_reached", "The daily publishing limit was reached. Try again tomorrow.", 429)
      }
      await ensureProject(project, deps.vercel)
      const deployment = await createDeployment(project, rendered.html, deps.vercel)
      await deps.records.set(recordKey, deployment.id, RECORD_SECONDS)
      return issue(deployment.id, false)
    } catch (error) {
      await deps.records.delete(recordKey).catch(() => undefined)
      throw error
    }
  } catch (error) {
    if (error instanceof PublishError) {
      console.error(`[publish] provider failure code=${error.code}`)
      return fail("unavailable", error.code === "auth" ? "Publishing is not available right now." : "Publishing failed. Please try again.", 502)
    }
    console.error("[publish] unexpected failure")
    return fail("unavailable", "Publishing failed. Please try again.", 502)
  }
}
