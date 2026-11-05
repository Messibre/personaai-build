import { containsTerm, findSkillIds, getSkill, normalize } from "@/lib/job/skills"

export interface NumberToken {
  raw: string
  value: number
  percent: boolean
}

export type ClaimToken =
  | { kind: "skill"; value: string; skillId: string }
  | { kind: "term"; value: string }
  | { kind: "verb"; value: string }

export const OWNERSHIP_VERBS = [
  "led",
  "founded",
  "owned",
  "architected",
  "managed",
  "headed",
  "built from scratch",
  "launched",
  "shipped to",
] as const

// "10,000+", "4.2s", "65%", "100k+", "4K". A letter directly before the digit (Web3, i18n) is not a number.
const NUMBER_PATTERN = /(?<![A-Za-z0-9.,])(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s?([kKmM])(?![A-Za-z]))?\+?(\s?%)?/g

export function extractNumbers(text: string): NumberToken[] {
  const out: NumberToken[] = []
  for (const match of text.matchAll(NUMBER_PATTERN)) {
    const base = Number(match[1].replace(/,/g, ""))
    if (!Number.isFinite(base)) continue
    const multiplier = match[2]?.toLowerCase() === "k" ? 1_000 : match[2]?.toLowerCase() === "m" ? 1_000_000 : 1
    out.push({ raw: match[0].trim(), value: base * multiplier, percent: Boolean(match[3]) })
  }
  return out
}

/** A sentence number is supported when a cited fact has the same value (and is a percentage if the sentence says so). */
export function numberSupported(token: NumberToken, factNumbers: readonly NumberToken[]): boolean {
  return factNumbers.some((fact) => fact.value === token.value && (!token.percent || fact.percent))
}

const WORD = /[A-Za-z][A-Za-z0-9]*(?:[.'][A-Za-z0-9]+)*/g
const DOTTED = /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)+$/
const CAMEL = /^[a-z]+[A-Z][A-Za-z0-9]*$/
const ALL_CAPS = /^[A-Z][A-Z0-9]+$/
const CAPITALIZED = /^[A-Z][A-Za-z0-9]+$/

function stripPossessive(word: string): string {
  return word.replace(/'s$/i, "")
}

/**
 * Words a sentence must not introduce on its own: taxonomy skills, proper-noun-like terms
 * (capitalized words after the first word, dotted/camelCase/ALLCAPS terms anywhere) and strong
 * ownership verbs. Numbers are extracted separately by extractNumbers.
 */
export function extractClaimTokens(text: string): ClaimToken[] {
  const tokens: ClaimToken[] = []
  const seen = new Set<string>()
  const add = (token: ClaimToken) => {
    const key = `${token.kind}:${token.value.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    tokens.push(token)
  }

  for (const skillId of findSkillIds(text)) add({ kind: "skill", value: getSkill(skillId)?.name ?? skillId, skillId })

  const words = [...text.matchAll(WORD)].map((match) => stripPossessive(match[0].replace(/\.$/, "")))
  words.forEach((word, index) => {
    if (word.length < 2) return
    if (DOTTED.test(word) || CAMEL.test(word) || ALL_CAPS.test(word)) add({ kind: "term", value: word })
    else if (index > 0 && CAPITALIZED.test(word)) add({ kind: "term", value: word })
  })

  for (const verb of OWNERSHIP_VERBS) if (containsTerm(text, verb)) add({ kind: "verb", value: verb })

  return tokens
}

/** Skills are supported by any alias of the same skill; other tokens need a case-insensitive word-boundary match. */
export function claimSupported(token: ClaimToken, supportText: string, supportSkillIds: ReadonlySet<string>): boolean {
  if (token.kind === "skill") return supportSkillIds.has(token.skillId)
  return containsTerm(supportText, token.value)
}

export { normalize }
