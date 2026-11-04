import type { FetchLike } from "@/lib/vault/upstash-store"

export const FAKE_URL = "https://fake-db-1234.upstash.io"
export const FAKE_TOKEN = "test-token-not-a-secret"

export interface FakeUpstash {
  fetchImpl: FetchLike
  strings: Map<string, string>
  sets: Map<string, Set<string>>
  requests: { url: string; authorization: string | null; signal: AbortSignal | null | undefined; body: unknown }[]
}

type Command = (string | number)[]

export function createFakeUpstash(): FakeUpstash {
  const strings = new Map<string, string>()
  const sets = new Map<string, Set<string>>()
  const requests: FakeUpstash["requests"] = []

  function run(command: Command): { result: unknown } | { error: string } {
    const [name, ...args] = command.map((part, index) => (index === 0 ? String(part).toUpperCase() : String(part)))
    switch (name) {
      case "GET":
        return { result: strings.get(args[0]) ?? null }
      case "SET":
        strings.set(args[0], args[1])
        return { result: "OK" }
      case "DEL":
        return { result: strings.delete(args[0]) ? 1 : 0 }
      case "SADD": {
        const set = sets.get(args[0]) ?? new Set<string>()
        args.slice(1).forEach((member) => set.add(member))
        sets.set(args[0], set)
        return { result: 1 }
      }
      case "SREM":
        args.slice(1).forEach((member) => sets.get(args[0])?.delete(member))
        return { result: 1 }
      case "SMEMBERS":
        return { result: [...(sets.get(args[0]) ?? [])] }
      case "MGET":
        return { result: args.map((key) => strings.get(key) ?? null) }
      default:
        return { error: "ERR unknown command" }
    }
  }

  const fetchImpl: FetchLike = async (input, init) => {
    const body = JSON.parse(String(init.body))
    const headers = init.headers as Record<string, string>
    requests.push({ url: input, authorization: headers.Authorization ?? null, signal: init.signal, body })
    const path = new URL(input).pathname
    const payload = path === "/pipeline" ? (body as Command[]).map(run) : run(body as Command)
    return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } })
  }

  return { fetchImpl, strings, sets, requests }
}
