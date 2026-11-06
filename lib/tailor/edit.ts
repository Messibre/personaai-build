import { z } from "zod"
import type { LLMClient } from "@/lib/llm/types"
import { buildNote, countWords } from "@/lib/outputs/note"
import { buildResumeHtml, buildResumeModel, buildResumePlainText } from "@/lib/outputs/resume"
import { buildTemplateData } from "@/lib/rewrite/to-template"
import { draftSchema, type Draft, type Sentence } from "@/lib/schemas/draft"
import type { JobProfile, ProjectPick } from "@/lib/schemas/job"
import { checkResultSchema, type CheckResult, type Removed } from "@/lib/schemas/tailor"
import { vaultSchema, type FactKind, type Vault } from "@/lib/schemas/vault"
import { buildPortfolioHtml } from "@/lib/templates"
import type { ColorScheme, PortfolioConfig, TemplateStyle } from "@/lib/types"
import { addFacts, getConfirmedFacts, type FactTarget } from "@/lib/vault/ops"

export const MAX_EDIT_CHARS = 400

/* ---------- section references ---------- */

export type SectionRef =
  | { section: "tagline" }
  | { section: "about" | "resume" | "note"; index: number }
  | { section: "project"; projectId: string; index: number }

const indexSchema = z.number().int().min(0).max(200)

export const sectionRefSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("tagline") }).strict(),
  z.object({ section: z.enum(["about", "resume", "note"]), index: indexSchema }).strict(),
  z.object({ section: z.literal("project"), projectId: z.string().min(1).max(128), index: indexSchema }).strict(),
])

export function sectionKey(ref: SectionRef): string {
  switch (ref.section) {
    case "tagline":
      return "tagline"
    case "about":
    case "resume":
    case "note":
      return `${ref.section}:${ref.index}`
    case "project":
      return `project:${ref.projectId}:${ref.index}`
    default: {
      const unreachable: never = ref
      return unreachable
    }
  }
}

function listFor(draft: Draft, ref: Exclude<SectionRef, { section: "tagline" }>): Sentence[] | undefined {
  switch (ref.section) {
    case "about":
      return draft.about
    case "resume":
      return draft.resumeBullets
    case "note":
      return draft.note
    case "project":
      return draft.projects.find((project) => project.projectId === ref.projectId)?.sentences
    default: {
      const unreachable: never = ref
      return unreachable
    }
  }
}

/** The text currently at `ref`, or undefined when nothing is there. */
export function textAt(draft: Draft, ref: SectionRef): string | undefined {
  if (ref.section === "tagline") return draft.tagline === "" ? undefined : draft.tagline
  return listFor(draft, ref)?.[ref.index]?.text
}

/* ---------- edit ---------- */

export type EditRejectionReason = Removed["reason"] | "empty" | "too_long" | "not_found" | "bad_fact" | "check_unavailable"

export interface AddFactSuggestion {
  kind: "add_fact"
  factText: string
}

export type EditResult =
  | { ok: true; draft: Draft }
  | { ok: false; reason: EditRejectionReason; message: string; suggestion?: AddFactSuggestion }

export interface EditDeps {
  checkDraft: (draft: Draft, vault: Vault, llm?: LLMClient) => Promise<CheckResult>
  llm?: LLMClient
}

export interface EditOptions {
  /** Ids of facts the user has just added and confirmed. They are linked to the edited sentence. */
  attachFactIds?: string[]
}

const REASON_MESSAGES: Record<Removed["reason"], string> = {
  unknown_fact: "This mentions something that is not in your confirmed facts.",
  unconfirmed_fact: "This relies on a fact you have not confirmed yet.",
  number_mismatch: "A number in this sentence does not match your confirmed facts.",
  unsupported: "Your confirmed facts do not back this sentence up.",
}

function reject(reason: EditRejectionReason, message: string, suggestion?: AddFactSuggestion): EditResult {
  return { ok: false, reason, message, ...(suggestion ? { suggestion } : {}) }
}

function emptyDraft(): Draft {
  return { tagline: "", about: [], projects: [], resumeBullets: [], note: [] }
}

/** A draft holding only the sentence under test, so the checker judges it in isolation. */
function probeFor(ref: SectionRef, sentence: Sentence): Draft {
  const probe = emptyDraft()
  switch (ref.section) {
    case "tagline":
      probe.tagline = sentence.text
      break
    case "about":
      probe.about = [sentence]
      break
    case "resume":
      probe.resumeBullets = [sentence]
      break
    case "note":
      probe.note = [sentence]
      break
    case "project":
      probe.projects = [{ projectId: ref.projectId, sentences: [sentence] }]
      break
    default: {
      const unreachable: never = ref
      return unreachable
    }
  }
  return probe
}

/** What survived the checker for the probe, as long as it is exactly the sentence that was submitted. */
function survivedUnchanged(clean: Draft, ref: SectionRef, submitted: string): boolean {
  const expected = probeFor(ref, { text: submitted, factIds: [] })
  const sameList = (a: Sentence[], b: Sentence[]) => a.length === b.length && a.every((s, i) => s.text === b[i]?.text)
  if (clean.tagline !== expected.tagline) return false
  if (!sameList(clean.about, expected.about)) return false
  if (!sameList(clean.resumeBullets, expected.resumeBullets)) return false
  if (!sameList(clean.note, expected.note)) return false
  if (clean.projects.length !== expected.projects.length) return false
  return clean.projects.every((project, i) => {
    const wanted = expected.projects[i]
    return wanted !== undefined && project.projectId === wanted.projectId && sameList(project.sentences, wanted.sentences)
  })
}

function replaceAt(draft: Draft, ref: SectionRef, sentence: Sentence): Draft {
  const next = structuredClone(draft)
  if (ref.section === "tagline") {
    next.tagline = sentence.text
    return next
  }
  const list = listFor(next, ref)
  if (list) list[ref.index] = sentence
  return next
}

/**
 * Replaces one sentence, but only if the fact checker keeps it. The checker removes; it never writes,
 * so anything it returns that differs from what the user typed is treated as a failure.
 * A rejected edit leaves the draft untouched.
 */
export async function applyEdit(
  draft: Draft,
  ref: SectionRef,
  newText: string,
  vault: Vault,
  deps: EditDeps,
  options: EditOptions = {},
): Promise<EditResult> {
  const text = newText.trim()
  if (text === "") return reject("empty", "Write something first, or delete the sentence instead.")
  if (text.length > MAX_EDIT_CHARS) return reject("too_long", `Keep it under ${MAX_EDIT_CHARS} characters.`)

  const current = ref.section === "tagline" ? undefined : listFor(draft, ref)?.[ref.index]
  if (ref.section === "tagline" ? draft.tagline === "" : current === undefined) {
    return reject("not_found", "That sentence is no longer in the draft.")
  }

  const attach = [...new Set(options.attachFactIds ?? [])]
  if (attach.length > 0) {
    const confirmedIds = new Set(getConfirmedFacts(vault).map((fact) => fact.id))
    if (!attach.every((id) => confirmedIds.has(id))) {
      return reject("bad_fact", "That fact is not confirmed in your vault yet.")
    }
  }

  const factIds = ref.section === "tagline" ? [] : [...new Set([...(current?.factIds ?? []), ...attach])]
  const candidate: Sentence = { text, factIds }
  const probe = probeFor(ref, candidate)

  let checked: ReturnType<typeof checkResultSchema.safeParse>
  try {
    checked = checkResultSchema.safeParse(await deps.checkDraft(probe, vault, deps.llm))
  } catch {
    return reject("check_unavailable", "The fact checker could not run, so your edit was not applied.")
  }
  if (!checked.success || !draftSchema.safeParse(checked.data.clean).success) {
    return reject("check_unavailable", "The fact checker returned an unusable result, so your edit was not applied.")
  }

  if (survivedUnchanged(checked.data.clean, ref, text)) {
    return { ok: true, draft: replaceAt(draft, ref, candidate) }
  }

  const removed = checked.data.removed.find((entry) => entry.text.trim() === text) ?? checked.data.removed[0]
  const why = REASON_MESSAGES[removed?.reason ?? "unsupported"]
  return reject(removed?.reason ?? "unsupported", why, { kind: "add_fact", factText: text })
}

/** Deleting never needs a check: it only removes text. A project left with no sentences is dropped. */
export function deleteSentence(draft: Draft, ref: SectionRef): Draft {
  const next = structuredClone(draft)
  if (ref.section === "tagline") {
    next.tagline = ""
    return next
  }
  const list = listFor(next, ref)
  if (!list || ref.index >= list.length) return next
  list.splice(ref.index, 1)
  if (ref.section === "project") {
    next.projects = next.projects.filter((project) => project.sentences.length > 0)
  }
  return next
}

export function picksForDraft(draft: Draft, picks: ProjectPick[]): ProjectPick[] {
  const surviving = new Set(draft.projects.filter((project) => project.sentences.length > 0).map((project) => project.projectId))
  return picks.filter((pick) => surviving.has(pick.projectId))
}

/* ---------- adding a fact from a rejected edit ---------- */

export function defaultFactTarget(ref: SectionRef, vault: Vault, picks: ProjectPick[]): FactTarget | null {
  if (ref.section === "project" && vault.projects.some((project) => project.id === ref.projectId)) {
    return { type: "project", id: ref.projectId }
  }
  const firstPicked = picks.find((pick) => vault.projects.some((project) => project.id === pick.projectId))
  if (firstPicked) return { type: "project", id: firstPicked.projectId }
  const first = vault.projects[0]
  return first ? { type: "project", id: first.id } : null
}

/**
 * Adds the user's own wording to the vault as an UNCONFIRMED fact. Nothing here confirms it;
 * the caller must run confirmFact after the user presses Confirm.
 */
export function addUnconfirmedUserFact(
  vault: Vault,
  target: FactTarget,
  text: string,
): { vault: Vault; factId: string } {
  const kind: FactKind = target.type === "project" ? "built" : "role"
  const before = new Set([...vault.projects.flatMap((p) => p.facts), ...vault.experience.flatMap((e) => e.facts)].map((f) => f.id))
  const updated = addFacts(vault, target, [{ text, kind, source: "user", confirmed: false }])
  const created = [...updated.projects.flatMap((p) => p.facts), ...updated.experience.flatMap((e) => e.facts)].find(
    (fact) => !before.has(fact.id),
  )
  if (!created) throw new Error("The fact could not be added.")
  return { vault: updated, factId: created.id }
}

/* ---------- re-rendering ---------- */

const DEFAULT_SECTIONS: PortfolioConfig["sections"] = ["about", "skills", "projects", "experience", "education", "github-stats", "contact"]

export interface RenderInput {
  vault: Vault
  job: JobProfile
  draft: Draft
  picks: ProjectPick[]
  template: TemplateStyle
  colorScheme: ColorScheme
  company?: string
}

export interface RenderedOutputs {
  picks: ProjectPick[]
  portfolioHtml: string
  resumeHtml: string
  resumeText: string
  noteText: string
  noteWordCount: number
}

/** The same assembly generateStage uses, so an unedited draft renders identically. No model call. */
export function renderFromDraft(input: RenderInput): RenderedOutputs {
  const picks = picksForDraft(input.draft, input.picks)
  const config: PortfolioConfig = {
    template: input.template,
    colorScheme: input.colorScheme,
    sections: [...DEFAULT_SECTIONS],
    socialLinks: {},
  }
  const templateData = buildTemplateData({ vault: input.vault, draft: input.draft, picks, config, job: input.job })
  const resumeModel = buildResumeModel({ vault: input.vault, draft: input.draft, job: input.job, picks })
  const note = buildNote({ vault: input.vault, draft: input.draft, job: input.job, company: input.company })
  return {
    picks,
    portfolioHtml: buildPortfolioHtml(templateData),
    resumeHtml: buildResumeHtml(resumeModel),
    resumeText: buildResumePlainText(resumeModel),
    noteText: note.text,
    noteWordCount: note.text ? countWords(note.text) : 0,
  }
}

/* ---------- request schema for /api/tailor/edit ---------- */

export const editRequestSchema = z
  .object({
    vault: vaultSchema,
    draft: draftSchema,
    ref: sectionRefSchema,
    newText: z.string().max(5_000),
    attachFactIds: z.array(z.string().min(1).max(128)).max(10).optional(),
  })
  .strict()
export type EditRequest = z.infer<typeof editRequestSchema>
