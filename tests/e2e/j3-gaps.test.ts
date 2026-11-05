import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { missingMessage } from "@/lib/job/gaps"
import type { Gap } from "@/lib/schemas/tailor"
import { addFacts, confirmFact } from "@/lib/vault/ops"
import { loadAlexVault } from "../vault/helpers"
import { isolatedEnv, json, postRequest, scriptedLLM } from "../helpers/e2e"

const holder = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock("@/lib/llm", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/llm")>()), getLLMClient: () => holder.client }))

import { POST as analyze } from "@/app/api/tailor/analyze/route"

const POSTING = [
  "Platform Frontend Engineer",
  "",
  "We run a React and TypeScript web app on our own Kubernetes clusters.",
  "Requirements",
  "- Strong React and TypeScript.",
  "- Hands-on Kubernetes experience: you will deploy and debug services on Kubernetes.",
  "- Care about accessibility.",
].join("\n")

async function gapsFor(vault: ReturnType<typeof loadAlexVault>): Promise<Gap[]> {
  const response = await analyze(postRequest("/api/tailor/analyze", { vault, postingText: POSTING }))
  expect(response.status).toBe(200)
  return (await json<{ gaps: Gap[] }>(response)).gaps
}

describe("J3: gaps are reported plainly and close when a matching fact is confirmed", () => {
  beforeEach(() => {
    isolatedEnv()
    holder.client = scriptedLLM().client
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("reports Kubernetes as a gap with the plain message, then drops it once a fact is confirmed", async () => {
    let vault = loadAlexVault()
    const gaps = await gapsFor(vault)
    const kube = gaps.find((gap) => /kubernetes/i.test(gap.label))
    expect(kube).toBeDefined()
    expect(kube!.message).toBe(missingMessage(kube!.label))
    expect(kube!.message).toMatch(/otherwise leave it out/)
    expect(kube!.message).not.toMatch(/\b(claim|pretend|say you|mention it anyway|exaggerate)\b/i)

    // An unconfirmed fact does not close the gap.
    vault = addFacts(vault, { type: "project", id: "proj_canvas-flow" }, [
      { text: "Deployed the canvas-flow preview service on Kubernetes", kind: "built", source: "user", confirmed: false },
    ])
    expect((await gapsFor(vault)).some((gap) => /kubernetes/i.test(gap.label))).toBe(true)

    const added = vault.projects.find((p) => p.id === "proj_canvas-flow")!.facts.find((f) => f.text.includes("Kubernetes"))!
    vault = confirmFact(vault, added.id)
    expect((await gapsFor(vault)).some((gap) => /kubernetes/i.test(gap.label))).toBe(false)
  })
})
