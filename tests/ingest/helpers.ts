import { vi } from "vitest"

export type RouteReply = { status?: number; json?: unknown; text?: string } | Error

/** Recorded-style GitHub responses for alexchen-ui/canvas-flow. */
export const canvasFlowReplies: Record<string, RouteReply> = {
  "": {
    json: {
      name: "canvas-flow",
      description: "GPU-accelerated infinite canvas and diagramming engine built with WebGL and React",
      homepage: "https://canvasflow.dev",
      stargazers_count: 3840,
      forks_count: 290,
      topics: ["canvas", "webgl", "react", "diagrams", "typescript"],
    },
  },
  "/languages": { json: { TypeScript: 82000, GLSL: 12000, CSS: 5500, HTML: 500 } },
  "/readme": { text: "# canvas-flow\n\nAn infinite canvas for diagrams.\n\n## Why\nSVG could not keep up." },
  "/commits?per_page=10": {
    json: [
      { commit: { message: "Add spatial index for hit testing\n\nLong body that should be dropped" } },
      { commit: { message: "Fix pointer capture on touch devices" } },
      { commit: { message: "Introduce offscreen WebGL scene" } },
    ],
  },
}

export interface FetchStub {
  fetchMock: ReturnType<typeof vi.fn>
  calls: Array<{ url: string; headers: Record<string, string> }>
  maxInFlight: () => number
}

/** Stubs global fetch. Keys are the path after /repos/{owner}/{repo}. */
export function stubGitHubFetch(replies: Record<string, RouteReply> = canvasFlowReplies): FetchStub {
  const calls: FetchStub["calls"] = []
  let inFlight = 0
  let peak = 0

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, headers: { ...(init?.headers as Record<string, string> | undefined) } })
    inFlight += 1
    peak = Math.max(peak, inFlight)
    await new Promise((resolve) => setTimeout(resolve, 5))
    inFlight -= 1

    const suffix = url.replace(/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/?]+/, "")
    const reply = replies[suffix]
    if (reply instanceof Error) throw reply
    if (!reply) return new Response("not found", { status: 404 })
    const status = reply.status ?? 200
    if (reply.json !== undefined) return new Response(JSON.stringify(reply.json), { status })
    return new Response(reply.text ?? "", { status })
  })

  vi.stubGlobal("fetch", fetchMock)
  return { fetchMock, calls, maxInFlight: () => peak }
}
