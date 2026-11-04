import { getLLMClient } from "@/lib/llm"

/**
 * Legacy wrapper for callGemini, now routing through the unified LLMClient.
 */
export async function callGemini(prompt: string): Promise<string> {
  const client = getLLMClient()
  const result = await client.generate({
    prompt,
    maxOutputTokens: 16384,
  })

  if (!result.ok) {
    if (result.error.kind === "config") {
      throw new Error("No Gemini API keys configured. Set GEMINI_API_KEY_1 and/or GEMINI_API_KEY_2.")
    }
    if (result.error.kind === "timeout") {
      throw new Error("Gemini API call timed out")
    }
    if (result.error.kind === "rate_limited") {
      throw new Error("Gemini API rate limited")
    }
    if (result.error.kind === "bad_request") {
      throw new Error(result.error.message)
    }
    throw new Error("Gemini API call failed")
  }

  return result.text
}
