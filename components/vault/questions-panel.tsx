"use client"

import { useState } from "react"
import { QuestionCard } from "@/components/vault/question-card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { friendlyMessage } from "@/lib/ingest/client"
import { requestDrafts } from "@/lib/questions/client"
import { confirmAnswer, countConfirmedQuestions, getAnswerFact } from "@/lib/questions/confirm"
import { PROJECT_QUESTIONS, type AnswerDraft, type QuestionId } from "@/lib/questions/questions"
import type { Project, Vault } from "@/lib/schemas/vault"

export interface QuestionsPanelProps {
  project: Project
  onChangeVault: (update: (vault: Vault) => Vault) => Promise<void>
  disabled?: boolean
  initialDrafts?: AnswerDraft[]
}

export function QuestionsPanel({ project, onChangeVault, disabled = false, initialDrafts }: QuestionsPanelProps) {
  const [drafts, setDrafts] = useState<AnswerDraft[] | null>(initialDrafts ?? null)
  const [draftRound, setDraftRound] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  const headingId = `questions-${project.id}`
  const confirmedCount = countConfirmedQuestions(project)

  async function generateDrafts() {
    setGenerating(true)
    setDraftError(null)
    try {
      setDrafts(await requestDrafts(project))
      setDraftRound((round) => round + 1)
    } catch (err: unknown) {
      setDraftError(friendlyMessage(err))
    } finally {
      setGenerating(false)
    }
  }

  function confirm(questionId: QuestionId) {
    return (input: { text: string; edited: boolean; evidence?: string }) =>
      onChangeVault((vault) => confirmAnswer(vault, project.id, questionId, input))
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 px-6 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 id={headingId} className="text-sm font-semibold text-foreground">
            Questions
          </h3>
          <p role="status" className="text-sm text-muted-foreground" data-testid="question-progress">
            {confirmedCount} of {PROJECT_QUESTIONS.length} confirmed
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={generateDrafts} disabled={disabled || generating}>
          {generating ? (
            <>
              <Spinner /> Generating drafts
            </>
          ) : (
            "Generate drafts"
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Drafts are suggestions. An answer only counts once you press Confirm.
      </p>

      {draftError ? (
        <p role="alert" className="text-sm text-destructive">
          We could not draft answers right now. {draftError} You can still type your own answers below.
        </p>
      ) : null}

      <ol className="flex flex-col gap-3" aria-label={`Questions about ${project.name}`}>
        {PROJECT_QUESTIONS.map((question) => (
          <QuestionCard
            key={`${question.id}-${draftRound}-${getAnswerFact(project, question.id)?.id ?? "none"}`}
            question={question}
            draft={drafts?.find((draft) => draft.questionId === question.id)}
            confirmedFact={getAnswerFact(project, question.id)}
            disabled={disabled}
            onConfirm={confirm(question.id)}
          />
        ))}
      </ol>
    </section>
  )
}
