import { z } from "zod"
import { getLLMClient } from "@/lib/llm"
import { DraftError, draftAnswers } from "@/lib/questions/draft"
import { projectSchema } from "@/lib/schemas/vault"

export const runtime = "nodejs"

const MAX_BODY_BYTES = 1_000_000

const bodySchema = z.object({ project: projectSchema })

function errorResponse(status: number, error: string, code: string): Response {
  return Response.json({ error, code }, { status })
}

function describe(error: DraftError): Response {
  if (error.detail.kind === "invalid_output") {
    return errorResponse(502, "The model returned a response we could not read. Please try again.", "invalid_output")
  }
  switch (error.detail.error.kind) {
    case "rate_limited":
      return errorResponse(429, "The AI service is busy. Please try again shortly.", "llm_rate_limited")
    case "timeout":
      return errorResponse(504, "Drafting took too long. Please try again.", "llm_timeout")
    case "config":
      return errorResponse(503, "The AI service is not configured.", "llm_config")
    default:
      return errorResponse(502, "The AI service is unavailable right now.", "llm_unavailable")
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text()
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) return errorResponse(413, "Request body too large.", "too_large")

  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return errorResponse(400, "Body must be valid JSON.", "invalid_body")
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return errorResponse(400, "Provide a valid project.", "invalid_body")

  try {
    const drafts = await draftAnswers(getLLMClient(), parsed.data.project)
    return Response.json({ drafts })
  } catch (error) {
    if (error instanceof DraftError) return describe(error)
    return errorResponse(502, "The AI service is unavailable right now.", "llm_unavailable")
  }
}
