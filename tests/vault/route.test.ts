import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DELETE, GET, PUT } from "@/app/api/vault/[id]/route"
import { loadAlexVault } from "./helpers"

let tmpDir: string

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

function put(id: string, body: string): Promise<Response> {
  return PUT(new Request(`http://localhost/api/vault/${id}`, { method: "PUT", body }), ctx(id))
}

function get(id: string): Promise<Response> {
  return GET(new Request(`http://localhost/api/vault/${id}`), ctx(id))
}

function del(id: string): Promise<Response> {
  return DELETE(new Request(`http://localhost/api/vault/${id}`, { method: "DELETE" }), ctx(id))
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "vault-route-"))
  vi.stubEnv("VAULT_DATA_DIR", path.join(tmpDir, "vaults"))
  vi.stubEnv("VERCEL", "")
  vi.spyOn(console, "error").mockImplementation(() => undefined)
})

afterEach(async () => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe("/api/vault/[id]", () => {
  it("PUT then GET round-trips a vault", async () => {
    const vault = loadAlexVault()
    const saved = await put(vault.id, JSON.stringify(vault))
    expect(saved.status).toBe(200)
    expect(await saved.json()).toEqual({ id: vault.id, updatedAt: vault.updatedAt })

    const fetched = await get(vault.id)
    expect(fetched.status).toBe(200)
    expect(await fetched.json()).toEqual(vault)
  })

  it("GET returns 404 for a vault that does not exist", async () => {
    expect((await get("vault_nobody-here")).status).toBe(404)
  })

  it.each(["..", "a.b", "short", "x".repeat(65)])("rejects invalid id %j with 400", async (id) => {
    expect((await get(id)).status).toBe(400)
    expect((await put(id, "{}")).status).toBe(400)
    expect((await del(id)).status).toBe(400)
  })

  it("PUT rejects non-JSON, invalid vaults and mismatched ids with 400", async () => {
    const vault = loadAlexVault()
    expect((await put(vault.id, "not json")).status).toBe(400)

    const invalid = await put(vault.id, JSON.stringify({ ...vault, admin: true }))
    expect(invalid.status).toBe(400)
    expect(((await invalid.json()) as { issues: unknown[] }).issues.length).toBeGreaterThan(0)

    const mismatch = await put("vault_different-id", JSON.stringify(vault))
    expect(mismatch.status).toBe(400)
    expect(await get("vault_different-id")).toHaveProperty("status", 404)
  })

  it("PUT rejects bodies over 1 MB with 413 and writes nothing", async () => {
    const vault = loadAlexVault()
    const oversized = JSON.stringify({ ...vault, padding: "x".repeat(1_000_001) })
    expect((await put(vault.id, oversized)).status).toBe(413)
    expect((await get(vault.id)).status).toBe(404)
  })

  it("DELETE removes a vault, then reports 404", async () => {
    const vault = loadAlexVault()
    await put(vault.id, JSON.stringify(vault))
    expect((await del(vault.id)).status).toBe(200)
    expect((await get(vault.id)).status).toBe(404)
    expect((await del(vault.id)).status).toBe(404)
  })

  it("reports a corrupt stored vault as 500 with a trace id and no filesystem path", async () => {
    const dir = path.join(tmpDir, "vaults")
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, "vault_alex-chen.json"), "garbage", "utf8")

    const response = await get("vault_alex-chen")
    expect(response.status).toBe(500)
    const text = await response.text()
    expect(text).not.toContain(tmpDir)
    expect(JSON.parse(text)).toMatchObject({ error: "Stored vault is unreadable." })
    expect(JSON.parse(text).traceId).toMatch(/^[0-9a-f-]{36}$/)

    // A corrupt vault can still be removed.
    expect((await del("vault_alex-chen")).status).toBe(200)
    expect((await get("vault_alex-chen")).status).toBe(404)
  })

  it("is disabled on Vercel, where the filesystem is not persistent", async () => {
    vi.stubEnv("VERCEL", "1")
    const vault = loadAlexVault()
    expect((await get(vault.id)).status).toBe(501)
    expect((await put(vault.id, JSON.stringify(vault))).status).toBe(501)
    expect((await del(vault.id)).status).toBe(501)
  })
})
