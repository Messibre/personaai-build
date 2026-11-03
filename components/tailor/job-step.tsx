"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { POSTING_LIMITS } from "@/lib/tailor/limits"

interface JobStepProps {
  postingText: string
  company: string
  busy: boolean
  onPostingChange: (value: string) => void
  onCompanyChange: (value: string) => void
  onSubmit: () => void
}

export function JobStep({ postingText, company, busy, onPostingChange, onCompanyChange, onSubmit }: JobStepProps) {
  const length = postingText.trim().length
  const tooShort = length < POSTING_LIMITS.min
  const tooLong = length > POSTING_LIMITS.max

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!busy && !tooShort && !tooLong) onSubmit()
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="posting">Job posting</Label>
        <Textarea
          id="posting"
          rows={14}
          value={postingText}
          disabled={busy}
          onChange={(event) => onPostingChange(event.target.value)}
          placeholder="Paste the full job description here."
          aria-describedby="posting-help"
        />
        <p id="posting-help" className="text-sm text-muted-foreground">
          {length.toLocaleString("en-US")} characters. Between {POSTING_LIMITS.min} and{" "}
          {POSTING_LIMITS.max.toLocaleString("en-US")} are accepted.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="company">Company (optional)</Label>
        <Input id="company" value={company} disabled={busy} maxLength={200} onChange={(event) => onCompanyChange(event.target.value)} />
      </div>
      <div>
        <Button type="submit" disabled={busy || tooShort || tooLong}>
          {busy ? <Spinner /> : null}
          {busy ? "Analyzing the job" : "Analyze job"}
        </Button>
      </div>
    </form>
  )
}
