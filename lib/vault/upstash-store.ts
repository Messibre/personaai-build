import type { Vault } from "@/lib/schemas/vault"
import {
  VaultStoreError,
  assertValidVaultId,
  parseStoredVault,
  parseVaultForWrite,
  toSummary,
  type VaultStore,
  type VaultSummary,
} from "@/lib/vault/store"

/*
 * Security notes
 * - Anyone with the link can read and write that vault. There are no accounts.
 * - Ids come from createVaultId() (192 random bits), so they are unguessable. Never log them,
 *   never put them in error messages, never list them publicly. list() is internal only.
 * - DELETE exists so users can erase their data.
 * - Only the fixed https://*.upstash.io host from env is ever contacted. The vault id is only
 *   ever sent in the request body, never in the URL.
 */

const REQUEST_TIMEOUT_MS = 5_000
const KEY_PREFIX = "vault:"
const INDEX_KEY = "vaults:index"

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>

export interface UpstashConfig {
  url: string
  token: string
}

export interface UpstashStoreOptions {
  /** Defaults to the global fetch. Injected by tests so no network is touched. */
  fetchImpl?: FetchLike
}

export function parseUpstashConfig(url: string | undefined, token: string | undefined): UpstashConfig {
  if (!url || !token) {
    throw new VaultStoreError("config", "Upstash is not configured.")
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new VaultStoreError("config", "UPSTASH_REDIS_REST_URL must be an https URL ending in .upstash.io.")
  }
  const hostOk = parsed.hostname.endsWith(".upstash.io") && parsed.hostname.length > ".upstash.io".length
  if (parsed.protocol !== "https:" || !hostOk || parsed.username || parsed.password) {
    throw new VaultStoreError("config", "UPSTASH_REDIS_REST_URL must be an https URL ending in .upstash.io.")
  }
  return { url: parsed.origin, token }
}

type RedisArg = string | number
type RedisResult = { result?: unknown; error?: string }

export class UpstashVaultStore implements VaultStore {
  private readonly config: UpstashConfig
  private readonly fetchImpl: FetchLike

  constructor(
    url: string | undefined = process.env.UPSTASH_REDIS_REST_URL,
    token: string | undefined = process.env.UPSTASH_REDIS_REST_TOKEN,
    options: UpstashStoreOptions = {},
  ) {
    this.config = parseUpstashConfig(url, token)
    // Not a direct call: the host was validated above, so this is a fixed-provider request.
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis)
  }

  async get(id: string): Promise<Vault | null> {
    assertValidVaultId(id)
    const raw = await this.command(["GET", KEY_PREFIX + id])
    if (raw === null || raw === undefined) return null
    if (typeof raw !== "string") throw new VaultStoreError("corrupt", "Stored vault is not valid JSON.")
    return parseStoredVault(raw, id)
  }

  async save(vault: Vault): Promise<void> {
    const valid = parseVaultForWrite(vault)
    await this.pipeline([
      ["SET", KEY_PREFIX + valid.id, JSON.stringify(valid)],
      ["SADD", INDEX_KEY, valid.id],
    ])
  }

  async delete(id: string): Promise<void> {
    assertValidVaultId(id)
    await this.pipeline([
      ["DEL", KEY_PREFIX + id],
      ["SREM", INDEX_KEY, id],
    ])
  }

  /** Internal only (M7 admin). Unreadable or missing entries are skipped. */
  async list(): Promise<VaultSummary[]> {
    const members = await this.command(["SMEMBERS", INDEX_KEY])
    if (!Array.isArray(members) || members.length === 0) return []
    const ids = members.filter((member): member is string => typeof member === "string")
    const values = await this.command(["MGET", ...ids.map((id) => KEY_PREFIX + id)])
    if (!Array.isArray(values)) return []
    const summaries: VaultSummary[] = []
    values.forEach((raw, index) => {
      if (typeof raw !== "string") return
      try {
        summaries.push(toSummary(parseStoredVault(raw, ids[index])))
      } catch {
        // Skip unreadable entries rather than failing the whole listing.
      }
    })
    return summaries
  }

  private async command(args: RedisArg[]): Promise<unknown> {
    const body = await this.post("", args)
    if (!body || typeof body !== "object") {
      throw new VaultStoreError("io", "Vault storage returned an unexpected response.")
    }
    const { result, error } = body as RedisResult
    if (error) throw new VaultStoreError("io", "Vault storage rejected the request.")
    return result
  }

  private async pipeline(commands: RedisArg[][]): Promise<void> {
    const body = await this.post("/pipeline", commands)
    if (!Array.isArray(body) || body.length !== commands.length) {
      throw new VaultStoreError("io", "Vault storage returned an unexpected response.")
    }
    if ((body as RedisResult[]).some((entry) => !entry || entry.error)) {
      throw new VaultStoreError("io", "Vault storage rejected the request.")
    }
  }

  private async post(path: string, payload: unknown): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(`${this.config.url}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch {
      throw new VaultStoreError("io", "Vault storage is unreachable.")
    }
    if (!response.ok) {
      throw new VaultStoreError("io", `Vault storage returned status ${response.status}.`)
    }
    try {
      return await response.json()
    } catch {
      throw new VaultStoreError("io", "Vault storage returned an unexpected response.")
    }
  }
}
