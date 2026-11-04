import type { EnrichedGitHubRepo, GitHubProfile, GitHubRepo } from "./types"

const GITHUB_API = "https://api.github.com"

export type GitHubErrorCode = "not_found" | "rate_limited" | "upstream"

export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly code: GitHubErrorCode,
  ) {
    super(message)
    this.name = "GitHubError"
  }
}

function errorForStatus(status: number, username: string): GitHubError {
  if (status === 404) return new GitHubError(`GitHub user "${username}" not found`, "not_found")
  if (status === 403 || status === 429) {
    return new GitHubError("GitHub API rate limit exceeded. Please try again later.", "rate_limited")
  }
  return new GitHubError(`GitHub API error: ${status}`, "upstream")
}

export async function fetchGitHubProfile(username: string): Promise<GitHubProfile> {
  const res = await fetch(`${GITHUB_API}/users/${encodeURIComponent(username)}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "PersonaAI-Portfolio-Generator",
    },
  })

  if (!res.ok) throw errorForStatus(res.status, username)

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

  if (!res.ok) throw errorForStatus(res.status, username)

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
