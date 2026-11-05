import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Draft } from "@/lib/schemas/draft"
import { addUnconfirmedUserFact, applyEdit } from "@/lib/tailor/edit"
import { confirmFact } from "@/lib/vault/ops"
import { loadAlexVault } from "../vault/helpers"
import { isolatedEnv, json, postRequest, scriptedLLM } from "../helpers/e2e"

const holder = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock("@/lib/llm", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/llm")>()), getLLMClient: () => holder.client }))

import { POST as edit } from "@/app/api/tailor/edit/route"

const PROJECT = "proj_canvas-flow"
const ref = { section: "project" as const, projectId: PROJECT, index: 0 }

function startingDraft(): Draft {
  return {
    tagline: "",
    about: [],
    projects: [{ projectId: PROJECT, sentences: [{ text: "GPU-accelerated infinite canvas and diagramming engine built with WebGL and React", factIds: ["fact_cf-built"] }] }],
    resumeBullets: [],
    note: [],
  }
}

type EditResponse = { ok: true; draft: Draft } | { ok: false; reason: string; message: string; suggestion?: { kind: string; factText: string } }

describe("J5: editing a generated sentence is re-checked against the vault", () => {
  beforeEach(() => {
    isolatedEnv()
    holder.client = scriptedLLM().client
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("accepts a reword, rejects a new number with an add-fact suggestion, then accepts it once confirmed", async () => {
    let vault = loadAlexVault()
    let draft = startingDraft()

    const reworded = "Built a GPU-accelerated infinite canvas and diagramming engine with WebGL and React"
    const first = await json<EditResponse>(await edit(postRequest("/api/tailor/edit", { vault, draft, ref, newText: reworded })))
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.draft.projects[0].sentences[0]).toEqual({ text: reworded, factIds: ["fact_cf-built"] })
    draft = first.draft

    const withNumber = `${reworded} for 50,000 users`
    const second = await json<EditResponse>(await edit(postRequest("/api/tailor/edit", { vault, draft, ref, newText: withNumber })))
    expect(second).toMatchObject({ ok: false, reason: "number_mismatch", suggestion: { kind: "add_fact", factText: withNumber } })

    const added = addUnconfirmedUserFact(vault, { type: "project", id: PROJECT }, "The canvas served 50,000 users")
    // Attaching an unconfirmed fact is refused.
    const refused = await json<EditResponse>(
      await edit(postRequest("/api/tailor/edit", { vault: added.vault, draft, ref, newText: withNumber, attachFactIds: [added.factId] })),
    )
    expect(refused).toMatchObject({ ok: false, reason: "bad_fact" })

    vault = confirmFact(added.vault, added.factId)
    const third = await json<EditResponse>(
      await edit(postRequest("/api/tailor/edit", { vault, draft, ref, newText: withNumber, attachFactIds: [added.factId] })),
    )
    expect(third.ok).toBe(true)
    if (!third.ok) return
    expect(third.draft.projects[0].sentences[0]).toEqual({ text: withNumber, factIds: ["fact_cf-built", added.factId] })
  })

  it("refuses the edit and leaves the draft untouched when the checker throws", async () => {
    const draft = startingDraft()
    const before = structuredClone(draft)
    const result = await applyEdit(draft, ref, "Anything at all", loadAlexVault(), {
      checkDraft: async () => {
        throw new Error("checker down")
      },
    })
    expect(result).toMatchObject({ ok: false, reason: "check_unavailable" })
    expect(draft).toEqual(before)
  })
})
