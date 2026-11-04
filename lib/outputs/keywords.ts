import type { JobProfile } from "@/lib/schemas/job"

export function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
}

/** Each distinct requirement keyword as a list of normalized words. */
export function jobKeywordWords(job: JobProfile): string[][] {
  const seen = new Set<string>()
  const result: string[][] = []
  for (const requirement of job.requirements) {
    for (const keyword of requirement.keywords) {
      const words = wordsOf(keyword)
      if (words.length === 0) continue
      const key = words.join(" ")
      if (seen.has(key)) continue
      seen.add(key)
      result.push(words)
    }
  }
  return result
}

/** How many job keywords appear (all of their words) in the text. */
export function keywordOverlap(text: string, keywords: string[][]): number {
  const present = new Set(wordsOf(text))
  let matched = 0
  for (const words of keywords) {
    if (words.every((word) => present.has(word))) matched += 1
  }
  return matched
}

/** A skill matches when it and a keyword share all words of the shorter one. */
export function skillMatchesKeywords(skillName: string, keywords: string[][]): boolean {
  const skillWords = wordsOf(skillName)
  if (skillWords.length === 0) return false
  const skillSet = new Set(skillWords)
  return keywords.some((words) => {
    const wordSet = new Set(words)
    return words.every((word) => skillSet.has(word)) || skillWords.every((word) => wordSet.has(word))
  })
}

/** Stable sort: highest score first, ties keep their original order. */
export function stableSortByScore<T>(items: T[], score: (item: T) => number): T[] {
  return items
    .map((item, index) => ({ item, index, value: score(item) }))
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .map((entry) => entry.item)
}
