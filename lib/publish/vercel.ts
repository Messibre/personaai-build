// Fixed provider host: no user input ever reaches the hostname, so this is not an SSRF surface.
// safeFetch is GET-only, so the POST calls to Vercel go through fetch against this constant.
const VERCEL_API = "https://api.vercel.com"
const TIMEOUT_MS = 20_000

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>

export class PublishError extends Error {
  constructor(
    message: string,
    readonly code: "config" | "provider" | "auth",
  ) {
    super(message)
    this.name = "PublishError"
  }
}

export interface VercelConfig {
  token: string
  teamId?: string
  fetchImpl?: FetchLike
}

export type DeploymentState = "building" | "ready" | "failed"

export function configFromEnv(env: Record<string, string | undefined> = process.env): VercelConfig {
  const token = env.VERCEL_TOKEN
  if (!token) throw new PublishError("Publishing is not configured on this deployment.", "config")
  return { token, ...(env.VERCEL_TEAM_ID ? { teamId: env.VERCEL_TEAM_ID } : {}) }
}

function url(path: string, config: VercelConfig): string {
  return `${VERCEL_API}${path}${config.teamId ? `${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(config.teamId)}` : ""}`
}

async function call(path: string, config: VercelConfig, init: { method?: string; body?: unknown } = {}): Promise<{ status: number; json: Record<string, unknown> }> {
  const target = url(path, config)
  const fetchImpl: FetchLike = config.fetchImpl ?? ((input, options) => fetch(`${VERCEL_API}${input.slice(VERCEL_API.length)}`, options))
  let response: Response
  try {
    response = await fetchImpl(target, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new PublishError("The publishing service could not be reached.", "provider")
  }
  if (response.status === 401 || response.status === 403) {
    throw new PublishError("The publishing credentials were rejected for this team.", "auth")
  }
  let json: Record<string, unknown> = {}
  try {
    json = (await response.json()) as Record<string, unknown>
  } catch {
    // An empty body is fine for some responses.
  }
  return { status: response.status, json }
}

/** Creates the project with deployment protection off so the public link opens without a login. */
export async function ensureProject(name: string, config: VercelConfig): Promise<void> {
  const created = await call("/v10/projects", config, { method: "POST", body: { name, ssoProtection: null } })
  if (created.status === 200 || created.status === 201) return
  const code = (created.json.error as { code?: string } | undefined)?.code
  if (created.status === 409 || code === "conflict" || code === "project_already_exists") return
  throw new PublishError("The publishing service could not create the site.", "provider")
}

export async function createDeployment(name: string, html: string, config: VercelConfig): Promise<{ id: string }> {
  const created = await call("/v13/deployments?skipAutoDetectionConfirmation=1", config, {
    method: "POST",
    body: {
      name,
      project: name,
      target: "production",
      files: [
        { file: "index.html", data: html, encoding: "utf-8" },
        { file: "vercel.json", data: JSON.stringify({ cleanUrls: true, trailingSlash: false }), encoding: "utf-8" },
      ],
      projectSettings: { framework: null },
    },
  })
  const id = created.json.id
  if ((created.status !== 200 && created.status !== 201) || typeof id !== "string") {
    throw new PublishError("The publishing service did not accept the site.", "provider")
  }
  return { id }
}

export interface DeploymentStatus {
  state: DeploymentState
  url?: string
}

export async function getDeploymentStatus(id: string, project: string, config: VercelConfig): Promise<DeploymentStatus> {
  const found = await call(`/v13/deployments/${encodeURIComponent(id)}`, config)
  if (found.status !== 200) throw new PublishError("The publishing status could not be read.", "provider")
  const raw = String(found.json.readyState ?? found.json.status ?? "")
  if (raw === "ERROR" || raw === "CANCELED") return { state: "failed" }
  if (raw !== "READY") return { state: "building" }
  const aliases = Array.isArray(found.json.alias) ? (found.json.alias as unknown[]).filter((a): a is string => typeof a === "string") : []
  const preferred = aliases.find((alias) => alias === `${project}.vercel.app`) ?? aliases[0]
  const host = preferred ?? (typeof found.json.url === "string" ? found.json.url : null)
  return host ? { state: "ready", url: `https://${host}` } : { state: "building" }
}
