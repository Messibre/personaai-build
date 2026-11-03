import { FileVaultStore } from "@/lib/vault/file-store"
import { VaultStoreError, type VaultStore } from "@/lib/vault/store"
import { UpstashVaultStore } from "@/lib/vault/upstash-store"

export const NO_PERSISTENT_STORE_MESSAGE = "Vault storage is not available on this deployment."

type Env = Record<string, string | undefined>

/**
 * Upstash when both env vars are set; the file store when not on Vercel (local dev);
 * otherwise there is nowhere durable to write, so fail instead of silently losing data.
 */
export function getServerVaultStore(env: Env = process.env): VaultStore {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashVaultStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
  }
  if (!env.VERCEL) {
    return new FileVaultStore()
  }
  throw new VaultStoreError("config", NO_PERSISTENT_STORE_MESSAGE)
}
