"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, CircleAlert, Loader2, MinusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

type Result = {
  analysis: { roleTitle: string; roleType: string }
  selectedProjects: Array<{ project: { name: string; url?: string }; score: number; covers: string[]; evidence: string[]; reason: string }>
  requirementChecks: Array<{ requirement: { label: string; tier: string }; status: "covered" | "partial" | "missing"; evidence: string[]; explanation: string }>
  summary: { mustHave: { covered: number; partial: number; missing: number } }
}

const statusIcon = { covered: CheckCircle2, partial: CircleAlert, missing: MinusCircle }

export default function JobMatchPage() {
  const [jobText, setJobText] = useState("")
  const [jobUrl, setJobUrl] = useState("")
  const [githubUsername, setGithubUsername] = useState("")
  const [resumeText, setResumeText] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function analyze(forceRefresh = false) {
    setError("")
    setResult(null)
    setLoading(true)
    try {
      if (!githubUsername.trim()) {
        setError("Connect your GitHub first by entering your GitHub username.")
        return
      }
      let response: Response
      try {
        response = await fetch("/api/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobText: jobText || undefined, jobUrl: jobUrl || undefined, githubUsername, resumeText: resumeText || undefined, refresh: forceRefresh }),
        })
      } catch (err) {
        if (err instanceof TypeError) throw new Error("Couldn't reach the server, try again.")
        throw err
      }
      const contentType = response.headers.get("content-type") || ""
      if (!contentType.includes("application/json")) {
        console.error("Unexpected Job Match response", response.status)
        throw new Error("Unexpected server response.")
      }
      const data = await response.json() as { ok: boolean; error?: { message?: string }; analysis?: Result["analysis"]; selectedProjects?: Result["selectedProjects"]; requirementChecks?: Result["requirementChecks"]; summary?: Result["summary"] }
      if (!response.ok || !data.ok) {
        console.error("Job Match API error", response.status, data.error)
        throw new Error(data.error?.message || "Job matching failed.")
      }
      if (!data.analysis || !data.selectedProjects || !data.requirementChecks || !data.summary) throw new Error("Unexpected server response.")
      setResult({ analysis: data.analysis, selectedProjects: data.selectedProjects, requirementChecks: data.requirementChecks, summary: data.summary })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Job matching failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to PersonaAI</Link>
        <div className="mb-8 flex items-start gap-4">
          <div className="rounded-2xl bg-[var(--persona-accent)]/15 p-3 text-[var(--persona-accent)]"><BriefcaseBusiness className="size-7" /></div>
          <div><h1 className="text-3xl font-semibold tracking-tight">Job Match</h1><p className="mt-2 text-muted-foreground">Compare a job with evidence from your GitHub projects and resume.</p></div>
        </div>
        <Card>
          <CardHeader><CardTitle>Job posting</CardTitle><CardDescription>Paste the posting for the most reliable result, or provide a public URL.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={jobText} onChange={(event) => setJobText(event.target.value)} placeholder="Paste the job description here..." className="min-h-40" maxLength={15000} />
            <Input value={jobUrl} onChange={(event) => setJobUrl(event.target.value)} placeholder="https://example.com/jobs/..." type="url" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Input value={githubUsername} onChange={(event) => setGithubUsername(event.target.value)} placeholder="GitHub username (required)" />
                <p className="text-xs text-muted-foreground">Your public GitHub projects are used as evidence. <Link href="/" className="underline">Connect GitHub first</Link></p>
              </div>
              <Textarea value={resumeText} onChange={(event) => setResumeText(event.target.value)} placeholder="Resume text (optional)" className="min-h-24" maxLength={30000} />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => analyze()} disabled={loading || (!jobText.trim() && !jobUrl.trim()) || !githubUsername.trim()}>{loading && <Loader2 className="mr-2 size-4 animate-spin" />} Analyze job</Button>
              <Button type="button" variant="outline" onClick={() => analyze(true)} disabled={loading || !githubUsername.trim()}>Refresh GitHub data</Button>
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </CardContent>
        </Card>

        {result && <div className="mt-8 space-y-6">
          <Card><CardHeader><CardTitle>{result.analysis.roleTitle}</CardTitle><CardDescription>{result.analysis.roleType} · {result.summary.mustHave.covered} must-haves covered, {result.summary.mustHave.partial} partial, {result.summary.mustHave.missing} missing</CardDescription></CardHeader></Card>
          <section><h2 className="mb-3 text-xl font-semibold">Best-fit projects</h2><div className="grid gap-4 md:grid-cols-2">{result.selectedProjects.length ? result.selectedProjects.map((item) => <Card key={item.project.name}><CardHeader><CardTitle>{item.project.url ? <a href={item.project.url} target="_blank" rel="noreferrer" className="hover:underline">{item.project.name}</a> : item.project.name}</CardTitle><CardDescription>Match score: {item.score}</CardDescription></CardHeader><CardContent><p className="text-sm">{item.reason}</p><p className="mt-3 text-xs text-muted-foreground">{item.evidence.join(" · ")}</p></CardContent></Card>) : <Card><CardContent className="pt-6 text-sm text-muted-foreground">No projects matched directly. Add a GitHub username or resume text to compare your evidence.</CardContent></Card>}</div></section>
          <section><h2 className="mb-3 text-xl font-semibold">Requirement checklist</h2><div className="space-y-3">{result.requirementChecks.map((check) => { const Icon = statusIcon[check.status]; return <Card key={`${check.requirement.tier}-${check.requirement.label}`}><CardContent className="flex gap-3 pt-6"><Icon className={`mt-0.5 size-5 shrink-0 ${check.status === "covered" ? "text-emerald-500" : check.status === "partial" ? "text-amber-500" : "text-muted-foreground"}`} /><div><p className="font-medium">{check.requirement.label} <span className="text-xs text-muted-foreground">({check.requirement.tier})</span></p><p className="mt-1 text-sm text-muted-foreground">{check.explanation}</p>{check.evidence.length > 0 && <p className="mt-2 text-xs">{check.evidence.join(" · ")}</p>}</div></CardContent></Card> })}</div></section>
        </div>}
      </div>
    </main>
  )
}
