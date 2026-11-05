import { randomUUID } from "node:crypto"
import { ONE_MINUTE_MS, withRateLimit } from "@/lib/security/guard"
import { vaultSchema } from "@/lib/schemas/vault"
import { NO_PERSISTENT_STORE_MESSAGE, getServerVaultStore } from "@/lib/vault/index"
import { VaultStoreError, isValidVaultId, type VaultStore } from "@/lib/vault/store"

/*
 * Security notes: the vault id in the URL is the access secret. Anyone with the link can read and
 * write that vault, so ids are unguessable (see createVaultId), are never logged and never
 * appear in error bodies. There is no listing endpoint. DELETE lets users erase their data.
 */

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

// Returns a store, or a 501 only when no persistent store is configured on this deployment.
function resolveStore(): VaultStore | Response {
  try {
    return getServerVaultStore()
  } catch (error) {
    if (error instanceof VaultStoreError && error.code === "config") {
      const unconfigured = error.message === NO_PERSISTENT_STORE_MESSAGE
      if (unconfigured) return errorResponse(501, NO_PERSISTENT_STORE_MESSAGE)
      console.error("[vault] storage is misconfigured")
      return errorResponse(500, "Vault storage is misconfigured.")
    }
    return storeFailure(error)
  }
}

async function resolveId(context: RouteContext): Promise<string | Response> {
  const { id } = await context.params
  return isValidVaultId(id) ? id : errorResponse(400, "Invalid vault id.")
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const store = resolveStore()
  if (store instanceof Response) return store
  const id = await resolveId(context)
  if (id instanceof Response) return id

  try {
    const vault = await store.get(id)
    return vault ? Response.json(vault) : errorResponse(404, "Vault not found.")
  } catch (error) {
    return storeFailure(error)
  }
}

export const PUT = withRateLimit(handlePut, { route: "vault/put", max: 30, windowMs: ONE_MINUTE_MS })

async function handlePut(request: Request, context: RouteContext): Promise<Response> {
  const store = resolveStore()
  if (store instanceof Response) return store
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
    await store.save(parsed.data)
    return Response.json({ id, updatedAt: parsed.data.updatedAt })
  } catch (error) {
    return storeFailure(error)
  }
}

export const DELETE = withRateLimit(handleDelete, { route: "vault/delete", max: 30, windowMs: ONE_MINUTE_MS })

async function handleDelete(_request: Request, context: RouteContext): Promise<Response> {
  const store = resolveStore()
  if (store instanceof Response) return store
  const id = await resolveId(context)
  if (id instanceof Response) return id

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
