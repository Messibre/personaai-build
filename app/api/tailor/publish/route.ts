import { publishPortfolio } from "@/lib/publish/publish"
import { publishRequestSchema } from "@/lib/publish/requests"
import { getPublishRecords } from "@/lib/publish/records"
import { PublishError, configFromEnv } from "@/lib/publish/vercel"
import { ONE_MINUTE_MS, withGuards } from "@/lib/security/guard"
import { errorResponse, readValidatedBody } from "@/lib/tailor/http"
import { getServerVaultStore } from "@/lib/vault/index"
import { VaultStoreError } from "@/lib/vault/store"

export const runtime = "nodejs"
export const maxDuration = 60

async function handle(request: Request): Promise<Response> {
  const body = await readValidatedBody(request, publishRequestSchema)
  if (body instanceof Response) return body

  let vercel
  try {
    vercel = configFromEnv()
  } catch (error) {
    if (error instanceof PublishError) return errorResponse(501, "Publishing is not configured on this deployment.", "unavailable")
    throw error
  }

  try {
    const store = getServerVaultStore()
    const result = await publishPortfolio(body, {
      loadVault: (id) => store.get(id),
      records: getPublishRecords(),
      vercel,
      secret: vercel.token,
    })
    if (!result.ok) return errorResponse(result.status, result.message, result.code)
    return Response.json({
      deploymentId: result.deploymentId,
      project: result.project,
      statusToken: result.statusToken,
      reused: result.reused,
    })
  } catch (error) {
    if (error instanceof VaultStoreError) return errorResponse(503, "Publishing is not available right now.", "unavailable")
    return errorResponse(502, "Publishing failed. Please try again.", "unavailable")
  }
}

export const POST = withGuards(handle, { route: "tailor/publish", max: 3, windowMs: ONE_MINUTE_MS })
