import type { FactKind } from "@/lib/schemas/vault"

export type QuestionId = "hard" | "decided" | "happened"

export interface ProjectQuestion {
  id: QuestionId
  text: string
  kind: FactKind
}

export const PROJECT_QUESTIONS: readonly ProjectQuestion[] = [
  { id: "hard", text: "What was the hardest part of this project?", kind: "hard" },
  { id: "decided", text: "What did you decide, and why?", kind: "decided" },
  { id: "happened", text: "What happened as a result?", kind: "outcome" },
]

export function getQuestion(id: string): ProjectQuestion | undefined {
  return PROJECT_QUESTIONS.find((question) => question.id === id)
}

export type DraftStatus = "drafted" | "needs_user"

export interface AnswerDraft {
  questionId: QuestionId
  status: DraftStatus
  text?: string
  evidence?: string
  followUp?: string
}

export const MAX_ANSWER_CHARS = 500
