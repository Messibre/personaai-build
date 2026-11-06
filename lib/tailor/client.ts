import type { Draft } from "@/lib/schemas/draft"
import { guardedFetch, type ApiPath } from "@/lib/security/guarded-fetch"
import type { JobProfile, ProjectPick } from "@/lib/schemas/job"
import type { ContentSelection } from "@/lib/schemas/tailoring-preferences"
import type { Vault } from "@/lib/schemas/vault"
import type { ColorScheme, TemplateStyle } from "@/lib/types"
import type { EditResult, SectionRef } from "./edit"
import type { AnalyzeOutput, GenerateOutput } from "./pipeline"

export class TailorApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message)
    this.name = "TailorApiError"
  }
}

async function post<T>(url: ApiPath, payload: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await guardedFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new TailorApiError("Could not reach the server. Check your connection and try again.")
  }
  if (!response.ok) {
    let message = "Something went wrong. Please try again."
    let code: string | undefined
    try {
      const body = (await response.json()) as { error?: unknown; code?: unknown }
      if (typeof body.error === "string" && body.error) message = body.error
      if (typeof body.code === "string") code = body.code
    } catch {
      // keep the generic message
    }
    throw new TailorApiError(message, code)
  }
  return (await response.json()) as T
}

export function analyzeJob(vault: Vault, postingText: string, signal?: AbortSignal): Promise<AnalyzeOutput> {
  return post("/api/tailor/analyze", { vault, postingText }, signal)
}

export function generateOutputs(
  input: { vault: Vault; job: JobProfile; picks: ProjectPick[]; template: TemplateStyle; colorScheme: ColorScheme; company?: string },
  signal?: AbortSignal,
): Promise<GenerateOutput> {
  return post("/api/tailor/generate", input, signal)
}

export function editSentence(
  input: { vault: Vault; draft: Draft; ref: SectionRef; newText: string; attachFactIds?: string[] },
  signal?: AbortSignal,
): Promise<EditResult> {
  return post("/api/tailor/edit", input, signal)
}

export interface PublishStarted {
  deploymentId: string
  project: string
  statusToken: string
  reused: boolean
}

export interface PublishStatus {
  state: "building" | "ready" | "failed"
  url?: string
}

export function publishPortfolio(
  input: {
    vaultId: string
    selection: ContentSelection
    job: JobProfile
    draft: Draft
    picks: ProjectPick[]
    template: TemplateStyle
    colorScheme: ColorScheme
    company?: string
    confirmPublic: true
  },
  signal?: AbortSignal,
): Promise<PublishStarted> {
  return post("/api/tailor/publish", input, signal)
}

export async function getPublishStatus(statusToken: string, signal?: AbortSignal): Promise<PublishStatus> {
  let response: Response
  try {
    response = await guardedFetch(`/api/tailor/publish/status?token=${encodeURIComponent(statusToken)}`, { signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new TailorApiError("Could not reach the server. Check your connection and try again.")
  }
  if (!response.ok) {
    let message = "Publishing status is not available right now."
    try {
      const body = (await response.json()) as { error?: unknown }
      if (typeof body.error === "string" && body.error) message = body.error
    } catch {
      // keep the generic message
    }
    throw new TailorApiError(message)
  }
  return (await response.json()) as PublishStatus
}

export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}
