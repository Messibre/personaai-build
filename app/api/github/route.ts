import { NextResponse } from "next/server"
import { GitHubError, fetchGitHubProfile, fetchGitHubRepos } from "@/lib/github"
import { isRecord, readJsonBody } from "@/lib/api/read-json"

const STATUS_BY_CODE = {
  not_found: 404,
  rate_limited: 429,
  upstream: 502,
} as const

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request, 10_000)
    if (!body.ok) return body.response

    const username = isRecord(body.data) ? body.data.username : undefined

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    const sanitizedUsername = username.trim().replace(/[^a-zA-Z0-9-]/g, "")

    if (!sanitizedUsername) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 })
    }

    const [profile, repos] = await Promise.all([
      fetchGitHubProfile(sanitizedUsername),
      fetchGitHubRepos(sanitizedUsername),
    ])

    return NextResponse.json({ profile, repos })
  } catch (err) {
    if (err instanceof GitHubError) {
      return NextResponse.json({ error: err.message }, { status: STATUS_BY_CODE[err.code] })
    }
    const traceId = crypto.randomUUID()
    console.error(`[github] error [${traceId}]:`, err)
    return NextResponse.json({ error: "Failed to fetch GitHub data", traceId }, { status: 500 })
  }
}
