"use client"

import { useState, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { friendlyMessage, importResumeText, parseResumePdf } from "@/lib/ingest/client"
import type { ImportBundle } from "@/lib/ingest/merge"
import { MAX_RESUME_CHARS } from "@/lib/ingest/resume"

interface ResumeImportCardProps {
  disabled: boolean
  onImport: (bundle: ImportBundle) => Promise<void>
}

export function ResumeImportCard({ disabled, onImport }: ResumeImportCardProps) {
  const [text, setText] = useState("")
  const [phase, setPhase] = useState<"idle" | "reading" | "extracting">("idle")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const busy = phase !== "idle"
  const tooLong = text.length > MAX_RESUME_CHARS

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setPhase("reading")
    setError(null)
    setDone(null)
    try {
      setText(await parseResumePdf(file))
    } catch (err) {
      setError(friendlyMessage(err))
    } finally {
      setPhase("idle")
    }
  }

  async function extract() {
    setPhase("extracting")
    setError(null)
    setDone(null)
    try {
      const result = await importResumeText(text)
      await onImport({
        projects: result.projects,
        experience: result.experience,
        skills: result.skills,
        education: result.education,
      })
      const found = result.projects.length + result.experience.length + result.skills.length + result.education.length
      const skipped =
        result.dropped > 0
          ? ` ${result.dropped} ${result.dropped === 1 ? "item was" : "items were"} skipped because ${result.dropped === 1 ? "it" : "they"} could not be matched to your resume text.`
          : ""
      setDone(`Added ${found} ${found === 1 ? "item" : "items"} from your resume.${skipped}`)
    } catch (err) {
      setError(friendlyMessage(err))
    } finally {
      setPhase("idle")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import from a resume</CardTitle>
        <CardDescription>
          Upload a text-based PDF or paste the text. Only details quoted from your resume are kept.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="resume-file">Resume PDF</Label>
          <Input id="resume-file" type="file" accept="application/pdf" onChange={onFile} disabled={disabled || busy} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="resume-text">Resume text</Label>
          <Textarea
            id="resume-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            placeholder="Paste your resume here"
            disabled={disabled || busy}
            aria-describedby="resume-count"
          />
          <p id="resume-count" className={tooLong ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
            {text.length.toLocaleString("en-US")} / {MAX_RESUME_CHARS.toLocaleString("en-US")} characters
          </p>
        </div>
        <Button type="button" onClick={extract} disabled={disabled || busy || text.trim() === "" || tooLong}>
          {phase !== "idle" ? <Spinner /> : null}
          {phase === "reading" ? "Reading PDF" : "Extract from resume"}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {done ? (
          <p role="status" className="text-sm text-muted-foreground">
            {done}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
