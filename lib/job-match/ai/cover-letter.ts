import type { EvidenceLedger } from "../report/ledger"

export interface CoverLetterOptions {
  tone: "concise" | "warm" | "formal"
  length: "short" | "standard"
  featuredProjectId?: string
  addressGaps: boolean
}

export function deterministicCoverLetter(ledger: EvidenceLedger, options: CoverLetterOptions): { text: string; placeholders: string[]; wordCount: number } {
  const project = ledger.selectedProjects.find((item) => item.project.id === options.featuredProjectId) || ledger.selectedProjects[0]
  const top = ledger.requirements[0]
  const gap = ledger.checks.find((check) => check.status === "missing")
  const projectLine = project ? `My project ${project.project.name} demonstrates ${project.covers.slice(0, 2).join(" and ") || "relevant work"}, supported by the available project evidence.` : "My available project evidence is limited, so I would welcome the opportunity to discuss the relevant work directly."
  const gapLine = options.addressGaps && gap ? `I have not used ${gap.requirement.label} in a verified project, and I am learning it without presenting it as production experience.` : ""
  const text = `{{FULL_NAME}}\n\nDear {{HIRING_MANAGER|Hiring Team}},\n\nI am applying for the ${ledger.roleTitle} role at {{COMPANY}}. My background includes work related to ${top?.label || "the role's core requirements"}.\n\n${projectLine}\n\n${gapLine}${gapLine ? "\n\n" : ""}I would be glad to discuss how this evidence connects to your stated needs${ledger.values[0] ? `, especially ${ledger.values[0]}` : ""}.\n\nRegards,\n{{FULL_NAME}}`
  const placeholders = [...text.matchAll(/\{\{[^}]+\}\}/g)].map((match) => match[0])
  return { text, placeholders, wordCount: text.split(/\s+/).filter(Boolean).length }
}
