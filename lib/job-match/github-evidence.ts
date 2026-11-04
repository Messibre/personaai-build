import type { EvidenceItem, ProfileEvidence, ProfileProject } from "./types"
import skills from "./skills.json"
import { safeFetch } from "@/lib/security/safe-fetch"

type Skill = (typeof skills)[number]
type BlobValue = { text?: string } | { id?: string } | null
type GithubNode = {
  name: string
  description: string | null
  url: string
  pushedAt: string
  stargazerCount: number
  isArchived: boolean
  primaryLanguage: { name: string } | null
  languages: { edges: Array<{ size: number; node: { name: string } }> }
  repositoryTopics: { nodes: Array<{ topic: { name: string } }> }
}

const cache = new Map<string, { expires: number; value: ProfileEvidence }>()
const TTL_MS = 6 * 60 * 60 * 1000
const WEIGHTS = { dependency: 1, resume: 0.9, languageHigh: 0.8, config: 0.8, topic: 0.7, readme: 0.5, description: 0.5, languageLow: 0.4 }

function text(value: BlobValue): string {
  return value && "text" in value && typeof value.text === "string" ? value.text : ""
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9+#./-]+/g, " ").trim()
}

function cleanSnippet(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[#*_`]+/g, " ")
    .replace(/&(?:nbsp|amp|quot|lt|gt|#39);/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 360)
}

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function skillMatches(value: string): Skill[] {
  const source = normalize(value)
  return skills.filter((skill) => skill.aliases.some((alias) => {
    const aliasText = normalize(alias)
    if (aliasText.length <= 2 && !["go", "c#", "r"].includes(aliasText)) return false
    const pattern = new RegExp(`(?<![a-z0-9+#.])${escaped(aliasText)}(?![a-z0-9+#])`, "i")
    if (!pattern.test(source)) return false
    if (aliasText === "go" || aliasText === "r") return /\b(programming|language|experience|golang)\b/i.test(source)
    return true
  }))
}

function recency(pushedAt: string): number {
  const age = Date.now() - new Date(pushedAt).getTime()
  return age <= 365 * 86400000 ? 1 : Math.max(0.7, 1 - ((age / 86400000 - 365) / 3650))
}

function addEvidence(items: EvidenceItem[], project: ProfileProject, source: EvidenceItem["source"], snippet: string, strength: number) {
  const cleaned = cleanSnippet(snippet)
  if (!cleaned) return
  for (const skill of skillMatches(cleaned)) {
    if (items.some((item) => item.skill === skill.id && item.source === source && item.snippet === cleaned)) continue
    items.push({ skill: skill.id, source, strength: strength * recency(project.pushedAt || new Date().toISOString()) * (project.archived ? 0.5 : 1), projectId: project.id, projectName: project.name, snippet: cleaned })
  }
}

function buildProject(node: GithubNode): ProfileProject {
  const project: ProfileProject = {
    id: `github:${node.name}`,
    name: node.name,
    url: node.url,
    pushedAt: node.pushedAt,
    archived: node.isArchived,
    description: node.description || undefined,
    language: node.primaryLanguage?.name || undefined,
    topics: node.repositoryTopics.nodes.map((item) => item.topic.name),
    stars: node.stargazerCount,
    evidence: [],
  }
  const evidence = project.evidence
  const languageTotal = node.languages.edges.reduce((sum, item) => sum + item.size, 0) || 1
  for (const language of node.languages.edges) {
    addEvidence(evidence, project, "language", language.node.name, language.size / languageTotal >= 0.15 ? WEIGHTS.languageHigh : WEIGHTS.languageLow)
  }
  if (node.primaryLanguage?.name) addEvidence(evidence, project, "language", node.primaryLanguage.name, WEIGHTS.languageHigh)
  for (const topic of node.repositoryTopics.nodes) addEvidence(evidence, project, "topic", topic.topic.name, WEIGHTS.topic)
  if (node.description) addEvidence(evidence, project, "description", node.description, WEIGHTS.description)
  return project
}

const QUERY = `query($login: String!) { user(login: $login) { repositories(first: 100, isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}, privacy: PUBLIC) { nodes { name description url pushedAt stargazerCount isArchived primaryLanguage { name } languages(first: 8, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name } } } repositoryTopics(first: 15) { nodes { topic { name } } } } } } }`

type RestRepo = {
  name: string
  description: string | null
  html_url: string
  pushed_at: string
  stargazers_count: number
  archived: boolean
  fork: boolean
  language: string | null
  topics?: string[]
}

const GITHUB_HEADERS = { Accept: "application/json", "User-Agent": "PersonaAI-Job-Match/1.0" }

function assertGithubOk(response: Response) {
  if (response.ok) return
  if (response.status === 401) throw new Error("GitHub rejected GITHUB_TOKEN. Check that the token is valid and has not expired.")
  const exhausted = response.headers.get("x-ratelimit-remaining") === "0"
  if (response.status === 429 || (response.status === 403 && exhausted)) throw new Error("GitHub rate limit reached. Please try again later.")
  if (response.status === 403) throw new Error("GitHub denied the request. Set GITHUB_TOKEN to authenticate this server.")
  if (response.status === 404) throw new Error("GitHub user was not found.")
  throw new Error(`GitHub returned ${response.status}. Please check the username and try again.`)
}

async function fetchNodesGraphql(login: string, token: string, signal: AbortSignal): Promise<GithubNode[]> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { ...GITHUB_HEADERS, "Content-Type": "application/json", Authorization: `bearer ${token}` },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
    signal,
  })
  assertGithubOk(response)
  const payload = await response.json() as { data?: { user?: { repositories: { nodes: GithubNode[] } } }; errors?: Array<{ message: string }> }
  if (payload.errors?.length) throw new Error(payload.errors[0].message)
  if (!payload.data?.user) throw new Error("GitHub user was not found.")
  return payload.data.user.repositories.nodes
}

// The GraphQL API rejects anonymous callers, so without a token we read the public REST listing instead.
// It has no per-repo language breakdown, so only the primary language is available as evidence.
async function fetchNodesRest(login: string): Promise<GithubNode[]> {
  const url = `https://api.github.com/users/${encodeURIComponent(login)}/repos?type=owner&sort=pushed&per_page=100`
  const response = await safeFetch(url, {
    headers: GITHUB_HEADERS,
    timeoutMs: 20000,
    isHostAllowed: (hostname) => hostname === "api.github.com",
  })
  assertGithubOk(response)
  const repos = await response.json() as RestRepo[]
  return repos.filter((repo) => !repo.fork).map((repo) => ({
    name: repo.name,
    description: repo.description,
    url: repo.html_url,
    pushedAt: repo.pushed_at,
    stargazerCount: repo.stargazers_count,
    isArchived: repo.archived,
    primaryLanguage: repo.language ? { name: repo.language } : null,
    languages: { edges: repo.language ? [{ size: 1, node: { name: repo.language } }] : [] },
    repositoryTopics: { nodes: (repo.topics ?? []).map((topic) => ({ topic: { name: topic } })) },
  }))
}

export async function fetchProfileEvidence(login: string, forceRefresh = false): Promise<ProfileEvidence> {
  const cached = cache.get(login.toLowerCase())
  if (!forceRefresh && cached && cached.expires > Date.now()) return cached.value
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const token = process.env.GITHUB_TOKEN
    const nodes = token ? await fetchNodesGraphql(login, token, controller.signal) : await fetchNodesRest(login)
    const projects = nodes.filter((node) => !node.isArchived).map(buildProject)
    const value = { login, projects, items: projects.flatMap((project) => project.evidence), fetchedAt: new Date().toISOString() }
    cache.set(login.toLowerCase(), { expires: Date.now() + TTL_MS, value })
    return value
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("GitHub took too long to respond. Please try again or refresh your GitHub data.", { cause: error })
    }
    if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
      throw new Error("GitHub could not be reached from this server. Check the deployment network and try again.", { cause: error })
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export function resumeEvidence(resumeText: string): EvidenceItem[] {
  return resumeText.split(/\n+/).flatMap((line, index) => {
    const snippet = line.trim()
    if (!snippet) return []
    return skillMatches(snippet).map((skill) => ({ skill: skill.id, source: "resume" as const, strength: WEIGHTS.resume, projectId: `resume:${index}`, projectName: "Resume", snippet }))
  })
}
