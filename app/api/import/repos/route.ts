import { z } from "zod"
import { GitHubInputError, GitHubRateLimitError, fetchRepoDeepDive } from "@/lib/github"
import { repoToProjectDraft } from "@/lib/ingest/github"
import { MAX_IMPORT_REPOS } from "@/lib/ingest/merge"
import type { Project } from "@/lib/schemas/vault"

export const runtime = "nodejs"

const MAX_BODY_BYTES = 1_000_000
const GITHUB_NAME = z
  .string()
  .max(100)
  .regex(/^[A-Za-z0-9._-]+$/)
  .refine((value) => value !== "." && value !== "..")

const bodySchema = z.object({
  username: GITHUB_NAME,
  repoNames: z.array(GITHUB_NAME).min(1).max(MAX_IMPORT_REPOS),
})

function errorResponse(status: number, error: string, code?: string): Response {
  return Response.json({ error, ...(code ? { code } : {}) }, { status })
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text()
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) return errorResponse(413, "Request body too large.")

  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return errorResponse(400, "Body must be valid JSON.")
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    const tooMany = parsed.error.issues.some((issue) => issue.code === "too_big" && issue.path[0] === "repoNames")
    return errorResponse(
      400,
      tooMany ? `Import at most ${MAX_IMPORT_REPOS} repositories at a time.` : "Provide a valid GitHub username and 1 to 6 repository names.",
    )
  }

  const { username } = parsed.data
  const seenNames = new Set<string>()
  const repoNames = parsed.data.repoNames.filter((name) => {
    const key = name.toLowerCase()
    if (seenNames.has(key)) return false
    seenNames.add(key)
    return true
  })

  const projects: Project[] = []
  try {
    for (const repo of repoNames) {
      projects.push(repoToProjectDraft(await fetchRepoDeepDive(username, repo)))
    }
  } catch (error) {
    if (error instanceof GitHubRateLimitError) {
      return errorResponse(429, "GitHub rate limit reached. Wait a while and try again, or ask the site owner to configure GITHUB_TOKEN.", "rate_limited")
    }
    if (error instanceof GitHubInputError) return errorResponse(400, error.message)
    console.error("[import/repos] unexpected failure")
    return errorResponse(500, "Could not import those repositories.")
  }

  return Response.json(projects)
}
