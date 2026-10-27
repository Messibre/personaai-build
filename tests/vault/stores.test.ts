import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FileVaultStore } from "@/lib/vault/file-store"
import {
  LOCAL_STORAGE_KEY_PREFIX,
  LocalStorageVaultStore,
  type StorageLike,
} from "@/lib/vault/local-storage-store"
import { MemoryVaultStore, VaultStoreError, type VaultStore } from "@/lib/vault/store"
import { loadAlexVault, loadResumeOnlyVault } from "./helpers"

class FakeStorage implements StorageLike {
  readonly items = new Map<string, string>()
  failSetItem: Error | null = null

  get length(): number {
    return this.items.size
  }
  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null
  }
  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    if (this.failSetItem) throw this.failSetItem
    this.items.set(key, value)
  }
  removeItem(key: string): void {
    this.items.delete(key)
  }
}

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vault-store-"))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

const implementations: Array<[string, () => VaultStore]> = [
  ["MemoryVaultStore", () => new MemoryVaultStore()],
  ["FileVaultStore", () => new FileVaultStore(path.join(tmpDir, "vaults"))],
  ["LocalStorageVaultStore", () => new LocalStorageVaultStore(() => new FakeStorageSingleton().storage)],
]

// One storage per test run so the LocalStorage store keeps state across calls within a test.
class FakeStorageSingleton {
  private static current = new FakeStorage()
  static reset(): void {
    FakeStorageSingleton.current = new FakeStorage()
  }
  get storage(): FakeStorage {
    return FakeStorageSingleton.current
  }
}

beforeEach(() => FakeStorageSingleton.reset())

describe.each(implementations)("%s contract", (_name, create) => {
  it("round-trips a vault and returns null for an unknown id", async () => {
    const store = create()
    const vault = loadAlexVault()
    expect(await store.get("unknown-vault")).toBeNull()
    await store.save(vault)
    expect(await store.get(vault.id)).toEqual(vault)
  })

  it("overwrites on save and lists summaries", async () => {
    const store = create()
    const alex = loadAlexVault()
    const priya = loadResumeOnlyVault()
    await store.save(alex)
    await store.save(priya)
    await store.save({ ...alex, person: { ...alex.person, name: "Alexander Chen" } })

    const list = await store.list()
    expect(list).toHaveLength(2)
    expect(list.find((s) => s.id === alex.id)?.name).toBe("Alexander Chen")
    expect(list.find((s) => s.id === priya.id)?.name).toBe("Priya Patel")
  })

  it("delete removes the vault and is idempotent", async () => {
    const store = create()
    const vault = loadAlexVault()
    await store.save(vault)
    await store.delete(vault.id)
    await store.delete(vault.id)
    expect(await store.get(vault.id)).toBeNull()
    expect(await store.list()).toEqual([])
  })

  it("does not alias stored state to the caller's object", async () => {
    const store = create()
    const vault = loadAlexVault()
    await store.save(vault)
    vault.person.name = "Mutated after save"
    const fetched = await store.get(vault.id)
    expect(fetched?.person.name).toBe("Alex Chen")
    fetched!.person.name = "Mutated after get"
    expect((await store.get(vault.id))?.person.name).toBe("Alex Chen")
  })
})

describe("MemoryVaultStore and FileVaultStore: error behaviour", () => {
  const strict: Array<[string, () => VaultStore]> = [implementations[0], implementations[1]]

  describe.each(strict)("%s", (_name, create) => {
    it("rejects an invalid vault and stores nothing", async () => {
      const store = create()
      const bad = { ...loadAlexVault(), id: "../escape-attempt" }
      await expect(store.save(bad)).rejects.toMatchObject({ code: "invalid_vault" })
      const bad2 = { ...loadAlexVault(), extra: true } as never
      await expect(store.save(bad2)).rejects.toMatchObject({ code: "invalid_vault" })
      expect(await store.list()).toEqual([])
    })

    it.each(["../etc/passwd", "a/b", "..", "short", "has.dot_1234", "x".repeat(65), ""])(
      "rejects path-unsafe id %j on get and delete",
      async (id) => {
        const store = create()
        await expect(store.get(id)).rejects.toMatchObject({ code: "invalid_id" })
        await expect(store.delete(id)).rejects.toMatchObject({ code: "invalid_id" })
      },
    )
  })
})

describe("FileVaultStore", () => {
  it("never writes outside its directory and leaves no temp files after saving", async () => {
    const dir = path.join(tmpDir, "vaults")
    const store = new FileVaultStore(dir)
    await expect(store.get("../../outside-file")).rejects.toBeInstanceOf(VaultStoreError)
    await store.save(loadAlexVault())

    expect(await fs.readdir(tmpDir)).toEqual(["vaults"])
    expect(await fs.readdir(dir)).toEqual(["vault_alex-chen.json"])
  })

  it("reports a corrupt file as corrupt without leaking the path", async () => {
    const dir = path.join(tmpDir, "vaults")
    await fs.mkdir(dir)
    await fs.writeFile(path.join(dir, "vault_alex-chen.json"), "{ not json", "utf8")

    const error = await new FileVaultStore(dir).get("vault_alex-chen").catch((e: unknown) => e)
    expect(error).toBeInstanceOf(VaultStoreError)
    expect((error as VaultStoreError).code).toBe("corrupt")
    expect((error as VaultStoreError).message).not.toContain(tmpDir)
  })

  it("treats schema-invalid files and files whose id does not match their name as corrupt", async () => {
    const dir = path.join(tmpDir, "vaults")
    await fs.mkdir(dir)
    await fs.writeFile(path.join(dir, "vault_alex-chen.json"), JSON.stringify({ hello: "world" }), "utf8")
    await fs.writeFile(
      path.join(dir, "vault_other-one.json"),
      JSON.stringify(loadAlexVault()), // carries id vault_alex-chen
      "utf8",
    )

    const store = new FileVaultStore(dir)
    await expect(store.get("vault_alex-chen")).rejects.toMatchObject({ code: "corrupt" })
    await expect(store.get("vault_other-one")).rejects.toMatchObject({ code: "corrupt" })
  })

  it("lists healthy vaults while skipping corrupt files and unrelated entries", async () => {
    const dir = path.join(tmpDir, "vaults")
    const store = new FileVaultStore(dir)
    await store.save(loadAlexVault())
    await fs.writeFile(path.join(dir, "broken-vault.json"), "garbage", "utf8")
    await fs.writeFile(path.join(dir, "notes.txt"), "hi", "utf8")
    await fs.writeFile(path.join(dir, "vault_alex-chen.abc.tmp"), "partial", "utf8")

    const list = await store.list()
    expect(list.map((s) => s.id)).toEqual(["vault_alex-chen"])
  })

  it("lists an empty array when the directory does not exist yet", async () => {
    expect(await new FileVaultStore(path.join(tmpDir, "missing")).list()).toEqual([])
  })

  it("concurrent saves to the same id leave one complete, valid vault and no temp files", async () => {
    const dir = path.join(tmpDir, "vaults")
    const store = new FileVaultStore(dir)
    const base = loadAlexVault()
    const names = Array.from({ length: 25 }, (_, i) => `Writer ${i}`)

    await Promise.all(names.map((name) => store.save({ ...base, person: { ...base.person, name } })))

    const final = await store.get(base.id)
    expect(final).not.toBeNull()
    expect(names).toContain(final!.person.name)
    expect(await fs.readdir(dir)).toEqual(["vault_alex-chen.json"])
  })

  it("reports an io error (without paths) when the directory cannot be created", async () => {
    const blocker = path.join(tmpDir, "file-not-dir")
    await fs.writeFile(blocker, "x", "utf8")
    const error = await new FileVaultStore(path.join(blocker, "vaults"))
      .save(loadAlexVault())
      .catch((e: unknown) => e)
    expect(error).toMatchObject({ code: "io" })
    expect((error as Error).message).not.toContain(tmpDir)
  })

  it("defaults the directory from VAULT_DATA_DIR", async () => {
    vi.stubEnv("VAULT_DATA_DIR", path.join(tmpDir, "from-env"))
    try {
      await new FileVaultStore().save(loadAlexVault())
      expect(await fs.readdir(path.join(tmpDir, "from-env"))).toEqual(["vault_alex-chen.json"])
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe("LocalStorageVaultStore", () => {
  it("returns null and records the error when the stored value is corrupt", async () => {
    const storage = new FakeStorage()
    storage.items.set(`${LOCAL_STORAGE_KEY_PREFIX}vault_alex-chen`, "{{{")
    const onError = vi.fn()
    const store = new LocalStorageVaultStore(() => storage, onError)

    expect(await store.get("vault_alex-chen")).toBeNull()
    expect(store.lastError?.code).toBe("corrupt")
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it("does not throw when storage is full, reports it, and keeps the previous value", async () => {
    const storage = new FakeStorage()
    const onError = vi.fn()
    const store = new LocalStorageVaultStore(() => storage, onError)
    const vault = loadAlexVault()
    await store.save(vault)

    storage.failSetItem = new DOMException("full", "QuotaExceededError")
    await expect(store.save({ ...vault, person: { ...vault.person, name: "Changed" } })).resolves.toBeUndefined()

    expect(onError).toHaveBeenCalledTimes(1)
    expect(store.lastError?.code).toBe("io")
    storage.failSetItem = null
    expect((await store.get(vault.id))?.person.name).toBe("Alex Chen")
  })

  it("does not throw when storage is unavailable", async () => {
    const onError = vi.fn()
    const store = new LocalStorageVaultStore(() => null, onError)
    await expect(store.save(loadAlexVault())).resolves.toBeUndefined()
    expect(await store.get("vault_alex-chen")).toBeNull()
    expect(await store.list()).toEqual([])
    await expect(store.delete("vault_alex-chen")).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it("survives a storage provider that throws", async () => {
    const store = new LocalStorageVaultStore(() => {
      throw new Error("SecurityError")
    })
    await expect(store.save(loadAlexVault())).resolves.toBeUndefined()
    expect(await store.get("vault_alex-chen")).toBeNull()
  })

  it("lists only its own healthy entries", async () => {
    const storage = new FakeStorage()
    const store = new LocalStorageVaultStore(() => storage, vi.fn())
    await store.save(loadAlexVault())
    storage.items.set("some-other-app:key", "value")
    storage.items.set(`${LOCAL_STORAGE_KEY_PREFIX}vault_broken-one`, "nope")

    const list = await store.list()
    expect(list.map((s) => s.id)).toEqual(["vault_alex-chen"])
    expect(store.lastError?.code).toBe("corrupt")
  })

  it("refuses to save an invalid vault and reports invalid_vault", async () => {
    const storage = new FakeStorage()
    const store = new LocalStorageVaultStore(() => storage, vi.fn())
    await store.save({ ...loadAlexVault(), id: "bad/id/with/slashes" })
    expect(storage.items.size).toBe(0)
    expect(store.lastError?.code).toBe("invalid_vault")
  })

  it("rejects path-like ids on get and delete without touching storage", async () => {
    const storage = new FakeStorage()
    storage.items.set("unrelated", "keep")
    const store = new LocalStorageVaultStore(() => storage, vi.fn())
    expect(await store.get("../x")).toBeNull()
    await store.delete("../x")
    expect(storage.items.get("unrelated")).toBe("keep")
    expect(store.lastError?.code).toBe("invalid_id")
  })
})
