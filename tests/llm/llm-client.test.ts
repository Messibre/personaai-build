import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { GeminiClient } from "@/lib/llm/gemini"
import { MockClient } from "@/lib/llm/mock"
import { createLLMClient, parseLLMEnv } from "@/lib/llm"

describe("LLMClient Abstraction & Adapters (L02)", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.GEMINI_API_KEY_1
    delete process.env.GEMINI_API_KEY_2
    delete process.env.GEMINI_API_KEY
    delete process.env.LLM_PROVIDER
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("MockClient (offline)", () => {
    it("returns deterministic bio without network", async () => {
      const mock = new MockClient()
      const result = await mock.generate({
        prompt: "Write a short bio for a developer",
        maxOutputTokens: 200,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.text).toContain("software engineer")
        expect(result.usage?.inputTokens).toBeGreaterThan(0)
      }
    })

    it("returns valid template JSON for design queries", async () => {
      const mock = new MockClient()
      const result = await mock.generate({
        system: "You are a creative director deciding the best visual design for a developer portfolio.",
        prompt: "Choose available templates and color scheme",
        maxOutputTokens: 512,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        const parsed = JSON.parse(result.text)
        expect(parsed.template).toBe("bold-portrait")
        expect(parsed.colorScheme).toBe("midnight")
      }
    })

    it("returns valid portfolio content JSON for portfolio generation queries", async () => {
      const mock = new MockClient()
      const result = await mock.generate({
        system: "You are a career copywriter",
        prompt: "Generate portfolio copy with project selection & descriptions and about me (3-4 sentences)",
        maxOutputTokens: 2000,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        const parsed = JSON.parse(result.text)
        expect(Array.isArray(parsed.projects)).toBe(true)
        expect(parsed.projects.length).toBeGreaterThan(0)
        expect(typeof parsed.aboutMe).toBe("string")
      }
    })

    it("supports custom enqueued responses and callbacks", async () => {
      const mock = new MockClient({
        responses: [
          "First custom response",
          (req) => `Handled: ${req.prompt}`,
          { ok: false, error: { kind: "rate_limited", retryable: true } },
        ],
      })

      const res1 = await mock.generate({ prompt: "one", maxOutputTokens: 100 })
      expect(res1.ok).toBe(true)
      if (res1.ok) expect(res1.text).toBe("First custom response")

      const res2 = await mock.generate({ prompt: "two", maxOutputTokens: 100 })
      expect(res2.ok).toBe(true)
      if (res2.ok) expect(res2.text).toBe("Handled: two")

      const res3 = await mock.generate({ prompt: "three", maxOutputTokens: 100 })
      expect(res3.ok).toBe(false)
      if (!res3.ok) expect(res3.error.kind).toBe("rate_limited")
    })
  })

  describe("GeminiClient", () => {
    it("fails before any network call if keys are missing (no secrets logged)", async () => {
      const fetchFn = vi.fn()
      const client = new GeminiClient({ keys: [], fetchFn })

      const result = await client.generate({
        prompt: "Hello",
        maxOutputTokens: 100,
      })

      expect(fetchFn).not.toHaveBeenCalled()
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe("config")
        if (result.error.kind === "config") {
          expect(result.error.message).toContain("No Gemini API keys configured")
        }
      }
    })

    it("passes API key in x-goog-api-key header and NEVER in the URL", async () => {
      let capturedUrl = ""
      let capturedHeaders: Record<string, string> = {}

      const fetchFn = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        capturedUrl = url
        capturedHeaders = (init?.headers as Record<string, string>) || {}
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "Response from Gemini" }] } }],
            usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 25 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      })

      const client = new GeminiClient({
        keys: ["test-secret-key-123"],
        fetchFn,
      })

      const result = await client.generate({
        prompt: "Test prompt",
        maxOutputTokens: 500,
      })

      expect(result.ok).toBe(true)
      expect(fetchFn).toHaveBeenCalledTimes(1)

      // CRITICAL SECURITY CHECKS:
      // 1. URL must not contain the API key
      expect(capturedUrl).not.toContain("test-secret-key-123")
      expect(capturedUrl).not.toContain("?key=")
      expect(capturedUrl).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent")

      // 2. Header must contain the API key
      expect(capturedHeaders["x-goog-api-key"]).toBe("test-secret-key-123")
    })

    it("rotates between GEMINI_API_KEY_1 and GEMINI_API_KEY_2 across calls", async () => {
      const usedKeys: string[] = []

      const fetchFn = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        const headers = (init?.headers as Record<string, string>) || {}
        usedKeys.push(headers["x-goog-api-key"])
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "OK" }] } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      })

      const client = new GeminiClient({
        keys: ["key-alpha", "key-beta"],
        fetchFn,
      })

      await client.generate({ prompt: "call 1", maxOutputTokens: 100 })
      await client.generate({ prompt: "call 2", maxOutputTokens: 100 })
      await client.generate({ prompt: "call 3", maxOutputTokens: 100 })

      expect(usedKeys).toEqual(["key-alpha", "key-beta", "key-alpha"])
    })

    it("retries on 429 up to maxRetries with backoff and rotates key", async () => {
      const calls: string[] = []

      const fetchFn = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        const headers = (init?.headers as Record<string, string>) || {}
        calls.push(headers["x-goog-api-key"])
        if (calls.length <= 2) {
          return new Response(JSON.stringify({ error: { message: "Quota exceeded" } }), { status: 429 })
        }
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "Success after retries" }] } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      })

      const client = new GeminiClient({
        keys: ["key-1", "key-2"],
        maxRetries: 2,
        backoffMs: 1, // fast backoff for tests
        fetchFn,
      })

      const result = await client.generate({ prompt: "retry me", maxOutputTokens: 100 })

      expect(result.ok).toBe(true)
      expect(calls.length).toBe(3) // attempt 1 (429) -> attempt 2 (429) -> attempt 3 (200)
      expect(calls).toEqual(["key-1", "key-2", "key-1"])
      if (result.ok) {
        expect(result.text).toBe("Success after retries")
      }
    })

    it("never retries 400 (bad request) or 401 (auth failure)", async () => {
      const fetchFn = vi.fn().mockImplementation(async () => {
        return new Response(
          JSON.stringify({ error: { message: "Invalid argument supplied" } }),
          { status: 400 }
        )
      })

      const client = new GeminiClient({
        keys: ["key-1", "key-2"],
        maxRetries: 2,
        fetchFn,
      })

      const result = await client.generate({ prompt: "bad", maxOutputTokens: 100 })

      expect(result.ok).toBe(false)
      expect(fetchFn).toHaveBeenCalledTimes(1) // NOT retried!
      if (!result.ok) {
        expect(result.error.kind).toBe("bad_request")
      }
    })

    it("maps 401/403 to config error and never leaks API key", async () => {
      const fetchFn = vi.fn().mockImplementation(async () => {
        return new Response("API_KEY_INVALID for secret-key-xyz", { status: 401 })
      })

      const client = new GeminiClient({
        keys: ["secret-key-xyz"],
        fetchFn,
      })

      const result = await client.generate({ prompt: "test", maxOutputTokens: 100 })

      expect(result.ok).toBe(false)
      expect(fetchFn).toHaveBeenCalledTimes(1)
      if (!result.ok) {
        expect(result.error.kind).toBe("config")
        if (result.error.kind === "config") {
          expect(result.error.message).not.toContain("secret-key-xyz")
        }
      }
    })

    it("redacts API keys if present in provider error message", async () => {
      const sensitiveKey = "secret-super-key-999"
      const fetchFn = vi.fn().mockImplementation(async () => {
        return new Response(
          JSON.stringify({ error: { message: `Failure with key: ${sensitiveKey} on model` } }),
          { status: 404 }
        )
      })

      const client = new GeminiClient({
        keys: [sensitiveKey],
        fetchFn,
      })

      const result = await client.generate({ prompt: "test", maxOutputTokens: 100 })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe("bad_request")
        if (result.error.kind === "bad_request") {
          expect(result.error.message).not.toContain(sensitiveKey)
          expect(result.error.message).toContain("[REDACTED_API_KEY]")
        }
      }
    })

    it("handles hard timeout and maps to timeout error", async () => {
      const fetchFn = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        return new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted")
            err.name = "TimeoutError"
            reject(err)
          })
        })
      })

      const client = new GeminiClient({
        keys: ["key-1"],
        timeoutMs: 10,
        fetchFn,
      })

      const result = await client.generate({ prompt: "timeout test", maxOutputTokens: 100 })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe("timeout")
      }
    })
  })

  describe("createLLMClient factory", () => {
    it("returns MockClient when LLM_PROVIDER=mock", () => {
      process.env.LLM_PROVIDER = "mock"
      const client = createLLMClient()
      expect(client).toBeInstanceOf(MockClient)
    })

    it("returns GeminiClient by default or when LLM_PROVIDER=gemini", () => {
      process.env.LLM_PROVIDER = "gemini"
      process.env.GEMINI_API_KEY_1 = "test-key"
      const client = createLLMClient()
      expect(client).toBeInstanceOf(GeminiClient)
    })

    it("validates environment config with Zod", () => {
      process.env.LLM_PROVIDER = "mock"
      process.env.LLM_TIMEOUT_MS = "5000"
      const config = parseLLMEnv()
      expect(config.provider).toBe("mock")
      expect(config.timeoutMs).toBe(5000)
    })
  })
})
