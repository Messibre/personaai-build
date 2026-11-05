import { checkBetaGate } from "./beta-gate"
import { clientKey, createRateLimiter } from "./rate-limit"

export type RouteHandler = (request: Request) => Promise<Response>

export type GuardOptions = {
  route: string
  max: number
  windowMs: number
}

export const ONE_MINUTE_MS = 60_000

function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Too many requests. Please wait a moment and try again.", code: "too_many_requests" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  )
}

/** Per-client rate limit only, no beta gate. Passes extra route arguments (such as params) through. */
export function withRateLimit<Rest extends unknown[]>(
  handler: (request: Request, ...rest: Rest) => Promise<Response>,
  { route, max, windowMs }: GuardOptions,
): (request: Request, ...rest: Rest) => Promise<Response> {
  const limiter = createRateLimiter({ windowMs, max })

  return async (request, ...rest) => {
    const result = limiter.check(clientKey(request, route))
    if (!result.allowed) return tooManyRequests(result.retryAfterSeconds)
    return handler(request, ...rest)
  }
}

/** Beta gate first, then the per-client rate limit, then the handler. */
export function withGuards(handler: RouteHandler, options: GuardOptions): RouteHandler {
  const limited = withRateLimit(handler, options)

  return async (request) => {
    const denied = checkBetaGate(request)
    if (denied) return denied
    return limited(request)
  }
}

/** Answers 404 (as if the route did not exist) unless the flag is on. Checked before any guard. */
export function whenEnabled(isEnabled: () => boolean, handler: RouteHandler): RouteHandler {
  return async (request) => (isEnabled() ? handler(request) : Response.json({ error: "Not found." }, { status: 404 }))
}
