import { describe, expect, it } from "vitest"
import { UpstashVaultStore, parseUpstashConfig } from "@/lib/vault/upstash-store"
import { VaultStoreError } from "@/lib/vault/store"
import { FAKE_TOKEN, FAKE_URL, createFakeUpstash } from "./fake-upstash"
import { loadAlexVault, loadResumeOnlyVault } from "./helpers"

function makeStore() {
  const fake = createFakeUpstash()
  return { fake, store: new UpstashVaultStore(FAKE_URL, FAKE_TOKEN, { fetchImpl: fake.fetchImpl }) }
}

describe("UpstashVaultStore", () => {
  it("round-trips a vault and keeps the index in sync", async () => {
    const { fake, store } = makeStore()
    const vault = loadAlexVault()
    await store.save(vault)

    expect(await store.get(vault.id)).toEqual(vault)
    expect(fake.strings.has(`vault:${vault.id}`)).toBe(true)
    expect(fake.sets.get("vaults:index")?.has(vault.id)).toBe(true)
  })

  it("returns null (404 case) for a vault that does not exist", async () => {
    const { store } = makeStore()
    expect(await store.get("vault_nobody-here")).toBeNull()
  })

  it("replaces a vault saved twice instead of duplicating it", async () => {
    const { store } = makeStore()
    const vault = loadAlexVault()
    await store.save(vault)
    await store.save({ ...vault, person: { ...vault.person, name: "Renamed" } })
    const listed = await store.list()
    expect(listed).toHaveLength(1)
    expect(listed[0].name).toBe("Renamed")
  })

  it("delete removes the value and the index entry", async () => {
    const { fake, store } = makeStore()
    const vault = loadAlexVault()
    await store.save(vault)
    await store.delete(vault.id)
    expect(await store.get(vault.id)).toBeNull()
    expect(fake.sets.get("vaults:index")?.size).toBe(0)
  })

  it("list returns summaries and skips unreadable entries", async () => {
    const { fake, store } = makeStore()
    const alex = loadAlexVault()
    const resume = loadResumeOnlyVault()
    await store.save(alex)
    await store.save(resume)
    fake.strings.set(`vault:${resume.id}`, "{not json")
    const listed = await store.list()
    expect(listed.map((entry) => entry.id)).toEqual([alex.id])
  })

  it("throws a corrupt error for a value that is not valid JSON or not a vault", async () => {
    const { fake, store } = makeStore()
    const vault = loadAlexVault()
    fake.strings.set(`vault:${vault.id}`, "{not json")
    await expect(store.get(vault.id)).rejects.toMatchObject({ code: "corrupt" })

    fake.strings.set(`vault:${vault.id}`, JSON.stringify({ hello: "world" }))
    await expect(store.get(vault.id)).rejects.toMatchObject({ code: "corrupt" })
  })

  it("rejects a stored vault whose id does not match its key", async () => {
    const { fake, store } = makeStore()
    const alex = loadAlexVault()
    const resume = loadResumeOnlyVault()
    fake.strings.set(`vault:${resume.id}`, JSON.stringify(alex))
    await expect(store.get(resume.id)).rejects.toMatchObject({ code: "corrupt" })
  })

  it("refuses to save an invalid vault and never contacts Upstash", async () => {
    const { fake, store } = makeStore()
    await expect(store.save({ id: "x" } as never)).rejects.toMatchObject({ code: "invalid_vault" })
    expect(fake.requests).toHaveLength(0)
  })

  it("rejects invalid ids before any request", async () => {
    const { fake, store } = makeStore()
    await expect(store.get("..")).rejects.toMatchObject({ code: "invalid_id" })
    await expect(store.delete("a/b")).rejects.toMatchObject({ code: "invalid_id" })
    expect(fake.requests).toHaveLength(0)
  })

  it("sends the bearer token, an abort signal, and only the vault id in the body, never the URL", async () => {
    const { fake, store } = makeStore()
    const vault = loadAlexVault()
    await store.save(vault)
    await store.get(vault.id)
    for (const request of fake.requests) {
      expect(request.authorization).toBe(`Bearer ${FAKE_TOKEN}`)
      expect(request.signal).toBeInstanceOf(AbortSignal)
      expect(request.url).not.toContain(vault.id)
      expect(new URL(request.url).origin).toBe(FAKE_URL)
    }
  })

  it("wraps network failures and non-2xx responses without leaking the token or the id", async () => {
    const vault = loadAlexVault()
    const failing = new UpstashVaultStore(FAKE_URL, FAKE_TOKEN, {
      fetchImpl: async () => {
        throw new Error(`boom ${FAKE_TOKEN} ${vault.id}`)
      },
    })
    const unauthorized = new UpstashVaultStore(FAKE_URL, FAKE_TOKEN, {
      fetchImpl: async () => new Response("nope", { status: 401 }),
    })
    for (const store of [failing, unauthorized]) {
      const error = await store.get(vault.id).catch((caught: unknown) => caught)
      expect(error).toBeInstanceOf(VaultStoreError)
      expect((error as VaultStoreError).code).toBe("io")
      expect((error as Error).message).not.toContain(FAKE_TOKEN)
      expect((error as Error).message).not.toContain(vault.id)
    }
  })

  it("turns a Redis-level error in the response body into an io error", async () => {
    const store = new UpstashVaultStore(FAKE_URL, FAKE_TOKEN, {
      fetchImpl: async () => new Response(JSON.stringify({ error: "WRONGTYPE" }), { status: 200 }),
    })
    await expect(store.get("vault_nobody-here")).rejects.toMatchObject({ code: "io" })
  })
})

describe("parseUpstashConfig", () => {
  it("accepts an https *.upstash.io url and normalises it to the origin", () => {
    expect(parseUpstashConfig("https://eu1-fancy-12345.upstash.io/", "t").url).toBe("https://eu1-fancy-12345.upstash.io")
  })

  it.each([
    "http://fake-db.upstash.io",
    "https://evil.example.com",
    "https://upstash.io.evil.com",
    "https://notupstash.io",
    "https://.upstash.io",
    "https://user:pw@fake-db.upstash.io",
    "not a url",
    "ftp://fake-db.upstash.io",
  ])("rejects %j with a config error", (url) => {
    expect(() => parseUpstashConfig(url, "t")).toThrowError(VaultStoreError)
    try {
      parseUpstashConfig(url, "t")
    } catch (error) {
      expect((error as VaultStoreError).code).toBe("config")
    }
  })

  it("rejects a missing url or token", () => {
    expect(() => parseUpstashConfig(undefined, "t")).toThrowError(VaultStoreError)
    expect(() => parseUpstashConfig(FAKE_URL, undefined)).toThrowError(VaultStoreError)
  })

  it("the store constructor applies the same validation", () => {
    expect(() => new UpstashVaultStore("https://evil.example.com", "t")).toThrowError(VaultStoreError)
  })
})
