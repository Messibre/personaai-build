import { z } from "zod"
import { MAX_RESUME_CHARS, extractResume, type ResumeExtractionError } from "@/lib/ingest/resume"
import { getLLMClient } from "@/lib/llm"

export const runtime = "nodejs"

const MAX_BODY_BYTES = 1_000_000

const bodySchema = z.object({ text: z.string() })

function errorResponse(status: number, error: string, code: string): Response {
  return Response.json({ error, code }, { status })
}

function describe(error: ResumeExtractionError): Response {
  switch (error.kind) {
    case "too_large":
      return errorResponse(413, `Resume text is too long. The limit is ${MAX_RESUME_CHARS.toLocaleString("en-US")} characters.`, "too_large")
    case "empty":
      return errorResponse(400, "Resume text is empty.", "empty")
    case "invalid_output":
      return errorResponse(502, "The model returned a response we could not read. Please try again.", "invalid_output")
    case "llm":
      switch (error.error.kind) {
        case "rate_limited":
          return errorResponse(429, "The AI service is busy. Please try again shortly.", "llm_rate_limited")
        case "timeout":
          return errorResponse(504, "Reading the resume took too long. Please try again.", "llm_timeout")
        case "config":
          return errorResponse(503, "The AI service is not configured.", "llm_config")
        default:
          return errorResponse(502, "The AI service is unavailable right now.", "llm_unavailable")
      }
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
  if (!parsed.success) return errorResponse(400, "Provide the resume as a text string.", "invalid_body")

  const result = await extractResume(getLLMClient(), parsed.data.text)
  return result.ok ? Response.json(result.data) : describe(result.error)
}
