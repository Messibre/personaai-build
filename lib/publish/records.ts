import { VaultStoreError } from "@/lib/vault/store"

/** Small key-value surface for idempotency records and per-vault caps. */
export interface PublishRecords {
  get(key: string): Promise<string | null>
  /** Stores only if the key is absent. Returns whether this call stored it. */
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>
  set(key: string, value: string, ttlSeconds: number): Promise<void>
  delete(key: string): Promise<void>
  /** Increments a counter that expires `ttlSeconds` after its first increment. */
  increment(key: string, ttlSeconds: number): Promise<number>
}

export class MemoryPublishRecords implements PublishRecords {
  private readonly entries = new Map<string, { value: string; expires: number }>()

  constructor(private readonly now: () => number = Date.now) {}

  private live(key: string): { value: string; expires: number } | undefined {
    const entry = this.entries.get(key)
    if (entry && entry.expires <= this.now()) {
      this.entries.delete(key)
      return undefined
    }
    return entry
  }

  async get(key: string) {
    return this.live(key)?.value ?? null
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number) {
    if (this.live(key)) return false
    this.entries.set(key, { value, expires: this.now() + ttlSeconds * 1000 })
    return true
  }

  async set(key: string, value: string, ttlSeconds: number) {
    this.entries.set(key, { value, expires: this.now() + ttlSeconds * 1000 })
  }

  async delete(key: string) {
    this.entries.delete(key)
  }

  async increment(key: string, ttlSeconds: number) {
    const current = this.live(key)
    const next = Number(current?.value ?? 0) + 1
    this.entries.set(key, { value: String(next), expires: current?.expires ?? this.now() + ttlSeconds * 1000 })
    return next
  }
}

type Arg = string | number

export class UpstashPublishRecords implements PublishRecords {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async command(args: Arg[]): Promise<unknown> {
    let response: Response
    try {
      response = await fetch(this.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(args),
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      })
    } catch {
      throw new VaultStoreError("io", "Publishing records are unreachable.")
    }
    if (!response.ok) throw new VaultStoreError("io", "Publishing records rejected the request.")
    const body = (await response.json()) as { result?: unknown; error?: string }
    if (body.error) throw new VaultStoreError("io", "Publishing records rejected the request.")
    return body.result
  }

  async get(key: string) {
    const result = await this.command(["GET", key])
    return typeof result === "string" ? result : null
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number) {
    return (await this.command(["SET", key, value, "EX", ttlSeconds, "NX"])) === "OK"
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.command(["SET", key, value, "EX", ttlSeconds])
  }

  async delete(key: string) {
    await this.command(["DEL", key])
  }

  async increment(key: string, ttlSeconds: number) {
    const count = Number(await this.command(["INCR", key]))
    if (count === 1) await this.command(["EXPIRE", key, ttlSeconds])
    return count
  }
}

let memory: MemoryPublishRecords | undefined

export function getPublishRecords(env: Record<string, string | undefined> = process.env): PublishRecords {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN
  if (url && token) return new UpstashPublishRecords(url, token)
  if (env.VERCEL) throw new VaultStoreError("config", "Publishing records are not available on this deployment.")
  return (memory ??= new MemoryPublishRecords())
}
