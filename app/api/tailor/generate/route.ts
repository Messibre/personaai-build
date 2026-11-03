import { errorResponse, readValidatedBody, stageErrorResponse } from "@/lib/tailor/http"
import { generateStage } from "@/lib/tailor/pipeline"
import { generateRequestSchema } from "@/lib/tailor/requests"
import { getTailorDeps } from "@/lib/tailor/wire"

export const runtime = "nodejs"
export const maxDuration = 90

export async function POST(request: Request): Promise<Response> {
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
