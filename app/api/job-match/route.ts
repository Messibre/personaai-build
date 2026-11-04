import { NextResponse } from "next/server"
import { analyzeJob } from "@/lib/job-match/analyzer"
import { fetchJobPosting } from "@/lib/job-match/fetch-job"
import { fetchProfileEvidence, resumeEvidence } from "@/lib/job-match/github-evidence"
import { jobMatchInputSchema } from "@/lib/job-match/schemas"
import { checkRequirements, selectProjects } from "@/lib/job-match/matcher"
import { calculateCompatibility } from "@/lib/job-match/report/compatibility"
import { createLedger } from "@/lib/job-match/report/ledger"
import { saveLedger } from "@/lib/job-match/report/store"
import { explainCompatibility } from "@/lib/job-match/ai/explanation"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const parsed = jobMatchInputSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message || "Invalid input" } }, { status: 400 })
    const input = parsed.data
    const jobText = input.jobText || (input.jobUrl ? await fetchJobPosting(input.jobUrl) : "")
    if (!jobText.trim()) return NextResponse.json({ ok: false, error: { code: "JOB_REQUIRED", message: "Paste a job description or provide a job URL." } }, { status: 400 })
    const profile = await fetchProfileEvidence(input.githubUsername, input.refresh)
    const analysis = await analyzeJob(jobText)
    const resumeItems = resumeEvidence(input.resumeText || "")
    const selectedProjects = selectProjects(profile, resumeItems, analysis)
    const { checks, summary } = checkRequirements(profile, resumeItems, analysis)
    const analysisId = crypto.randomUUID()
    const ledger = createLedger(analysisId, jobText, analysis, checks, selectedProjects, [...profile.items, ...resumeItems])
    saveLedger(ledger)
    const compatibility = calculateCompatibility(analysis, checks, selectedProjects, ledger.evidence.length)
    const explanation = await explainCompatibility(ledger, compatibility)
    const publicProjects = selectedProjects.map(({ score: _score, ...project }) => project)
    return NextResponse.json({
      ok: true,
      analysis,
      compatibility,
      explanation,
      selectedProjects: publicProjects,
      requirementChecks: checks,
      summary,
      analysisId,
      profile: { login: profile.login, projectCount: profile.projects.length, fetchedAt: profile.fetchedAt },
      meta: { aiEnhanced: explanation.aiEnhanced, tasksRun: ["deterministic-analysis", "compatibility", "evidence-ledger", explanation.aiEnhanced ? "ai-explanation" : "template-explanation"], cached: false, fallbackUsed: explanation.fallbackUsed || false, fallbackReason: explanation.fallbackReason ?? null },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job matching failed. Please try again."
    const code = message.includes("GitHub") ? "GITHUB_ERROR" : message.includes("paste") || message.includes("blocks") ? "FETCH_BLOCKED" : "JOB_MATCH_FAILED"
    console.error("[job-match]", code, message)
    return NextResponse.json({ ok: false, error: { code, message } }, { status: 422 })
  }
}
