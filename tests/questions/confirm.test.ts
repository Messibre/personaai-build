import { describe, expect, it } from "vitest"
import {
  answerFactId,
  confirmAnswer,
  countConfirmedQuestions,
  getAnswerFact,
  getQuestionStatus,
  skipAnswer,
} from "@/lib/questions/confirm"
import { vaultSchema } from "@/lib/schemas/vault"
import { getConfirmedProjectFacts, VaultOpError } from "@/lib/vault/ops"
import { makeProject, makeVault } from "./helpers"

const PROJECT_ID = "proj_canvas-flow"
const EVIDENCE = "SVG could not keep up with 10,000 nodes"
const DRAFT_TEXT = "I found SVG could not keep up with 10,000 nodes."

function project(vault: ReturnType<typeof makeVault>) {
  return vault.projects.find((candidate) => candidate.id === PROJECT_ID)!
}

describe("confirmAnswer", () => {
  it("stores an unedited draft as a confirmed ai-draft fact with its evidence", () => {
    const vault = confirmAnswer(makeVault(), PROJECT_ID, "hard", { text: DRAFT_TEXT, edited: false, evidence: EVIDENCE })
    const fact = getAnswerFact(project(vault), "hard")

    expect(fact).toMatchObject({ kind: "hard", source: "ai-draft", confirmed: true, text: DRAFT_TEXT, evidence: EVIDENCE })
    expect(vaultSchema.safeParse(vault).success).toBe(true)
  })

  it("stores an edited answer as source user, without carrying the draft's evidence", () => {
    const vault = confirmAnswer(makeVault(), PROJECT_ID, "decided", {
      text: "I chose WebGL because 2D canvas was too slow.",
      edited: true,
      evidence: EVIDENCE,
    })
    const fact = getAnswerFact(project(vault), "decided")

    expect(fact).toMatchObject({ kind: "decided", source: "user", confirmed: true })
    expect(fact?.evidence).toBeUndefined()
  })

  it("stores a typed-from-scratch answer as source user and maps happened to outcome", () => {
    const vault = confirmAnswer(makeVault(), PROJECT_ID, "happened", { text: "Teams adopted it.", edited: true })
    expect(getAnswerFact(project(vault), "happened")).toMatchObject({ kind: "outcome", source: "user", confirmed: true })
  })

  it("replaces on a second confirm and never duplicates", () => {
    let vault = confirmAnswer(makeVault(), PROJECT_ID, "hard", { text: DRAFT_TEXT, edited: false, evidence: EVIDENCE })
    const afterFirst = project(vault).facts.length
    vault = confirmAnswer(vault, PROJECT_ID, "hard", { text: "Hit testing was the real problem.", edited: true })
    vault = confirmAnswer(vault, PROJECT_ID, "hard", { text: "Hit testing was the real problem.", edited: true })

    const matching = project(vault).facts.filter((fact) => fact.id === answerFactId(PROJECT_ID, "hard"))
    expect(matching).toHaveLength(1)
    expect(matching[0]).toMatchObject({ text: "Hit testing was the real problem.", source: "user" })
    expect(project(vault).facts).toHaveLength(afterFirst)
  })

  it("keeps one fact per question, separate from each other and from imported facts", () => {
    let vault = makeVault()
    const importedCount = project(vault).facts.length
    for (const questionId of ["hard", "decided", "happened"]) {
      vault = confirmAnswer(vault, PROJECT_ID, questionId, { text: `Answer for ${questionId}.`, edited: true })
    }
    expect(project(vault).facts).toHaveLength(importedCount + 3)
    expect(project(vault).facts.find((fact) => fact.id === "fact_built")).toBeDefined()
  })

  it("bumps updatedAt and does not mutate the input vault", () => {
    const before = makeVault()
    const snapshot = structuredClone(before)
    const after = confirmAnswer(before, PROJECT_ID, "hard", { text: "Hard.", edited: true })
    expect(before).toEqual(snapshot)
    expect(after.updatedAt > before.updatedAt).toBe(true)
  })

  it("refuses an unedited draft whose evidence is missing or not in the sources", () => {
    const vault = makeVault()
    expect(() => confirmAnswer(vault, PROJECT_ID, "hard", { text: DRAFT_TEXT, edited: false })).toThrow(VaultOpError)
    expect(() =>
      confirmAnswer(vault, PROJECT_ID, "hard", { text: DRAFT_TEXT, edited: false, evidence: "made up quote from nowhere" }),
    ).toThrow(VaultOpError)
  })

  it.each([
    ["blank text", { text: "   ", edited: true }],
    ["text over 500 characters", { text: "x".repeat(501), edited: true }],
  ])("rejects %s", (_label, input) => {
    expect(() => confirmAnswer(makeVault(), PROJECT_ID, "hard", input)).toThrow(VaultOpError)
  })

  it("rejects an unknown question or project", () => {
    expect(() => confirmAnswer(makeVault(), PROJECT_ID, "nope", { text: "x", edited: true })).toThrow(VaultOpError)
    expect(() => confirmAnswer(makeVault(), "missing", "hard", { text: "x", edited: true })).toThrow(VaultOpError)
  })

  it("keeps fact ids within the schema limit for very long project ids", () => {
    const longId = `proj_${"a".repeat(120)}`
    const vault = confirmAnswer(makeVault(makeProject({ id: longId })), longId, "hard", { text: "Hard.", edited: true })
    expect(vaultSchema.safeParse(vault).success).toBe(true)
    expect(getAnswerFact(vault.projects[0], "hard")).toBeDefined()
  })
})

describe("skipAnswer", () => {
  it("creates no fact and leaves the vault untouched", () => {
    const vault = makeVault()
    const skipped = skipAnswer(vault, PROJECT_ID, "hard")

    expect(skipped).toBe(vault)
    expect(getAnswerFact(project(skipped), "hard")).toBeUndefined()
    expect(countConfirmedQuestions(project(skipped))).toBe(0)
  })
})

describe("getQuestionStatus and confirmed facts", () => {
  it("derives the count from facts, one question at a time", () => {
    let vault = makeVault()
    expect(getQuestionStatus(project(vault)).map((entry) => entry.status)).toEqual([
      "unanswered",
      "unanswered",
      "unanswered",
    ])

    vault = confirmAnswer(vault, PROJECT_ID, "decided", { text: "Chose WebGL.", edited: true })
    expect(getQuestionStatus(project(vault))).toEqual([
      { questionId: "hard", status: "unanswered" },
      { questionId: "decided", status: "confirmed" },
      { questionId: "happened", status: "unanswered" },
    ])
    expect(countConfirmedQuestions(project(vault))).toBe(1)
  })

  it("does not count an unconfirmed fact, even one stored under the answer id", () => {
    const base = makeProject()
    const withUnconfirmed = makeProject({
      facts: [
        ...base.facts,
        {
          id: answerFactId(PROJECT_ID, "hard"),
          text: "Draft that was never confirmed.",
          kind: "hard",
          source: "ai-draft",
          confirmed: false,
        },
      ],
    })
    expect(countConfirmedQuestions(withUnconfirmed)).toBe(0)
    expect(getConfirmedProjectFacts(withUnconfirmed).some((fact) => fact.text.includes("never confirmed"))).toBe(false)
  })

  it("never lets a drafted answer into getConfirmedProjectFacts until it is confirmed", () => {
    const vault = makeVault()
    const draftText = "I found SVG could not keep up with 10,000 nodes."
    expect(getConfirmedProjectFacts(project(vault)).some((fact) => fact.text === draftText)).toBe(false)

    const confirmed = confirmAnswer(vault, PROJECT_ID, "hard", { text: draftText, edited: false, evidence: EVIDENCE })
    expect(getConfirmedProjectFacts(project(confirmed)).some((fact) => fact.text === draftText)).toBe(true)
  })
})
