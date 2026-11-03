"use client"

import { useId, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { friendlyMessage, saveVault } from "@/lib/ingest/client"
import { withApplicationFeedback } from "@/lib/metrics/feedback"
import type { Vault } from "@/lib/schemas/vault"
import { hashJobText } from "@/lib/vault/applications"

const NOTE_LIMIT = 500

interface FeedbackPromptProps {
  vault: Vault
  postingText: string
  onSaved: (vault: Vault) => void
}

type Phase = "ask" | "note" | "saving" | "done" | "skipped"

/** Optional and skippable. It sits below the outputs and never blocks them. */
export function FeedbackPrompt({ vault, postingText, onSaved }: FeedbackPromptProps) {
  const noteId = useId()
  const [phase, setPhase] = useState<Phase>("ask")
  const [accurate, setAccurate] = useState<boolean | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function submit(isAccurate: boolean, text: string) {
    setPhase("saving")
    setError(null)
    try {
      const jobTextHash = await hashJobText(postingText)
      const updated = withApplicationFeedback(vault, jobTextHash, { accurate: isAccurate, ...(text.trim() ? { note: text.trim() } : {}) })
      await saveVault(updated)
      onSaved(updated)
      setPhase("done")
    } catch (err) {
      setError(friendlyMessage(err))
      setPhase(isAccurate ? "ask" : "note")
    }
  }

  if (phase === "done") {
    return (
      <Alert role="status">
        <AlertDescription>Thanks, that helps.</AlertDescription>
      </Alert>
    )
  }
  if (phase === "skipped") return null

  return (
    <section aria-labelledby={`${noteId}-q`} className="flex flex-col gap-3 rounded-md border border-border p-4">
      <h3 id={`${noteId}-q`} className="text-base font-medium text-foreground">
        Does this sound true to what you did?
      </h3>

      {phase === "note" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={noteId} className="text-sm text-muted-foreground">
            What was off? (optional)
          </label>
          <Textarea id={noteId} value={note} maxLength={NOTE_LIMIT} onChange={(event) => setNote(event.target.value)} rows={3} />
          <p className="text-xs text-muted-foreground">
            {note.length}/{NOTE_LIMIT}
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => void submit(accurate ?? false, note)}>
              Send
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPhase("ask")}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={phase === "saving"} onClick={() => void submit(true, "")}>
            Yes
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={phase === "saving"}
            onClick={() => {
              setAccurate(false)
              setPhase("note")
            }}
          >
            Partly or no
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={phase === "saving"} onClick={() => setPhase("skipped")}>
            Skip
          </Button>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
