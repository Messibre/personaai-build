export const BETA_CODE_HEADER = "x-beta-code"

const STORAGE_KEY = "personaai.betaCode"

export function getBetaCode(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setBetaCode(code: string): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, code)
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the code then lasts only until reload.
  }
}

export function clearBetaCode(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing to clear
  }
}

type Listener = () => void
const listeners = new Set<Listener>()

/** Subscribe to "a request was refused for lack of an access code". Returns an unsubscribe function. */
export function onAccessRequired(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifyAccessRequired(): void {
  for (const listener of listeners) listener()
}
