import { BETA_CODE_HEADER, getBetaCode, notifyAccessRequired } from "./beta-code"

export type ApiPath = `/api/${string}`

/**
 * fetch for this app's own /api routes. Attaches the stored access code and asks the UI for one
 * when the server answers 401. Anything that is not a same-origin /api path is rejected, so this
 * cannot be used for user-influenced outbound requests.
 */
export async function guardedFetch(path: ApiPath, init: RequestInit = {}): Promise<Response> {
  if (!path.startsWith("/api/") || path.startsWith("/api//")) {
    throw new Error("guardedFetch only calls same-origin /api routes.")
  }

  const headers = new Headers(init.headers)
  const code = getBetaCode()
  if (code) headers.set(BETA_CODE_HEADER, code)

  const response = await fetch(
    path,
    { ...init, headers },
  )
  if (response.status === 401) notifyAccessRequired()
  return response
}
