import type { LLMClient, LLMGenerateRequest, LLMResult, LLMError } from "./types"

export interface GeminiClientConfig {
  keys?: string[]
  model?: string
  timeoutMs?: number
  maxRetries?: number
  backoffMs?: number
  fetchFn?: typeof fetch
}

const DEFAULT_MODEL = "gemini-2.5-flash"
const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RETRIES = 2
const DEFAULT_BACKOFF_MS = 300
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

export class GeminiClient implements LLMClient {
  private readonly keys: string[]
  private readonly model: string
  private readonly timeoutMs: number
  private readonly maxRetries: number
  private readonly backoffMs: number
  private readonly fetchFn: typeof fetch
  private currentKeyIndex = 0

  constructor(config: GeminiClientConfig = {}) {
    const rawKeys = config.keys ?? [
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY,
    ].filter(Boolean) as string[]

    // Deduplicate non-empty trimmed keys
    this.keys = Array.from(new Set(rawKeys.map((k) => k.trim()).filter((k) => k.length > 0)))
    this.model = config.model || process.env.GEMINI_MODEL || DEFAULT_MODEL
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES
    this.backoffMs = config.backoffMs ?? DEFAULT_BACKOFF_MS
    this.fetchFn = config.fetchFn ?? globalThis.fetch
  }

  private getNextKey(): string | null {
    if (this.keys.length === 0) return null
    const key = this.keys[this.currentKeyIndex % this.keys.length]
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length
    return key
  }

  async generate(req: LLMGenerateRequest): Promise<LLMResult> {
    if (this.keys.length === 0) {
      return {
        ok: false,
        error: {
          kind: "config",
          message: "No Gemini API keys configured. Set GEMINI_API_KEY_1 and/or GEMINI_API_KEY_2.",
        },
      }
    }

    const endpoint = `${GEMINI_API_BASE}/${encodeURIComponent(this.model)}:generateContent`

    let lastError: LLMError = {
      kind: "provider_down",
      retryable: true,
    }

    const maxAttempts = 1 + this.maxRetries

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const activeKey = this.getNextKey()
      if (!activeKey) {
        return {
          ok: false,
          error: {
            kind: "config",
            message: "No Gemini API key available.",
          },
        }
      }

      const timeoutSignal = AbortSignal.timeout(this.timeoutMs)
      let requestSignal: AbortSignal = timeoutSignal

      if (req.signal) {
        if (typeof AbortSignal.any === "function") {
          requestSignal = AbortSignal.any([timeoutSignal, req.signal])
        } else {
          const controller = new AbortController()
          const onAbort = () => controller.abort()
          timeoutSignal.addEventListener("abort", onAbort, { once: true })
          req.signal.addEventListener("abort", onAbort, { once: true })
          requestSignal = controller.signal
        }
      }

      const requestBody: {
        contents: Array<{ parts: Array<{ text: string }> }>
        generationConfig: {
          temperature: number
          maxOutputTokens: number
          responseMimeType?: string
          thinkingConfig?: { thinkingBudget: number }
        }
        systemInstruction?: { parts: Array<{ text: string }> }
      } = {
        contents: [
          {
            parts: [{ text: req.prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: req.maxOutputTokens,
          ...(req.responseMimeType ? { responseMimeType: req.responseMimeType } : {}),
          // 2.5 Flash thinking tokens eat the output budget and push large prompts past the timeout.
          ...(this.model.includes("flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }

      if (req.system) {
        requestBody.systemInstruction = {
          parts: [{ text: req.system }],
        }
      }

      try {
        const response = await this.fetchFn(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": activeKey,
          },
          body: JSON.stringify(requestBody),
          signal: requestSignal,
        })

        // 429: Rate limited -> Retryable
        if (response.status === 429) {
          lastError = { kind: "rate_limited", retryable: true }
          if (attempt < maxAttempts - 1) {
            await this.sleep(this.backoffMs * (attempt + 1))
            continue
          }
          return { ok: false, error: lastError }
        }

        // 5xx: Provider down / server error -> Retryable
        if (response.status >= 500) {
          lastError = { kind: "provider_down", retryable: true }
          if (attempt < maxAttempts - 1) {
            await this.sleep(this.backoffMs * (attempt + 1))
            continue
          }
          return { ok: false, error: lastError }
        }

        // 4xx (except 429): Bad request, auth, not found -> NOT retryable
        if (!response.ok) {
          let errText = ""
          try {
            errText = await response.text()
          } catch {
            errText = `HTTP ${response.status}`
          }

          // Ensure keys are never leaked in error messages
          const sanitizedErr = this.sanitizeErrorText(errText)

          if (response.status === 401 || response.status === 403) {
            return {
              ok: false,
              error: {
                kind: "config",
                message: "Gemini API rejected key credentials (invalid or expired).",
              },
            }
          }

          return {
            ok: false,
            error: {
              kind: "bad_request",
              message: `Gemini API returned status ${response.status}: ${sanitizedErr}`,
            },
          }
        }

        const data = await response.json()

        if (data.error) {
          const sanitizedMsg = this.sanitizeErrorText(data.error.message || "Unknown Gemini API error")
          return {
            ok: false,
            error: {
              kind: "bad_request",
              message: sanitizedMsg,
            },
          }
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (typeof text !== "string") {
          return {
            ok: false,
            error: {
              kind: "provider_down",
              retryable: true,
            },
          }
        }

        const usage = data.usageMetadata
          ? {
              inputTokens: Number(data.usageMetadata.promptTokenCount) || 0,
              outputTokens: Number(data.usageMetadata.candidatesTokenCount) || 0,
            }
          : undefined

        return {
          ok: true,
          text,
          usage,
        }
      } catch (err: unknown) {
        if (timeoutSignal.aborted) {
          lastError = { kind: "timeout" }
          // Timeout is not retried across the same attempt loop
          return { ok: false, error: lastError }
        }

        if (req.signal?.aborted) {
          lastError = { kind: "timeout" }
          return { ok: false, error: lastError }
        }

        const errName = err instanceof Error ? err.name : ""
        if (errName === "TimeoutError" || errName === "AbortError") {
          lastError = { kind: "timeout" }
          return { ok: false, error: lastError }
        }

        // Network or fetch failure -> retryable provider down
        lastError = { kind: "provider_down", retryable: true }
        if (attempt < maxAttempts - 1) {
          await this.sleep(this.backoffMs * (attempt + 1))
          continue
        }
      }
    }

    return { ok: false, error: lastError }
  }

  private sanitizeErrorText(raw: string): string {
    let sanitized = raw.slice(0, 300)
    for (const key of this.keys) {
      if (key && key.length > 5) {
        sanitized = sanitized.replaceAll(key, "[REDACTED_API_KEY]")
      }
    }
    return sanitized
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
