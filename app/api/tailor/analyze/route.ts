import { errorResponse, readValidatedBody, stageErrorResponse } from "@/lib/tailor/http"
import { analyzeStage } from "@/lib/tailor/pipeline"
import { analyzeRequestSchema } from "@/lib/tailor/requests"
import { getTailorDeps } from "@/lib/tailor/wire"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request): Promise<Response> {
  const body = await readValidatedBody(request, analyzeRequestSchema)
  if (body instanceof Response) return body

  let result
  try {
    result = await analyzeStage(getTailorDeps(), body)
  } catch {
    return errorResponse(503, "This step is not available right now. Please try again later.", "unavailable")
  }
  return result.ok ? Response.json(result.data) : stageErrorResponse(result.error)
}
