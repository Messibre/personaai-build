import { verifyStatusToken } from "@/lib/publish/capability"
import { statusQuerySchema } from "@/lib/publish/requests"
import { PublishError, configFromEnv, getDeploymentStatus } from "@/lib/publish/vercel"
import { ONE_MINUTE_MS, withRateLimit } from "@/lib/security/guard"
import { errorResponse } from "@/lib/tailor/http"

export const runtime = "nodejs"

async function handle(request: Request): Promise<Response> {
  const parsed = statusQuerySchema.safeParse({ token: new URL(request.url).searchParams.get("token") ?? "" })
  if (!parsed.success) return errorResponse(400, "Missing status token.", "invalid_request")

  let vercel
  try {
    vercel = configFromEnv()
  } catch {
    return errorResponse(501, "Publishing is not configured on this deployment.", "unavailable")
  }

  const claims = verifyStatusToken(parsed.data.token, vercel.token)
  if (!claims) return errorResponse(401, "This publishing link expired. Publish again to get a new one.", "expired")

  try {
    const status = await getDeploymentStatus(claims.deploymentId, claims.project, vercel)
    return Response.json(status, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof PublishError) return errorResponse(502, "Publishing status is not available right now.", "unavailable")
    return errorResponse(502, "Publishing status is not available right now.", "unavailable")
  }
}

export const GET = withRateLimit(handle, { route: "tailor/publish-status", max: 60, windowMs: ONE_MINUTE_MS })
