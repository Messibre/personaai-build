import type { ZodType, ZodTypeDef } from "zod"
import type { TailorError, TailorErrorCode } from "./pipeline"
import { MAX_BODY_BYTES } from "./requests"

export function errorResponse(status: number, error: string, code?: string): Response {
  return Response.json({ error, ...(code ? { code } : {}) }, { status })
}

const STATUS_BY_CODE: Record<TailorErrorCode, number> = {
  too_short: 400,
  too_long: 400,
  vault_empty: 400,
  invalid_picks: 400,
  analyze_failed: 502,
  rewrite_failed: 502,
  check_failed: 502,
  unavailable: 503,
}

export function stageErrorResponse(error: TailorError): Response {
  return errorResponse(STATUS_BY_CODE[error.code], error.message, error.code)
}

/** Parses and validates a JSON body with a hard size cap. Returns a Response on any problem. */
export async function readValidatedBody<T>(request: Request, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T | Response> {
  const declared = Number(request.headers.get("content-length"))
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return errorResponse(413, "Request body too large.", "too_large")
  }

  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return errorResponse(413, "Request body too large.", "too_large")
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return errorResponse(400, "Body must be valid JSON.", "invalid_body")
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return errorResponse(400, "The request is not valid. Check the vault, job and selections and try again.", "invalid_body")
  }
  return parsed.data
}
