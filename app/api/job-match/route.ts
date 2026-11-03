import { NextResponse } from "next/server"
import { fetchGitHubRepos, enrichReposForAI } from "@/lib/github"
import { analyzeJob } from "@/lib/job-match/analyzer"
import { fetchJobPosting } from "@/lib/job-match/fetch-job"
import { jobMatchInputSchema } from "@/lib/job-match/schemas"
import { checkRequirements, selectProjects } from "@/lib/job-match/matcher"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const parsed = jobMatchInputSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 })
    const input = parsed.data
    const jobText = input.jobText || (input.jobUrl ? await fetchJobPosting(input.jobUrl) : "")
    if (!jobText.trim()) return NextResponse.json({ error: "Paste a job description or provide a job URL." }, { status: 400 })

    const repos = input.githubUsername ? await enrichReposForAI(input.githubUsername, await fetchGitHubRepos(input.githubUsername)) : []
    const analysis = await analyzeJob(jobText)
    const projectInput = { githubRepos: repos, resumeText: input.resumeText || "" }
    const selectedProjects = selectProjects(projectInput, analysis)
    const { checks, summary } = checkRequirements(projectInput, analysis)
    return NextResponse.json({ analysis, selectedProjects, requirementChecks: checks, summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job matching failed. Please try again."
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
