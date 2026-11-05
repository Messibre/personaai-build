import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mergeImport } from "@/lib/ingest/merge"
import { confirmAnswer } from "@/lib/questions/confirm"
import type { Draft } from "@/lib/schemas/draft"
import type { Project, Vault } from "@/lib/schemas/vault"
import { confirmFact, createEmptyVault } from "@/lib/vault/ops"
import { COLOR_SCHEME, JOBS, TEMPLATE, isolatedEnv, json, postRequest, scriptedLLM } from "../helpers/e2e"

const holder = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock("@/lib/llm", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/llm")>()), getLLMClient: () => holder.client }))

import { POST as importRepos } from "@/app/api/import/repos/route"
import { POST as draftQuestions } from "@/app/api/questions/draft/route"
import { POST as analyze } from "@/app/api/tailor/analyze/route"
import { POST as generate } from "@/app/api/tailor/generate/route"

const USER = "dana-ortiz"
const LEAD_REPO = "insight-board"
const BROKEN_REPO = "half-broken"
const README =
  "# insight-board\n\nAn accessible analytics dashboard with keyboard navigation and screen reader support.\n\nKeyword search missed synonyms, so ranking moved to pgvector embeddings for retrieval."
const HARD_EVIDENCE = "Keyword search missed synonyms, so ranking moved to pgvector embeddings for retrieval."

const REPOS = [LEAD_REPO, BROKEN_REPO, "repo-three", "repo-four", "repo-five", "repo-six"]

function meta(name: string) {
  return {
    name,
    description: name === LEAD_REPO ? "Accessible analytics dashboard with keyboard navigation and screen reader support" : `The ${name} project`,
    homepage: null,
    stargazers_count: 3,
    forks_count: 1,
    topics: name === LEAD_REPO ? ["accessibility", "llm"] : [],
  }
}

/** Recorded-style GitHub API: per repo, per path. The broken repo fails README and commits with 500. */
function stubGitHub() {
  const calls: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      const match = url.match(/^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/?]+)(.*)$/)
      if (!match || match[1] !== USER) return new Response("not found", { status: 404 })
      const [, , repo, rest] = match
      if (!REPOS.includes(repo)) return new Response("not found", { status: 404 })
      if (rest === "") return Response.json(meta(repo))
      if (rest === "/languages") return Response.json({ TypeScript: 9000, CSS: 1000 })
      if (repo === BROKEN_REPO) return new Response("boom", { status: 500 })
      if (rest === "/readme") return new Response(repo === LEAD_REPO ? README : `# ${repo}`)
      if (rest.startsWith("/commits")) return Response.json([{ commit: { message: "Add focus rings to every chart control" } }])
      return new Response("not found", { status: 404 })
    }),
  )
  return calls
}

function leadSentence(draft: Draft, projectId: string): string | undefined {
  return draft.projects.find((p) => p.projectId === projectId)?.sentences[0]?.text
}

describe("J2: GitHub user imports repos, answers questions and tailors twice", () => {
  beforeEach(() => {
    isolatedEnv()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("rejects a seventh repository with 400 before calling GitHub", async () => {
    const calls = stubGitHub()
    const response = await importRepos(postRequest("/api/import/repos", { username: USER, repoNames: [...REPOS, "seventh"] }))
    expect(response.status).toBe(400)
    expect(await json(response)).toEqual({ error: "Import at most 6 repositories at a time." })
    expect(calls).toHaveLength(0)
  })

  it("runs the whole GitHub journey", async () => {
    stubGitHub()
    const llm = scriptedLLM({
      questions: () =>
        JSON.stringify({
          answers: [
            { questionId: "hard", status: "drafted", text: "Keyword search missed synonyms, so ranking moved to pgvector embeddings.", evidence: HARD_EVIDENCE },
            { questionId: "decided", status: "drafted", text: "Chose Kafka to stream events to the dashboard.", evidence: "We picked Kafka for streaming." },
            { questionId: "happened", status: "needs_user", followUp: "Who used it?" },
          ],
        }),
    })
    holder.client = llm.client

    // Import six repos; one degrades instead of failing the batch.
    const imported = await importRepos(postRequest("/api/import/repos", { username: USER, repoNames: REPOS }))
    expect(imported.status).toBe(200)
    const projects = await json<Project[]>(imported)
    expect(projects.map((p) => p.name)).toEqual(REPOS)
    const broken = projects.find((p) => p.name === BROKEN_REPO)!
    expect(broken.facts.length).toBeGreaterThan(0)
    expect(broken.sourceSnapshot?.readme ?? "").toBe("")
    for (const fact of projects.flatMap((p) => p.facts)) expect(fact.confirmed).toBe(false)

    let vault: Vault = mergeImport(createEmptyVault("Dana Ortiz"), { projects, githubUsername: USER })
    const lead = vault.projects.find((p) => p.name === LEAD_REPO)!

    // Three-question drafts: verified evidence survives, hallucinated evidence is downgraded.
    const drafted = await draftQuestions(postRequest("/api/questions/draft", { project: lead }))
    expect(drafted.status).toBe(200)
    const { drafts } = await json<{ drafts: Array<{ questionId: string; status: string; evidence?: string; followUp?: string }> }>(drafted)
    expect(drafts.map((d) => [d.questionId, d.status])).toEqual([
      ["hard", "drafted"],
      ["decided", "needs_user"],
      ["happened", "needs_user"],
    ])
    expect(drafts[0].evidence).toBe(HARD_EVIDENCE)
    expect(JSON.stringify(drafts)).not.toContain("Kafka")

    // Confirm one unedited (with evidence) and one edited answer, plus the description fact.
    vault = confirmAnswer(vault, lead.id, "hard", { text: "Keyword search missed synonyms, so ranking moved to pgvector embeddings.", edited: false, evidence: HARD_EVIDENCE })
    vault = confirmAnswer(vault, lead.id, "decided", { text: "Kept every chart operable by keyboard and announced updates to screen readers.", edited: true })
    const descriptionFact = vault.projects.find((p) => p.id === lead.id)!.facts.find((f) => f.kind === "built" && f.source === "github")!
    vault = confirmFact(vault, descriptionFact.id)
    const leadFacts = vault.projects.find((p) => p.id === lead.id)!.facts
    expect(leadFacts.find((f) => f.id.startsWith("answer-hard"))).toMatchObject({ source: "ai-draft", evidence: HARD_EVIDENCE, confirmed: true })
    expect(leadFacts.find((f) => f.id.startsWith("answer-decided"))).toMatchObject({ source: "user", confirmed: true })
    expect(leadFacts.find((f) => f.id.startsWith("answer-decided"))?.evidence).toBeUndefined()

    // Tailor for two postings: the same project leads, but with a different lead fact.
    const leads: string[] = []
    for (const posting of [JOBS.ai, JOBS.ux]) {
      const analyzed = await analyze(postRequest("/api/tailor/analyze", { vault, postingText: posting }))
      expect(analyzed.status).toBe(200)
      const analysis = await json<{ job: unknown; picks: Array<{ projectId: string }> }>(analyzed)
      expect(analysis.picks[0].projectId).toBe(lead.id)

      const generated = await generate(
        postRequest("/api/tailor/generate", { vault, job: analysis.job, picks: analysis.picks, template: TEMPLATE, colorScheme: COLOR_SCHEME }),
      )
      expect(generated.status).toBe(200)
      const output = await json<{ draft: Draft }>(generated)
      const sentence = leadSentence(output.draft, lead.id)
      expect(sentence).toBeTruthy()
      leads.push(sentence!)
    }
    expect(leads[0]).toMatch(/embeddings/)
    expect(leads[1]).toMatch(/keyboard|screen reader/i)
    expect(leads[0]).not.toBe(leads[1])
  })
})
