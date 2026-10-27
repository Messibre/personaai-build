import { MockClient } from "@/lib/llm/mock"
import type { LLMGenerateRequest } from "@/lib/llm/types"
import type { RewriteContext } from "@/lib/rewrite/context"
import type { Draft, Sentence } from "@/lib/schemas/draft"
import type { JobProfile, ProjectPick } from "@/lib/schemas/job"

export { loadAlexVault, loadResumeOnlyVault } from "../vault/helpers"

export const CANVAS_FLOW = "proj_canvas-flow"
export const MOTION_TOKENS = "proj_motion-tokens"
export const TREE_GRID = "proj_headless-tree-grid"

export const uxJob: JobProfile = {
  title: "UX Engineer",
  seniority: "senior",
  roleType: "frontend",
  requirements: [
    {
      id: "req_a11y",
      label: "Builds accessible interfaces that respect user motion preferences",
      level: "must",
      keywords: ["accessibility", "wcag", "assistive", "prefers-reduced-motion", "reduced motion"],
    },
    { id: "req_react", label: "Strong React", level: "nice", keywords: ["react"] },
  ],
  topThree: ["Accessible interfaces", "Design systems", "Motion and interaction"],
}

export const uxPicks: ProjectPick[] = [
  { projectId: MOTION_TOKENS, matchedRequirementIds: ["req_a11y"], score: 0.92 },
  { projectId: CANVAS_FLOW, matchedRequirementIds: ["req_a11y"], score: 0.71 },
]

export const aiJob: JobProfile = {
  title: "Machine Learning Engineer, Visualization Tools",
  seniority: "senior",
  roleType: "ml",
  requirements: [
    {
      id: "req_scale",
      label: "Keeps large datasets responsive in the browser",
      level: "must",
      keywords: ["10,000", "nodes", "bottleneck", "dom"],
    },
    { id: "req_rows", label: "Handles very large tables", level: "nice", keywords: ["100k", "rows", "virtualized"] },
  ],
  topThree: ["Large-scale data visualisation", "Performance", "Browser tooling"],
}

export const aiPicks: ProjectPick[] = [
  { projectId: CANVAS_FLOW, matchedRequirementIds: ["req_scale"], score: 0.88 },
  { projectId: TREE_GRID, matchedRequirementIds: ["req_rows"], score: 0.64 },
]

const BEGIN = "BEGIN_CONTEXT_JSON\n"
const END = "\nEND_CONTEXT_JSON"

export function readContextFromPrompt(prompt: string): RewriteContext {
  const start = prompt.indexOf(BEGIN)
  const end = prompt.indexOf(END)
  if (start === -1 || end === -1) throw new Error("Prompt has no context block")
  return JSON.parse(prompt.slice(start + BEGIN.length, end)) as RewriteContext
}

function sentenceFrom(fact: { id: string; text: string }): Sentence {
  return { text: fact.text, factIds: [fact.id] }
}

/**
 * A deterministic stand-in for the model that does what the system prompt asks:
 * each project opens with its lead fact, then adds one more fact, and nothing is invented.
 */
export function draftFollowingLeads(context: RewriteContext): Draft {
  const projects = context.projects
    .filter((project) => project.facts.length > 0)
    .map((project) => {
      const lead = project.facts.find((fact) => fact.id === project.leadFactId) ?? project.facts[0]
      const second = project.facts.find((fact) => fact.id !== lead.id)
      return {
        projectId: project.projectId,
        sentences: [sentenceFrom(lead), ...(second ? [sentenceFrom(second)] : [])],
      }
    })

  const experienceFact = context.experience[0]?.facts[0]
  const firstLead = projects[0]?.sentences[0]

  return {
    tagline: `${context.person.name}, ${context.job.title}`,
    about: experienceFact ? [sentenceFrom(experienceFact)] : [],
    projects,
    resumeBullets: [],
    note: firstLead ? [firstLead] : [],
  }
}

export function leadFollowingClient(captured: LLMGenerateRequest[] = []): MockClient {
  return new MockClient({
    responses: [
      (req) => {
        captured.push(req)
        return JSON.stringify(draftFollowingLeads(readContextFromPrompt(req.prompt)))
      },
    ],
  })
}

export function clientReturning(draft: unknown, captured: LLMGenerateRequest[] = []): MockClient {
  return new MockClient({
    responses: [
      (req) => {
        captured.push(req)
        return JSON.stringify(draft)
      },
    ],
  })
}

export function emptyDraft(): Draft {
  return { tagline: "", about: [], projects: [], resumeBullets: [], note: [] }
}
