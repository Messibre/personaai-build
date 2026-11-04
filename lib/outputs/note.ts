import type { Draft } from "@/lib/schemas/draft"
import type { JobProfile } from "@/lib/schemas/job"
import type { Vault } from "@/lib/schemas/vault"

export interface BuildNoteInput {
  vault: Vault
  draft: Draft
  job: JobProfile
  /** The posting's company, when known. JobProfile does not carry one. */
  company?: string
}

export interface Note {
  text: string
  wordCount: number
}

function oneLine(text: string | undefined, max = 100): string {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, max)
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

/**
 * Greeting and sign-off carry no claims. With no draft sentences there is no note
 * to send, so an empty note is returned instead of a hollow greeting.
 */
export function buildNote({ vault, draft, company }: BuildNoteInput): Note {
  const body = draft.note
    .map((sentence) => oneLine(sentence.text, 1000))
    .filter(Boolean)
    .join(" ")
  if (!body) return { text: "", wordCount: 0 }

  const companyName = oneLine(company)
  const greeting = companyName ? `Hi ${companyName} team,` : "Hello,"
  const text = [greeting, body, `Best,\n${oneLine(vault.person.name, 200)}`].join("\n\n")
  return { text, wordCount: countWords(text) }
}
