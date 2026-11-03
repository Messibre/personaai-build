import type { EvidenceItem, JobAnalysis, RequirementCheck, SelectedProject, ProfileEvidence } from "./types"

const related = new Map([
  ["react", ["next.js", "javascript", "typescript", "jsx"]],
  ["next.js", ["react", "javascript", "typescript"]],
  ["machine-learning", ["python", "pytorch", "tensorflow"]],
  ["llm", ["openai", "rag", "embeddings", "python"]],
  ["docker", ["kubernetes", "ci-cd", "deployment"]],
  ["kubernetes", ["docker", "ci-cd", "cloud"]],
  ["accessibility", ["html", "ux", "ui"]],
  ["typescript", ["javascript", "react", "node.js"]],
])

function evidenceFor(items: EvidenceItem[], skillId: string): EvidenceItem[] {
  return items.filter((item) => item.skill === skillId)
}

function partialEvidence(items: EvidenceItem[], skillId: string): EvidenceItem[] {
  const skills = related.get(skillId) || []
  return items.filter((item) => skills.includes(item.skill))
}

export function selectProjects(profile: ProfileEvidence, resumeItems: EvidenceItem[], analysis: JobAnalysis): SelectedProject[] {
  const all = [...profile.items, ...resumeItems]
  const requirements = [...analysis.mustHaveRequirements, ...analysis.niceToHaveRequirements]
  const ranked = profile.projects.map((project) => {
    const items = all.filter((item) => item.projectId === project.id)
    const covers = requirements.filter((requirement) => evidenceFor(items, requirement.skillId).length)
    const score = covers.reduce((sum, requirement) => sum + (requirement.tier === "must" ? 20 : 8), 0) + items.reduce((sum, item) => sum + item.strength, 0)
    const evidence = covers.flatMap((requirement) => evidenceFor(items, requirement.skillId).slice(0, 1).map((item) => `${item.source}: ${item.snippet}`))
    return { project: { id: project.id, name: project.name, url: project.url, description: project.description, language: project.language, topics: project.topics, stars: project.stars }, score: Math.round(score * 10) / 10, covers: covers.map((requirement) => requirement.label), evidence: [...new Set(evidence)].slice(0, 6), reason: `Best evidence for ${covers.map((requirement) => requirement.label).join(", ")} in this job.` }
  }).filter((item) => item.covers.length).sort((a, b) => b.score - a.score)
  const selected: SelectedProject[] = []
  const covered = new Set<string>()
  for (const project of ranked) {
    if (project.covers.some((label) => !covered.has(label)) || selected.length < 2) {
      selected.push(project)
      project.covers.forEach((label) => covered.add(label))
    }
    if (selected.length >= 4) break
  }
  return selected
}

export function checkRequirements(profile: ProfileEvidence, resumeItems: EvidenceItem[], analysis: JobAnalysis): { checks: RequirementCheck[]; summary: { mustHave: { covered: number; partial: number; missing: number }; totalRequirements: number } } {
  const all = [...profile.items, ...resumeItems]
  const checks = [...analysis.mustHaveRequirements, ...analysis.niceToHaveRequirements].map((requirement) => {
    const direct = evidenceFor(all, requirement.skillId)
    const nearby = direct.length ? [] : partialEvidence(all, requirement.skillId)
    const evidence = (direct.length ? direct : nearby).slice(0, 5)
    const status = direct.length ? "covered" : nearby.length ? "partial" : "missing"
    return {
      requirement,
      status: status as RequirementCheck["status"],
      evidence: evidence.map((item) => item.snippet),
      projects: [...new Set(evidence.map((item) => item.projectName))],
      explanation: direct.length ? "Your project or resume contains direct evidence for this requirement." : nearby.length ? `Related evidence exists in ${[...new Set(nearby.map((item) => item.projectName))].join(", ")}, but it does not directly show ${requirement.label}.` : `Nothing in your projects or resume supports ${requirement.label}.`,
    }
  })
  const must = checks.filter((check) => check.requirement.tier === "must")
  return {
    checks,
    summary: {
      mustHave: {
        covered: must.filter((check) => check.status === "covered").length,
        partial: must.filter((check) => check.status === "partial").length,
        missing: must.filter((check) => check.status === "missing").length,
      },
      totalRequirements: checks.length,
    },
  }
}
