export const DEFAULT_MAX_BODY_BYTES = 1_048_576 // ~1 MB

export type JsonBodyResult =
  | { ok: true; data: unknown }
  | { ok: false; response: Response }

/**
 * Reads a JSON request body with a size cap. Rejects oversized payloads (413)
 * and malformed JSON (400) with a ready-to-return response so routes can
 * bail out uniformly instead of surfacing parser errors as 500s.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<JsonBodyResult> {
  const tooLarge = () => ({
    ok: false as const,
    response: Response.json({ error: "Payload too large" }, { status: 413 }),
  })

  const declaredLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return tooLarge()

  const raw = await request.text()
  if (Buffer.byteLength(raw, "utf-8") > maxBytes) return tooLarge()

  try {
    return { ok: true, data: JSON.parse(raw) }
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Invalid JSON" }, { status: 400 }),
    }
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
