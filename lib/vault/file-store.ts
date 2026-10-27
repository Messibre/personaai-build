import { randomUUID } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import type { Vault } from "@/lib/schemas/vault"
import {
  VaultStoreError,
  assertValidVaultId,
  isValidVaultId,
  parseStoredVault,
  parseVaultForWrite,
  toSummary,
  type VaultStore,
  type VaultSummary,
} from "./store"

export const DEFAULT_VAULT_DATA_DIR = "data/vaults"

const VAULT_FILE_PATTERN = /^([A-Za-z0-9_-]{8,64})\.json$/

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "ENOENT"
}

/**
 * SERVER ONLY. Never import this from a client component (it pulls in node:fs).
 *
 * For local development and hand-testing only: Vercel's filesystem is not persistent,
 * so vaults written here disappear between invocations in production.
 */
export class FileVaultStore implements VaultStore {
  private readonly dir: string

  constructor(dir: string = process.env.VAULT_DATA_DIR || DEFAULT_VAULT_DATA_DIR) {
    this.dir = path.resolve(dir)
  }

  // The id regex excludes dots and separators, so the joined path cannot leave this.dir.
  private fileFor(id: string): string {
    assertValidVaultId(id)
    return path.join(this.dir, `${id}.json`)
  }

  async get(id: string): Promise<Vault | null> {
    const file = this.fileFor(id)
    let raw: string
    try {
      raw = await fs.readFile(file, "utf8")
    } catch (error) {
      if (isNotFound(error)) return null
      throw new VaultStoreError("io", "Could not read the vault.")
    }
    return parseStoredVault(raw, id)
  }

  async save(vault: Vault): Promise<void> {
    const valid = parseVaultForWrite(vault)
    const file = this.fileFor(valid.id)
    const temp = path.join(this.dir, `${valid.id}.${randomUUID()}.tmp`)

    try {
      await fs.mkdir(this.dir, { recursive: true })
      await fs.writeFile(temp, JSON.stringify(valid, null, 2), "utf8")
      await fs.rename(temp, file)
    } catch {
      // Best-effort cleanup: the original write failure is what the caller needs to see.
      await fs.rm(temp, { force: true }).catch(() => undefined)
      throw new VaultStoreError("io", "Could not write the vault.")
    }
  }

  /** Files that fail validation are left out of the listing rather than breaking it; `get` still reports them. */
  async list(): Promise<VaultSummary[]> {
    let names: string[]
    try {
      names = await fs.readdir(this.dir)
    } catch (error) {
      if (isNotFound(error)) return []
      throw new VaultStoreError("io", "Could not list vaults.")
    }

    const summaries: VaultSummary[] = []
    for (const name of names) {
      const match = VAULT_FILE_PATTERN.exec(name)
      if (!match || !isValidVaultId(match[1])) continue
      try {
        const vault = await this.get(match[1])
        if (vault) summaries.push(toSummary(vault))
      } catch (error) {
        if (error instanceof VaultStoreError && error.code === "corrupt") continue
        throw error
      }
    }
    return summaries
  }

  async delete(id: string): Promise<void> {
    const file = this.fileFor(id)
    try {
      await fs.rm(file, { force: true })
    } catch {
      throw new VaultStoreError("io", "Could not delete the vault.")
    }
  }
}
