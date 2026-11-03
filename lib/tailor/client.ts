import type { JobProfile, ProjectPick } from "@/lib/schemas/job"
import type { Vault } from "@/lib/schemas/vault"
import type { ColorScheme, TemplateStyle } from "@/lib/types"
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

async function post<T>(url: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
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

export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}
