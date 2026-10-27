import { randomUUID } from "node:crypto"
import { vaultSchema } from "@/lib/schemas/vault"
import { FileVaultStore } from "@/lib/vault/file-store"
import { VaultStoreError, isValidVaultId } from "@/lib/vault/store"

export const runtime = "nodejs"

const MAX_BODY_BYTES = 1_000_000

interface RouteContext {
  params: Promise<{ id: string }>
}

function errorResponse(status: number, error: string, extra?: Record<string, unknown>): Response {
  return Response.json({ error, ...extra }, { status })
}

function storeFailure(error: unknown): Response {
  const traceId = randomUUID()
  const code = error instanceof VaultStoreError ? error.code : "unknown"
  console.error(`[vault] request failed code=${code} traceId=${traceId}`)
  const message = error instanceof VaultStoreError && error.code === "corrupt" ? "Stored vault is unreadable." : "Vault storage failed."
  return errorResponse(500, message, { traceId })
}

// Vercel's filesystem is not persistent, so a file-backed API there would silently lose data.
function unavailableOnVercel(): Response | null {
  return process.env.VERCEL ? errorResponse(501, "Vault storage is not available on this deployment.") : null
}

async function resolveId(context: RouteContext): Promise<string | Response> {
  const { id } = await context.params
  return isValidVaultId(id) ? id : errorResponse(400, "Invalid vault id.")
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const blocked = unavailableOnVercel()
  if (blocked) return blocked
  const id = await resolveId(context)
  if (id instanceof Response) return id

  try {
    const vault = await new FileVaultStore().get(id)
    return vault ? Response.json(vault) : errorResponse(404, "Vault not found.")
  } catch (error) {
    return storeFailure(error)
  }
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  const blocked = unavailableOnVercel()
  if (blocked) return blocked
  const id = await resolveId(context)
  if (id instanceof Response) return id

  const declaredLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return errorResponse(413, "Request body too large.")
  }

  const body = await request.text()
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
    return errorResponse(413, "Request body too large.")
  }

  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return errorResponse(400, "Body must be valid JSON.")
  }

  const parsed = vaultSchema.safeParse(json)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 20)
      .map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    return errorResponse(400, "Vault failed validation.", { issues })
  }
  if (parsed.data.id !== id) {
    return errorResponse(400, "Vault id in the body does not match the URL.")
  }

  try {
    await new FileVaultStore().save(parsed.data)
    return Response.json({ id, updatedAt: parsed.data.updatedAt })
  } catch (error) {
    return storeFailure(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  const blocked = unavailableOnVercel()
  if (blocked) return blocked
  const id = await resolveId(context)
  if (id instanceof Response) return id

  const store = new FileVaultStore()
  try {
    try {
      if ((await store.get(id)) === null) return errorResponse(404, "Vault not found.")
    } catch (error) {
      // An unreadable vault can still be deleted; any other failure is real.
      if (!(error instanceof VaultStoreError && error.code === "corrupt")) throw error
    }
    await store.delete(id)
    return Response.json({ id, deleted: true })
  } catch (error) {
    return storeFailure(error)
  }
}
