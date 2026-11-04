import { checkBetaGate } from "./beta-gate"
import { clientKey, createRateLimiter } from "./rate-limit"

export type RouteHandler = (request: Request) => Promise<Response>

export type GuardOptions = {
  route: string
  max: number
  windowMs: number
}

export const ONE_MINUTE_MS = 60_000

/** Beta gate first, then the per-client rate limit, then the handler. */
export function withGuards(handler: RouteHandler, { route, max, windowMs }: GuardOptions): RouteHandler {
  const limiter = createRateLimiter({ windowMs, max })

  return async (request) => {
    const denied = checkBetaGate(request)
    if (denied) return denied

    const result = limiter.check(clientKey(request, route))
    if (!result.allowed) {
      return Response.json(
        { error: "Too many requests. Please wait a moment and try again.", code: "too_many_requests" },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
      )
    }

    return handler(request)
  }
}
