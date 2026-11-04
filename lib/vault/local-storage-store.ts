import type { Vault } from "@/lib/schemas/vault"
import {
  VaultStoreError,
  assertValidVaultId,
  parseStoredVault,
  parseVaultForWrite,
  toSummary,
  type VaultStore,
  type VaultSummary,
} from "./store"

export const LOCAL_STORAGE_KEY_PREFIX = "personaai:vault:"

export interface StorageLike {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type StorageProvider = () => StorageLike | null

function browserStorage(): StorageLike | null {
  // Reading window.localStorage itself can throw (blocked cookies, sandboxed iframes).
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

function toStoreError(error: unknown, fallbackMessage: string): VaultStoreError {
  return error instanceof VaultStoreError ? error : new VaultStoreError("io", fallbackMessage)
}

/**
 * Browser store. No method throws: storage can be full, blocked or corrupt, and the UI must keep working.
 * Failures are surfaced through `onError` and `lastError` instead of being swallowed; `get` returns null
 * and `save` leaves the previous value untouched when something goes wrong.
 */
export class LocalStorageVaultStore implements VaultStore {
  lastError: VaultStoreError | null = null

  constructor(
    private readonly getStorage: StorageProvider = browserStorage,
    private readonly onError?: (error: VaultStoreError) => void,
  ) {}

  private report(error: unknown, fallbackMessage: string): void {
    const storeError = toStoreError(error, fallbackMessage)
    this.lastError = storeError
    this.onError?.(storeError)
  }

  private storage(): StorageLike | null {
    try {
      return this.getStorage()
    } catch {
      return null
    }
  }

  async get(id: string): Promise<Vault | null> {
    try {
      assertValidVaultId(id)
      const storage = this.storage()
      if (!storage) return null
      const raw = storage.getItem(LOCAL_STORAGE_KEY_PREFIX + id)
      return raw === null ? null : parseStoredVault(raw, id)
    } catch (error) {
      this.report(error, "Could not read the vault from browser storage.")
      return null
    }
  }

  async save(vault: Vault): Promise<void> {
    try {
      const valid = parseVaultForWrite(vault)
      const storage = this.storage()
      if (!storage) throw new VaultStoreError("io", "Browser storage is unavailable.")
      storage.setItem(LOCAL_STORAGE_KEY_PREFIX + valid.id, JSON.stringify(valid))
    } catch (error) {
      this.report(error, "Could not save the vault to browser storage.")
    }
  }

  async list(): Promise<VaultSummary[]> {
    const summaries: VaultSummary[] = []
    try {
      const storage = this.storage()
      if (!storage) return summaries
      for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index)
        if (!key || !key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) continue
        const id = key.slice(LOCAL_STORAGE_KEY_PREFIX.length)
        try {
          assertValidVaultId(id)
          const raw = storage.getItem(key)
          if (raw !== null) summaries.push(toSummary(parseStoredVault(raw, id)))
        } catch (error) {
          this.report(error, "Skipped an unreadable vault in browser storage.")
        }
      }
    } catch (error) {
      this.report(error, "Could not list vaults in browser storage.")
    }
    return summaries
  }

  async delete(id: string): Promise<void> {
    try {
      assertValidVaultId(id)
      this.storage()?.removeItem(LOCAL_STORAGE_KEY_PREFIX + id)
    } catch (error) {
      this.report(error, "Could not delete the vault from browser storage.")
    }
  }
}
