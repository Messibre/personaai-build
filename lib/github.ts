import type { EnrichedGitHubRepo, GitHubProfile, GitHubRepo } from "./types"

const GITHUB_API = "https://api.github.com"

export async function fetchGitHubProfile(username: string): Promise<GitHubProfile> {
  const res = await fetch(`${GITHUB_API}/users/${encodeURIComponent(username)}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "PersonaAI-Portfolio-Generator",
    },
  })

  if (res.status === 404) {
    throw new Error(`GitHub user "${username}" not found`)
  }

  if (res.status === 403) {
    throw new Error("GitHub API rate limit exceeded. Please try again later.")
  }

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`)
  }

  const data = await res.json()

  return {
    username: data.login,
    name: data.name,
    bio: data.bio,
    avatar_url: data.avatar_url,
    followers: data.followers,
    following: data.following,
    public_repos: data.public_repos,
    html_url: data.html_url,
    location: data.location,
    blog: data.blog,
    company: data.company,
  }
}

export async function fetchGitHubRepos(username: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `${GITHUB_API}/users/${encodeURIComponent(username)}/repos?sort=stars&direction=desc&per_page=30&type=owner`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "PersonaAI-Portfolio-Generator",
      },
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch repos: ${res.status}`)
  }

  const data = await res.json()

  return data
    .filter((repo: { fork: boolean }) => !repo.fork)
    .slice(0, 20)
    .map((repo: Record<string, unknown>) => ({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count || 0,
      html_url: repo.html_url,
      fork: repo.fork,
      topics: repo.topics || [],
      homepage: repo.homepage,
    }))
}

async function fetchRepoRootContents(username: string, repo: string): Promise<unknown[]> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/contents`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "PersonaAI-Portfolio-Generator",
        },
        signal: AbortSignal.timeout(2000),
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function fetchRepoReadme(username: string, repo: string): Promise<string> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/readme`,
      {
        headers: {
          Accept: "application/vnd.github.raw",
          "User-Agent": "PersonaAI-Portfolio-Generator",
        },
        signal: AbortSignal.timeout(2000),
      }
    )
    if (!res.ok) return ""
    const text = await res.text()
    return text.trim().substring(0, 1200)
  } catch {
    return ""
  }
}

export async function detectRepoTechnology(username: string, repo: string): Promise<string> {
  const contents = await fetchRepoRootContents(username, repo)
  if (contents.length === 0) return ""

  const names = contents
    .map((item) => {
      if (!item || typeof item !== "object") return ""
      const entry = item as { name?: unknown }
      return typeof entry.name === "string" ? entry.name.toLowerCase() : ""
    })
    .filter(Boolean)

  const detected = new Set<string>()
  const has = (...patterns: string[]) => patterns.some((pattern) => names.some((name) => name === pattern || name.startsWith(pattern)))

  if (has("package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb")) {
    detected.add("Node.js")
    detected.add("TypeScript")
  }

  if (has("requirements.txt", "pyproject.toml", "poetry.lock", "pipfile", "setup.py")) {
    detected.add("Python")
  }

  if (has("foundry.toml", "remappings.txt")) {
    detected.add("Solidity")
    detected.add("Foundry")
  }

  if (names.some((name) => name.startsWith("hardhat.config.")) || has("hardhat.config.js", "hardhat.config.ts")) {
    detected.add("Solidity")
    detected.add("Hardhat")
  }

  if (has("cargo.toml")) {
    detected.add("Rust")
  }

  if (has("go.mod")) {
    detected.add("Go")
  }

  if (has("composer.json")) {
    detected.add("PHP")
  }

  if (has("pom.xml", "build.gradle", "build.gradle.kts")) {
    detected.add("Java")
  }

  if (has("tsconfig.json")) {
    detected.add("TypeScript")
  }

  if (has("vite.config.ts", "vite.config.js", "next.config.js", "next.config.mjs", "next.config.ts")) {
    detected.add("Web App")
  }

  return [...detected].join(", ")
}

export async function enrichReposForAI(username: string, repos: GitHubRepo[]): Promise<EnrichedGitHubRepo[]> {
  // Cap at 8 repos — top starred ones provide the most AI signal, and fetching
  // more than that serially is the #1 source of generation latency.
  const limitedRepos = (repos || []).filter((repo) => !repo.fork).slice(0, 8)

  return Promise.all(
    limitedRepos.map(async (repo) => {
      const readmeText = await fetchRepoReadme(username, repo.name)
      const detectedTech = readmeText ? "" : await detectRepoTechnology(username, repo.name)

      return {
        ...repo,
        readmeText,
        detectedTech,
      }
    })
  )
}

// ---------------------------------------------------------------------------
// Repo deep dive (vault import). Additive: nothing above this line changed.
// ---------------------------------------------------------------------------

const GITHUB_NAME_PATTERN = /^[A-Za-z0-9._-]+$/
const MAX_GITHUB_NAME_LENGTH = 100
const DEEP_DIVE_TIMEOUT_MS = 5000
const DEEP_DIVE_CONCURRENCY = 3
const DEEP_DIVE_README_CHARS = 6000
const DEEP_DIVE_MAX_COMMITS = 10
const DEEP_DIVE_COMMIT_LINE_CHARS = 200

export class GitHubRateLimitError extends Error {
  readonly kind = "rate_limited" as const
  constructor() {
    super("GitHub rate limit reached. Try again later, or set GITHUB_TOKEN to raise the limit.")
    this.name = "GitHubRateLimitError"
  }
}

export class GitHubInputError extends Error {
  readonly kind = "invalid_input" as const
  constructor(message: string) {
    super(message)
    this.name = "GitHubInputError"
  }
}

export interface RepoDeepDive {
  owner: string
  name: string
  readme: string
  /** Language name to its share of the code, in percent. */
  languages: Record<string, number>
  commits: string[]
  topics: string[]
  homepage: string | null
  description: string | null
  stars: number
  forks: number
  /** Sub-calls that failed; the matching fields are empty rather than the whole dive failing. */
  degraded: string[]
}

export interface RepoDeepDiveOptions {
  /** Overrides GITHUB_TOKEN. An empty string means "no token". */
  token?: string
  timeoutMs?: number
}

function assertGitHubName(label: string, value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_GITHUB_NAME_LENGTH ||
    !GITHUB_NAME_PATTERN.test(value) ||
    value === "." ||
    value === ".."
  ) {
    throw new GitHubInputError(`Invalid GitHub ${label}.`)
  }
  return value
}

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length)
  let next = 0
  const worker = async () => {
    while (next < tasks.length) {
      const index = next++
      results[index] = await tasks[index]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}

type SubCallResult = { ok: true; response: Response } | { ok: false }

function deepDiveHeaders(accept: string, token: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": "PersonaAI-Portfolio-Generator",
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function toSafeHomepage(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null
  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null
  } catch {
    return null
  }
}

function toLanguagePercentages(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {}
  const entries = Object.entries(raw as Record<string, unknown>).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0,
  )
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0)
  if (total === 0) return {}
  return Object.fromEntries(entries.map(([name, bytes]) => [name, Math.round((bytes / total) * 1000) / 10]))
}

/**
 * Fetches README, languages, recent commits and metadata for one repo.
 * Throws GitHubInputError before any request on a bad name, and GitHubRateLimitError on HTTP 403/429.
 * Any other sub-call failure only empties its own field (listed in `degraded`).
 */
export async function fetchRepoDeepDive(
  username: string,
  repo: string,
  opts: RepoDeepDiveOptions = {},
): Promise<RepoDeepDive> {
  const owner = assertGitHubName("username", username)
  const name = assertGitHubName("repository name", repo)
  const token = (opts.token ?? process.env.GITHUB_TOKEN ?? "").trim() || undefined
  const timeoutMs = opts.timeoutMs ?? DEEP_DIVE_TIMEOUT_MS
  const base = `/repos/${owner}/${name}`

  const call = async (path: string, accept: string): Promise<SubCallResult> => {
    try {
      const response = await fetch(`${GITHUB_API}${base}${path}`, {
        headers: deepDiveHeaders(accept, token),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (response.status === 403 || response.status === 429) throw new GitHubRateLimitError()
      return response.ok ? { ok: true, response } : { ok: false }
    } catch (error) {
      if (error instanceof GitHubRateLimitError) throw error
      return { ok: false }
    }
  }

  const json = async (path: string): Promise<unknown | undefined> => {
    const result = await call(path, "application/vnd.github+json")
    if (!result.ok) return undefined
    try {
      return await result.response.json()
    } catch {
      return undefined
    }
  }

  const [meta, languages, readme, commits] = await runWithConcurrency(
    [
      () => json(""),
      () => json("/languages"),
      async () => {
        const result = await call("/readme", "application/vnd.github.raw")
        if (!result.ok) return undefined
        try {
          return await result.response.text()
        } catch {
          return undefined
        }
      },
      () => json(`/commits?per_page=${DEEP_DIVE_MAX_COMMITS}`),
    ],
    DEEP_DIVE_CONCURRENCY,
  )

  const degraded: string[] = []
  if (meta === undefined) degraded.push("metadata")
  if (languages === undefined) degraded.push("languages")
  if (readme === undefined) degraded.push("readme")
  if (commits === undefined) degraded.push("commits")

  const metaObject = meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {}
  const topics = Array.isArray(metaObject.topics)
    ? metaObject.topics.filter((topic): topic is string => typeof topic === "string" && topic.trim() !== "")
    : []

  const commitMessages = Array.isArray(commits)
    ? commits
        .map((entry) => {
          const message = (entry as { commit?: { message?: unknown } } | null)?.commit?.message
          return typeof message === "string"
            ? message.split("\n")[0].trim().slice(0, DEEP_DIVE_COMMIT_LINE_CHARS)
            : ""
        })
        .filter(Boolean)
        .slice(0, DEEP_DIVE_MAX_COMMITS)
    : []

  const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0)

  return {
    owner,
    name,
    readme: typeof readme === "string" ? readme.trim().slice(0, DEEP_DIVE_README_CHARS) : "",
    languages: toLanguagePercentages(languages),
    commits: commitMessages,
    topics,
    homepage: toSafeHomepage(metaObject.homepage),
    description:
      typeof metaObject.description === "string" && metaObject.description.trim() !== ""
        ? metaObject.description.trim()
        : null,
    stars: count(metaObject.stargazers_count),
    forks: count(metaObject.forks_count),
    degraded,
  }
}
