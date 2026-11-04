export type AiDisabledReason = "flag_off" | "no_api_key"

export function aiDisabledReason(): AiDisabledReason | null {
  if (process.env.AI_ENHANCE !== "true") return "flag_off"
  if (!process.env.GEMINI_API_KEY_1 && !process.env.GEMINI_API_KEY_2) return "no_api_key"
  return null
}
