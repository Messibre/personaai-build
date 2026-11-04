import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryVaultStore } from "@/lib/vault/store"
import { HOUR, T0, app, vaultWith } from "./helpers"

const holder = vi.hoisted(() => ({ store: undefined as unknown as import("@/lib/vault/store").VaultStore, fail: false }))

vi.mock("@/lib/vault/index", () => ({
  NO_PERSISTENT_STORE_MESSAGE: "none",
  getServerVaultStore: () => {
    if (holder.fail) throw new Error("boom")
    return holder.store
  },
}))

import { GET } from "@/app/api/admin/metrics/route"

const TOKEN = "correct-horse-battery-staple-token"
const SECRET_VAULT_ID = "secret-vault-id-0001"
const SECRET_EMAIL = "alex.private@example.com"
const POSTING_HASH = "a".repeat(64)

function request(headers: Record<string, string> = {}, query = ""): Request {
  return new Request(`http://localhost/api/admin/metrics${query}`, { headers })
}

const authed = { authorization: `Bearer ${TOKEN}` }

beforeEach(async () => {
  holder.fail = false
  holder.store = new MemoryVaultStore()
  const vault = vaultWith(SECRET_VAULT_ID, [app("a", T0), app("b", T0 + 3 * HOUR, { feedback: { accurate: false, note: "too long" } })], "Alex Chen")
  await holder.store.save({ ...vault, person: { ...vault.person, email: SECRET_EMAIL } })
  vi.stubEnv("ADMIN_TOKEN", TOKEN)
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("GET /api/admin/metrics", () => {
  it("returns 503 when ADMIN_TOKEN is not configured, even with a header", async () => {
    vi.stubEnv("ADMIN_TOKEN", "")
    expect((await GET(request(authed))).status).toBe(503)
  })

  it("returns 401 without an Authorization header", async () => {
    expect((await GET(request())).status).toBe(401)
  })

  it("returns 401 for a wrong token, a wrong scheme and a prefix of the token", async () => {
    expect((await GET(request({ authorization: "Bearer nope" }))).status).toBe(401)
    expect((await GET(request({ authorization: `Basic ${TOKEN}` }))).status).toBe(401)
    expect((await GET(request({ authorization: `Bearer ${TOKEN.slice(0, 10)}` }))).status).toBe(401)
    expect((await GET(request({ authorization: `Bearer ${TOKEN}x` }))).status).toBe(401)
  })

  it("does not accept the token as a query parameter", async () => {
    expect((await GET(request({}, `?token=${TOKEN}`))).status).toBe(401)
  })

  it("returns metrics for a valid token, uncached", async () => {
    const response = await GET(request(authed))
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("no-store")
    const body = await response.json()
    expect(body).toMatchObject({ headline: "1 of 1", testedUsers: 1, returners: 1, feedbackCount: 1, accurateCount: 0, unreadableVaults: 0 })
    expect(body.perUser[0]).toMatchObject({ name: "Alex Chen", status: "returned", feedback: [{ accurate: false, note: "too long" }] })
  })

  it("never leaks vault ids, emails, facts or posting hashes", async () => {
    const vault = await holder.store.get(SECRET_VAULT_ID)
    expect(vault).not.toBeNull()
    const factText = vault?.projects[0]?.facts[0]?.text
    expect(factText).toBeTruthy()

    for (const query of ["", "?format=csv"]) {
      const text = await (await GET(request(authed, query))).text()
      expect(text).not.toContain(SECRET_VAULT_ID)
      expect(text).not.toContain(SECRET_EMAIL)
      expect(text).not.toContain(POSTING_HASH)
      expect(text).not.toContain(factText as string)
      expect(text).not.toContain("vaultId")
    }
  })

  it("serves CSV with a download header", async () => {
    const response = await GET(request(authed, "?format=csv"))
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/csv")
    expect(response.headers.get("content-disposition")).toContain("return-loop.csv")
    expect((await response.text()).split("\n")[0]).toContain("name,applications")
  })

  it("returns a generic 503 with a trace id when storage fails", async () => {
    holder.fail = true
    const response = await GET(request(authed))
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.traceId).toBeTruthy()
    expect(JSON.stringify(body)).not.toContain("boom")
  })
})
