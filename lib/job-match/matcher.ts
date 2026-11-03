import type { EnrichedGitHubRepo } from "@/lib/types"
import type { JobAnalysis, JobProject, ProjectInput, RequirementCheck, SelectedProject } from "./types"

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim()

function buildProjects({ githubRepos, resumeText }: ProjectInput): JobProject[] {
  const github = githubRepos.map((repo) => ({
    id: `github:${repo.name}`,
    name: repo.name,
    source: "github" as const,
    url: repo.html_url,
    evidence: [
      repo.description ? `GitHub description: ${repo.description}` : "",
      repo.language ? `GitHub language: ${repo.language}` : "",
      repo.topics.length ? `GitHub topics: ${repo.topics.join(", ")}` : "",
      repo.detectedTech ? `Detected repository technology: ${repo.detectedTech}` : "",
      repo.readmeText ? `README: ${repo.readmeText}` : "",
    ].filter(Boolean),
    searchableText: normalize([repo.name, repo.description, repo.language, repo.topics.join(" "), repo.detectedTech, repo.readmeText].filter(Boolean).join(" ")),
  }))
  const resume = resumeText.trim()
    ? [{
        id: "resume:projects",
        name: "Resume projects",
        source: "resume" as const,
        evidence: resumeText.split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 80),
        searchableText: normalize(resumeText),
      }]
    : []
  return [...github, ...resume]
}

function requirementTerms(requirement: { label: string; synonyms: string[] }): string[] {
  return [requirement.label, ...requirement.synonyms].map(normalize).filter(Boolean)
}

function evidenceFor(project: JobProject, requirement: { label: string; synonyms: string[] }): string[] {
  const terms = requirementTerms(requirement)
  return project.evidence.filter((evidence) => terms.some((term) => normalize(evidence).includes(term)))
}

export function selectProjects(input: ProjectInput, analysis: JobAnalysis): SelectedProject[] {
  const requirements = [...analysis.mustHaveRequirements, ...analysis.niceToHaveRequirements]
  const projects = buildProjects(input)
  const ranked = projects.map((project) => {
    const matches = requirements.flatMap((requirement) => evidenceFor(project, requirement).length ? [requirement] : [])
    const mustMatches = matches.filter((requirement) => requirement.priority === "must-have").length
    const niceMatches = matches.filter((requirement) => requirement.priority === "nice-to-have").length
    const evidence = [...new Set(matches.flatMap((requirement) => evidenceFor(project, requirement)))]
    return {
      project,
      score: mustMatches * 20 + niceMatches * 8,
      covers: matches.map((requirement) => requirement.label),
      evidence,
      reason: matches.length ? `Shows evidence for ${matches.map((requirement) => requirement.label).join(", ")} in this job.` : "",
    }
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score)

  const selected: SelectedProject[] = []
  const covered = new Set<string>()
  for (const item of ranked) {
    const addsCoverage = item.covers.some((label) => !covered.has(label))
    if (addsCoverage || selected.length < 2) {
      selected.push(item)
      item.covers.forEach((label) => covered.add(label))
    }
    if (selected.length === 4) break
  }
  return selected
}

export function checkRequirements(input: ProjectInput, analysis: JobAnalysis): { checks: RequirementCheck[]; summary: { mustHave: { covered: number; partial: number; missing: number }; totalRequirements: number } } {
  const projects = buildProjects(input)
  const checks = [...analysis.mustHaveRequirements, ...analysis.niceToHaveRequirements].map((requirement) => {
    const direct = projects.flatMap((project) => evidenceFor(project, requirement).map((evidence) => ({ project, evidence })))
    if (direct.length) {
      return {
        requirement,
        status: "covered" as const,
        evidence: [...new Set(direct.map((item) => item.evidence))],
        projects: [...new Set(direct.map((item) => item.project.name))],
        explanation: "Your projects contain direct evidence for this requirement.",
      }
    }
    const related = projects.filter((project) => {
      const words = requirementTerms(requirement).flatMap((term) => term.split(" ").filter((word) => word.length > 3))
      return words.some((word) => project.searchableText.includes(word))
    })
    return {
      requirement,
      status: related.length ? "partial" as const : "missing" as const,
      evidence: related.flatMap((project) => project.evidence.slice(0, 1)),
      projects: related.map((project) => project.name),
      explanation: related.length
        ? `Related evidence exists in ${related.map((project) => project.name).join(", ")}, but it does not directly show ${requirement.label}.`
        : `Nothing in your projects or resume mentions ${requirement.label}.`,
    }
  })
  const mustHave = checks.filter((check) => check.requirement.priority === "must-have")
  return {
    checks,
    summary: {
      mustHave: {
        covered: mustHave.filter((check) => check.status === "covered").length,
        partial: mustHave.filter((check) => check.status === "partial").length,
        missing: mustHave.filter((check) => check.status === "missing").length,
      },
      totalRequirements: checks.length,
    },
  }
}
