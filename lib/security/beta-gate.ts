import { createHash, timingSafeEqual } from "node:crypto"

export const BETA_CODE_HEADER = "x-beta-code"

/** Constant-time string comparison. Both sides are hashed first so the buffers always have equal length. */
export function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest()
  const right = createHash("sha256").update(b).digest()
  return timingSafeEqual(left, right)
}

/**
 * Returns a 401 Response when BETA_ACCESS_CODE is set and the request does not carry it, otherwise null.
 * With the variable unset (or empty) the gate is open, which is the local-dev default.
 * A missing and a wrong code produce the same response, and neither says whether a code is configured.
 */
export function checkBetaGate(request: Request, expected: string | undefined = process.env.BETA_ACCESS_CODE): Response | null {
  if (!expected) return null
  const provided = request.headers.get(BETA_CODE_HEADER) ?? ""
  if (safeEqual(provided, expected)) return null
  return Response.json({ error: "Access code required.", code: "unauthorized" }, { status: 401 })
}
