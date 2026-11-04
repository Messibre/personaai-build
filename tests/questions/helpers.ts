import { vi } from "vitest"
import { MockClient } from "@/lib/llm/mock"
import { vaultSchema, type Project, type Vault } from "@/lib/schemas/vault"
import { createEmptyVault, upsertProject } from "@/lib/vault/ops"
import alexChenFixture from "@/fixtures/vaults/alex-chen.json"

export const FETCHED_AT = "2026-01-15T10:00:00.000Z"

export const README = [
  "# canvas-flow",
  "",
  "An infinite canvas for diagrams. SVG could not keep up with 10,000 nodes,",
  "so the renderer now draws to an offscreen WebGL scene.",
].join("\n")

export const COMMITS = ["Add spatial index for hit testing", "Introduce offscreen WebGL scene"]

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj_canvas-flow",
    name: "canvas-flow",
    techs: ["TypeScript", "WebGL", "React"],
    facts: [
      {
        id: "fact_built",
        text: "An infinite canvas engine for diagrams",
        kind: "built",
        source: "github",
        confirmed: true,
      },
    ],
    sourceSnapshot: { readme: README, commits: COMMITS, fetchedAt: FETCHED_AT },
    ...overrides,
  }
}

export function makeVault(project: Project = makeProject()): Vault {
  return upsertProject(createEmptyVault("Alex Chen"), project)
}

export function alexChenVault(): Vault {
  return vaultSchema.parse(structuredClone(alexChenFixture))
}

export interface ModelAnswer {
  questionId: string
  status: string
  text?: string
  evidence?: string
  followUp?: string
}

export function answersJson(answers: ModelAnswer[]): string {
  return JSON.stringify({ answers })
}

export function mockWith(...responses: string[]): { client: MockClient; generate: ReturnType<typeof vi.spyOn> } {
  const client = new MockClient({ responses })
  return { client, generate: vi.spyOn(client, "generate") }
}
