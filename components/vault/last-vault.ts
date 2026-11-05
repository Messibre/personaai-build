"use client"

import { useEffect, useState } from "react"

export const LAST_VAULT_KEY = "personaai:lastVaultId"
export const VAULT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/

export function readLastVaultId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const value = window.localStorage.getItem(LAST_VAULT_KEY)
    return value && VAULT_ID_PATTERN.test(value) ? value : null
  } catch {
    return null
  }
}

export function rememberVaultId(id: string): void {
  if (typeof window === "undefined" || !VAULT_ID_PATTERN.test(id)) return
  try {
    window.localStorage.setItem(LAST_VAULT_KEY, id)
  } catch {
    // storage can be unavailable (private mode, quota); the link still works
  }
}

/** Reads after mount so server and first client render match. */
export function useLastVaultId(): string | null {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => setId(readLastVaultId()), [])
  return id
}
