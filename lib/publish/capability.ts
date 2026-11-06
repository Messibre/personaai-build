import { createHmac, timingSafeEqual } from "node:crypto"

export const STATUS_TOKEN_TTL_MS = 60 * 60 * 1000

export interface StatusClaims {
  deploymentId: string
  project: string
  exp: number
}

function key(secret: string): Buffer {
  return createHmac("sha256", "personaai:publish-status:v1").update(secret).digest()
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", key(secret)).update(payload).digest("base64url")
}

/** A short-lived token that lets the browser poll one deployment and nothing else. */
export function issueStatusToken(claims: Omit<StatusClaims, "exp">, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...claims, exp: now + STATUS_TOKEN_TTL_MS })).toString("base64url")
  return `${payload}.${sign(payload, secret)}`
}

export function verifyStatusToken(token: string, secret: string, now = Date.now()): StatusClaims | null {
  if (token.length > 1024) return null
  const [payload, signature, extra] = token.split(".")
  if (!payload || !signature || extra !== undefined) return null
  const expected = Buffer.from(sign(payload, secret))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<StatusClaims>
    if (typeof claims.deploymentId !== "string" || typeof claims.project !== "string" || typeof claims.exp !== "number") return null
    if (claims.exp < now) return null
    return { deploymentId: claims.deploymentId, project: claims.project, exp: claims.exp }
  } catch {
    return null
  }
}
