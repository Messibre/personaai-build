import type { z } from "zod"
import type { LLMClient, LLMError } from "./types"

export interface StructuredRequest<T> {
  system?: string
  prompt: string
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
  maxOutputTokens: number
}

export type StructuredError =
  | { kind: "llm"; error: LLMError }
  | { kind: "invalid_output"; message: string }

export type StructuredResult<T> = { ok: true; data: T } | { ok: false; error: StructuredError }

const MAX_REPAIR_ECHO_CHARS = 4000
const MAX_ISSUES_REPORTED = 20

/** Model output is untrusted: accept a fenced block or surrounding chatter, then let the schema decide. */
function extractJsonText(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) return fenced[1].trim()
  return trimmed
}

function parseJson(raw: string): { ok: true; value: unknown } | { ok: false; message: string } {
  const text = extractJsonText(raw)
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")
    if (start !== -1 && end > start) {
      try {
        return { ok: true, value: JSON.parse(text.slice(start, end + 1)) }
      } catch {
        // fall through to the typed failure below
      }
    }
    return { ok: false, message: "Output was not valid JSON." }
  }
}

function validate<T>(
  raw: string,
  schema: StructuredRequest<T>["schema"],
): { ok: true; data: T } | { ok: false; message: string } {
  const parsed = parseJson(raw)
  if (!parsed.ok) return parsed

  const result = schema.safeParse(parsed.value)
  if (result.success) return { ok: true, data: result.data }

  const issues = result.error.issues
    .slice(0, MAX_ISSUES_REPORTED)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ")
  return { ok: false, message: `Output failed schema validation: ${issues}` }
}

function buildRepairPrompt(originalPrompt: string, previousOutput: string, message: string): string {
  return [
    originalPrompt,
    "",
    "Your previous answer was rejected.",
    `Reason: ${message}`,
    "Previous answer (truncated):",
    previousOutput.slice(0, MAX_REPAIR_ECHO_CHARS),
    "",
    "Reply again with ONLY a JSON object that fixes this. No prose, no code fences.",
  ].join("\n")
}

export async function generateStructured<T>(
  client: LLMClient,
  request: StructuredRequest<T>,
): Promise<StructuredResult<T>> {
  const { system, prompt, schema, maxOutputTokens } = request

  const first = await client.generate({
    system,
    prompt,
    maxOutputTokens,
    responseMimeType: "application/json",
  })
  if (!first.ok) return { ok: false, error: { kind: "llm", error: first.error } }

  const firstAttempt = validate(first.text, schema)
  if (firstAttempt.ok) return { ok: true, data: firstAttempt.data }

  const repair = await client.generate({
    system,
    prompt: buildRepairPrompt(prompt, first.text, firstAttempt.message),
    maxOutputTokens,
    responseMimeType: "application/json",
  })
  if (!repair.ok) return { ok: false, error: { kind: "llm", error: repair.error } }

  const secondAttempt = validate(repair.text, schema)
  if (secondAttempt.ok) return { ok: true, data: secondAttempt.data }

  return { ok: false, error: { kind: "invalid_output", message: secondAttempt.message } }
}
