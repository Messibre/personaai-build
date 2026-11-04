import type { RepoDeepDive } from "@/lib/github"
import { projectSchema, type Fact, type FactKind, type Project } from "@/lib/schemas/vault"

const MIN_LANGUAGE_PERCENT = 10
const MOSTLY_THRESHOLD_PERCENT = 50
const MAX_FACT_TEXT = 500
const MAX_EVIDENCE = 1000
const MAX_TOPICS_LISTED = 10

function githubFact(text: string, kind: FactKind, evidence: string): Fact {
  return {
    id: crypto.randomUUID(),
    text: text.slice(0, MAX_FACT_TEXT),
    kind,
    source: "github",
    evidence: evidence.slice(0, MAX_EVIDENCE),
    confirmed: false,
  }
}

function formatPercent(value: number): string {
  return String(Math.round(value))
}

/**
 * Builds a project from GitHub data with deterministic facts only: no model is involved,
 * and popularity numbers (stars, forks) live in `stats`, never in a fact.
 */
export function repoToProjectDraft(dive: RepoDeepDive): Project {
  const facts: Fact[] = []

  const description = dive.description?.trim()
  if (description) {
    facts.push(githubFact(description, "built", description))
  }

  const rankedLanguages = Object.entries(dive.languages)
    .filter(([, percent]) => percent >= MIN_LANGUAGE_PERCENT)
    .sort((a, b) => b[1] - a[1])

  rankedLanguages.forEach(([language, percent], index) => {
    const shown = formatPercent(percent)
    const text =
      index === 0 && percent >= MOSTLY_THRESHOLD_PERCENT
        ? `Written mostly in ${language} (${shown}% of the code)`
        : `Includes ${language} (${shown}% of the code)`
    facts.push(githubFact(text, "tech", `GitHub languages: ${language} ${percent}%`))
  })

  if (dive.topics.length > 0) {
    const listed = dive.topics.slice(0, MAX_TOPICS_LISTED).join(", ")
    facts.push(githubFact(`Tagged on GitHub with: ${listed}`, "tech", `GitHub topics: ${dive.topics.join(", ")}`))
  }

  if (dive.homepage) {
    facts.push(githubFact(`Has a live deployment at ${dive.homepage}`, "built", dive.homepage))
  }

  const techs: string[] = []
  const seen = new Set<string>()
  for (const tech of [...rankedLanguages.map(([language]) => language), ...dive.topics]) {
    const key = tech.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    techs.push(tech.slice(0, 100))
  }

  const topLanguage = Object.entries(dive.languages).sort((a, b) => b[1] - a[1])[0]?.[0]

  return projectSchema.parse({
    id: crypto.randomUUID(),
    name: dive.name,
    url: `https://github.com/${dive.owner}/${dive.name}`,
    ...(topLanguage ? { primaryLanguage: topLanguage } : {}),
    stats: { stars: dive.stars, forks: dive.forks },
    techs,
    facts,
    sourceSnapshot: {
      ...(dive.readme ? { readme: dive.readme } : {}),
      commits: dive.commits,
      fetchedAt: new Date().toISOString(),
    },
  })
}
