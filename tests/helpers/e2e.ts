import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { vi } from "vitest"
import type { LLMClient, LLMGenerateRequest, LLMResult } from "@/lib/llm/types"
import type { RewriteContext } from "@/lib/rewrite/context"
import type { Draft } from "@/lib/schemas/draft"
import type { Vault } from "@/lib/schemas/vault"
import { COLOR_SCHEMES, type ColorScheme } from "@/lib/types"
import { draftFollowingLeads, readContextFromPrompt } from "../rewrite/helpers"

export const TEMPLATE = "bold-portrait" as const
export const COLOR_SCHEME = Object.keys(COLOR_SCHEMES)[0] as ColorScheme

export const JOBS = {
  ux: fs.readFileSync(path.resolve("fixtures/jobs/ux-engineer.txt"), "utf8"),
  frontend: fs.readFileSync(path.resolve("fixtures/jobs/frontend-engineer.txt"), "utf8"),
  ai: fs.readFileSync(path.resolve("fixtures/jobs/ai-engineer.txt"), "utf8"),
  injected: fs.readFileSync(path.resolve("fixtures/jobs/injected.txt"), "utf8"),
}

export function persona(name: string, file: "resume.txt" | "notion.md" | "github.json"): string {
  return fs.readFileSync(path.resolve("fixtures/personas", name, file), "utf8")
}

type Reply = string | LLMResult
type Handler = (req: LLMGenerateRequest) => Reply | Promise<Reply>

export interface ScriptHandlers {
  resume?: Handler
  questions?: Handler
  /** Defaults to a model that follows the lead facts exactly. */
  rewrite?: (context: RewriteContext, req: LLMGenerateRequest) => Draft | Reply | Promise<Draft | Reply>
  /** Defaults to "every sentence is supported". */
  entailment?: Handler
}

export interface ScriptedLLM {
  client: LLMClient
  prompts: LLMGenerateRequest[]
  rewritten: Draft[]
  allPromptText: () => string
}

/** One fake model that answers each pipeline call by recognising its system prompt, and records every request. */
export function scriptedLLM(handlers: ScriptHandlers = {}): ScriptedLLM {
  const prompts: LLMGenerateRequest[] = []
  const rewritten: Draft[] = []

  const normalize = (reply: Reply): LLMResult => (typeof reply === "string" ? { ok: true, text: reply } : reply)

  const client: LLMClient = {
    async generate(req) {
      prompts.push(req)
      const system = req.system ?? ""
      if (system.includes("extract structured career data")) {
        return normalize(handlers.resume ? await handlers.resume(req) : "{}")
      }
      if (system.includes("answer three questions")) {
        return normalize(handlers.questions ? await handlers.questions(req) : '{"answers":[]}')
      }
      if (system.includes("strict fact checker")) {
        if (handlers.entailment) return normalize(await handlers.entailment(req))
        const count = (req.prompt.match(/<sentence index=/g) ?? []).length
        const results = Array.from({ length: count }, (_, index) => ({ index, supported: true }))
        return normalize(JSON.stringify({ results }))
      }
      if (req.prompt.includes("BEGIN_CONTEXT_JSON")) {
        const context = readContextFromPrompt(req.prompt)
        const out = handlers.rewrite ? await handlers.rewrite(context, req) : draftFollowingLeads(context)
        if (typeof out === "string" || "ok" in out) return normalize(out as Reply)
        rewritten.push(out)
        return normalize(JSON.stringify(out))
      }
      return normalize("{}")
    },
  }

  return { client, prompts, rewritten, allPromptText: () => prompts.map((p) => `${p.system ?? ""}\n${p.prompt}`).join("\n") }
}

let ipCounter = 0
/** A fresh client address per call, so route rate limits only trip when a test means them to. */
export function freshIp(): string {
  ipCounter += 1
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`
}

export function postRequest(route: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": freshIp(), ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

export function vaultRequest(method: "GET" | "PUT" | "DELETE", id: string, body?: unknown): [Request, { params: Promise<{ id: string }> }] {
  const request = new Request(`http://localhost/api/vault/${id}`, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": freshIp() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  return [request, { params: Promise.resolve({ id }) }]
}

/** Local-dev env: file store in a fresh temp dir, gates open, no Upstash, not on Vercel. */
export function isolatedEnv(extra: Record<string, string> = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-vaults-"))
  vi.stubEnv("VAULT_DATA_DIR", dir)
  vi.stubEnv("VERCEL", "")
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "")
  vi.stubEnv("BETA_ACCESS_CODE", "")
  vi.stubEnv("ADMIN_TOKEN", "")
  vi.stubEnv("LLM_PROVIDER", "mock")
  for (const [key, value] of Object.entries(extra)) vi.stubEnv(key, value)
  return dir
}

export function confirmedFactIds(vault: Vault): Set<string> {
  return new Set(
    [...vault.projects.flatMap((p) => p.facts), ...vault.experience.flatMap((e) => e.facts)]
      .filter((fact) => fact.confirmed)
      .map((fact) => fact.id),
  )
}

export function allFactIds(vault: Vault): Set<string> {
  return new Set([...vault.projects.flatMap((p) => p.facts), ...vault.experience.flatMap((e) => e.facts)].map((f) => f.id))
}

export function draftSentences(draft: Draft) {
  return [...draft.about, ...draft.projects.flatMap((p) => p.sentences), ...draft.resumeBullets, ...draft.note]
}

export function draftText(draft: Draft): string {
  return [draft.tagline, ...draftSentences(draft).map((s) => s.text)].join("\n")
}

/** Text a reader sees in an HTML document: scripts, styles and tags removed. */
export function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
}

export async function json<T = Record<string, unknown>>(response: Response): Promise<T> {
  return (await response.json()) as T
}
