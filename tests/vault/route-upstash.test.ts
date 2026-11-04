import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DELETE, GET, PUT } from "@/app/api/vault/[id]/route"
import { createVaultId } from "@/lib/vault/id"
import { FAKE_TOKEN, FAKE_URL, createFakeUpstash } from "./fake-upstash"
import { loadAlexVault } from "./helpers"

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

const call = {
  get: (id: string) => GET(new Request(`http://localhost/api/vault/${id}`), ctx(id)),
  put: (id: string, body: string) => PUT(new Request(`http://localhost/api/vault/${id}`, { method: "PUT", body }), ctx(id)),
  del: (id: string) => DELETE(new Request(`http://localhost/api/vault/${id}`, { method: "DELETE" }), ctx(id)),
}

let fake: ReturnType<typeof createFakeUpstash>
let logged: string[]

beforeEach(() => {
  fake = createFakeUpstash()
  logged = []
  vi.stubEnv("UPSTASH_REDIS_REST_URL", FAKE_URL)
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", FAKE_TOKEN)
  vi.stubEnv("VERCEL", "1")
  // The store binds the global fetch at construction, which happens inside each request.
  vi.stubGlobal("fetch", (input: string, init: RequestInit) => fake.fetchImpl(input, init))
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    logged.push(args.join(" "))
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("/api/vault/[id] with Upstash on Vercel", () => {
  it("PUT, GET and DELETE work against the configured store instead of returning 501", async () => {
    const vault = { ...loadAlexVault(), id: createVaultId() }
    expect((await call.put(vault.id, JSON.stringify(vault))).status).toBe(200)
    const fetched = await call.get(vault.id)
    expect(fetched.status).toBe(200)
    expect(await fetched.json()).toEqual(vault)

    expect((await call.del(vault.id)).status).toBe(200)
    expect((await call.get(vault.id)).status).toBe(404)
  })

  it("returns 501 on Vercel when no persistent store is configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "")
    const response = await call.get(createVaultId())
    expect(response.status).toBe(501)
  })

  it("never reflects the vault id in error bodies or logs", async () => {
    const id = createVaultId()
    const vault = { ...loadAlexVault(), id }
    const responses: Response[] = []

    responses.push(await call.get(id)) // 404
    responses.push(await call.put(id, "{not json")) // 400
    responses.push(await call.put(id, JSON.stringify({ ...vault, id: createVaultId() }))) // 400 mismatch
    responses.push(await call.put(id, JSON.stringify({ id }))) // 400 validation

    fake.strings.set(`vault:${id}`, "{corrupt")
    responses.push(await call.get(id)) // 500 corrupt

    vi.stubGlobal("fetch", async () => {
      throw new Error(`network down ${id} ${FAKE_TOKEN}`)
    })
    responses.push(await call.get(id)) // 500 io
    responses.push(await call.put(id, JSON.stringify(vault))) // 500 io

    expect(responses.map((response) => response.status)).toEqual([404, 400, 400, 400, 500, 500, 500])
    for (const response of responses) {
      const text = await response.text()
      expect(text).not.toContain(id)
      expect(text).not.toContain(FAKE_TOKEN)
    }
    for (const line of logged) {
      expect(line).not.toContain(id)
      expect(line).not.toContain(FAKE_TOKEN)
    }
  })

  it("exposes no listing: the route module has no list handler", async () => {
    const route = await import("@/app/api/vault/[id]/route")
    expect(Object.keys(route).filter((key) => /^[A-Z]+$/.test(key)).sort()).toEqual(["DELETE", "GET", "PUT"])
  })
})
