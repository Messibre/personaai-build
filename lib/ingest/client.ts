import type { GitHubProfile, GitHubRepo } from "@/lib/types"
import type { ResumeExtraction } from "@/lib/ingest/resume"
import { vaultSchema, type Project, type Vault } from "@/lib/schemas/vault"

export class ImportApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = "ImportApiError"
  }
}

async function readError(response: Response, fallback: string): Promise<ImportApiError> {
  let message = fallback
  let code: string | undefined
  try {
    const body = (await response.json()) as { error?: unknown; code?: unknown }
    if (typeof body.error === "string" && body.error) message = body.error
    if (typeof body.code === "string") code = body.code
  } catch {
    // keep the fallback message
  }
  if (response.status === 429 || /rate limit/i.test(message)) {
    return new ImportApiError(
      "GitHub is limiting requests right now (unauthenticated access allows only 60 per hour). Wait a while and try again.",
      429,
      "rate_limited",
    )
  }
  return new ImportApiError(message, response.status, code)
}

async function postJson<T>(url: string, payload: unknown, fallback: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new ImportApiError("Could not reach the server. Check your connection and try again.", 0)
  }
  if (!response.ok) throw await readError(response, fallback)
  return (await response.json()) as T
}

/** Resolves to null when the vault does not exist yet. */
export async function loadVault(id: string, signal?: AbortSignal): Promise<Vault | null> {
  const response = await fetch(`/api/vault/${id}`, { signal })
  if (response.status === 404) return null
  if (!response.ok) throw await readError(response, "Could not load your vault.")
  const parsed = vaultSchema.safeParse(await response.json())
  if (!parsed.success) throw new ImportApiError("Your saved vault could not be read.", 500, "corrupt")
  return parsed.data
}

export async function saveVault(vault: Vault): Promise<void> {
  let response: Response
  try {
    response = await fetch(`/api/vault/${vault.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vault),
    })
  } catch {
    throw new ImportApiError("Could not reach the server to save your vault.", 0)
  }
  if (!response.ok) throw await readError(response, "Could not save your vault.")
}

export function listGitHubRepos(username: string): Promise<{ profile: GitHubProfile; repos: GitHubRepo[] }> {
  return postJson("/api/github", { username }, "Could not load GitHub repositories.")
}

export function importRepos(username: string, repoNames: string[]): Promise<Project[]> {
  return postJson("/api/import/repos", { username, repoNames }, "Could not import those repositories.")
}

export function importResumeText(text: string): Promise<ResumeExtraction> {
  return postJson("/api/import/resume", { text }, "Could not read that resume.")
}

export async function parseResumePdf(file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  let response: Response
  try {
    response = await fetch("/api/parse-resume", { method: "POST", body: form })
  } catch {
    throw new ImportApiError("Could not reach the server. Check your connection and try again.", 0)
  }
  if (!response.ok) throw await readError(response, "Could not read that PDF.")
  const body = (await response.json()) as { text?: unknown }
  if (typeof body.text !== "string" || body.text.trim() === "") {
    throw new ImportApiError("No text could be read from that PDF.", 422)
  }
  return body.text
}

export function friendlyMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Something went wrong. Please try again."
}
