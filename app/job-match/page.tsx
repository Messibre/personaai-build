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
  compatibility: { label: string; confidence: string; reasonCodes: string[]; coreGaps: string[] }
  explanation: { paragraph: string; sentences: Array<{ text: string; evidenceIds: string[]; requirementIds: string[] }> }
  selectedProjects: Array<{ project: { id: string; name: string; url?: string; description?: string; language?: string; topics?: string[]; stars?: number }; covers: string[]; evidence: string[]; reason: string }>
  requirementChecks: Array<{ requirement: { label: string; tier: string }; status: "covered" | "partial" | "missing"; evidence: string[]; explanation: string }>
  summary: { mustHave: { covered: number; partial: number; missing: number } }
  analysisId: string
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
  const [coverLetter, setCoverLetter] = useState("")
  const [letterLoading, setLetterLoading] = useState(false)

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
      const data = await response.json() as Partial<Result> & { ok?: boolean; error?: { code?: string; message?: string } | string }
      if (!response.ok || !data.ok) {
        console.error("Job Match API error", response.status, data.error)
        const message = typeof data.error === "string" ? data.error : data.error?.message
        throw new Error(message || `Job matching failed (HTTP ${response.status}).`)
      }
      if (!data.analysis || !data.compatibility || !data.explanation || !data.selectedProjects || !data.requirementChecks || !data.summary || !data.analysisId) throw new Error("Unexpected server response.")
      setResult(data as Result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Job matching failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function generateCoverLetter() {
    if (!result) return
    setLetterLoading(true)
    setError("")
    try {
      const response = await fetch("/api/job-match/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: result.analysisId, options: { tone: "warm", length: "standard", addressGaps: false } }),
      })
      const data = await response.json() as { ok?: boolean; text?: string; error?: { message?: string } }
      if (!response.ok || !data.ok || !data.text) throw new Error(data.error?.message || "Could not generate the cover letter.")
      setCoverLetter(data.text)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the cover letter.")
    } finally {
      setLetterLoading(false)
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
          <Card><CardHeader><div className="flex flex-wrap items-center gap-3"><CardTitle>{result.analysis.roleTitle}</CardTitle><span className="rounded-full bg-[var(--persona-accent)]/15 px-3 py-1 text-sm text-[var(--persona-accent)]">{result.compatibility.label}</span><span className="rounded-full bg-muted px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">{result.compatibility.confidence} confidence</span></div><CardDescription>{result.analysis.roleType} · {result.summary.mustHave.covered} must-haves covered, {result.summary.mustHave.partial} partial, {result.summary.mustHave.missing} missing</CardDescription></CardHeader><CardContent><p className="text-sm leading-6">{result.explanation.paragraph}</p><details className="mt-4"><summary className="cursor-pointer text-sm font-medium">Why this label?</summary><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{result.compatibility.reasonCodes.map((code) => <li key={code}>{code.replaceAll("_", " ").replace("CORE GAP:", "Core gap: ")}</li>)}</ul></details></CardContent></Card>
          <section><h2 className="mb-3 text-xl font-semibold">Best-fit projects</h2><div className="grid gap-4 md:grid-cols-2">{result.selectedProjects.length ? result.selectedProjects.map((item) => <Card key={item.project.name}><CardHeader><CardTitle>{item.project.url ? <a href={item.project.url} target="_blank" rel="noreferrer" className="hover:underline">{item.project.name}</a> : item.project.name}</CardTitle><CardDescription>Covers: {item.covers.join(", ")}</CardDescription></CardHeader><CardContent><p className="text-sm">{item.project.description || "Public GitHub repository"}</p><p className="mt-2 text-xs text-muted-foreground">{[item.project.language, item.project.stars !== undefined ? `${item.project.stars} stars` : "", ...(item.project.topics || []).slice(0, 5)].filter(Boolean).join(" · ")}</p><p className="mt-3 text-sm">{item.reason}</p><ul className="mt-3 space-y-2 text-xs text-muted-foreground">{item.evidence.map((evidence, evidenceIndex) => <li key={`${evidence}-${evidenceIndex}`} className="rounded-md bg-muted/40 px-3 py-2">{evidence}</li>)}</ul></CardContent></Card>) : <Card><CardContent className="pt-6 text-sm text-muted-foreground">No projects matched directly. Add a GitHub username or resume text to compare your evidence.</CardContent></Card>}</div></section>
          <section><h2 className="mb-3 text-xl font-semibold">Requirement checklist</h2><div className="space-y-3">{result.requirementChecks.map((check) => { const Icon = statusIcon[check.status]; return <Card key={`${check.requirement.tier}-${check.requirement.label}`}><CardContent className="flex gap-3 pt-6"><Icon className={`mt-0.5 size-5 shrink-0 ${check.status === "covered" ? "text-emerald-500" : check.status === "partial" ? "text-amber-500" : "text-muted-foreground"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{check.requirement.label}</p><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{check.requirement.tier}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{check.status}</span></div><p className="mt-1 text-sm text-muted-foreground">{check.explanation}</p>{check.evidence.length > 0 && <ul className="mt-3 space-y-2 text-xs text-muted-foreground">{check.evidence.slice(0, 4).map((evidence, evidenceIndex) => <li key={`${evidence}-${evidenceIndex}`} className="rounded-md bg-muted/40 px-3 py-2">{evidence}</li>)}</ul>}</div></CardContent></Card> })}</div></section>
          <Card><CardHeader><CardTitle>Cover letter</CardTitle><CardDescription>Generated only from the verified GitHub and resume evidence in this analysis.</CardDescription></CardHeader><CardContent className="space-y-3"><Button onClick={generateCoverLetter} disabled={letterLoading}>{letterLoading ? "Generating..." : "Generate cover letter"}</Button>{coverLetter && <><Textarea value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} className="min-h-72" /><p className="text-xs text-muted-foreground">Review before sending. Only verified evidence was used.</p></>}</CardContent></Card>
        </div>}
      </div>
    </main>
  )
}
