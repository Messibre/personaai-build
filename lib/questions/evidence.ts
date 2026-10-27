import type { Project } from "@/lib/schemas/vault"

const MIN_EVIDENCE_CHARS = 8

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

/** The only places a quote may come from: the README and commit messages. */
export function getEvidenceSources(project: Project): string[] {
  const snapshot = project.sourceSnapshot
  if (!snapshot) return []
  const sources: string[] = []
  if (snapshot.readme) sources.push(normalizeWhitespace(snapshot.readme))
  for (const commit of snapshot.commits ?? []) sources.push(normalizeWhitespace(commit))
  return sources.filter((source) => source !== "")
}

export function isVerbatimEvidence(project: Project, evidence: string | null | undefined): boolean {
  if (typeof evidence !== "string") return false
  const needle = normalizeWhitespace(evidence)
  if (needle.length < MIN_EVIDENCE_CHARS) return false
  return getEvidenceSources(project).some((source) => source.includes(needle))
}

// A quote that is itself an instruction to the model is the injection, not evidence of the user's work.
const INSTRUCTION_PATTERNS = [
  /\bignore\b[^.\n]{0,40}\b(instructions?|prompts?|rules?)\b/i,
  /\bdisregard\b[^.\n]{0,40}\b(instructions?|prompts?|rules?)\b/i,
  /\bforget\b[^.\n]{0,40}\b(instructions?|prompts?|rules?)\b/i,
  /\bsystem prompt\b/i,
  /\byou are now\b/i,
  /\bnew instructions?\b/i,
  /\bact as\b/i,
]

export function looksLikeInstruction(evidence: string): boolean {
  return INSTRUCTION_PATTERNS.some((pattern) => pattern.test(evidence))
}

/** Every digit sequence in the answer must appear in the quote that supports it. */
export function numbersAreGrounded(text: string, evidence: string): boolean {
  const numbers = text.match(/\d[\d,.]*/g) ?? []
  const normalizedEvidence = normalizeWhitespace(evidence)
  return numbers.every((value) => normalizedEvidence.includes(value.replace(/[.,]+$/, "")))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Capitalised words after the first word of a sentence read as names (Google, WebGL).
 * Each must appear in the supporting quote or the project's own name or techs.
 */
export function namesAreGrounded(text: string, allowedContext: string): boolean {
  const sentences = text.split(/(?<=[.!?])\s+/)
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).slice(1)
    for (const raw of words) {
      const word = raw.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "")
      if (!/^[A-Z][A-Za-z0-9]+$/.test(word)) continue
      if (!new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(allowedContext)) return false
    }
  }
  return true
}
