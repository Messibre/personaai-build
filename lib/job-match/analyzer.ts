import { callGemini } from "../gemini"
import { parseJobAnalysis } from "./schemas"
import type { JobAnalysis } from "./types"

function parseJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
  return JSON.parse(cleaned)
}

export async function analyzeJob(
  jobText: string,
  generate: (prompt: string) => Promise<string> = callGemini,
): Promise<JobAnalysis> {
  const prompt = `Analyze this job posting. Return only valid JSON matching this shape:
{"roleTitle":"string","roleType":"frontend|ux-engineer|ai-ml|fullstack|backend|other","mustHaveRequirements":[{"label":"string","synonyms":["string"],"quote":"exact short quote","priority":"must-have"}],"niceToHaveRequirements":[{"label":"string","synonyms":["string"],"quote":"exact short quote","priority":"nice-to-have"}],"values":["string"]}
Extract concrete requirements, short synonyms, and exact quotes from the posting. Ignore benefits, legal text, and company fluff. Do not infer requirements that are not supported by the posting.

JOB POSTING:
${jobText.slice(0, 15000)}`

  let lastError: Error | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return parseJobAnalysis(parseJson(await generate(prompt)))
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Invalid job analysis response")
    }
  }
  throw new Error(`The job analysis could not be validated. ${lastError?.message || ""}`.trim())
}
