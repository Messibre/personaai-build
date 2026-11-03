import { applyEdit, editRequestSchema } from "@/lib/tailor/edit"
import { errorResponse, readValidatedBody } from "@/lib/tailor/http"
import { getTailorDeps } from "@/lib/tailor/wire"

export const runtime = "nodejs"
export const maxDuration = 60

/** Re-checks a single edited sentence. A rejected edit is a normal answer (200 with ok:false), not an error. */
export async function POST(request: Request): Promise<Response> {
  const body = await readValidatedBody(request, editRequestSchema)
  if (body instanceof Response) return body

  try {
    const deps = getTailorDeps()
    const result = await applyEdit(
      body.draft,
      body.ref,
      body.newText,
      body.vault,
      { checkDraft: deps.checkDraft, llm: deps.llm },
      { attachFactIds: body.attachFactIds },
    )
    return Response.json(result)
  } catch {
    return errorResponse(503, "This step is not available right now. Please try again later.", "unavailable")
  }
}
