import type { Fact } from "@/lib/schemas/vault"
import { MAX_ANSWER_CHARS, type AnswerDraft } from "@/lib/questions/questions"

export interface CardStateInput {
  draft?: AnswerDraft
  confirmedFact?: Fact
  text: string
}

export interface CardState {
  /** The model's draft text; undefined for typed-from-scratch and already-confirmed answers. */
  baseline?: string
  edited: boolean
  confirmLabel: "Confirm" | "Confirm my edit"
  canConfirm: boolean
  evidence?: string
  followUp?: string
  statusLabel: "Confirmed" | "Draft, not confirmed yet" | "Not confirmed yet"
}

export function deriveCardState({ draft, confirmedFact, text }: CardStateInput): CardState {
  const trimmed = text.trim()
  const withinLimit = trimmed.length > 0 && trimmed.length <= MAX_ANSWER_CHARS

  if (confirmedFact) {
    const changed = trimmed !== confirmedFact.text
    return {
      edited: changed,
      confirmLabel: "Confirm my edit",
      canConfirm: changed && withinLimit,
      evidence: confirmedFact.evidence,
      statusLabel: "Confirmed",
    }
  }

  if (draft?.status === "drafted" && draft.text) {
    const edited = trimmed !== draft.text.trim()
    return {
      baseline: draft.text,
      edited,
      confirmLabel: edited ? "Confirm my edit" : "Confirm",
      canConfirm: withinLimit,
      evidence: draft.evidence,
      statusLabel: "Draft, not confirmed yet",
    }
  }

  return {
    edited: true,
    confirmLabel: "Confirm",
    canConfirm: withinLimit,
    followUp: draft?.status === "needs_user" ? draft.followUp : undefined,
    statusLabel: "Not confirmed yet",
  }
}

/** What to send to confirmAnswer: unedited drafts keep their evidence, anything the user wrote does not. */
export function buildConfirmInput(state: CardState, text: string): { text: string; edited: boolean; evidence?: string } {
  return {
    text: text.trim(),
    edited: state.edited,
    ...(state.edited || !state.evidence ? {} : { evidence: state.evidence }),
  }
}
