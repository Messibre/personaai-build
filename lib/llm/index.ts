import { z } from "zod"
import type { LLMClient } from "./types"
import { GeminiClient } from "./gemini"
import { MockClient } from "./mock"

export * from "./types"
export { GeminiClient } from "./gemini"
export { MockClient } from "./mock"

const envConfigSchema = z.object({
  provider: z.enum(["gemini", "mock"]).default("gemini"),
  model: z.string().min(1).default("gemini-2.5-flash"),
  timeoutMs: z.coerce.number().positive().default(10_000),
  geminiKeys: z.array(z.string().min(1)).default([]),
})

export type LLMEnvConfig = z.infer<typeof envConfigSchema>

export function parseLLMEnv(): LLMEnvConfig {
  const rawProvider = (process.env.LLM_PROVIDER || "gemini").toLowerCase().trim()
  const provider = rawProvider === "mock" ? "mock" : "gemini"

  const rawKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY,
  ].filter(Boolean) as string[]

  const geminiKeys = Array.from(new Set(rawKeys.map((k) => k.trim()).filter((k) => k.length > 0)))

  return envConfigSchema.parse({
    provider,
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    timeoutMs: process.env.LLM_TIMEOUT_MS ? Number(process.env.LLM_TIMEOUT_MS) : 10_000,
    geminiKeys,
  })
}

export function createLLMClient(overrides?: Partial<LLMEnvConfig>): LLMClient {
  const config = overrides
    ? envConfigSchema.parse({ ...parseLLMEnv(), ...overrides })
    : parseLLMEnv()

  if (config.provider === "mock") {
    return new MockClient()
  }

  return new GeminiClient({
    keys: config.geminiKeys,
    model: config.model,
    timeoutMs: config.timeoutMs,
  })
}

// Global cached client instance for routes and server runtime
let cachedClient: LLMClient | null = null

export function getLLMClient(): LLMClient {
  if (!cachedClient) {
    cachedClient = createLLMClient()
  }
  return cachedClient
}

/** Reset cached client (useful in tests when switching envs) */
export function resetLLMClient(): void {
  cachedClient = null
}
