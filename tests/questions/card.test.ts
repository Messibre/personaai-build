import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { QuestionCard } from "@/components/vault/question-card"
import { QuestionsPanel } from "@/components/vault/questions-panel"
import { buildConfirmInput, deriveCardState } from "@/lib/questions/card-logic"
import { confirmAnswer } from "@/lib/questions/confirm"
import { PROJECT_QUESTIONS, type AnswerDraft } from "@/lib/questions/questions"
import { makeVault } from "./helpers"

const EVIDENCE = "SVG could not keep up with 10,000 nodes"
const DRAFT_TEXT = "I found SVG could not keep up with 10,000 nodes."

const drafted: AnswerDraft = { questionId: "hard", status: "drafted", text: DRAFT_TEXT, evidence: EVIDENCE }
const needsUser: AnswerDraft = {
  questionId: "decided",
  status: "needs_user",
  followUp: "Why did you pick WebGL over canvas 2D?",
}
const noop = async () => undefined

describe("deriveCardState", () => {
  it("shows an unedited draft with its evidence and a plain Confirm button", () => {
    const state = deriveCardState({ draft: drafted, text: DRAFT_TEXT })
    expect(state).toMatchObject({
      edited: false,
      confirmLabel: "Confirm",
      canConfirm: true,
      evidence: EVIDENCE,
      statusLabel: "Draft, not confirmed yet",
    })
    expect(buildConfirmInput(state, DRAFT_TEXT)).toEqual({ text: DRAFT_TEXT, edited: false, evidence: EVIDENCE })
  })

  it("switches to Confirm my edit and drops the evidence once the text is edited", () => {
    const text = `${DRAFT_TEXT} It was painful.`
    const state = deriveCardState({ draft: drafted, text })
    expect(state.confirmLabel).toBe("Confirm my edit")
    expect(state.edited).toBe(true)
    expect(buildConfirmInput(state, text)).toEqual({ text, edited: true })
  })

  it("disables Confirm for empty or over-long text", () => {
    expect(deriveCardState({ draft: drafted, text: "   " }).canConfirm).toBe(false)
    expect(deriveCardState({ draft: drafted, text: "x".repeat(501) }).canConfirm).toBe(false)
  })

  it("treats a needs_user draft as typed-from-scratch with a follow-up and no evidence", () => {
    const state = deriveCardState({ draft: needsUser, text: "Because 2D canvas was too slow." })
    expect(state).toMatchObject({ edited: true, followUp: needsUser.followUp, statusLabel: "Not confirmed yet" })
    expect(state.evidence).toBeUndefined()
    expect(buildConfirmInput(state, "Because 2D canvas was too slow.").evidence).toBeUndefined()
  })

  it("keeps a confirmed answer's source on re-confirm by requiring a change", () => {
    const vault = confirmAnswer(makeVault(), "proj_canvas-flow", "hard", { text: "Typed by me.", edited: true })
    const fact = vault.projects[0].facts.find((candidate) => candidate.source === "user")!
    expect(deriveCardState({ confirmedFact: fact, text: "Typed by me." }).canConfirm).toBe(false)
    expect(deriveCardState({ confirmedFact: fact, text: "Typed by me, edited." }).canConfirm).toBe(true)
  })
})

describe("QuestionCard rendering", () => {
  it("renders the draft, its evidence quote and an enabled Confirm button", () => {
    const html = renderToStaticMarkup(
      createElement(QuestionCard, { question: PROJECT_QUESTIONS[0], draft: drafted, onConfirm: noop }),
    )
    expect(html).toContain(PROJECT_QUESTIONS[0].text)
    expect(html).toContain("From your repo")
    expect(html).toContain(EVIDENCE)
    expect(html).toContain(DRAFT_TEXT)
    expect(html).toContain("Draft, not confirmed yet")
    expect(html).toMatch(/<button[^>]*>Confirm<\/button>/)
    expect(html).toContain("Skip")
  })

  it("renders a needs_user card with the follow-up, an empty box and no evidence", () => {
    const html = renderToStaticMarkup(
      createElement(QuestionCard, { question: PROJECT_QUESTIONS[1], draft: needsUser, onConfirm: noop }),
    )
    expect(html).toContain("Why did you pick WebGL over canvas 2D?")
    expect(html).not.toContain("From your repo")
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Confirm<\/button>/)
  })

  it("escapes markup that arrives in evidence text", () => {
    const hostile: AnswerDraft = { ...drafted, evidence: '<img src=x onerror="alert(1)"> SVG quote here' }
    const html = renderToStaticMarkup(
      createElement(QuestionCard, { question: PROJECT_QUESTIONS[0], draft: hostile, onConfirm: noop }),
    )
    expect(html).not.toContain("<img")
    expect(html).toContain("&lt;img")
  })
})

describe("QuestionsPanel rendering", () => {
  const panel = (vault: ReturnType<typeof makeVault>, initialDrafts?: AnswerDraft[]) =>
    renderToStaticMarkup(
      createElement(QuestionsPanel, { project: vault.projects[0], onChangeVault: noop, initialDrafts }),
    )

  it("shows the evidence while the confirmed count stays at 0 until a confirm is applied", () => {
    const vault = makeVault()
    const before = panel(vault, [drafted])
    expect(before).toContain(EVIDENCE)
    expect(before).toContain("0 of 3 confirmed")

    const confirmed = confirmAnswer(vault, "proj_canvas-flow", "hard", {
      text: DRAFT_TEXT,
      edited: false,
      evidence: EVIDENCE,
    })
    const after = panel(confirmed, [drafted])
    expect(after).toContain("1 of 3 confirmed")
    expect(after).toContain("Confirmed")
  })

  it("does not count drafts as confirmed even when all three are drafted", () => {
    const all: AnswerDraft[] = PROJECT_QUESTIONS.map((question) => ({
      questionId: question.id,
      status: "drafted",
      text: DRAFT_TEXT,
      evidence: EVIDENCE,
    }))
    expect(panel(makeVault(), all)).toContain("0 of 3 confirmed")
  })
})
