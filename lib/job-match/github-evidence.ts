import type { EvidenceItem, ProfileEvidence, ProfileProject } from "./types"
import skills from "./skills.json"

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
  readme: BlobValue
  readmeAlt: BlobValue
  pkg: BlobValue
  requirements: BlobValue
  pyproject: BlobValue
  dockerfile: BlobValue
  goMod: BlobValue
  cargo: BlobValue
  workflows: BlobValue
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
  for (const skill of skillMatches(snippet)) {
    items.push({ skill: skill.id, source, strength: strength * recency(project.pushedAt || new Date().toISOString()) * (project.archived ? 0.5 : 1), projectId: project.id, projectName: project.name, snippet: snippet.slice(0, 1000) })
  }
}

function manifestPackages(content: string): string {
  try {
    const parsed = JSON.parse(content) as { dependencies?: Record<string, unknown>; devDependencies?: Record<string, unknown>; scripts?: Record<string, unknown> }
    return [...Object.keys(parsed.dependencies || {}), ...Object.keys(parsed.devDependencies || {}), ...Object.keys(parsed.scripts || {})].join(" ")
  } catch {
    return content
  }
}

function buildProject(node: GithubNode): ProfileProject {
  const project: ProfileProject = { id: `github:${node.name}`, name: node.name, url: node.url, pushedAt: node.pushedAt, archived: node.isArchived, evidence: [] }
  const evidence = project.evidence
  const languageTotal = node.languages.edges.reduce((sum, item) => sum + item.size, 0) || 1
  for (const language of node.languages.edges) {
    addEvidence(evidence, project, "language", language.node.name, language.size / languageTotal >= 0.15 ? WEIGHTS.languageHigh : WEIGHTS.languageLow)
  }
  if (node.primaryLanguage?.name) addEvidence(evidence, project, "language", node.primaryLanguage.name, WEIGHTS.languageHigh)
  for (const topic of node.repositoryTopics.nodes) addEvidence(evidence, project, "topic", topic.topic.name, WEIGHTS.topic)
  if (node.description) addEvidence(evidence, project, "description", node.description, WEIGHTS.description)
  const readme = text(node.readme) || text(node.readmeAlt)
  if (readme) addEvidence(evidence, project, "readme", readme.replace(/```[\s\S]*?```|!\[[^\]]*]\([^)]*\)/g, " ").slice(0, 20000), WEIGHTS.readme)
  const pkg = manifestPackages(text(node.pkg))
  if (pkg) addEvidence(evidence, project, "dependency", pkg, WEIGHTS.dependency)
  for (const manifest of [text(node.requirements), text(node.pyproject), text(node.goMod), text(node.cargo)]) {
    if (manifest) addEvidence(evidence, project, "dependency", manifest, WEIGHTS.dependency)
  }
  if (text(node.dockerfile)) addEvidence(evidence, project, "config", "Docker", WEIGHTS.config)
  if (text(node.workflows)) addEvidence(evidence, project, "config", `GitHub Actions ${text(node.workflows)}`, WEIGHTS.config)
  return project
}

const QUERY = `query($login: String!) { user(login: $login) { repositories(first: 40, ownerAffiliations: OWNER, isFork: false, orderBy: {field: PUSHED_AT, direction: DESC}, privacy: PUBLIC) { nodes { name description url pushedAt stargazerCount isArchived primaryLanguage { name } languages(first: 8, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name } } } repositoryTopics(first: 15) { nodes { topic { name } } } readme: object(expression: "HEAD:README.md") { ... on Blob { text } } readmeAlt: object(expression: "HEAD:README") { ... on Blob { text } } pkg: object(expression: "HEAD:package.json") { ... on Blob { text } } requirements: object(expression: "HEAD:requirements.txt") { ... on Blob { text } } pyproject: object(expression: "HEAD:pyproject.toml") { ... on Blob { text } } dockerfile: object(expression: "HEAD:Dockerfile") { ... on Blob { id } } goMod: object(expression: "HEAD:go.mod") { ... on Blob { text } } cargo: object(expression: "HEAD:Cargo.toml") { ... on Blob { text } } workflows: object(expression: "HEAD:.github/workflows") { ... on Tree { entries { name } } } } } } }`

export async function fetchProfileEvidence(login: string, forceRefresh = false): Promise<ProfileEvidence> {
  const cached = cache.get(login.toLowerCase())
  if (!forceRefresh && cached && cached.expires > Date.now()) return cached.value
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "PersonaAI-Job-Match/1.0", ...(process.env.GITHUB_TOKEN ? { Authorization: `bearer ${process.env.GITHUB_TOKEN}` } : {}) },
      body: JSON.stringify({ query: QUERY, variables: { login } }),
      signal: controller.signal,
    })
    if (response.status === 403 || response.status === 429) throw new Error("GitHub rate limit reached. Please try again later.")
    if (!response.ok) throw new Error(`GitHub returned ${response.status}. Please check the username and try again.`)
    const payload = await response.json() as { data?: { user?: { repositories: { nodes: GithubNode[] } } }; errors?: Array<{ message: string }> }
    if (payload.errors?.length) throw new Error(payload.errors[0].message)
    if (!payload.data?.user) throw new Error("GitHub user was not found.")
    const projects = payload.data.user.repositories.nodes.filter((node) => !node.isArchived).map(buildProject)
    const value = { login, projects, items: projects.flatMap((project) => project.evidence), fetchedAt: new Date().toISOString() }
    cache.set(login.toLowerCase(), { expires: Date.now() + TTL_MS, value })
    return value
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
