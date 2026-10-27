"use client"

import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { buildConfirmInput, deriveCardState } from "@/lib/questions/card-logic"
import { MAX_ANSWER_CHARS, type AnswerDraft, type ProjectQuestion } from "@/lib/questions/questions"
import type { Fact } from "@/lib/schemas/vault"

export interface QuestionCardProps {
  question: ProjectQuestion
  draft?: AnswerDraft
  confirmedFact?: Fact
  disabled?: boolean
  onConfirm: (input: { text: string; edited: boolean; evidence?: string }) => Promise<void>
}

export function QuestionCard({ question, draft, confirmedFact, disabled = false, onConfirm }: QuestionCardProps) {
  const fieldId = useId()
  const [text, setText] = useState(confirmedFact?.text ?? (draft?.status === "drafted" ? (draft.text ?? "") : ""))
  const [skipped, setSkipped] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const state = deriveCardState({ draft, confirmedFact, text })

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      await onConfirm(buildConfirmInput(state, text))
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Could not save this answer. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (skipped && !confirmedFact) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border p-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">{question.text}</p>
          <p className="text-sm text-muted-foreground">Skipped for now. Nothing was saved.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setSkipped(false)}>
          Answer this
        </Button>
      </li>
    )
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-border p-4" data-question-id={question.id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Label htmlFor={fieldId} className="text-sm font-medium text-foreground">
          {question.text}
        </Label>
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {confirmedFact ? "\u2713 " : ""}
          {state.statusLabel}
        </span>
      </div>

      {state.followUp ? (
        <p className="text-sm text-muted-foreground">
          The sources do not say enough to draft this. {state.followUp}
        </p>
      ) : null}

      <Textarea
        id={fieldId}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        maxLength={MAX_ANSWER_CHARS}
        disabled={disabled || saving}
        placeholder={state.followUp ? "Write your answer in your own words" : undefined}
      />

      {state.evidence ? (
        <figure className="flex flex-col gap-1">
          <figcaption className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            From your repo
          </figcaption>
          <blockquote className="border-l-2 border-border pl-3 text-sm text-muted-foreground">
            {state.evidence}
          </blockquote>
        </figure>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={handleConfirm} disabled={disabled || saving || !state.canConfirm}>
          {saving ? "Saving" : state.confirmLabel}
        </Button>
        {confirmedFact ? null : (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSkipped(true)} disabled={disabled || saving}>
            Skip
          </Button>
        )}
      </div>
    </li>
  )
}
