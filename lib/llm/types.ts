export interface LLMGenerateRequest {
  system?: string
  prompt: string
  maxOutputTokens: number
  signal?: AbortSignal
  responseMimeType?: string
}

export type LLMResult =
  | {
      ok: true
      text: string
      usage?: {
        inputTokens: number
        outputTokens: number
      }
    }
  | {
      ok: false
      error: LLMError
    }

export type LLMError =
  | { kind: "config"; message: string }
  | { kind: "timeout" }
  | { kind: "rate_limited"; retryable: true }
  | { kind: "provider_down"; retryable: true }
  | { kind: "bad_request"; message: string }

export interface LLMClient {
  generate(req: LLMGenerateRequest): Promise<LLMResult>
}
