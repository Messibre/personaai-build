import { applyEdit, editRequestSchema } from "@/lib/tailor/edit"
import { errorResponse, readValidatedBody } from "@/lib/tailor/http"
import { getTailorDeps } from "@/lib/tailor/wire"

import { ONE_MINUTE_MS, withGuards } from "@/lib/security/guard"

export const runtime = "nodejs"
export const maxDuration = 120

/** Re-checks a single edited sentence. A rejected edit is a normal answer (200 with ok:false), not an error. */
async function handle(request: Request): Promise<Response> {
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

export const POST = withGuards(handle, { route: "tailor/edit", max: 20, windowMs: ONE_MINUTE_MS })
