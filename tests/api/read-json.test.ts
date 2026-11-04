import { describe, expect, it } from "vitest"
import { isRecord, readJsonBody } from "@/lib/api/read-json"

function jsonRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/test", { method: "POST", body, headers })
}

describe("readJsonBody", () => {
  it("parses a valid JSON body", async () => {
    const result = await readJsonBody(jsonRequest('{"a":1}'))
    expect(result).toEqual({ ok: true, data: { a: 1 } })
  })

  it("returns a 400 response for malformed JSON", async () => {
    const result = await readJsonBody(jsonRequest("not json"))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(400)
  })

  it("returns a 413 response when the body exceeds the limit", async () => {
    const result = await readJsonBody(jsonRequest(JSON.stringify({ a: "x".repeat(100) })), 50)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(413)
  })

  it("rejects early when content-length already exceeds the limit", async () => {
    const result = await readJsonBody(jsonRequest("{}", { "content-length": "999999" }), 100)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(413)
  })

  it("measures size in bytes, not characters", async () => {
    // 40 three-byte characters = 120 bytes of UTF-8, but only 40 characters
    const result = await readJsonBody(jsonRequest(JSON.stringify({ a: "€".repeat(40) })), 100)
    expect(result.ok).toBe(false)
  })
})

describe("isRecord", () => {
  it("accepts plain objects only", () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(isRecord("str")).toBe(false)
  })
})
