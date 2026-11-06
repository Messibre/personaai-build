import { buildNote, countWords } from "@/lib/outputs/note"
import { buildResumeHtml, buildResumeModel, buildResumePlainText } from "@/lib/outputs/resume"
import { buildTemplateData } from "@/lib/rewrite/to-template"
import { draftSchema, type Draft } from "@/lib/schemas/draft"
import type { JobProfile, ProjectPick } from "@/lib/schemas/job"
import { checkResultSchema, type Gap, type Removed } from "@/lib/schemas/tailor"
import type { Vault } from "@/lib/schemas/vault"
import { buildPortfolioHtml } from "@/lib/templates"
import type { ColorScheme, PortfolioConfig, TemplateStyle } from "@/lib/types"
import type { TailorDeps } from "./ports"

import { MAX_PICKS, POSTING_LIMITS } from "./limits"

export { MAX_PICKS, POSTING_LIMITS }

export type TailorErrorCode =
  | "too_short"
  | "too_long"
  | "vault_empty"
  | "invalid_picks"
  | "analyze_failed"
  | "rewrite_failed"
  | "check_failed"
  | "unavailable"

export interface TailorError {
  code: TailorErrorCode
  message: string
}

export type StageResult<T> = { ok: true; data: T } | { ok: false; error: TailorError }

function fail<T>(code: TailorErrorCode, message: string): StageResult<T> {
  return { ok: false, error: { code, message } }
}

const UNAVAILABLE_MESSAGE = "This step is not available yet. Please try again later."
const DEFAULT_SECTIONS: PortfolioConfig["sections"] = ["about", "skills", "projects", "experience", "education", "github-stats", "contact"]

export function hasConfirmedFacts(project: Vault["projects"][number]): boolean {
  return project.facts.some((fact) => fact.confirmed)
}

function hasConfirmedExperience(vault: Vault): boolean {
  return vault.experience.some((item) => item.facts.some((fact) => fact.confirmed))
}

function vaultWithEligibleProjects(vault: Vault): Vault {
  return { ...vault, projects: vault.projects.filter(hasConfirmedFacts) }
}

/* ---------- analyze ---------- */

export interface AnalyzeInput {
  vault: Vault
  postingText: string
}

export interface AnalyzeOutput {
  job: JobProfile
  gaps: Gap[]
  picks: ProjectPick[]
}

export async function analyzeStage(deps: TailorDeps, input: AnalyzeInput): Promise<StageResult<AnalyzeOutput>> {
  const postingText = input.postingText.trim()
  if (postingText.length < POSTING_LIMITS.min) {
    return fail("too_short", `The job posting is too short. Paste at least ${POSTING_LIMITS.min} characters.`)
  }
  if (postingText.length > POSTING_LIMITS.max) {
    return fail("too_long", `The job posting is too long. Keep it under ${POSTING_LIMITS.max.toLocaleString("en-US")} characters.`)
  }

  const eligible = vaultWithEligibleProjects(input.vault)
  if (eligible.projects.length === 0 && !hasConfirmedExperience(eligible)) return vaultEmpty()

  try {
    const analysis = await deps.analyzeJob(deps.llm, postingText)
    if (!analysis.ok) return fail("analyze_failed", "I could not read that job posting. Try again, or paste a cleaner copy.")

    const gaps = deps.detectGaps(analysis.data, input.vault)
    const eligibleIds = new Set(eligible.projects.map((project) => project.id))
    const seen = new Set<string>()
    const picks = deps
      .pickProjects(analysis.data, eligible, { max: MAX_PICKS })
      .filter((pick) => {
        if (!eligibleIds.has(pick.projectId) || seen.has(pick.projectId)) return false
        seen.add(pick.projectId)
        return true
      })
      .slice(0, MAX_PICKS)

    if (picks.length === 0 && !hasConfirmedExperience(eligible)) return vaultEmpty()
    return { ok: true, data: { job: analysis.data, gaps, picks } }
  } catch {
    return fail("unavailable", UNAVAILABLE_MESSAGE)
  }
}

function vaultEmpty<T>(): StageResult<T> {
  return fail(
    "vault_empty",
    "None of your projects or experiences has a confirmed fact yet. Add and confirm some in your vault at /vault, then come back.",
  )
}

/* ---------- generate ---------- */

export interface GenerateInput {
  vault: Vault
  job: JobProfile
  picks: ProjectPick[]
  template: TemplateStyle
  colorScheme: ColorScheme
  company?: string
}

export interface GenerateOutput {
  draft: Draft
  picks: ProjectPick[]
  removed: Removed[]
  portfolioHtml: string
  resumeHtml: string
  resumeText: string
  noteText: string
  noteWordCount: number
  droppedByRewrite: number
}

/** A sentence may only survive the checker if it was already in the draft. The checker removes; it never writes. */
function onlyContainsOriginalSentences(original: Draft, clean: Draft): boolean {
  const known = (sentences: Draft["about"]) => new Set(sentences.map((sentence) => sentence.text))
  const subset = (before: Draft["about"], after: Draft["about"]) => {
    const allowed = known(before)
    return after.every((sentence) => allowed.has(sentence.text))
  }
  if (clean.tagline !== "" && clean.tagline !== original.tagline) return false
  if (!subset(original.about, clean.about)) return false
  if (!subset(original.resumeBullets, clean.resumeBullets)) return false
  if (!subset(original.note, clean.note)) return false
  return clean.projects.every((project) => {
    const source = original.projects.find((candidate) => candidate.projectId === project.projectId)
    return source !== undefined && subset(source.sentences, project.sentences)
  })
}

export function validatePicks(vault: Vault, picks: ProjectPick[]): string | null {
  if (picks.length === 0 && !hasConfirmedExperience(vault)) return "Include a project or experience with confirmed facts."
  if (picks.length > MAX_PICKS) return `Choose no more than ${MAX_PICKS} projects.`
  const ids = picks.map((pick) => pick.projectId)
  if (new Set(ids).size !== ids.length) return "Each project can only be chosen once."
  const known = new Map(vault.projects.map((project) => [project.id, project]))
  for (const id of ids) {
    const project = known.get(id)
    if (!project) return "One of the chosen projects is not in your vault."
    if (!hasConfirmedFacts(project)) return "One of the chosen projects has no confirmed facts."
  }
  return null
}

export async function generateStage(deps: TailorDeps, input: GenerateInput): Promise<StageResult<GenerateOutput>> {
  const pickProblem = validatePicks(input.vault, input.picks)
  if (pickProblem) return fail("invalid_picks", pickProblem)

  let rewritten: Draft
  let droppedByRewrite: number
  try {
    const rewrite = await deps.rewriteForJob(deps.llm, { vault: input.vault, job: input.job, picks: input.picks })
    if (!rewrite.ok) {
      const kind = rewrite.error.kind === "llm" ? `llm:${rewrite.error.error.kind}` : rewrite.error.kind
      console.error(`[tailor] rewrite failed (${kind})`)
    }
    if (!rewrite.ok) return fail("rewrite_failed", "I could not write the text for this job. Please try again.")
    rewritten = rewrite.draft
    droppedByRewrite = rewrite.dropped
  } catch {
    return fail("unavailable", UNAVAILABLE_MESSAGE)
  }

  // Fail closed: no checker result means nothing is shown, and the unchecked draft is never used.
  let checked: ReturnType<typeof checkResultSchema.safeParse>
  try {
    checked = checkResultSchema.safeParse(await deps.checkDraft(rewritten, input.vault, deps.llm, { jobTitle: input.job.title }))
  } catch {
    return fail("check_failed", "The fact checker could not run, so nothing was produced. Please try again.")
  }
  if (!checked.success || !draftSchema.safeParse(checked.data.clean).success) {
    return fail("check_failed", "The fact checker returned an unusable result, so nothing was produced.")
  }
  const { clean, removed } = checked.data
  if (!onlyContainsOriginalSentences(rewritten, clean)) {
    return fail("check_failed", "The fact checker returned text that was not in the draft, so nothing was produced.")
  }

  const survivingIds = new Set(clean.projects.filter((project) => project.sentences.length > 0).map((project) => project.projectId))
  const keptPicks = input.picks.filter((pick) => survivingIds.has(pick.projectId))
  const keptDraft: Draft = { ...clean, projects: clean.projects.filter((project) => survivingIds.has(project.projectId)) }

  const removedAll: Removed[] = [...removed]
  for (const pick of input.picks) {
    if (survivingIds.has(pick.projectId)) continue
    const alreadyListed = removed.some((entry) => entry.section === "project" && entry.projectId === pick.projectId)
    if (alreadyListed) continue
    const name = input.vault.projects.find((project) => project.id === pick.projectId)?.name ?? "A project"
    removedAll.push({ section: "project", projectId: pick.projectId, text: `${name}: no sentence could be backed by your confirmed facts.`, reason: "unsupported" })
  }

  const config: PortfolioConfig = { template: input.template, colorScheme: input.colorScheme, sections: [...DEFAULT_SECTIONS], socialLinks: {} }
  const templateData = buildTemplateData({ vault: input.vault, draft: keptDraft, picks: keptPicks, config, job: input.job })
  const portfolioHtml = buildPortfolioHtml(templateData)
  const resumeModel = buildResumeModel({ vault: input.vault, draft: keptDraft, job: input.job, picks: keptPicks })
  const note = buildNote({ vault: input.vault, draft: keptDraft, job: input.job, company: input.company })

  return {
    ok: true,
    data: {
      draft: keptDraft,
      picks: keptPicks,
      removed: removedAll,
      portfolioHtml,
      resumeHtml: buildResumeHtml(resumeModel),
      resumeText: buildResumePlainText(resumeModel),
      noteText: note.text,
      noteWordCount: note.text ? countWords(note.text) : 0,
      droppedByRewrite,
    },
  }
}
