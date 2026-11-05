import { errorResponse, readValidatedBody, stageErrorResponse } from "@/lib/tailor/http"
import { generateStage } from "@/lib/tailor/pipeline"
import { generateRequestSchema } from "@/lib/tailor/requests"
import { getTailorDeps } from "@/lib/tailor/wire"

import { ONE_MINUTE_MS, withGuards } from "@/lib/security/guard"

export const runtime = "nodejs"
export const maxDuration = 300

async function handle(request: Request): Promise<Response> {
  const body = await readValidatedBody(request, generateRequestSchema)
  if (body instanceof Response) return body

  let result
  try {
    result = await generateStage(getTailorDeps(), body)
  } catch {
    return errorResponse(503, "This step is not available right now. Please try again later.", "unavailable")
  }
  return result.ok ? Response.json(result.data) : stageErrorResponse(result.error)
}

export const POST = withGuards(handle, { route: "tailor/generate", max: 5, windowMs: ONE_MINUTE_MS })
