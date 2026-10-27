import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MockClient } from "@/lib/llm/mock"
import { PROJECT_QUESTIONS } from "@/lib/questions/questions"
import { alexChenVault, answersJson, makeProject } from "./helpers"

const llmState = vi.hoisted(() => ({ client: null as unknown }))

vi.mock("@/lib/llm", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/llm")>()
  return { ...original, getLLMClient: () => llmState.client }
})

import { POST } from "@/app/api/questions/draft/route"

function request(body: unknown): Request {
  return new Request("http://localhost/api/questions/draft", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined)
  llmState.client = new MockClient()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("POST /api/questions/draft", () => {
  it.each([
    ["invalid JSON", "not json"],
    ["a body with no project", {}],
    ["a project that fails the schema", { project: { id: "x" } }],
  ])("rejects %s with 400", async (_label, body) => {
    const response = await POST(request(body))
    expect(response.status).toBe(400)
  })

  it("rejects an oversize body with 413", async () => {
    const response = await POST(request("x".repeat(1_000_001)))
    expect(response.status).toBe(413)
  })

  it("returns three needs_user drafts for a project without a snapshot, without calling the model", async () => {
    const client = new MockClient({ responses: [] })
    const generate = vi.spyOn(client, "generate")
    llmState.client = client

    const response = await POST(request({ project: makeProject({ sourceSnapshot: undefined }) }))
    const body = (await response.json()) as { drafts: Array<{ status: string }> }

    expect(response.status).toBe(200)
    expect(body.drafts).toHaveLength(3)
    expect(body.drafts.every((draft) => draft.status === "needs_user")).toBe(true)
    expect(generate).not.toHaveBeenCalled()
  })

  it("maps unreadable model output to a 502 without crashing", async () => {
    llmState.client = new MockClient({ responses: ["not json", "still not json"] })
    const response = await POST(request({ project: makeProject() }))
    expect(response.status).toBe(502)
    expect(((await response.json()) as { code: string }).code).toBe("invalid_output")
  })
})

describe("alex-chen canvas-flow walkthrough", () => {
  it("returns this exact JSON for the fixture project with a scripted MockClient", async () => {
    const project = alexChenVault().projects.find((candidate) => candidate.id === "proj_canvas-flow")!
    llmState.client = new MockClient({
      responses: [
        answersJson([
          { questionId: "hard", status: "needs_user", followUp: "What made rendering at this scale hard before WebGL?" },
          {
            questionId: "decided",
            status: "drafted",
            text: "I built the engine with WebGL and React.",
            evidence: "built with WebGL and React",
          },
          {
            questionId: "happened",
            status: "drafted",
            text: "It now serves 3,840 stars.",
            evidence: "built with WebGL and React",
          },
        ]),
      ],
    })

    const response = await POST(request({ project }))
    const body = await response.json()
    console.info(`[draft-route alex-chen] ${JSON.stringify(body, null, 2)}`)

    expect(response.status).toBe(200)
    expect(body).toEqual({
      drafts: [
        {
          questionId: "hard",
          status: "needs_user",
          followUp: "What made rendering at this scale hard before WebGL?",
        },
        {
          questionId: "decided",
          status: "drafted",
          text: "I built the engine with WebGL and React.",
          evidence: "built with WebGL and React",
        },
        { questionId: "happened", status: "needs_user", followUp: PROJECT_QUESTIONS[2].text },
      ],
    })
  })
})
