"use client"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CopyButton } from "./copy-button"

interface NoteViewProps {
  text: string
  wordCount: number
}

export function NoteView({ text, wordCount }: NoteViewProps) {
  if (!text) {
    return (
      <p className="text-sm text-muted-foreground">
        No note was generated because none of your confirmed facts could be tied to this job.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="application-note">Short note ({wordCount} words)</Label>
      <Textarea id="application-note" readOnly value={text} rows={10} />
      <div>
        <CopyButton text={text} label="Copy note" />
      </div>
    </div>
  )
}
