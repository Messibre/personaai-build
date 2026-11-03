import { z } from "zod"
import { callGemini } from "../../gemini"
import type { EvidenceLedger } from "../report/ledger"
import type { CompatibilityReport } from "../report/compatibility"

const sentenceSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["proof", "job_reference", "framing"]),
  evidenceIds: z.array(z.string()),
  requirementIds: z.array(z.string()),
})
const responseSchema = z.object({ sentences: z.array(sentenceSchema).min(3).max(4) })

export interface Explanation {
  paragraph: string
  sentences: z.infer<typeof sentenceSchema>[]
  aiEnhanced: boolean
  fallbackUsed?: boolean
}

function fallback(report: CompatibilityReport, ledger: EvidenceLedger): Explanation {
  const first = ledger.checks[0]
  const project = ledger.selectedProjects[0]
  const gap = ledger.checks.find((check) => check.status !== "covered")
  const sentences = [
    { text: `${report.label} means your verified work covers some of the job's stated needs, with clear limits described below.`, type: "framing" as const, evidenceIds: [], requirementIds: [] },
    { text: project ? `${project.project.name} is the strongest project because it shows ${project.covers.slice(0, 2).join(" and ") || "related work"}.` : "There is not enough project evidence to name a strongest match.", type: "proof" as const, evidenceIds: [], requirementIds: first ? ["R1"] : [] },
    { text: gap ? `${gap.requirement.label} is ${gap.status}; the available data does not show a direct production example.` : "No important requirement gap was found in the available evidence.", type: "job_reference" as const, evidenceIds: [], requirementIds: gap ? [`R${ledger.checks.indexOf(gap) + 1}`] : [] },
    { text: "If you have used the missing requirement, add it to the relevant project details; otherwise do not claim it.", type: "framing" as const, evidenceIds: [], requirementIds: [] },
  ]
  return { paragraph: sentences.map((sentence) => sentence.text).join(" "), sentences, aiEnhanced: false, fallbackUsed: true }
}

export async function explainCompatibility(ledger: EvidenceLedger, report: CompatibilityReport): Promise<Explanation> {
  const base = fallback(report, ledger)
  if (process.env.AI_ENHANCE !== "true" || (!process.env.GEMINI_API_KEY_1 && !process.env.GEMINI_API_KEY_2)) return base
  try {
    const allowed = ledger.evidence.slice(0, 20).map((item) => `${item.id}: ${item.snippet}`).join("\n")
    const raw = await callGemini(`Write exactly 3 or 4 plain sentences explaining this compatibility result. Return JSON only: {"sentences":[{"text":"...","type":"proof|job_reference|framing","evidenceIds":[],"requirementIds":[]}]}. Do not invent facts. Use only these IDs and snippets.
Label: ${report.label}; confidence: ${report.confidence}; reasons: ${report.reasonCodes.join(", ")}
Requirements: ${ledger.requirements.slice(0, 3).map((item) => `${item.id} ${item.label}: ${item.quote}`).join("\n")}
Evidence:
${allowed}`)
    const parsed = responseSchema.parse(JSON.parse(raw.replace(/^```json\s*|\s*```$/gi, "").trim()))
    const sentences = parsed.sentences.map((sentence) => ({
      ...sentence,
      evidenceIds: sentence.evidenceIds.filter((id) => ledger.evidence.some((item) => item.id === id)),
      requirementIds: sentence.requirementIds.filter((id) => ledger.requirements.some((item) => item.id === id)),
    }))
    if (sentences.some((sentence) => sentence.type === "proof" && sentence.evidenceIds.length === 0)) return base
    return { paragraph: sentences.map((sentence) => sentence.text).join(" "), sentences, aiEnhanced: true }
  } catch {
    return base
  }
}
