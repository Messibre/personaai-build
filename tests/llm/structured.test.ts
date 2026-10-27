import { describe, expect, it } from "vitest"
import { z } from "zod"
import { generateStructured } from "@/lib/llm/structured"
import { MockClient } from "@/lib/llm/mock"
import type { LLMGenerateRequest } from "@/lib/llm/types"
import { jobProfileSchema } from "@/lib/schemas/job"

const PROFILE = {
  title: "Senior Frontend Engineer",
  requirements: [{ id: "r1", label: "React", level: "must", keywords: ["react"] }],
  topThree: ["React"],
}

function run(client: MockClient, schema: z.ZodType<unknown, z.ZodTypeDef, unknown> = jobProfileSchema) {
  return generateStructured(client, { prompt: "Extract the profile.", schema, maxOutputTokens: 500 })
}

function recorder(responses: string[]) {
  const requests: LLMGenerateRequest[] = []
  const client = new MockClient({
    responses: responses.map((text) => (req: LLMGenerateRequest) => {
      requests.push(req)
      return text
    }),
  })
  return { client, requests }
}

describe("generateStructured", () => {
  it("returns validated data on the first try with a single model call", async () => {
    const { client, requests } = recorder([JSON.stringify(PROFILE)])
    const result = await run(client)
    expect(result).toEqual({ ok: true, data: PROFILE })
    expect(requests).toHaveLength(1)
    expect(requests[0].responseMimeType).toBe("application/json")
  })

  it("accepts output wrapped in a code fence or surrounded by chatter", async () => {
    const fenced = await run(recorder(["```json\n" + JSON.stringify(PROFILE) + "\n```"]).client)
    expect(fenced).toEqual({ ok: true, data: PROFILE })

    const chatty = await run(recorder([`Sure! Here you go: ${JSON.stringify(PROFILE)} Hope that helps.`]).client)
    expect(chatty).toEqual({ ok: true, data: PROFILE })
  })

  it("repairs once: the second prompt explains the schema failure and carries the bad answer", async () => {
    const bad = JSON.stringify({ ...PROFILE, requirements: [{ id: "r1", label: "React", level: "maybe", keywords: [] }] })
    const { client, requests } = recorder([bad, JSON.stringify(PROFILE)])

    const result = await run(client)

    expect(result).toEqual({ ok: true, data: PROFILE })
    expect(requests).toHaveLength(2)
    expect(requests[1].prompt).toContain("Extract the profile.")
    expect(requests[1].prompt).toContain("requirements.0.level")
    expect(requests[1].prompt).toContain('"level":"maybe"')
  })

  it("gives up after one repair with a typed invalid_output error", async () => {
    const { client, requests } = recorder(["not json at all", "still { broken"])
    const result = await run(client)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatchObject({ kind: "invalid_output" })
    expect(requests).toHaveLength(2)
  })

  it("rejects extra keys, truncated JSON and out-of-range numbers instead of coercing", async () => {
    const extra = await run(recorder([JSON.stringify({ ...PROFILE, salary: 1 }), JSON.stringify({ ...PROFILE, salary: 1 })]).client)
    expect(extra.ok).toBe(false)

    const truncated = await run(recorder(['{"title": "Sen', '{"title": "Sen']).client)
    expect(truncated.ok).toBe(false)

    const bounded = z.object({ score: z.number().min(0).max(1) }).strict()
    const out = await run(recorder(['{"score": 7}', '{"score": 7}']).client, bounded)
    expect(out.ok).toBe(false)
    if (!out.ok && out.error.kind === "invalid_output") expect(out.error.message).toContain("score")
  })

  it("surfaces an LLM failure on the first call without retrying", async () => {
    const { client, requests } = recorder([])
    const failing = new MockClient({
      responses: [
        (req) => {
          requests.push(req)
          return { ok: false, error: { kind: "timeout", message: "timed out" } } as never
        },
      ],
    })
    const result = await run(failing)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe("llm")
    expect(requests).toHaveLength(1)
    void client
  })

  it("surfaces an LLM failure during the repair call", async () => {
    const client = new MockClient({
      responses: ["garbage", { ok: false, error: { kind: "timeout", message: "timed out" } } as never],
    })
    const result = await run(client)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe("llm")
  })

  it("truncates a huge bad answer before echoing it into the repair prompt", async () => {
    const huge = "x".repeat(20_000)
    const { client, requests } = recorder([huge, JSON.stringify(PROFILE)])
    await run(client)
    expect(requests[1].prompt.length).toBeLessThan(huge.length)
  })
})
