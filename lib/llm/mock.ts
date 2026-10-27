import type { LLMClient, LLMGenerateRequest, LLMResult } from "./types"

export type MockResponder =
  | LLMResult
  | string
  | ((req: LLMGenerateRequest) => LLMResult | string | Promise<LLMResult | string>)

export interface MockClientConfig {
  responses?: MockResponder[]
  defaultDelayMs?: number
}

const DEFAULT_BIO =
  "I am a software engineer focused on building scalable web applications and developer tools with clean, well-tested TypeScript."

const DEFAULT_TEMPLATE_JSON = JSON.stringify({
  template: "bold-portrait",
  colorScheme: "midnight",
  heroTaglineOverride: "Full-Stack Engineer building reliable, accessible web systems.",
  aboutMeOverride: "I specialize in modern TypeScript, React, and server-side systems with an emphasis on clarity and performance.",
  reasoning: "Selected bold-portrait with midnight color scheme for strong technical depth and clean readability.",
})

const DEFAULT_CONTENT_JSON = JSON.stringify({
  projects: [
    {
      name: "persona-ai",
      url: "https://github.com/user/persona-ai",
      language: "TypeScript",
      description: "Autonomous portfolio generator converting resumes and GitHub data into production-ready websites.",
      stars: 120,
      forks: 15,
    },
    {
      name: "safe-fetch-core",
      url: "https://github.com/user/safe-fetch-core",
      language: "TypeScript",
      description: "SSRF-resistant HTTP client for hardened outbound fetches in serverless environments.",
      stars: 45,
      forks: 4,
    },
  ],
  aboutMe:
    "I am a developer who turns complex system requirements into maintainable, well-tested code across full-stack TypeScript and cloud infrastructure.",
  heroTagline: "Full-stack developer building resilient, accessible web applications.",
})

export class MockClient implements LLMClient {
  private queue: MockResponder[] = []
  private readonly defaultDelayMs: number

  constructor(config: MockClientConfig = {}) {
    this.queue = config.responses ? [...config.responses] : []
    this.defaultDelayMs = config.defaultDelayMs ?? 0
  }

  enqueue(responder: MockResponder): void {
    this.queue.push(responder)
  }

  async generate(req: LLMGenerateRequest): Promise<LLMResult> {
    if (this.defaultDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.defaultDelayMs))
    }

    if (this.queue.length > 0) {
      const next = this.queue.shift()!
      if (typeof next === "function") {
        const result = await next(req)
        return this.normalizeResult(result)
      }
      return this.normalizeResult(next)
    }

    // Dynamic fixture selection based on system / prompt keywords
    const lowerPrompt = req.prompt.toLowerCase()
    const lowerSystem = (req.system || "").toLowerCase()

    if (
      lowerPrompt.includes("visual design for a developer portfolio") ||
      lowerPrompt.includes("current portfolio design:") ||
      lowerPrompt.includes("available templates") ||
      lowerSystem.includes("creative director")
    ) {
      return {
        ok: true,
        text: DEFAULT_TEMPLATE_JSON,
        usage: { inputTokens: 40, outputTokens: 80 },
      }
    }

    if (
      lowerPrompt.includes("portfolio copy") ||
      lowerPrompt.includes("project selection & descriptions") ||
      lowerPrompt.includes("about me (3-4 sentences") ||
      lowerSystem.includes("career copywriter")
    ) {
      return {
        ok: true,
        text: DEFAULT_CONTENT_JSON,
        usage: { inputTokens: 120, outputTokens: 250 },
      }
    }

    // Default fallback to text bio
    return {
      ok: true,
      text: DEFAULT_BIO,
      usage: { inputTokens: 30, outputTokens: 50 },
    }
  }

  private normalizeResult(res: LLMResult | string): LLMResult {
    if (typeof res === "string") {
      return {
        ok: true,
        text: res,
        usage: { inputTokens: 10, outputTokens: 20 },
      }
    }
    return res
  }
}
