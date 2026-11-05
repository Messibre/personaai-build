import { describe, expect, it } from "vitest"
import { isValidVaultId, VaultStoreError } from "@/lib/vault/store"
import { createVaultId } from "@/lib/vault/id"
import { FileVaultStore } from "@/lib/vault/file-store"
import { getServerVaultStore } from "@/lib/vault/index"
import { UpstashVaultStore } from "@/lib/vault/upstash-store"
import { FAKE_TOKEN, FAKE_URL } from "./fake-upstash"

describe("createVaultId", () => {
  it("is 32 base64url characters and passes the vault id pattern", () => {
    const id = createVaultId()
    expect(id).toHaveLength(32)
    expect(id).toMatch(/^[A-Za-z0-9_-]{32}$/)
    expect(isValidVaultId(id)).toBe(true)
  })

  it("is unique across 1000 generations", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createVaultId()))
    expect(ids.size).toBe(1000)
  })
})

describe("getServerVaultStore", () => {
  it("uses Upstash when both env vars are set, even on Vercel", () => {
    const env = { UPSTASH_REDIS_REST_URL: FAKE_URL, UPSTASH_REDIS_REST_TOKEN: FAKE_TOKEN, VERCEL: "1" }
    expect(getServerVaultStore(env)).toBeInstanceOf(UpstashVaultStore)
  })

  it("accepts the KV_REST_API_* names injected by the Vercel Upstash integration", () => {
    const env = { KV_REST_API_URL: FAKE_URL, KV_REST_API_TOKEN: FAKE_TOKEN, VERCEL: "1" }
    expect(getServerVaultStore(env)).toBeInstanceOf(UpstashVaultStore)
  })

  it("uses the file store when not on Vercel and Upstash is not fully configured", () => {
    expect(getServerVaultStore({})).toBeInstanceOf(FileVaultStore)
    expect(getServerVaultStore({ UPSTASH_REDIS_REST_URL: FAKE_URL })).toBeInstanceOf(FileVaultStore)
    expect(getServerVaultStore({ UPSTASH_REDIS_REST_TOKEN: FAKE_TOKEN, UPSTASH_REDIS_REST_URL: "" })).toBeInstanceOf(
      FileVaultStore,
    )
  })

  it("throws the no-persistent-store config error on Vercel without Upstash", () => {
    for (const env of [{ VERCEL: "1" }, { VERCEL: "1", UPSTASH_REDIS_REST_URL: FAKE_URL }]) {
      try {
        getServerVaultStore(env)
        throw new Error("expected getServerVaultStore to throw")
      } catch (error) {
        expect(error).toBeInstanceOf(VaultStoreError)
        expect((error as VaultStoreError).code).toBe("config")
      }
    }
  })

  it("surfaces a config error for a non-upstash url instead of sending data there", () => {
    const env = { UPSTASH_REDIS_REST_URL: "https://evil.example.com", UPSTASH_REDIS_REST_TOKEN: FAKE_TOKEN }
    expect(() => getServerVaultStore(env)).toThrowError(VaultStoreError)
  })
})
