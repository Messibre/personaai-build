import { ImportApiError } from "@/lib/ingest/client"
import type { AnswerDraft } from "@/lib/questions/questions"
import type { Project } from "@/lib/schemas/vault"

export async function requestDrafts(project: Project, signal?: AbortSignal): Promise<AnswerDraft[]> {
  let response: Response
  try {
    response = await fetch("/api/questions/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
      signal,
    })
  } catch {
    throw new ImportApiError("Could not reach the server. Check your connection and try again.", 0)
  }

  if (!response.ok) {
    let message = "Could not draft answers right now."
    try {
      const body = (await response.json()) as { error?: unknown }
      if (typeof body.error === "string" && body.error) message = body.error
    } catch {
      // keep the fallback message
    }
    throw new ImportApiError(message, response.status)
  }

  const body = (await response.json()) as { drafts?: unknown }
  if (!Array.isArray(body.drafts)) throw new ImportApiError("The draft response could not be read.", 502)
  return body.drafts as AnswerDraft[]
}
