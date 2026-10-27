import { VAULT_ID_PATTERN, vaultSchema, type Vault } from "@/lib/schemas/vault"

export interface VaultSummary {
  id: string
  name: string
  updatedAt: string
}

export interface VaultStore {
  get(id: string): Promise<Vault | null>
  save(vault: Vault): Promise<void>
  list(): Promise<VaultSummary[]>
  delete(id: string): Promise<void>
}

export type VaultStoreErrorCode = "invalid_id" | "invalid_vault" | "corrupt" | "io"

/** Messages are safe to show to a client: they never contain filesystem paths or vault contents. */
export class VaultStoreError extends Error {
  readonly code: VaultStoreErrorCode

  constructor(code: VaultStoreErrorCode, message: string) {
    super(message)
    this.name = "VaultStoreError"
    this.code = code
  }
}

export function isValidVaultId(id: unknown): id is string {
  return typeof id === "string" && VAULT_ID_PATTERN.test(id)
}

export function assertValidVaultId(id: unknown): asserts id is string {
  if (!isValidVaultId(id)) {
    throw new VaultStoreError("invalid_id", "Invalid vault id.")
  }
}

export function parseVaultForWrite(vault: unknown): Vault {
  const result = vaultSchema.safeParse(vault)
  if (!result.success) {
    throw new VaultStoreError("invalid_vault", "Vault failed validation and was not saved.")
  }
  return result.data
}

export function parseStoredVault(raw: string, expectedId: string): Vault {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw new VaultStoreError("corrupt", "Stored vault is not valid JSON.")
  }
  const result = vaultSchema.safeParse(json)
  if (!result.success || result.data.id !== expectedId) {
    throw new VaultStoreError("corrupt", "Stored vault does not match the vault schema.")
  }
  return result.data
}

export function toSummary(vault: Vault): VaultSummary {
  return { id: vault.id, name: vault.person.name, updatedAt: vault.updatedAt }
}

/** For tests. Stores deep copies so callers cannot mutate stored state by reference. */
export class MemoryVaultStore implements VaultStore {
  private readonly vaults = new Map<string, string>()

  async get(id: string): Promise<Vault | null> {
    assertValidVaultId(id)
    const raw = this.vaults.get(id)
    return raw === undefined ? null : parseStoredVault(raw, id)
  }

  async save(vault: Vault): Promise<void> {
    const valid = parseVaultForWrite(vault)
    this.vaults.set(valid.id, JSON.stringify(valid))
  }

  async list(): Promise<VaultSummary[]> {
    return [...this.vaults.entries()].map(([id, raw]) => toSummary(parseStoredVault(raw, id)))
  }

  async delete(id: string): Promise<void> {
    assertValidVaultId(id)
    this.vaults.delete(id)
  }
}
