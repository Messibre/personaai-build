import { FileVaultStore } from "@/lib/vault/file-store"
import { VaultStoreError, type VaultStore } from "@/lib/vault/store"
import { UpstashVaultStore } from "@/lib/vault/upstash-store"

export const NO_PERSISTENT_STORE_MESSAGE = "Vault storage is not available on this deployment."

type Env = Record<string, string | undefined>

/**
 * Upstash when a REST URL and token are set (either the UPSTASH_REDIS_REST_* names or the
 * KV_REST_API_* names the Vercel Upstash integration injects); the file store when not on
 * Vercel (local dev); otherwise there is nowhere durable to write, so fail instead of silently
 * losing data.
 */
export function getServerVaultStore(env: Env = process.env): VaultStore {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN
  if (url && token) {
    return new UpstashVaultStore(url, token)
  }
  if (!env.VERCEL) {
    return new FileVaultStore()
  }
  throw new VaultStoreError("config", NO_PERSISTENT_STORE_MESSAGE)
}
