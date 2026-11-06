import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Draft } from "@/lib/schemas/draft"
import type { Vault } from "@/lib/schemas/vault"
import { addFacts, confirmFact, createEmptyVault, upsertProject } from "@/lib/vault/ops"
import { draftFollowingLeads } from "../rewrite/helpers"
import { loadAlexVault, loadResumeOnlyVault } from "../vault/helpers"
import { COLOR_SCHEME, JOBS, TEMPLATE, confirmedFactIds, draftSentences, draftText, isolatedEnv, json, postRequest, scriptedLLM } from "../helpers/e2e"

const holder = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock("@/lib/llm", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/llm")>()), getLLMClient: () => holder.client }))

import { POST as analyze } from "@/app/api/tailor/analyze/route"
import { POST as generate } from "@/app/api/tailor/generate/route"

function thirdVault(): Vault {
  let vault = createEmptyVault("Robin Mensah")
  vault = upsertProject(vault, { id: "proj_ledger-ai", name: "ledger-ai", techs: ["Python"], facts: [] })
  vault = addFacts(vault, { type: "project", id: "proj_ledger-ai" }, [
    { text: "Retrieval pipeline that answers ledger questions with cited LLM responses", kind: "built", source: "user", confirmed: false },
    { text: "Evaluation suite of 120 labelled questions run on every prompt change", kind: "metric", source: "user", confirmed: false },
    { text: "Cut answer latency by 7 seconds with a smaller embeddings model", kind: "outcome", source: "user", confirmed: false },
  ])
  const [built, evals] = vault.projects[0].facts
  vault = confirmFact(vault, built.id)
  return confirmFact(vault, evals.id)
}

const VAULTS: Array<[string, () => Vault]> = [
  ["alex-chen", loadAlexVault],
  ["resume-only", loadResumeOnlyVault],
  ["robin-mensah", thirdVault],
]

/** A model that tries every kind of cheating at once, on top of an honest draft. */
function cheatingRewrite(context: Parameters<typeof draftFollowingLeads>[0]): Draft {
  const honest = draftFollowingLeads(context)
  const firstProject = honest.projects[0]
  const anyId = context.projects[0]?.facts[0]?.id ?? "fact_missing"
  return {
    ...honest,
    tagline: `${honest.tagline} who led 400 engineers`,
    about: [...honest.about, { text: "Invented a quantum compiler used by 9000 companies", factIds: ["fact_does-not-exist"] }],
    projects: firstProject
      ? [{ ...firstProject, sentences: [...firstProject.sentences, { text: `${firstProject.sentences[0]?.text ?? "Shipped it"} to 3 million users`, factIds: [anyId] }] }, ...honest.projects.slice(1)]
      : honest.projects,
  }
}

const numbersIn = (text: string) => text.match(/\d+(?:[.,]\d+)*/g) ?? []

describe("Product invariants across three vaults and four postings", () => {
  beforeEach(() => {
    isolatedEnv()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  for (const [vaultName, load] of VAULTS) {
    for (const [postingName, posting] of Object.entries(JOBS)) {
      it(`${vaultName} x ${postingName}`, async () => {
        const vault = load()
        const llm = scriptedLLM({ rewrite: cheatingRewrite })
        holder.client = llm.client

        const analyzed = await analyze(postRequest("/api/tailor/analyze", { vault, postingText: posting }))
        if ([...vault.projects, ...vault.experience].every((item) => !item.facts.some((fact) => fact.confirmed))) {
          expect(analyzed.status).toBe(400)
          expect(await json(analyzed)).toMatchObject({ code: "vault_empty" })
          return
        }
        expect(analyzed.status).toBe(200)
        const analysis = await json<{ job: unknown; picks: unknown[] }>(analyzed)

        const generated = await generate(postRequest("/api/tailor/generate", { vault, job: analysis.job, picks: analysis.picks, template: TEMPLATE, colorScheme: COLOR_SCHEME }))
        expect(generated.status).toBe(200)
        const output = await json<{ draft: Draft; noteText: string; resumeText: string }>(generated)

        const confirmed = confirmedFactIds(vault)
        const confirmedTexts = [...vault.projects, ...vault.experience].flatMap((o) => o.facts).filter((f) => f.confirmed).map((f) => f.text)
        const unconfirmedTexts = [...vault.projects, ...vault.experience].flatMap((o) => o.facts).filter((f) => !f.confirmed).map((f) => f.text)

        // 1. Every cited fact exists and is confirmed.
        for (const sentence of draftSentences(output.draft)) {
          expect(sentence.factIds.length).toBeGreaterThan(0)
          for (const id of sentence.factIds) expect(confirmed.has(id), id).toBe(true)
        }

        // 2. The checker only removes: every shipped sentence was in what the model wrote.
        expect(llm.rewritten).toHaveLength(1)
        const written = new Set(draftSentences(llm.rewritten[0]).map((s) => s.text))
        for (const sentence of draftSentences(output.draft)) expect(written.has(sentence.text)).toBe(true)

        // 3. No number appears that the confirmed facts do not contain.
        const allowed = new Set(confirmedTexts.flatMap(numbersIn))
        for (const value of [...numbersIn(draftText(output.draft)), ...numbersIn(output.noteText)]) {
          expect(allowed.has(value), `number ${value}`).toBe(true)
        }

        // 4. Unconfirmed fact text never reaches a prompt or the output.
        const prompts = llm.allPromptText()
        for (const text of unconfirmedTexts) {
          expect(prompts).not.toContain(text)
          expect(draftText(output.draft)).not.toContain(text)
          expect(output.noteText).not.toContain(text)
        }
      })
    }
  }
})
