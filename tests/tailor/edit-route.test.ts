import { describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/tailor/edit/route"
import { MAX_BODY_BYTES } from "@/lib/tailor/requests"
import { loadAlexVault, makeDeps } from "./helpers"

vi.mock("@/lib/tailor/wire", () => ({
  getTailorDeps: () =>
    makeDeps({
      checkDraft: async (draft) => ({
        clean: draft.note.some((s) => s.text.includes("Kubernetes")) ? { ...draft, note: [] } : draft,
        removed: draft.note.some((s) => s.text.includes("Kubernetes"))
          ? [{ section: "note", text: "Kubernetes", reason: "unknown_fact" }]
          : [],
      }),
    }),
}))

function post(body: string) {
  return POST(new Request("http://localhost/api/tailor/edit", { method: "POST", body, headers: { "Content-Type": "application/json" } }))
}

const draft = { tagline: "", about: [], projects: [], resumeBullets: [], note: [{ text: "Hello there.", factIds: [] }] }
const base = { vault: loadAlexVault(), draft, ref: { section: "note", index: 0 }, newText: "Hello again." }

describe("/api/tailor/edit", () => {
  it("rejects invalid JSON, unknown keys and bad refs with 400", async () => {
    expect((await post("{nope")).status).toBe(400)
    expect((await post(JSON.stringify({ ...base, extra: 1 }))).status).toBe(400)
    expect((await post(JSON.stringify({ ...base, ref: { section: "other", index: 0 } }))).status).toBe(400)
    expect((await post(JSON.stringify({ ...base, ref: { section: "note", index: -1 } }))).status).toBe(400)
  })

  it("rejects an oversize body with 413", async () => {
    expect((await post(JSON.stringify({ pad: "x".repeat(MAX_BODY_BYTES + 10) }))).status).toBe(413)
  })

  it("returns the new draft when the edit passes the check", async () => {
    const response = await post(JSON.stringify(base))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.draft.note[0].text).toBe("Hello again.")
  })

  it("answers a rejected edit with 200 and ok:false, never an error status", async () => {
    const response = await post(JSON.stringify({ ...base, newText: "We run Kubernetes." }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ ok: false, reason: "unknown_fact", suggestion: { kind: "add_fact" } })
  })
})
