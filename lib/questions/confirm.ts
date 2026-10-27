import { factSchema, type Fact, type Project, type Vault } from "@/lib/schemas/vault"
import { isVerbatimEvidence, normalizeWhitespace } from "@/lib/questions/evidence"
import { MAX_ANSWER_CHARS, PROJECT_QUESTIONS, getQuestion, type QuestionId } from "@/lib/questions/questions"
import { VaultOpError, upsertProject } from "@/lib/vault/ops"

const MAX_FACT_ID_CHARS = 128

export interface ConfirmInput {
  text: string
  edited: boolean
  evidence?: string
}

export type QuestionStatus = "confirmed" | "unanswered"

function shortHash(value: string): string {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0
  return hash.toString(16)
}

/** One stable fact id per (project, question) is what makes a second confirm replace the first. */
export function answerFactId(projectId: string, questionId: QuestionId): string {
  const id = `answer-${questionId}-${projectId}`
  return id.length <= MAX_FACT_ID_CHARS ? id : `answer-${questionId}-${shortHash(projectId)}`
}

export function getAnswerFact(project: Project, questionId: QuestionId): Fact | undefined {
  const id = answerFactId(project.id, questionId)
  return project.facts.find((fact) => fact.id === id)
}

function findProject(vault: Vault, projectId: string): Project {
  const project = vault.projects.find((candidate) => candidate.id === projectId)
  if (!project) throw new VaultOpError("Project not found.")
  return project
}

export function confirmAnswer(vault: Vault, projectId: string, questionId: string, input: ConfirmInput): Vault {
  const question = getQuestion(questionId)
  if (!question) throw new VaultOpError("Unknown question.")
  const project = findProject(vault, projectId)

  const text = normalizeWhitespace(input.text)
  if (text === "") throw new VaultOpError("Write an answer before confirming.")
  if (text.length > MAX_ANSWER_CHARS) throw new VaultOpError(`Keep the answer under ${MAX_ANSWER_CHARS} characters.`)

  // Unedited means the model wrote it, so it must still carry a quote that really is in the sources.
  const evidence = input.evidence ? normalizeWhitespace(input.evidence) : undefined
  const verifiedEvidence = evidence && isVerbatimEvidence(project, evidence) ? evidence : undefined
  if (!input.edited && !verifiedEvidence) {
    throw new VaultOpError("A drafted answer needs evidence from your repo before it can be confirmed.")
  }

  const fact: Fact = {
    id: answerFactId(project.id, question.id),
    text,
    kind: question.kind,
    source: input.edited ? "user" : "ai-draft",
    confirmed: true,
    ...(input.edited || !verifiedEvidence ? {} : { evidence: verifiedEvidence }),
  }
  const parsed = factSchema.safeParse(fact)
  if (!parsed.success) throw new VaultOpError("Answer failed validation.")

  const others = project.facts.filter((existing) => existing.id !== fact.id)
  return upsertProject(vault, { ...project, facts: [...others, parsed.data] })
}

/** Skipping creates no fact; the vault comes back untouched. */
export function skipAnswer(vault: Vault, projectId: string, questionId: string): Vault {
  if (!getQuestion(questionId)) throw new VaultOpError("Unknown question.")
  findProject(vault, projectId)
  return vault
}

export function getQuestionStatus(project: Project): Array<{ questionId: QuestionId; status: QuestionStatus }> {
  return PROJECT_QUESTIONS.map((question) => ({
    questionId: question.id,
    status: getAnswerFact(project, question.id)?.confirmed === true ? "confirmed" : "unanswered",
  }))
}

export function countConfirmedQuestions(project: Project): number {
  return getQuestionStatus(project).filter((entry) => entry.status === "confirmed").length
}
